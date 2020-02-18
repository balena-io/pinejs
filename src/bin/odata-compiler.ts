process.env.PINEJS_CACHE_FILE =
	process.env.PINEJS_CACHE_FILE || __dirname + '/.pinejs-cache.json';

import * as _abstractSql from '../sbvr-api/abstract-sql';
import * as _sbvrUtils from '../sbvr-api/sbvr-utils';
import * as _uriParser from '../sbvr-api/uri-parser';

import { AbstractSqlModel, SqlResult } from '@resin/abstract-sql-compiler';
import * as program from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Model } from '../config-loader/config-loader';
import '../server-glue/sbvr-loader';

// tslint:disable:no-var-requires
const { version } = JSON.parse(
	fs.readFileSync(require.resolve('../../package.json'), 'utf8'),
);

const generateAbstractSqlModelFromFile = (
	modelFile: string,
): AbstractSqlModel => {
	let fileContents: string | Model | AbstractSqlModel;
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
		if ('abstractSql' in fileContents && fileContents.abstractSql != null) {
			return fileContents.abstractSql as AbstractSqlModel;
		} else if ('modelText' in fileContents && fileContents.modelText != null) {
			seModel = fileContents.modelText;
		} else if ('modelFile' in fileContents && fileContents.modelFile != null) {
			seModel = fs.readFileSync(
				require.resolve(fileContents.modelFile),
				'utf8',
			);
		} else if ('tables' in fileContents && fileContents.tables != null) {
			return fileContents as AbstractSqlModel;
		} else {
			throw new Error('Unrecognised config file');
		}
	} else {
		throw new Error('Unrecognised config file');
	}
	const {
		generateLfModel,
		generateAbstractSqlModel,
	} = require('../sbvr-api/sbvr-utils') as typeof _sbvrUtils;
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

const generateAbstractSqlQuery = (modelFile: string, odata: string) => {
	const {
		memoizedParseOdata,
		translateUri,
	} = require('../sbvr-api/uri-parser') as typeof _uriParser;
	const odataAST = memoizedParseOdata(odata);
	return translateUri({
		engine: program.engine,
		method: 'GET',
		url: odata,
		resourceName: odataAST.tree.resource,
		odataQuery: odataAST.tree,
		odataBinds: odataAST.binds,
		values: {},
		vocabulary: '',
		abstractSqlModel: generateAbstractSqlModelFromFile(modelFile),
		custom: {},
	});
};

const parseOData = (odata: string, outputFile?: string) => {
	const {
		memoizedParseOdata,
	} = require('../sbvr-api/uri-parser') as typeof _uriParser;
	const result = memoizedParseOdata(odata);
	const json = JSON.stringify(result, null, 2);
	if (outputFile) {
		fs.writeFileSync(outputFile, json);
	} else {
		console.log(json);
	}
};

const translateOData = (
	modelFile: string,
	odata: string,
	outputFile?: string,
) => {
	const request = generateAbstractSqlQuery(modelFile, odata);
	const json = JSON.stringify(request.abstractSqlQuery, null, 2);
	if (outputFile) {
		fs.writeFileSync(outputFile, json);
	} else {
		console.log(json);
	}
};

const formatSqlQuery = (sqlQuery: SqlResult | SqlResult[]): string => {
	if (Array.isArray(sqlQuery)) {
		return sqlQuery.map(formatSqlQuery).join('\n');
	} else {
		return `\
Query: ${sqlQuery.query}
Bindings: ${JSON.stringify(sqlQuery.bindings, null, 2)}
`;
	}
};

const compileOData = (
	modelFile: string,
	odata: string,
	outputFile?: string,
) => {
	const translatedRequest = generateAbstractSqlQuery(modelFile, odata);
	const {
		compileRequest,
	} = require('../sbvr-api/abstract-sql') as typeof _abstractSql;
	const compiledRequest = compileRequest(translatedRequest);
	let output;
	if (program.json) {
		output = JSON.stringify(compiledRequest.sqlQuery, null, 2);
	} else {
		output = formatSqlQuery(compiledRequest.sqlQuery!);
	}
	if (outputFile) {
		fs.writeFileSync(outputFile, output);
	} else {
		console.log(output);
	}
};

program
	.version(version)
	.option(
		'-e, --engine <engine>',
		'The target database engine (postgres|websql|mysql), default: postgres',
		/postgres|websql|mysql/,
		'postgres',
	)
	.option('--json', 'Force json output, default: false');

program
	.command('parse <input-url> [output-file]')
	.description('parse the input OData URL into OData AST')
	.action(parseOData);

program
	.command('translate <model-file> <input-url> [output-file]')
	.description('translate the input OData URL into abstract SQL')
	.action(translateOData);

program
	.command('compile <model-file> <input-url> [output-file]')
	.description('translate the input OData URL into abstract SQL')
	.action(compileOData);

program
	.command('help')
	.description('print the help')
	.action(() => program.help());

program.arguments('<sbvr-file> <input-url> [output-file]').action(compileOData);

if (process.argv.length === 2) {
	program.help();
}

program.parse(process.argv);
