Promise = require 'bluebird'
TypedError = require 'typed-error'
{ ODataParser } = require '@resin/odata-parser'
{ OData2AbstractSQL } = require '@resin/odata-to-abstract-sql'
memoize = require 'memoizee'
_ = require 'lodash'

exports.TranslationError = class TranslationError extends TypedError
exports.ParsingError = class ParsingError extends TypedError
exports.BadRequestError = class BadRequestError extends TypedError

odataParser = ODataParser.createInstance()
odata2AbstractSQL = {}

memoizedOdata2AbstractSQL = do ->
	_memoizedOdata2AbstractSQL = memoize(
		(vocabulary, odataQuery, method, bodyKeys) ->
			try
				return odata2AbstractSQL[vocabulary].match(odataQuery, 'Process', [method, bodyKeys])
			catch e
				console.error('Failed to translate url: ', JSON.stringify(odataQuery, null, '\t'), method, e, e.stack)
				throw new TranslationError('Failed to translate url')
		normalizer: JSON.stringify
	)
	return (vocabulary, odataQuery, method, body) ->
		{ tree, extraBodyVars} = _memoizedOdata2AbstractSQL(vocabulary, odataQuery, method, _.keys(body).sort())
		_.assign(body, extraBodyVars)
		return tree

exports.metadataEndpoints = metadataEndpoints = ['$metadata', '$serviceroot']

exports.parseODataURI = (req) -> Promise.try ->
	{ method, url, body } = req
	url = url.split('/')
	apiRoot = url[1]
	if !apiRoot? or !odata2AbstractSQL[apiRoot]?
		throw new ParsingError('No such api root: ' + apiRoot)
	url = '/' + url[2...].join('/')
	try
		odata = odataParser.matchAll(url, 'Process')
	catch e
		console.log('Failed to parse url: ', method, url, e, e.stack)
		if e instanceof SyntaxError
			throw new BadRequestError('Malformed url')
		throw new ParsingError('Failed to parse url')

	return [{
		method
		vocabulary: apiRoot
		resourceName: odata.tree.resource
		odataBinds: odata.binds
		odataQuery: odata.tree
		values: body
		custom: {}
	}]

exports.translateUri = ({ method, vocabulary, resourceName, odataBinds, odataQuery, values, custom }) ->
	isMetadataEndpoint = resourceName in metadataEndpoints or method is 'OPTIONS'
	if !isMetadataEndpoint
		abstractSqlQuery = memoizedOdata2AbstractSQL(vocabulary, odataQuery, method, values)
		return {
			method
			vocabulary
			resourceName
			odataBinds
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