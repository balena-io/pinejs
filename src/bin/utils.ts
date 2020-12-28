process.env.PINEJS_CACHE_FILE =
	process.env.PINEJS_CACHE_FILE || __dirname + '/.pinejs-cache.json';

import type { SqlModel } from '@balena/abstract-sql-compiler';
import type { Config, Model } from '../config-loader/config-loader';
import type * as SbvrUtils from '../sbvr-api/sbvr-utils';
import type { AbstractSqlModel } from '@balena/abstract-sql-compiler';

import * as fs from 'fs';
import * as path from 'path';
import '../server-glue/sbvr-loader';

// tslint:disable:no-var-requires
export const { version } = JSON.parse(
	fs.readFileSync(require.resolve('../../package.json'), 'utf8'),
);

export const writeAll = (output: string, outputFile?: string): void => {
	if (outputFile) {
		fs.writeFileSync(outputFile, output);
	} else {
		console.log(output);
	}
};

export const writeSqlModel = (
	sqlModel: SqlModel,
	outputFile?: string,
): void => {
	const output = `\
--
-- Create table statements
--

${sqlModel.createSchema.join('\n\n')}

--
-- Rule validation queries
--

${sqlModel.rules
	.map(
		(rule) => `\
-- ${rule.structuredEnglish}
${rule.sql}`,
	)
	.join('\n\n')}
`;
	writeAll(output, outputFile);
};

export const getAbstractSqlModelFromFile = (
	modelFile: string,
): AbstractSqlModel => {
	let fileContents: string | Model | AbstractSqlModel | Config;
	try {
		fileContents = require(path.resolve(modelFile));
	} catch {
		fileContents = fs.readFileSync(require.resolve(modelFile), 'utf8');
	}
	let seModel: string;
	if (fileContents == null) {
		throw new Error('Invalid model file');
	}
	if (typeof fileContents === 'string') {
		seModel = fileContents;
	} else if (typeof fileContents === 'object') {
		if ('tables' in fileContents) {
			return fileContents;
		}
		const configModel =
			'models' in fileContents ? fileContents.models[0] : fileContents;
		if ('abstractSql' in configModel && configModel.abstractSql != null) {
			return configModel.abstractSql as AbstractSqlModel;
		} else if ('modelText' in configModel && configModel.modelText != null) {
			seModel = configModel.modelText;
		} else if ('modelFile' in configModel && configModel.modelFile != null) {
			seModel = fs.readFileSync(require.resolve(configModel.modelFile), 'utf8');
		} else {
			throw new Error('Unrecognised config file');
		}
	} else {
		throw new Error('Unrecognised config file');
	}
	const {
		generateLfModel,
		generateAbstractSqlModel,
	} = require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	let lfModel;
	try {
		lfModel = generateLfModel(seModel);
	} catch (e) {
		throw new Error(
			`Got '${e.message}' whilst trying to parse the model file as sbvr, if you're using a transpiled language for the model file you will need to either transpile in advance or run via its loader`,
		);
	}
	return generateAbstractSqlModel(lfModel);
};
