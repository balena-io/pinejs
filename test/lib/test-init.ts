import { ChildProcess, fork } from 'child_process';
import { boolVar } from '@balena/env-parsing';
import type { PineTestOptions } from './pine-init';
export const listenPortDefault = 1337;
export const testLocalServer = `http://localhost:${listenPortDefault}`;

console.log(`listenPortDefault:${JSON.stringify(listenPortDefault, null, 2)}`);
export async function testInit(
	options: Partial<PineTestOptions>,
): Promise<ChildProcess> {
	try {
		// manually setting defaults
		if (options.configPath === undefined) {
			throw new Error(`config path not set`);
		}
		const processArgs: PineTestOptions = {
			listenPort: options.listenPort ?? listenPortDefault,
			deleteDb: options.deleteDb ?? boolVar('DELETE_DB', false),
			configPath: options.configPath,
			hooksPath: options.hooksPath,
		};
		const testServer = fork(
			__dirname + '/pine-in-process.ts',
			[JSON.stringify(processArgs)],
			{ detached: false, execArgv: ['-r', 'ts-node/register/transpile-only'] },
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
