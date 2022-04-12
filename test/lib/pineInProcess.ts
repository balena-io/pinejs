import { exit } from 'process';
import { init } from './pineInit';

export async function forkInit() {
	// this file is forked - so here we have to evaluate process argv again.
	const initConfig = await import(process.argv[2]);
	// fork only has argv as string[] so we have to parseInt the port after passing
	const initPort = parseInt(process.argv[3], 10);

	try {
		await init(initConfig.default, initPort);
		if (process.send) {
			process.send({ init: 'init' });
		}
	} catch (e) {
		exit(1);
	}
}

forkInit();
