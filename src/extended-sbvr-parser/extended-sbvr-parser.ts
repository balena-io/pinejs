import { SBVRParser } from '@balena/sbvr-parser';
import { importSBVR } from '../server-glue/sbvr-loader.js';
import SbvrParserPackage from '@balena/sbvr-parser/package.json' with { type: 'json' };
import { version } from '../config-loader/env.js';

const Types = await importSBVR('@balena/sbvr-types/Type.sbvr', import.meta);

export const ExtendedSBVRParser = SBVRParser._extend({
	initialize() {
		SBVRParser.initialize.call(this);
		this.AddCustomAttribute('Database ID Field:');
		this.AddCustomAttribute('Database Table Name:');
		this.AddBuiltInVocab(Types);
		return this;
	},
	version: SbvrParserPackage.version + '+' + version,
});
