import express from 'express';
import { exit } from 'process';
import * as pine from '../../src/server-glue/module';
import type ExpressSession from 'express-session';

export type PineTestOptions = {
	configPath: string;
	hooksPath?: string;
	routesPath?: string;
	withLoginRoute?: boolean;
	exposeAuthEndpoints?: boolean;
	deleteDb: boolean;
	listenPort: number;
};

export async function init(
	initConfig: pine.ConfigLoader.Config,
	initPort: number,
	deleteDb: boolean = false,
	withLoginRoute: boolean = false,
	exposeAuthEndpoints: boolean = false,
) {
	const app = express();
	app.use(express.urlencoded({ extended: true }));
	app.use(express.json());

	if (exposeAuthEndpoints) {
		app.all('/Auth/*', pine.sbvrUtils.handleODataRequest);

		// pine object that can actually call the helper functions we want to test only exist on the server process
		// in order to be able to invoke these functions (in a different process) and properly test we create a custom
		// endpoint which allows us to execute the api function we are testing
		app.get('/auth-test/getUserPermissions', async (req, res) => {
			const body = req.body as { userId: number };
			const permissions = await pine.permissions.getUserPermissions(
				body.userId,
			);
			res.status(200).send(permissions);
		});
	}

	if (withLoginRoute) {
		/* eslint-disable @typescript-eslint/no-var-requires */
		const expressSession: typeof ExpressSession = require('express-session');
		const { default: passport } = await import('passport');

		app.use(
			expressSession({
				secret: 'A pink cat jumped over a rainbow',
				store: new pine.PinejsSessionStore(),
			}),
		);
		app.use(passport.initialize());
		app.use(passport.session());
	}

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
		const loader = await pine.init(app, initConfig);
		if (withLoginRoute) {
			await pine.mountLoginRouter(loader, app);
		}
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
