import { exit } from 'process';
import cluster from 'node:cluster';
import type { PineTestOptions } from './pine-init.js';
import { init } from './pine-init.js';
import { tasks } from '@balena/pinejs';
import { PINE_TEST_SIGNALS } from './common.js';
import { type Serializable } from 'child_process';

const createWorker = (
	readyWorkers: Set<number>,
	processArgs: PineTestOptions,
) => {
	const worker = cluster.fork(process.env);
	worker.on('message', (msg) => {
		if ('init' in msg && msg.init === 'ready') {
			readyWorkers.add(worker.id);
			if (readyWorkers.size === processArgs.clusterInstances && process.send) {
				process.send({ init: 'success' });
			}
		}
	});
};

export async function forkInit() {
	const processArgs: PineTestOptions = JSON.parse(process.argv[2]);

	if (cluster.isPrimary) {
		const readyWorkers = new Set<number>();
		process.on('message', (message: Serializable) => {
			console.log('Received message in primary process', message);
			for (const id of readyWorkers.keys()) {
				cluster.workers?.[id]?.send(message);
			}
		});
		if (processArgs.clusterInstances && processArgs.clusterInstances > 1) {
			for (let i = 0; i < processArgs.clusterInstances; i++) {
				createWorker(readyWorkers, processArgs);
			}
			cluster.on('exit', (worker) => {
				// While pine is initializing on empty db a worker might die
				// as several instances try at the same time to create tables etc
				// This is not a problem as the worker just tries to recreate until
				// everything syncs up
				console.info(`Worker ${worker.process.pid} died`);
				createWorker(readyWorkers, processArgs);
			});
		}
	}

	if (!cluster.isPrimary || processArgs.clusterInstances === 1) {
		await runApp(processArgs);
	}

	if (
		cluster.isPrimary &&
		process.send &&
		(!processArgs.clusterInstances || processArgs.clusterInstances === 1)
	) {
		// If single instance or no clustering, send success directly
		process.send({ init: 'success' });
	}
}

async function runApp(processArgs: PineTestOptions) {
	console.error('Running app in', processArgs);
	try {
		const { default: initConfig } = await import(processArgs.configPath);
		console.info(`listenPort: ${processArgs.listenPort}`);
		const app = await init(
			initConfig,
			processArgs.listenPort,
			processArgs.withLoginRoute,
		);

		// load hooks
		if (processArgs.hooksPath) {
			await import(processArgs.hooksPath);
		}

		// load actions
		if (processArgs.actionsPath) {
			await import(processArgs.actionsPath);
		}

		// load task handlers
		if (processArgs.taskHandlersPath) {
			const { initTaskHandlers } = await import(processArgs.taskHandlersPath);
			await initTaskHandlers();
		}

		if (processArgs.routesPath) {
			const { initRoutes } = await import(processArgs.routesPath);
			initRoutes(app);
		}

		if (process.send) {
			process.send({ init: 'ready' });
		}

		process.on('message', async (message) => {
			if (message === PINE_TEST_SIGNALS.STOP_TASK_WORKER) {
				// This avoids the worker from picking up any new tasks
				// Useful for stopping running process on a sigterm, for example
				tasks.worker?.stop();
			}

			if (message === PINE_TEST_SIGNALS.START_TASK_WORKER) {
				await tasks.worker?.start();
			}
		});
	} catch (e) {
		console.error(`init pine in process failed ${e}`);
		exit(1);
	}
}

void forkInit();
