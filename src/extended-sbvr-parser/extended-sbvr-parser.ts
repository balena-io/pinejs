const { SBVRParser } = require('@resin/sbvr-parser')
const Types = require('@resin/sbvr-types/Type.sbvr')

module.exports = SBVRParser._extend({
	initialize() {
		SBVRParser.initialize.call(this)
		this.AddCustomAttribute('Database ID Field:')
		this.AddCustomAttribute('Database Table Name:')
		this.AddBuiltInVocab(Types)
		return this
	}
})