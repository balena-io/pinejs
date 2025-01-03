process.env.PINEJS_CACHE_FILE =
	process.env.PINEJS_CACHE_FILE ||
	fileURLToPath(new URL('.pinejs-cache.json', import.meta.url));

import type { SqlModel } from '@balena/abstract-sql-compiler';
import type { Config, Model } from '../config-loader/config-loader.js';
import type { AbstractSqlModel } from '@balena/abstract-sql-compiler';

import fs from 'fs';
import path from 'path';
import '../server-glue/sbvr-loader.js';
import { fileURLToPath } from 'url';
import { loadSBVR } from '../server-glue/sbvr-loader.js';

export { version } from '../config-loader/env.js';

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

const getConfigModel = (
	fileContents: Model | AbstractSqlModel | Config,
	modelName?: string,
): Model | AbstractSqlModel => {
	if ('models' in fileContents) {
		if (fileContents.models.length === 0) {
			throw new Error('No models found in config file');
		}
		if (modelName != null) {
			const model = fileContents.models.find((m) => m.modelName === modelName);
			if (model == null) {
				throw new Error(
					`Could not find model with name '${modelName}', found: ${fileContents.models.map((m) => m.modelName).join(', ')}`,
				);
			}
			return model;
		}
		return fileContents.models[0];
	}
	return fileContents;
};

export const getAbstractSqlModelFromFile = async (
	modelFile: string,
	modelName: string | undefined,
): Promise<AbstractSqlModel> => {
	let fileContents: string | Model | AbstractSqlModel | Config;
	try {
		fileContents = await import(path.resolve(modelFile));
	} catch {
		fileContents = await fs.promises.readFile(path.resolve(modelFile), 'utf8');
		try {
			// Try to parse the file as JSON
			fileContents = JSON.parse(fileContents);
		} catch {
			// Ignore error as it's likely just a text sbvr file
		}
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
		const configModel = getConfigModel(fileContents, modelName);
		if ('abstractSql' in configModel && configModel.abstractSql != null) {
			return configModel.abstractSql;
		} else if ('modelText' in configModel && configModel.modelText != null) {
			seModel = configModel.modelText;
		} else if ('modelFile' in configModel && configModel.modelFile != null) {
			seModel = await loadSBVR(configModel.modelFile, import.meta);
		} else {
			throw new Error('Unrecognized config file');
		}
	} else {
		throw new Error('Unrecognized config file');
	}
	const { generateLfModel, generateAbstractSqlModel } = await import(
		'../sbvr-api/sbvr-utils.js'
	);
	let lfModel;
	try {
		lfModel = generateLfModel(seModel);
	} catch (e: any) {
		throw new Error(
			`Got '${e.message}' whilst trying to parse the model file as sbvr, if you're using a transpiled language for the model file you will need to either transpile in advance or run via its loader`,
		);
	}
	return generateAbstractSqlModel(lfModel);
};
