import {
	getAbstractSqlModelFromFile,
	version,
	writeAll,
	writeSqlModel,
} from './utils';

import { program } from 'commander';

const runCompile = async (inputFile: string, outputFile?: string) => {
	const { generateSqlModel } = await import('../sbvr-api/sbvr-utils');
	const abstractSql = getAbstractSqlModelFromFile(inputFile);
	const sqlModel = generateSqlModel(abstractSql, program.opts().engine);

	writeSqlModel(sqlModel, outputFile);
};

const generateTypes = async (inputFile: string, outputFile?: string) => {
	const { abstractSqlToTypescriptTypes } = await import(
		'@balena/abstract-sql-to-typescript'
	);
	const abstractSql = getAbstractSqlModelFromFile(inputFile);
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

void program.parseAsync(process.argv);
