Promise = require 'bluebird'
TypedError = require 'typed-error'
{ ODataParser } = require '@resin/odata-parser'
{ OData2AbstractSQL } = require '@resin/odata-to-abstract-sql'
memoize = require 'memoizee'
_ = require 'lodash'
utils = require './utils'
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
		{ tree, extraBodyVars } = _memoizedOdata2AbstractSQL(vocabulary, odataQuery, method, _.keys(body).sort())
		_.assign(body, extraBodyVars)
		return tree

exports.metadataEndpoints = metadataEndpoints = ['$metadata', '$serviceroot']

exports.parseODataURI = (req) ->
	{ method, url, body } = req
  # batch requests should be identified by POST requests located at
	# URL $batch relative to service root.

	body = if req.batch?.length > 0 then req.batch else [{ method: method, url: url, data: body }]
	utils.settleMap(body, parseOData)
	.catch SyntaxError, ->
		throw new BadRequestError("Malformed url: '#{url}'")
	.catch notParsingError, notBadRequestError, (e) ->
		console.error('Failed to parse url: ', method, url, e, e.stack)
		throw new ParsingError("Failed to parse url: '#{url}'")

parseOData = (b) ->
	if b._isChangeSet
		env = new Map()
		# We sort the CS set once, we must assure that requests which reference
		# other requests in the changeset are placed last. Once they are sorted
		# Map will guarantee retrival of results in insertion order
		sortedCS = _.sortBy b.changeSet, (el) -> !(el.url[0] == '/')
		Promise.reduce(sortedCS, parseODataCs, env)
		.then (env) -> Array.from(env.values())
	else
		{ url, apiRoot } = splitApiRoot(b.url)
		odata = odataParser.matchAll(url, 'Process')

		return {
			method: b.method
			vocabulary: apiRoot
			resourceName: odataQuery.resource
			odataQuery
			values: b.data
			custom: {}
			_defer: false
		}

parseODataCs = (env, b) ->
	cId = mustExtractHeader(b, 'content-id')

	if (b.url[0] == '/')
		{ url, apiRoot } = splitApiRoot(b.url)
		odata = odataParser.matchAll(url, 'Process')
		defer = false
	else
		url = b.url
		odata = odataParser.matchAll(url, 'Process')
		[tag, id] = odata.tree.resource
		# Use reference to collect information
		apiRoot = env.get(id).vocabulary
		# Update reference with actual resourceName
		odata.tree.resource = env.get(id).resourceName
		defer = true

	parseResult = {
		method: b.method
		vocabulary: apiRoot
		resourceName: odata.tree.resource
		odataBinds: odata.binds
		odataQuery: odata.tree
		values: b.data
		custom: {}
		id: cId
		_defer: defer
	}
	env.set(cId, parseResult)
	return env

splitApiRoot = (url) ->
	url = url.split('/')
	apiRoot = url[1]
	if !apiRoot? or !odata2AbstractSQL[apiRoot]?
		throw new ParsingError('No such api root: ' + apiRoot)
	url = '/' + url[2...].join('/')
	return { url: url, apiRoot: apiRoot }

mustExtractHeader = (body, header) ->
	h = body.headers[header]?[0]
	if _.isUndefined h
		throw new BadRequestError(header + ' must be specified in ' + body)
	return h

exports.translateUri = ({ method, vocabulary, resourceName, odataBinds, odataQuery, values, custom, id, _defer }) ->
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
			id
			_defer
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
