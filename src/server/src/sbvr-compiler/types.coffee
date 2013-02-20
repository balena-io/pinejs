define([
	'cs!sbvr-compiler/types/Serial'
	'cs!sbvr-compiler/types/Integer'
	'cs!sbvr-compiler/types/Real'
	'cs!sbvr-compiler/types/Date'
	'cs!sbvr-compiler/types/Text'
	'cs!sbvr-compiler/types/Short Text'
	'cs!sbvr-compiler/types/Color'
	'cs!sbvr-compiler/types/Hashed'
	'cs!sbvr-compiler/types/Boolean'
	'cs!sbvr-compiler/types/JSON'
	'cs!sbvr-compiler/types/File'
], (Serial, Integer, Real, Date, Text, ShortText, Color, Hashed, Boolean, JSON, File) ->
	return {Serial, Integer, Real, Date, Text, 'Short Text': ShortText, Color, Hashed, Boolean, JSON, File}
)