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

# Converts a value to its string representation and tries to parse is as an
# OData bind
exports.parseId = (b) ->
	ODataParser.matchAll(String(b), 'ExternalKeyBind')

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
		# Sort the body keys to improve cache hits
		{ tree, extraBodyVars } = _memoizedOdata2AbstractSQL(vocabulary, odataQuery, method, _.keys(body).sort())
		_.assign(body, extraBodyVars)
		return _.cloneDeep(tree)

exports.metadataEndpoints = metadataEndpoints = ['$metadata', '$serviceroot', '$canAccess']

notBadRequestOrParsingError = (e) ->
	not ((e instanceof BadRequestError) or (e instanceof ParsingError))

exports.parseOData = (b) ->
	Promise.try ->
		if b._isChangeSet
			env = new Map()
			# We sort the CS set once, we must assure that requests which reference
			# other requests in the changeset are placed last. Once they are sorted
			# Map will guarantee retrival of results in insertion order
			sortedCS = _.sortBy b.changeSet, (el) -> !(el.url[0] == '/')
			Promise.reduce(sortedCS, parseODataChangeset, env)
			.then (env) -> Array.from(env.values())
		else
			{ url, apiRoot } = splitApiRoot(b.url)
			odata = odataParser.matchAll(url, 'Process')

			return {
				method: b.method
				vocabulary: apiRoot
				resourceName: odata.tree.resource
				odataBinds: odata.binds
				odataQuery: odata.tree
				values: b.data
				custom: {}
				_defer: false
			}
	.catch SyntaxError, (e) ->
		throw new BadRequestError("Malformed url: '#{b.url}'")
	.catch notBadRequestOrParsingError, (e) ->
		console.error('Failed to parse url: ', b.method, b.url, e, e.stack)
		throw new ParsingError("Failed to parse url: '#{b.url}'")


parseODataChangeset = (env, b) ->
	contentId = mustExtractHeader(b, 'content-id')

	if env.has(contentId)
		throw new BadRequestError('Content-Id must be unique inside a changeset')

	if b.url[0] == '/'
		{ url, apiRoot } = splitApiRoot(b.url)
		odata = odataParser.matchAll(url, 'Process')
		defer = false
	else
		url = b.url
		odata = odataParser.matchAll(url, 'Process')
		{ bind } = odata.tree.resource
		[ tag, id ] = odata.binds[bind]
		# Use reference to collect information
		ref = env.get(id)
		if _.isUndefined(ref)
			throw new BadRequestError('Content-Id refers to a non existent resource')
		apiRoot = ref.vocabulary
		# Update resource with actual resourceName
		odata.tree.resource = ref.resourceName
		defer = true

	parseResult = {
		method: b.method
		vocabulary: apiRoot
		resourceName: odata.tree.resource
		odataBinds: odata.binds
		odataQuery: odata.tree
		values: b.data
		custom: {}
		id: contentId
		_defer: defer
	}
	env.set(contentId, parseResult)
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
		throw new BadRequestError("#{header} must be specified")
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
