Promise = require 'bluebird'
TypedError = require 'typed-error'
{ ODataParser } = require '@resin/odata-parser'
{ OData2AbstractSQL } = require '@resin/odata-to-abstract-sql'

exports.TranslationError = class TranslationError extends TypedError
exports.ParsingError = class ParsingError extends TypedError
exports.BadRequestError = class BadRequestError extends TypedError

odataParser = ODataParser.createInstance()
odata2AbstractSQL = {}

exports.metadataEndpoints = metadataEndpoints = ['$metadata', '$serviceroot']

exports.parseODataURI = (req) -> Promise.try ->
	{ method, url, body } = req
	url = url.split('/')
	apiRoot = url[1]
	if !apiRoot? or !odata2AbstractSQL[apiRoot]?
		throw new ParsingError('No such api root: ' + apiRoot)
	url = '/' + url[2...].join('/')
	try
		odataQuery = odataParser.matchAll(url, 'Process')
	catch e
		console.log('Failed to parse url: ', method, url, e, e.stack)
		if e instanceof SyntaxError
			throw new BadRequestError('Malformed url')
		throw new ParsingError('Failed to parse url')

	return [{
		method
		vocabulary: apiRoot
		resourceName: odataQuery.resource
		odataQuery
		values: body
		custom: {}
	}]

exports.translateUri = ({ method, vocabulary, resourceName, odataQuery, values, custom }) ->
	isMetadataEndpoint = resourceName in metadataEndpoints or method is 'OPTIONS'
	if !isMetadataEndpoint
		try
			abstractSqlQuery = odata2AbstractSQL[vocabulary].match(odataQuery, 'Process', [method, values])
		catch e
			console.error('Failed to translate url: ', JSON.stringify(odataQuery, null, '\t'), method, e, e.stack)
			throw new TranslationError('Failed to translate url')
		return {
			method
			vocabulary
			resourceName
			odataQuery
			abstractSqlQuery
			values
			custom
		}
	return {
		method
		vocabulary
		resourceName
		custom
	}

exports.addClientModel = (vocab, clientModel) ->
	odata2AbstractSQL[vocab] = OData2AbstractSQL.createInstance()
	odata2AbstractSQL[vocab].setClientModel(clientModel)

exports.deleteClientModel = (vocab, clientModel) ->
	delete odata2AbstractSQL[vocab]
