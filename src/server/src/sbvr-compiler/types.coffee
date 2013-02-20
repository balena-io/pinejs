define([
	'cs!sbvr-compiler/types/Serial'
	'cs!sbvr-compiler/types/Date'
	'cs!sbvr-compiler/types/Text'
	'cs!sbvr-compiler/types/Color'
	'cs!sbvr-compiler/types/Hashed'
	'cs!sbvr-compiler/types/Boolean'
	'cs!sbvr-compiler/types/JSON'
	'cs!sbvr-compiler/types/File'
], (Serial, Date, Text, Color, Hashed, Boolean, JSON, File) ->
	return {Serial, Date, Text, Color, Hashed, Boolean, JSON, File}
)