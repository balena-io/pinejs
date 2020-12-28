import { getAbstractSqlModelFromFile, version, writeAll } from './utils';

import type * as AbstractSql from '../sbvr-api/abstract-sql';
import type * as UriParser from '../sbvr-api/uri-parser';
import type { SqlResult } from '@balena/abstract-sql-compiler';

import * as program from 'commander';

const generateAbstractSqlQuery = (modelFile: string, odata: string) => {
	const {
		memoizedParseOdata,
		translateUri,
	} = require('../sbvr-api/uri-parser') as typeof UriParser;
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
		abstractSqlModel: getAbstractSqlModelFromFile(modelFile),
		custom: {},
	});
};

const parseOData = (odata: string, outputFile?: string) => {
	const {
		memoizedParseOdata,
	} = require('../sbvr-api/uri-parser') as typeof UriParser;
	const result = memoizedParseOdata(odata);
	const json = JSON.stringify(result, null, 2);
	writeAll(json, outputFile);
};

const translateOData = (
	modelFile: string,
	odata: string,
	outputFile?: string,
) => {
	const request = generateAbstractSqlQuery(modelFile, odata);
	const json = JSON.stringify(request.abstractSqlQuery, null, 2);
	writeAll(json, outputFile);
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
	} = require('../sbvr-api/abstract-sql') as typeof AbstractSql;
	const compiledRequest = compileRequest(translatedRequest);
	let output;
	if (program.json) {
		output = JSON.stringify(compiledRequest.sqlQuery, null, 2);
	} else {
		output = formatSqlQuery(compiledRequest.sqlQuery!);
	}
	writeAll(output, outputFile);
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
