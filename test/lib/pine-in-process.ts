import { exit } from 'process';
import { init, PineTestOptions } from './pine-init';

export async function forkInit() {
	try {
		// this file is forked - so here we have to evaluate process argv again.
		// fork only has argv as string[], we use JSON string as arguments
		const processArgs: PineTestOptions = JSON.parse(process.argv[2]);
		const initConfig = await import(processArgs.configPath);
		console.info(`listenPort: ${processArgs.listenPort}`);
		console.log(`processArgs:${JSON.stringify(processArgs, null, 2)}`);
		await init(
			initConfig.default,
			processArgs.listenPort,
			processArgs.deleteDb,
		);

		// load hooks
		if (processArgs.hooksPath) {
			await import(processArgs.hooksPath);
		}

		if (process.send) {
			process.send({ init: 'success' });
		}
	} catch (e) {
		console.error(`init pine in process failed ${e}`);
		exit(1);
	}
}

forkInit();
