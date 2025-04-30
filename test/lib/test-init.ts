import type { ChildProcess } from 'child_process';
import { fork } from 'child_process';
import { boolVar } from '@balena/env-parsing';
import type { types } from '@balena/pinejs';
import { dbModule } from '@balena/pinejs';
import type { PineTestOptions } from './pine-init.js';
export const listenPortDefault = 1337;
export const testLocalServer = `http://localhost:${listenPortDefault}`;

export async function testInit(
	options: types.OptionalField<PineTestOptions, 'listenPort' | 'deleteDb'>,
): Promise<ChildProcess> {
	try {
		const processArgs: PineTestOptions = {
			listenPort: options.listenPort ?? listenPortDefault,
			deleteDb: options.deleteDb ?? boolVar('DELETE_DB', false),
			configPath: options.configPath,
			hooksPath: options.hooksPath,
			actionsPath: options.actionsPath,
			taskHandlersPath: options.taskHandlersPath,
			routesPath: options.routesPath,
			withLoginRoute: options.withLoginRoute,
			clusterInstances: options.clusterInstances ?? 1,
		};
		if (processArgs.deleteDb) {
			await cleanDb();
		}
		const testServer = fork(
			import.meta.dirname + '/pine-in-process.ts',
			[JSON.stringify(processArgs)],
			{
				detached: false,
				execArgv: [
					'--require',
					'ts-node/register/transpile-only',
					'--loader',
					'ts-node/esm/transpile-only',
				],
			},
		);
		await new Promise((resolve, reject) => {
			testServer.on('message', (msg: { init: string }) => {
				console.info(`init pine in separate process`);
				if ('init' in msg && msg.init === 'success') {
					resolve(msg.init);
				}
			});
			testServer.on('error', () => {
				reject(new Error('error'));
			});
			testServer.on('exit', () => {
				reject(new Error('exit'));
			});
		});
		return testServer;
	} catch (err: any) {
		console.error(`TestServer wasn't created properly: ${err}`);
		throw err;
	}
}

export function testDeInit(testServer: ChildProcess) {
	testServer?.kill();
}

async function cleanDb() {
	try {
		const initDbOptions = {
			engine:
				process.env.DATABASE_URL?.slice(
					0,
					process.env.DATABASE_URL?.indexOf(':'),
				) ?? 'postgres',
			params: process.env.DATABASE_URL ?? 'localhost',
		};
		const initDb = dbModule.connect(initDbOptions);
		await initDb.executeSql(
			'DROP SCHEMA "public" CASCADE; CREATE SCHEMA "public";',
		);
		console.info(`Postgres database dropped`);
	} catch (e) {
		console.error(`Error during dropping postgres database: ${e}`);
	}
}
