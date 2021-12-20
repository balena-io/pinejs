import {
	getAbstractSqlModelFromFile,
	version,
	writeAll,
	writeSqlModel,
} from './utils';
import * as fs from 'fs';

import type * as SbvrUtils from '../sbvr-api/sbvr-utils';

import { program } from 'commander';
import { generateODataMetadata } from '../odata-metadata/odata-metadata-generator';
const getSE = (inputFile: string) => fs.readFileSync(inputFile, 'utf8');

const runCompile = (inputFile: string, outputFile?: string) => {
	const { generateSqlModel } =
		require('../sbvr-api/sbvr-utils') as typeof SbvrUtils;
	const abstractSql = getAbstractSqlModelFromFile(inputFile);
	const sqlModel = generateSqlModel(abstractSql, program.opts().engine);

	writeSqlModel(sqlModel, outputFile);
};

const generateTypes = (inputFile: string, outputFile?: string) => {
	const { abstractSqlToTypescriptTypes } =
		require('@balena/abstract-sql-to-typescript') as typeof import('@balena/abstract-sql-to-typescript');
	const abstractSql = getAbstractSqlModelFromFile(inputFile);
	const types = abstractSqlToTypescriptTypes(abstractSql);

	writeAll(types, outputFile);
};

const generateOData = (inputFile: string, outputFile?: string) => {
	const materializedConfig = JSON.parse(getSE(inputFile));
	// TODO: better way to destructure the materialisedConfig object
	const oDataSpec = generateODataMetadata(
		materializedConfig.models[0].apiRoot,
		materializedConfig.models[0].abstractSql,
		materializedConfig.whitelist,
		materializedConfig.authRoles,
	);

	writeAll(oDataSpec, outputFile);
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
	.command('generate-odata <input-file> [output-file]')
	.description(
		'generate odata specification from the input pinejs manifest file',
	)
	.action(generateOData);

program
	.command('help')
	.description('print the help')
	.action(() => program.help());

program.arguments('<input-file> [output-file]').action(runCompile);

if (process.argv.length === 2) {
	program.help();
}

program.parse(process.argv);
