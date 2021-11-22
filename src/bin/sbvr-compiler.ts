import { version, writeAll, writeSqlModel } from './utils';

import type * as SbvrUtils from '../sbvr-api/sbvr-utils';

import { program } from 'commander';
import * as fs from 'fs';

const getSE = (inputFile: string) => fs.readFileSync(inputFile, 'utf8');

const parse = (inputFile: string, outputFile?: string) => {
	const { generateLfModel } =
		require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	const seModel = getSE(inputFile);
	const result = generateLfModel(seModel);
	const json = JSON.stringify(result, null, 2);
	writeAll(json, outputFile);
};

const transform = (inputFile: string, outputFile?: string) => {
	const { generateLfModel, generateAbstractSqlModel } =
		require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	const seModel = getSE(inputFile);
	const lfModel = generateLfModel(seModel);
	const result = generateAbstractSqlModel(lfModel);
	const json = JSON.stringify(result, null, 2);
	writeAll(json, outputFile);
};

const runCompile = (inputFile: string, outputFile?: string) => {
	const { generateModels } =
		require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	const seModel = getSE(inputFile);
	const models = generateModels(
		{ apiRoot: 'sbvr-compiler', modelText: seModel },
		program.opts().engine,
	);

	writeSqlModel(models.sql, outputFile);
};

const generateTypes = (inputFile: string, outputFile?: string) => {
	const { generateModels } =
		require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	const materializedConfig = JSON.parse(getSE(inputFile));
	const models = generateModels(materializedConfig, program.opts().engine);

	// const { abstractSqlToTypescriptTypes } =
	// require('@balena/abstract-sql-to-typescript') as typeof import('@balena/abstract-sql-to-typescript');
	// const types = abstractSqlToTypescriptTypes(models.abstractSql);

	// writeAll(types, outputFile);
	writeAll(models.odataMetadata, outputFile);
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
	.command('parse <input-file> [output-file]')
	.description('parse the input SBVR file into LF')
	.action(parse);

program
	.command('transform <input-file> [output-file]')
	.description('transform the input SBVR file into abstract SQL')
	.action(transform);

program
	.command('compile <input-file> [output-file]')
	.description('compile the input SBVR file into SQL')
	.action(runCompile);

program
	.command('generate-types <input-file> [output-file]')
	.description('generate typescript types from the input SBVR')
	.action(generateTypes);

program
	.command('help')
	.description('print the help')
	.action(() => program.help());

program.arguments('<input-file> [output-file]').action(runCompile);

if (process.argv.length === 2) {
	program.help();
}

program.parse(process.argv);
