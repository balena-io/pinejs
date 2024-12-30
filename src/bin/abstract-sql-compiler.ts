import {
	getAbstractSqlModelFromFile,
	version,
	writeAll,
	writeSqlModel,
} from './utils.js';

import { program } from 'commander';

const runCompile = async (inputFile: string, outputFile?: string) => {
	const { generateSqlModel } = await import('../sbvr-api/sbvr-utils.js');
	const abstractSql = await getAbstractSqlModelFromFile(
		inputFile,
		program.opts().model,
	);
	const sqlModel = generateSqlModel(abstractSql, program.opts().engine);

	writeSqlModel(sqlModel, outputFile);
};

const generateTypes = async (
	inputFile: string,
	options: {
		outputFile?: string;
		convertSerialToInteger?: boolean;
	},
) => {
	const { abstractSqlToTypescriptTypes } = await import(
		'@balena/abstract-sql-to-typescript/generate'
	);
	const abstractSql = await getAbstractSqlModelFromFile(
		inputFile,
		program.opts().model,
	);
	const types = abstractSqlToTypescriptTypes(abstractSql, {
		convertSerialToInteger: options.convertSerialToInteger,
	});

	writeAll(types, options.outputFile);
};

program
	.version(version)
	.option(
		'-e, --engine <engine>',
		'The target database engine (postgres|websql|mysql), default: postgres',
		/postgres|websql|mysql/,
		'postgres',
	)
	.option(
		'-m, --model <model-name>',
		'The target model for config files with multiple models, default: first model',
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
	.option('--convert-serial-to-integer', 'Convert serials to integers')
	.action(async (inputFile, outputFile, opts) => {
		await generateTypes(inputFile, {
			outputFile,
			convertSerialToInteger: opts.convertSerialToInteger,
		});
	});

program
	.command('help')
	.description('print the help')
	.action(() => program.help());

program.arguments('<input-file> [output-file]').action(runCompile);

if (process.argv.length === 2) {
	program.help();
}

void program.parseAsync(process.argv);
