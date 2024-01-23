import { ChildProcess, fork } from 'child_process';
import { boolVar } from '@balena/env-parsing';
import type { PineTestOptions } from './pine-init';
import { OptionalField } from '../../src/sbvr-api/common-types';
export const listenPortDefault = 1337;
export const testLocalServer = `http://localhost:${listenPortDefault}`;

export async function testInit(
	options: OptionalField<PineTestOptions, 'listenPort' | 'deleteDb'>,
): Promise<ChildProcess> {
	try {
		const processArgs: PineTestOptions = {
			listenPort: options.listenPort ?? listenPortDefault,
			deleteDb: options.deleteDb ?? boolVar('DELETE_DB', false),
			configPath: options.configPath,
			hooksPath: options.hooksPath,
			routesPath: options.routesPath,
			withLoginRoute: options.withLoginRoute,
		};
		const testServer = fork(
			__dirname + '/pine-in-process.ts',
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
				if ('init' in msg) {
					resolve(msg.init);
				}
			});
			testServer.on('error', () => reject('error'));
			testServer.on('exit', () => reject('exit'));
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
