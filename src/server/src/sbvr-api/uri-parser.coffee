Promise = require 'bluebird'
TypedError = require 'typed-error'
{ODataParser} = require '@resin/odata-parser'
{OData2AbstractSQL} = require '@resin/odata-to-abstract-sql'
permissions = require './permissions.coffee'
_ = require 'lodash'

exports.PermissionError = class PermissionError extends TypedError
exports.TranslationError = class TranslationError extends TypedError
exports.ParsingError = class ParsingError extends TypedError

odataParser = ODataParser.createInstance()
odata2AbstractSQL = {}

metadataEndpoints = ['$metadata', '$serviceroot']

exports.parseODataURI = (req) -> Promise.try ->
	{method, url, body} = req
	url = url.split('/')
	apiRoot = url[1]
	if !apiRoot? or !odata2AbstractSQL[apiRoot]?
		throw new ParsingError('No such api root: ' + apiRoot)
	url = '/' + url[2...].join('/')
	try
		odataQuery = odataParser.matchAll(url, 'Process')
	catch e
		console.log('Failed to parse url: ', method, url, e, e.stack)
		throw new ParsingError('Failed to parse url')

	return [{
		method
		vocabulary: apiRoot
		resourceName: odataQuery.resource
		odataQuery
		values: body
		custom: {}
	}]

addPermissions = (req, permissionType, vocabulary, resourceName, odataQuery) ->
	permissions.checkPermissions(req, permissionType, resourceName, vocabulary)
	.then (conditionalPerms) ->
		if conditionalPerms is false
			throw new PermissionError()
		if conditionalPerms isnt true
			permissionFilters = permissions.nestedCheck conditionalPerms, (permissionCheck) ->
				try
					permissionCheck = odataParser.matchAll('/x?$filter=' + permissionCheck, 'Process')
					# We use an object with filter key to avoid collapsing our filters later.
					return filter: permissionCheck.options.$filter
				catch e
					console.warn('Failed to parse conditional permissions: ', permissionCheck)
					throw new ParsingError(e)

			if permissionFilters is false
				throw new PermissionError()
			if permissionFilters isnt true
				collapse = (v) ->
					if _.isArray(v)
						collapse(or: v)
					else if _.isObject(v)
						if v.hasOwnProperty('filter')
							v.filter
						else
							_(v)
							.toPairs()
							.flattenDeep()
							.map(collapse)
							.value()
					else
						v

				permissionFilters = collapse(permissionFilters)
				odataQuery.options ?= {}
				if odataQuery.options.$filter?
					odataQuery.options.$filter = ['and', odataQuery.options.$filter, permissionFilters]
				else
					odataQuery.options.$filter = permissionFilters

		if odataQuery.options?.$expand?.properties?
			# Make sure any relevant permission filters are also applied to expands.
			Promise.map odataQuery.options.$expand.properties, (expand) ->
				# Always use get for the $expands
				addPermissions(req, 'get', vocabulary, expand.name, expand)

exports.addPermissions = (req, {method, vocabulary, resourceName, odataQuery, values, custom}) ->
	method = method.toUpperCase()
	isMetadataEndpoint = resourceName in metadataEndpoints or method is 'OPTIONS'

	permissionType =
		if isMetadataEndpoint
			'model'
		else
			switch method
				when 'GET'
					or: ['get', 'read']
				when 'PUT'
					or: [
						'set'
						and: ['create', 'update']
					]
				when 'POST'
					or: ['set', 'create']
				when 'PATCH', 'MERGE'
					or: ['set', 'update']
				when 'DELETE'
					'delete'
				else
					console.warn('Unknown method for permissions type check: ', method)
					'all'

	addPermissions(req, permissionType, vocabulary, odataQuery.resource, odataQuery)
	.return {
		method
		vocabulary
		resourceName
		odataQuery
		values
		custom
	}

exports.translateUri = ({method, vocabulary, resourceName, odataQuery, values, custom}) ->
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
	odata2AbstractSQL[vocab].clientModel = clientModel

exports.deleteClientModel = (vocab, clientModel) ->
	delete odata2AbstractSQL[vocab]
