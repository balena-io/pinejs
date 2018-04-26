Promise = require 'bluebird'
{ ODataParser } = require '@resin/odata-parser'
{ OData2AbstractSQL } = require '@resin/odata-to-abstract-sql'
memoize = require 'memoizee'
memoizeWeak = require 'memoizee/weak'
_ = require 'lodash'
{ BadRequestError, ParsingError, TranslationError } = require './errors'
deepFreeze = require 'deep-freeze'
env = require '../config-loader/env'
permissions = require './permissions'

exports.BadRequestError = BadRequestError
exports.ParsingError = ParsingError
exports.TranslationError = TranslationError

# Converts a value to its string representation and tries to parse is as an
# OData bind
exports.parseId = (b) ->
	ODataParser.matchAll(String(b), 'ExternalKeyBind')

exports.memoizedParseOdata = memoizedParseOdata = do ->
	odataParser = ODataParser.createInstance()
	parseOdata = (url) ->
		odataParser.matchAll(url, 'Process')
	_memoizedParseOdata = memoize(
		parseOdata
		primitive: true
		max: env.cache.parseOData.max
	)
	return (url) ->
		if _.includes(url, '$')
			# If we're doing a complex url then skip caching due to # of permutations
			return parseOdata(url)
		else
			# Else if it's simple we can easily skip the parsing as we know we'll get a high % hit rate
			# We deep clone to avoid mutations polluting the cache
			return _.cloneDeep(_memoizedParseOdata(url))

memoizedGetOData2AbstractSQL = memoizeWeak(
	(abstractSqlModel) ->
		odata2AbstractSQL = OData2AbstractSQL.createInstance()
		odata2AbstractSQL.setClientModel(abstractSqlModel)
		return odata2AbstractSQL
)


memoizedOdata2AbstractSQL = do ->
	_memoizedOdata2AbstractSQL = memoizeWeak(
		(abstractSqlModel, odataQuery, method, bodyKeys, existingBindVarsLength) ->
			try
				odata2AbstractSQL = memoizedGetOData2AbstractSQL(abstractSqlModel)
				abstractSql = odata2AbstractSQL.match(odataQuery, 'Process', [method, bodyKeys, existingBindVarsLength])
				# We deep freeze to prevent mutations, which would pollute the cache
				deepFreeze(abstractSql)
				return abstractSql
			catch e
				if e instanceof permissions.PermissionError
					throw e
				console.error('Failed to translate url: ', JSON.stringify(odataQuery, null, '\t'), method, e, e.stack)
				throw new TranslationError('Failed to translate url')
		normalizer: (abstractSqlModel, [ odataQuery, method, bodyKeys, existingBindVarsLength ]) ->
			return JSON.stringify(odataQuery) + method + bodyKeys + existingBindVarsLength
		max: env.cache.odataToAbstractSql.max
	)
	return (request) ->
		{ method, odataQuery, odataBinds, values } = request
		abstractSqlModel = sbvrUtils.getAbstractSqlModel(request)
		# Sort the body keys to improve cache hits
		{ tree, extraBodyVars, extraBindVars } = _memoizedOdata2AbstractSQL(abstractSqlModel, odataQuery, method, _.keys(values).sort(), odataBinds.length)
		_.assign(values, extraBodyVars)
		odataBinds.push(extraBindVars...)
		return tree

exports.metadataEndpoints = metadataEndpoints = ['$metadata', '$serviceroot']

notBadRequestOrParsingError = (e) ->
	not ((e instanceof BadRequestError) or (e instanceof ParsingError))

exports.parseOData = (b) ->
	Promise.try ->
		if b._isChangeSet
			csReferences = new Map()
			# We sort the CS set once, we must assure that requests which reference
			# other requests in the changeset are placed last. Once they are sorted
			# Map will guarantee retrival of results in insertion order
			sortedCS = _.sortBy b.changeSet, (el) -> !(el.url[0] == '/')
			Promise.reduce(sortedCS, parseODataChangeset, csReferences)
			.then (csReferences) -> Array.from(csReferences.values())
		else
			{ url, apiRoot } = splitApiRoot(b.url)
			odata = memoizedParseOdata(url)

			# if we parse a canAccess action rewrite the resource to ensure we
			# do not run the resource hooks
			if odata.tree.property?.resource == 'canAccess'
				odata.tree.resource = odata.tree.resource + '#' + odata.tree.property.resource

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


parseODataChangeset = (csReferences, b) ->
	contentId = mustExtractHeader(b, 'content-id')

	if csReferences.has(contentId)
		throw new BadRequestError('Content-Id must be unique inside a changeset')

	if b.url[0] == '/'
		{ url, apiRoot } = splitApiRoot(b.url)
		odata = memoizedParseOdata(url)
		defer = false
	else
		url = b.url
		odata = memoizedParseOdata(url)
		{ bind } = odata.tree.resource
		[ tag, id ] = odata.binds[bind]
		# Use reference to collect information
		ref = csReferences.get(id)
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

	csReferences.set(contentId, parseResult)
	return csReferences

splitApiRoot = (url) ->
	url = url.split('/')
	apiRoot = url[1]
	if !apiRoot?
		throw new ParsingError('No such api root: ' + apiRoot)
	url = '/' + url[2...].join('/')
	return { url: url, apiRoot: apiRoot }

mustExtractHeader = (body, header) ->
	h = body.headers[header]?[0]
	if _.isUndefined h
		throw new BadRequestError("#{header} must be specified")
	return h

exports.translateUri = (request) ->
	if request.abstractSqlQuery?
		return request
	isMetadataEndpoint = request.resourceName in metadataEndpoints or request.method is 'OPTIONS'
	if !isMetadataEndpoint
		abstractSqlQuery = memoizedOdata2AbstractSQL(request)
		request = _.clone(request)
		request.abstractSqlQuery = abstractSqlQuery
		return request
	return request
