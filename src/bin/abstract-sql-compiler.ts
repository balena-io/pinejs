import { version, writeAll, writeSqlModel } from './utils';

import type * as SbvrUtils from '../sbvr-api/sbvr-utils';

import * as program from 'commander';
import * as fs from 'fs';

const getAbstractSql = (inputFile: string) => {
	return JSON.parse(fs.readFileSync(inputFile, 'utf8'));
};

const runCompile = (inputFile: string, outputFile?: string) => {
	const {
		generateSqlModel,
	} = require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	const abstractSql = getAbstractSql(inputFile);
	const sqlModel = generateSqlModel(abstractSql, program.engine);

	writeSqlModel(sqlModel, outputFile);
};

const generateTypes = (inputFile: string, outputFile?: string) => {
	const {
		abstractSqlToTypescriptTypes,
	} = require('@balena/abstract-sql-to-typescript') as typeof import('@balena/abstract-sql-to-typescript');
	const abstractSql = getAbstractSql(inputFile);
	const types = abstractSqlToTypescriptTypes(abstractSql);

	writeAll(types, outputFile);
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
	.command('compile <input-file> [output-file]')
	.description('compile the input AbstractSql model into SQL')
	.action(runCompile);

program
	.command('compile-schema <input-file> [output-file]')
	.description('compile the input AbstractSql model into SQL')
	.action(runCompile);

program
	.command('generate-types <input-file> [output-file]')
	.description('generate typescript types from the input AbstractSql')
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
