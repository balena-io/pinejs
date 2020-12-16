process.env.PINEJS_CACHE_FILE =
	process.env.PINEJS_CACHE_FILE || __dirname + '/.pinejs-cache.json';

import type * as SbvrUtils from '../sbvr-api/sbvr-utils';

import * as program from 'commander';
import * as fs from 'fs';
import '../server-glue/sbvr-loader';

// tslint:disable:no-var-requires
const { version } = JSON.parse(
	fs.readFileSync(require.resolve('../../package.json'), 'utf8'),
);

const getAbstractSql = (inputFile: string) => {
	return JSON.parse(fs.readFileSync(inputFile, 'utf8'));
};

const runCompile = (inputFile: string, outputFile?: string) => {
	const {
		generateSqlModel,
	} = require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	const abstractSql = getAbstractSql(inputFile);
	const sqlModel = generateSqlModel(abstractSql, program.engine);

	let writeLn: (...args: string[]) => void = console.log;
	if (outputFile) {
		fs.writeFileSync(outputFile, '');
		writeLn = (...args: string[]) =>
			fs.writeFileSync(outputFile, args.join(' ') + '\n', { flag: 'a' });
	}

	writeLn(`
		--
		-- Create table statements
		--
	`);
	for (const createSql of sqlModel.createSchema) {
		writeLn(createSql);
		writeLn();
	}
	writeLn(`

		--
		-- Rule validation queries
		--

	`);
	for (const rule of sqlModel.rules) {
		writeLn(`-- ${rule.structuredEnglish}`);
		writeLn(rule.sql);
		writeLn();
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
	.command('compile <input-file> [output-file]')
	.description('compile the input AbstractSql model into SQL')
	.action(runCompile);

program
	.command('compile-schema <input-file> [output-file]')
	.description('compile the input AbstractSql model into SQL')
	.action(runCompile);

program
	.command('help')
	.description('print the help')
	.action(() => program.help());

program.arguments('<input-file> [output-file]').action(runCompile);

if (process.argv.length === 2) {
	program.help();
}

program.parse(process.argv);
