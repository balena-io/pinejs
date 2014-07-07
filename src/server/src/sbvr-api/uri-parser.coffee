define [
	'exports'
	'odata-parser'
	'odata-to-abstract-sql'
	'bluebird'
	'cs!sbvr-api/permissions'
	'cs!custom-error/custom-error'
], (exports, {ODataParser}, {OData2AbstractSQL}, Promise, permissions, CustomError) ->

	exports.PermissionError = class PermissionError extends CustomError
	exports.TranslationError = class TranslationError extends CustomError
	exports.ParsingError = class ParsingError extends CustomError

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

	exports.addPermissions = (req, {method, vocabulary, resourceName, odataQuery, values, custom}) ->
		apiKey = odataQuery.options?.apikey

		isMetadataEndpoint = resourceName in metadataEndpoints

		permissionType =
			if isMetadataEndpoint
				'model'
			else
				switch method
					when 'GET'
						'get'
					when 'PUT', 'POST', 'PATCH', 'MERGE'
						'set'
					when 'DELETE'
						'delete'
					else
						console.warn('Unknown method for permissions type check: ', method)
						'all'
		permissions.checkPermissions(req, permissionType, resourceName, vocabulary, apiKey)
		.then (conditionalPerms) ->
			if conditionalPerms is false
				throw new PermissionError()
			if conditionalPerms isnt true
				if isMetadataEndpoint
					throw new PermissionError('Conditional permissions on a metadata endpoint?!')
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
						if _.isObject(v)
							if v.hasOwnProperty('filter')
								v.filter
							else
								_(v)
								.pairs()
								.flatten()
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

			return {
				method
				vocabulary
				resourceName
				odataQuery
				values
				custom
			}

	exports.translateUri = ({method, vocabulary, resourceName, odataQuery, values, custom}) ->
		isMetadataEndpoint = resourceName in metadataEndpoints
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

	return exports
