import * as express from 'express';
import { exit } from 'process';
import * as pine from '../../src/server-glue/module';

export type PineTestOptions = {
	configPath: string;
	hooksPath?: string;
	deleteDb: boolean;
	listenPort: number;
};

export async function init(
	initConfig: pine.ConfigLoader.Config,
	initPort: number,
	deleteDb: boolean = false,
) {
	const app = express();
	app.use(express.urlencoded({ extended: true }));
	app.use(express.json());

	app.use('/ping', (_req, res) => {
		res.sendStatus(200);
	});

	process.on('SIGUSR2', () => {
		console.info(
			`Received SIGUSR2 to toggle async migration execution enabled from ${
				pine.env.migrator.asyncMigrationIsEnabled
			} to ${!pine.env.migrator.asyncMigrationIsEnabled} `,
		);
		pine.env.migrator.asyncMigrationIsEnabled =
			!pine.env.migrator.asyncMigrationIsEnabled;
	});

	try {
		await cleanInit(deleteDb);
		await pine.init(app, initConfig);
		await new Promise((resolve) => {
			app.listen(initPort, () => {
				resolve('server started');
			});
		});
		return app;
	} catch (e) {
		console.log(`pineInit ${e}`);
		exit(1);
	}
}

async function cleanInit(deleteDb: boolean = false) {
	if (!deleteDb) {
		return;
	}

	try {
		const initDbOptions = {
			engine:
				process.env.DATABASE_URL?.slice(
					0,
					process.env.DATABASE_URL?.indexOf(':'),
				) || 'postgres',
			params: process.env.DATABASE_URL || 'localhost',
		};
		const initDb = pine.dbModule.connect(initDbOptions);
		await initDb.executeSql(
			'DROP SCHEMA "public" CASCADE; CREATE SCHEMA "public";',
		);
		console.info(`Postgres database dropped`);
	} catch (e) {
		console.error(`Error during dropping postgres database: ${e}`);
	}
}
