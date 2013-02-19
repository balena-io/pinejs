define([
	'cs!sbvr-compiler/types/Color'
	'cs!sbvr-compiler/types/Hashed'
	'cs!sbvr-compiler/types/Boolean'
	'cs!sbvr-compiler/types/JSON'
	'cs!sbvr-compiler/types/File'
], (Color, Hashed, Boolean, JSON, File) ->
	return {Color, Hashed, Boolean, JSON, File}
)