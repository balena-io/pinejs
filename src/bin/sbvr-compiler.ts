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

const getSE = (inputFile: string) => fs.readFileSync(inputFile, 'utf8');

const parse = (inputFile: string, outputFile?: string) => {
	const {
		generateLfModel,
	} = require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	const seModel = getSE(inputFile);
	const result = generateLfModel(seModel);
	const json = JSON.stringify(result, null, 2);
	if (outputFile) {
		fs.writeFileSync(outputFile, json);
	} else {
		console.log(json);
	}
};

const transform = (inputFile: string, outputFile?: string) => {
	const {
		generateLfModel,
		generateAbstractSqlModel,
	} = require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	const seModel = getSE(inputFile);
	const lfModel = generateLfModel(seModel);
	const result = generateAbstractSqlModel(lfModel);
	const json = JSON.stringify(result, null, 2);
	if (outputFile) {
		fs.writeFileSync(outputFile, json);
	} else {
		console.log(json);
	}
};

const runCompile = (inputFile: string, outputFile?: string) => {
	const {
		generateModels,
	} = require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	const seModel = getSE(inputFile);
	const models = generateModels(
		{ apiRoot: 'sbvr-compiler', modelText: seModel },
		program.engine,
	);

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
	for (const createSql of models.sql.createSchema) {
		writeLn(createSql);
		writeLn();
	}
	writeLn(`

		--
		-- Rule validation queries
		--

	`);
	for (const rule of models.sql.rules) {
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
	.command('help')
	.description('print the help')
	.action(() => program.help());

program.arguments('<input-file> [output-file]').action(runCompile);

if (process.argv.length === 2) {
	program.help();
}

program.parse(process.argv);
