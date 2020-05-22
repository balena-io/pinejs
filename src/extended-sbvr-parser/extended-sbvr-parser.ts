import { SBVRParser } from '@balena/sbvr-parser';
// tslint:disable-next-line:no-var-requires
const Types: string = require('@balena/sbvr-types/Type.sbvr');
import { version as sbvrParserVersion } from '@balena/sbvr-parser/package.json';
import { version } from '@balena/sbvr-parser/package.json';

export const ExtendedSBVRParser = SBVRParser._extend({
	initialize() {
		SBVRParser.initialize.call(this);
		this.AddCustomAttribute('Database ID Field:');
		this.AddCustomAttribute('Database Table Name:');
		this.AddBuiltInVocab(Types);
		return this;
	},
	version: sbvrParserVersion + '+' + version,
});
