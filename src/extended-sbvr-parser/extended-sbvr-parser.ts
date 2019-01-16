import { SBVRParser } from '@resin/sbvr-parser'
const Types: string = require('@resin/sbvr-types/Type.sbvr')
import { version as sbvrParserVersion } from '@resin/sbvr-parser/package.json'
const { version }: { version: string } = require('@resin/sbvr-parser/package.json')

export = SBVRParser._extend({
	initialize() {
		SBVRParser.initialize.call(this)
		this.AddCustomAttribute('Database ID Field:')
		this.AddCustomAttribute('Database Table Name:')
		this.AddBuiltInVocab(Types)
		return this
	},
	version: sbvrParserVersion + '+' + version
})
