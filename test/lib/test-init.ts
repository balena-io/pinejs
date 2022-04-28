import { ChildProcess, fork } from 'child_process';
import { exit } from 'process';
export const testListenPort = 1337;
export const testLocalServer = `http://localhost:${testListenPort}`;

export async function testInit(
	fixturePath: string,
	deleteDb: boolean = false,
	pineListenPort: number = testListenPort,
): Promise<ChildProcess> {
	try {
		const processArgs = {
			fixturePath,
			testListenPort: pineListenPort,
			deleteDb: deleteDb || process.env.DELETE_DB,
		};

		const testServer = fork(
			__dirname + '/pine-in-process.ts',
			[JSON.stringify(processArgs)],
			{ detached: false, execArgv: ['-r', 'ts-node/register'] },
		);
		await new Promise((resolve, reject) => {
			testServer.on('message', (msg: { init: string }) => {
				console.info(`init pine in separate process`);
				if ('init' in msg) {
					resolve(msg.init);
				}
			});
			testServer.on('error', () => reject('error'));
			testServer.on('close', () => reject('close'));
			testServer.on('disconnect', () => reject('disconnect'));
			testServer.on('exit', () => reject('exit'));
		});
		return testServer;
	} catch (e) {
		console.error(`TestServer wasn't created properly: ${e}`);
		exit(1);
	}
}

export function testDeInit(testServer: ChildProcess) {
	testServer?.kill();
}
