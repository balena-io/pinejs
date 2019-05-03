process.env.PINEJS_CACHE_FILE =
	process.env.PINEJS_CACHE_FILE || __dirname + '/.pinejs-cache.json';

import * as _abstractSql from '../sbvr-api/abstract-sql';
import * as _sbvrUtils from '../sbvr-api/sbvr-utils';
import * as _uriParser from '../sbvr-api/uri-parser';

import * as program from 'commander';
import * as fs from 'fs';
import '../server-glue/sbvr-loader';

// tslint:disable:no-var-requires
const { version } = JSON.parse(
	fs.readFileSync(require.resolve('../../package.json'), 'utf8'),
);

const getSE = (inputFile: string) => fs.readFileSync(inputFile, 'utf8');

const generateAbstractSqlModel = (sbvrFile: string) => {
	const {
		generateLfModel,
		generateAbstractSqlModel,
	} = require('../sbvr-api/sbvr-utils') as typeof _sbvrUtils;
	const seModel = getSE(sbvrFile);
	const lfModel = generateLfModel(seModel);
	return generateAbstractSqlModel(lfModel);
};

const generateAbstractSqlQuery = (sbvrFile: string, odata: string) => {
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
		abstractSqlModel: generateAbstractSqlModel(sbvrFile),
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
	sbvrFile: string,
	odata: string,
	outputFile?: string,
) => {
	const request = generateAbstractSqlQuery(sbvrFile, odata);
	const json = JSON.stringify(request.abstractSqlQuery, null, 2);
	if (outputFile) {
		fs.writeFileSync(outputFile, json);
	} else {
		console.log(json);
	}
};

const compileOData = (sbvrFile: string, odata: string, outputFile?: string) => {
	const translatedRequest = generateAbstractSqlQuery(sbvrFile, odata);
	const {
		compileRequest,
	} = require('../sbvr-api/abstract-sql') as typeof _abstractSql;
	const compiledRequest = compileRequest(translatedRequest);
	const json = JSON.stringify(compiledRequest.sqlQuery, null, 2);
	if (outputFile) {
		fs.writeFileSync(outputFile, json);
	} else {
		console.log(json);
	}
};

program
	.version(version)
	.option(
		'-e, --engine <engine>',
		'The target database engine (postgres|websql|mysql), default: postgres',
		/postgres|websql|mysql/,
		'postgres',
	);

program
	.command('parse <input-url> [output-file]')
	.description('parse the input OData URL into OData AST')
	.action(parseOData);

program
	.command('translate <sbvr-file> <input-url> [output-file]')
	.description('translate the input OData URL into abstract SQL')
	.action(translateOData);

program
	.command('compile <sbvr-file> <input-url> [output-file]')
	.description('compile the input SBVR file into SQL')
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
