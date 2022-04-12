import { fork } from 'child_process';
import { exit } from 'process';
export const testListenPort = 1337;
export const testLocalServer = `localhost:${testListenPort}`;

let testServer: any;
export async function testInit(fixturePath: string) {
	try {
		testServer = fork(
			__dirname + '/pineInProcess.ts',
			[fixturePath, testListenPort.toString()],
			{ detached: false, execArgv: ['-r', 'ts-node/register'] },
		);
		await new Promise((resolve, reject) => {
			testServer.on('message', (msg: any) => {
				console.log(`init pine app: ${msg.pineApp}`);
				resolve(msg.app);
			});
			testServer.on('error', () => reject('error'));
			testServer.on('close', () => reject('close'));
			testServer.on('disconnect', () => reject('disconnect'));
			testServer.on('exit', () => reject('exit'));
		});
	} catch (e) {
		console.error(`TestServer wasn't created properly: ${e}`);
		exit(1);
	}
}

export function testDeInit() {
	if (testServer) {
		testServer.kill();
	}
}
