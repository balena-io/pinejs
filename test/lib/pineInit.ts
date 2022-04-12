import * as express from 'express';
import { exit } from 'process';
import * as pine from '../../src/server-glue/module';

export async function init(initConfig: any, initPort: number) {
	const app = express();
	app.use(express.urlencoded({ extended: true }));

	app.use('/ping', (_req, res) => {
		res.sendStatus(200);
	});

	try {
		await pine.init(app, initConfig);
		await new Promise((resolve) => {
			app.listen(initPort, () => {
				resolve('server started');
			});
		});
		return app;
	} catch (e) {
		exit(1);
	}
}
