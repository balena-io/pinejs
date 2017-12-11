import * as _express from 'express'

if (!process.browser) {
	if (typeof nodeRequire === 'undefined' || nodeRequire == null) {
		// `nodeRequire` is a special variable we use to bypass webpack's resolving of `require`
		// statements on build for the cases where we need to always use the nodejs require, eg
		// in the config-loader which dynamically loads code at runtime, and for adding custom
		// filetype handlers - it works by being replaced with `require` after the webpack build
		// finishes.
		// In the case of `nodeRequire` being undefined it means we're being run in a nodejs
		// environment directly, without a webpack build, and have to manually create it as an
		// alias for the nodejs require so that things continue to work.

		// Alias require as nodeRequire for the config-loader hack.
		global.nodeRequire = require
	}
	// Register a .sbvr loader
	const fs = require('fs')
	nodeRequire.extensions['.sbvr'] = (module: NodeModule, filename: string) =>
		module.exports = fs.readFileSync(filename, { encoding: 'utf8' })

	// Register the .ometajs loader
	nodeRequire('ometa-js')
}

import * as Promise from 'bluebird'
import * as dbModule from '../database-layer/db'
// TODO: replace with the return type of `configLoader.setup`
type ConfigLoader = any
const configLoader = require('../config-loader/config-loader')
const migrator = require('../migrator/migrator')

export const sbvrUtils = require('../sbvr-api/sbvr-utils')
export const SessionStore = require('../pinejs-session-store/pinejs-session-store')

let databaseOptions: {
	engine: string,
	params: string,
}
if (dbModule.engines.websql != null) {
	databaseOptions = {
		engine: 'websql',
		params: 'rulemotion',
	}
} else {
	let databaseURL: string
	if (process.env.DATABASE_URL) {
		databaseURL = process.env.DATABASE_URL
	} else if (dbModule.engines.postgres != null) {
		databaseURL = 'postgres://postgres:.@localhost:5432/postgres'
	} else if (dbModule.engines.mysql == null) {
		databaseURL = 'mysql://mysql:.@localhost:3306'
	} else {
		throw new Error('No supported database options available')
	}
	databaseOptions = {
		engine: databaseURL.slice(0, databaseURL.indexOf(':')),
		params: databaseURL,
	}
}

const db = dbModule.connect(databaseOptions)

export const init = (app: _express.Application, config?: any): Promise<ConfigLoader> =>
	(sbvrUtils.setup(app, db) as Promise<any>)
	.then(() => {
		const cfgLoader = configLoader.setup(app)
		return cfgLoader.loadConfig(migrator.config)
		.return(cfgLoader)
	}).tap((cfgLoader) => {
		const promises: Promise<void>[] = []
		if (process.env.SBVR_SERVER_ENABLED) {
			const sbvrServer = require('../data-server/SBVRServer')
			const transactions = require('../http-transactions/transactions')
			promises.push(cfgLoader.loadConfig(sbvrServer.config))
			promises.push(
				cfgLoader.loadConfig(transactions.config)
				.then(() => transactions.addModelHooks('data'))
			)
		}
		if (!process.env.CONFIG_LOADER_DISABLED) {
			promises.push(cfgLoader.loadApplicationConfig(config))
		}
		return Promise.all(promises)
	}).catch((err) => {
		console.error('Error initialising server', err, err.stack)
		process.exit(1)
	})
