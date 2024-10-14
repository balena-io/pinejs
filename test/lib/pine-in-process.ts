import { exit } from 'process';
import type { PineTestOptions } from './pine-init';
import { init } from './pine-init';
import { tasks } from '../../src/server-glue/module';
import { PINE_TEST_SIGNALS } from './common';

export async function forkInit() {
	try {
		// this file is forked - so here we have to evaluate process argv again.
		// fork only has argv as string[], we use JSON string as arguments
		const processArgs: PineTestOptions = JSON.parse(process.argv[2]);
		const { default: initConfig } = await import(processArgs.configPath);
		console.info(`listenPort: ${processArgs.listenPort}`);
		const app = await init(
			initConfig.default,
			processArgs.listenPort,
			processArgs.deleteDb,
			processArgs.withLoginRoute,
		);

		// load hooks
		if (processArgs.hooksPath) {
			await import(processArgs.hooksPath);
		}

		// load task handlers
		if (processArgs.taskHandlersPath) {
			const {
				default: { initTaskHandlers },
			} = await import(processArgs.taskHandlersPath);
			initTaskHandlers();
		}

		if (processArgs.routesPath) {
			const {
				default: { initRoutes },
			} = await import(processArgs.routesPath);
			initRoutes(app);
		}

		if (process.send) {
			process.send({ init: 'success' });
		}

		process.on('message', async (message) => {
			if (message === PINE_TEST_SIGNALS.STOP_TASK_WORKER) {
				// This avoids the worker from picking up any new tasks
				// Useful for stopping running process on a sigterm, for example
				await tasks.worker?.stop();
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
