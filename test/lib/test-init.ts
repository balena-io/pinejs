import { ChildProcess, fork } from 'child_process';
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
