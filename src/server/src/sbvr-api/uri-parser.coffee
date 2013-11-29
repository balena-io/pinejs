define [
	'exports'
	'odata-parser'
	'odata-to-abstract-sql'
	'bluebird'
	'cs!sbvr-api/permissions'
], (exports, {ODataParser}, {OData2AbstractSQL}, Promise, permissions) ->
	odataParser = ODataParser.createInstance()
	odata2AbstractSQL = {}

	parseODataURI = (req, res) -> Promise.try ->
		{method, url, body} = req
		url = url.split('/')
		vocabulary = url[1]
		if !vocabulary? or !odata2AbstractSQL[vocabulary]?
			throw new Error('No such vocabulary: ' + vocabulary)
		url = '/' + url[2...].join('/')
		try
			query = odataParser.matchAll(url, 'Process')
		catch e
			console.log('Failed to parse url: ', method, url, e, e.stack)
			throw new Error('Failed to parse url')

		resourceName = query.resource
		apiKey = query.options?.apikey

		permissionType =
			if resourceName in ['$metadata', '$serviceroot']
				query = null
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
		permissions.checkPermissions(req, res, permissionType, resourceName, vocabulary, apiKey)
		.then((conditionalPerms) ->
			if conditionalPerms is false
				return false
			else if conditionalPerms isnt true
				if !query?
					throw new Error('Conditional permissions with no query?!')
				try
					conditionalPerms = odataParser.matchAll('/x?$filter=' + conditionalPerms, 'Process')
				catch e
					console.log('Failed to parse conditional permissions: ', conditionalPerms)
					throw new Error('Failed to parse permissions')
				query.options ?= {}
				if query.options.$filter?
					query.options.$filter = ['and', query.options.$filter, conditionalPerms.options.$filter]
				else
					query.options.$filter = conditionalPerms.options.$filter
			if query?
				try
					query = odata2AbstractSQL[vocabulary].match(query, 'Process', [method, body])
				catch e
					console.error('Failed to translate url: ', JSON.stringify(query, null, '\t'), method, url, e, e.stack)
					throw new Error('Failed to translate url')
			return {
				type: 'OData'
				vocabulary
				requests: [{
					query
					values: body
					resourceName
				}]
			}
		)

	exports.parseURITree = (callback) ->
		(req, res, next) ->
			args = arguments
			checkTree = ->
				if req.tree == false
					next('route')
				else if callback?
					callback(args...)
				else
					next()
			if req.tree?
				checkTree()
			else
				parseODataURI(req, res)
				.then((tree) ->
					req.tree = tree
				).catch((err) ->
					console.error('Error parsing OData URI', err, err.stack)
					req.tree = false
				).done(checkTree)

	exports.addClientModel = (vocab, clientModel) ->
		odata2AbstractSQL[vocab] = OData2AbstractSQL.createInstance()
		odata2AbstractSQL[vocab].clientModel = clientModel

	exports.deleteClientModel = (vocab, clientModel) ->
		delete odata2AbstractSQL[vocab]

	return exports
