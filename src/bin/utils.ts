process.env.PINEJS_CACHE_FILE =
	process.env.PINEJS_CACHE_FILE || __dirname + '/.pinejs-cache.json';

import type { SqlModel } from '@balena/abstract-sql-compiler';
import * as fs from 'fs';
import '../server-glue/sbvr-loader';

// tslint:disable:no-var-requires
export const { version } = JSON.parse(
	fs.readFileSync(require.resolve('../../package.json'), 'utf8'),
);

export const writeAll = (output: string, outputFile?: string): void => {
	if (outputFile) {
		fs.writeFileSync(outputFile, output);
	} else {
		console.log(output);
	}
};

export const writeSqlModel = (
	sqlModel: SqlModel,
	outputFile?: string,
): void => {
	const output = `\
--
-- Create table statements
--

${sqlModel.createSchema.join('\n\n')}

--
-- Rule validation queries
--

${sqlModel.rules
	.map(
		(rule) => `\
-- ${rule.structuredEnglish}
${rule.sql}`,
	)
	.join('\n\n')}
`;
	writeAll(output, outputFile);
};
