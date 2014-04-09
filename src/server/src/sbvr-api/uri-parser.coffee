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
		.then (conditionalPerms) ->
			if conditionalPerms is false
				return false
			else if conditionalPerms isnt true
				if !query?
					throw new Error('Conditional permissions with no query?!')
				permissionFilters = permissions.nestedCheck conditionalPerms, (permissionCheck) ->
					try
						permissionCheck = odataParser.matchAll('/x?$filter=' + permissionCheck, 'Process')
						# We use an object with filter key to avoid collapsing our filters later.
						return filter: permissionCheck.options.$filter
					catch e
						console.warn('Failed to parse conditional permissions: ', permissionCheck)
						return false
				if permissionFilters is false
					return false
				else if permissionFilters isnt true
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
					query.options ?= {}
					if query.options.$filter?
						query.options.$filter = ['and', query.options.$filter, permissionFilters]
					else
						query.options.$filter = permissionFilters

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

	exports.parseURITree = (callback) ->
		(req, res, next) ->
			checkTree = (tree) ->
				req.tree = tree
				if tree is false
					res.send(401)
				else if callback?
					callback(req, res, next)
				else
					next()
			if req.tree?
				checkTree(req.tree)
			else
				parseODataURI(req, res)
				.done checkTree, (err) ->
					console.error('Error parsing OData URI', err, err.stack)
					next('route')

	exports.addClientModel = (vocab, clientModel) ->
		odata2AbstractSQL[vocab] = OData2AbstractSQL.createInstance()
		odata2AbstractSQL[vocab].clientModel = clientModel

	exports.deleteClientModel = (vocab, clientModel) ->
		delete odata2AbstractSQL[vocab]

	return exports
