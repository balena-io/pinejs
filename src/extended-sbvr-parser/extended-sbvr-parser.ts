import { SBVRParser } from '@balena/sbvr-parser';
import { requireSBVR } from '../server-glue/sbvr-loader';
import { version as sbvrParserVersion } from '@balena/sbvr-parser/package.json';
import { version } from '../config-loader/env';

const Types = requireSBVR('@balena/sbvr-types/Type.sbvr', require);

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
