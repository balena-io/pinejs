import { getAbstractSqlModelFromFile, version, writeAll } from './utils';
import type { SqlResult } from '@balena/abstract-sql-compiler';

import { program } from 'commander';

const generateAbstractSqlQuery = async (modelFile: string, odata: string) => {
	const { memoizedParseOdata, translateUri } = await import(
		'../sbvr-api/uri-parser'
	);
	const odataAST = memoizedParseOdata(odata);
	const vocabulary = '';
	return translateUri({
		engine: program.opts().engine,
		method: 'GET',
		url: odata,
		resourceName: odataAST.tree.resource,
		originalResourceName: odataAST.tree.resource,
		odataQuery: odataAST.tree,
		odataBinds: odataAST.binds,
		values: {},
		vocabulary,
		abstractSqlModel: getAbstractSqlModelFromFile(modelFile),
		custom: {},
		translateVersions: [vocabulary],
	});
};

const parseOData = async (odata: string, outputFile?: string) => {
	const { memoizedParseOdata } = await import('../sbvr-api/uri-parser');
	const result = memoizedParseOdata(odata);
	const json = JSON.stringify(result, null, 2);
	writeAll(json, outputFile);
};

const translateOData = async (
	modelFile: string,
	odata: string,
	outputFile?: string,
) => {
	const request = await generateAbstractSqlQuery(modelFile, odata);
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

const compileOData = async (
	modelFile: string,
	odata: string,
	outputFile?: string,
) => {
	const translatedRequest = await generateAbstractSqlQuery(modelFile, odata);
	const { compileRequest } = await import('../sbvr-api/abstract-sql');
	const compiledRequest = compileRequest(translatedRequest);
	let output;
	if (program.opts().json) {
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
	.description('compile the input OData URL into SQL')
	.action(compileOData);

program
	.command('help')
	.description('print the help')
	.action(() => program.help());

program.arguments('<sbvr-file> <input-url> [output-file]').action(compileOData);

if (process.argv.length === 2) {
	program.help();
}

program.parseAsync(process.argv);
