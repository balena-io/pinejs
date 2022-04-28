import { exit } from 'process';
import { init } from './pine-init';

export async function forkInit() {
	try {
		// this file is forked - so here we have to evaluate process argv again.
		// fork only has argv as string[], we use JSON string as arguments
		const processArgs: {
			fixturePath: string;
			testListenPort: number;
			deleteDb: boolean;
		} = JSON.parse(process.argv[2]);
		const initConfig = await import(processArgs.fixturePath);
		console.info(`pine testListenPort: ${processArgs.testListenPort}`);
		await init(
			initConfig.default,
			processArgs.testListenPort,
			processArgs.deleteDb,
		);
		if (process.send) {
			process.send({ init: 'success' });
		}
	} catch (e) {
		console.error(`init pine in process failed ${e}`);
		exit(1);
	}
}

forkInit();
