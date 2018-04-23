_ = require 'lodash'
Promise = require 'bluebird'
{ sqlNameToODataName, odataNameToSqlName } = require '@resin/odata-to-abstract-sql'
TypedError = require('typed-error')
stringify = require 'json-stringify-pretty-compact'
util = require 'util'
permissions = require '../sbvr-api/permissions'

translateError = (err) ->
	if err instanceof Error
		err = err.message
	# these errors are shown to the user, so let's provide at least some text instead of 500
	if err == 500
		err = 'Server Error'
	return '' + err

exports.setup = (app, sbvrUtils, apiKeyMiddleware) ->
	forwardRequests = (app, fromVersion, toVersion, interceptFn) ->
		fromRegex = new RegExp("^/#{_.escapeRegExp(fromVersion)}", 'i')
		fromRoute = "/#{fromVersion}/*"
		toRoute = "/#{toVersion}"
		app.options(fromRoute, (req, res) -> res.sendStatus(200))
		app.all fromRoute, apiKeyMiddleware, (req, res, next) ->
			# console.log('got body', req.body)
			# Allow logging the real url we received
			req.untranslatedUrl ?= req.url
			Promise.try ->
				interceptFn?(req, res)
			.then ->
				req.originalUrl = req.originalUrl.replace(fromRegex, toRoute)
				req.url = req.url.replace(fromRegex, toRoute)
				# console.log('sending to url', req.url)
				if toVersion == 'resin'
					sbvrUtils.handleODataRequest(req, res, next)
				else
					next('route')
					# # Return null to stop the `next('route')` triggering unreturned promise warnings
					return null
			.catch ReturnableError, (err) ->
				res.status(400).json(translateError(err))
			.catch (err) ->
				console.error('error in forward request', err)
				res.sendStatus(400)

	exports.ReturnableError = class ReturnableError extends TypedError

	forwardRequests = _.partial(forwardRequests, app)

	exports.resolveNavigationResource = resolveNavigationResource = (abstractSqlModel, resourceName, navigationName) ->
		# If we don't have a model for the version then it should be an old one where the navigation name *is* the resource name
		return navigationName if not abstractSqlModel?
		try
			navigation = sbvrUtils.resolveNavigationResource({resourceName: resourceName, abstractSqlModel: abstractSqlModel}, navigationName)
		catch e
			console.error(e)
			# If we don't have a mapping then the navigation name *is* the resource name
			navigation = navigationName
		return navigation

	cloneCustom = (requestMappingFns, custom, abstractSqlModel, lambda, resourceName, propertyName, v, optionName) ->
		newResource = lambda[propertyName] ? resolveNavigationResource(abstractSqlModel, resourceName, propertyName)
		if requestMappingFns.resourceRename?
			maybeNewResource = requestMappingFns.resourceRename?(newResource, custom.$req)
			if maybeNewResource?
				newResource = maybeNewResource

		newCustom = _.mapValues custom, (v, k) ->
			if k[0] is '$'
				return v
			return _.cloneDeep(v)
		if optionName?
			newCustom.$optionName = optionName

		requestMappingFns.start?(newResource, v, newCustom)

		return { newCustom, newResource }

	exports.rewriteODataOptions = rewriteODataOptions = (requestMappingFns, resource, data, custom, abstractSqlModel, lambda = {}) ->
		deletes = []
		_.each data, (v, k) ->
			if _.isArray(v)
				rewriteODataOptions(requestMappingFns, resource, v, custom, abstractSqlModel, lambda)
			else if _.isObject(v)
				propertyName = v.name
				if propertyName?
					if !lambda[propertyName]? and requestMappingFns.resource(resource, v, k, data, custom) is true
						deletes.push(k)
						# We can skip recursing if we're gonna delete it anyway
						return

					if v.lambda?
						newLambda = _.clone(lambda)
						newLambda[v.lambda.identifier] = resolveNavigationResource(abstractSqlModel, resource, propertyName)
						# TODO: This should actually use the top level resource context,
						# however odata-to-abstract-sql is bugged so we use the lambda context to match that bug for now
						{ newCustom, newResource } = cloneCustom(requestMappingFns, custom, abstractSqlModel, lambda, resource, propertyName, v)
						rewriteODataOptions(requestMappingFns, newResource, v, newCustom, abstractSqlModel, newLambda)
					else if v.options?
						_.each v.options, (option, optionName) ->
							{ newCustom, newResource } = cloneCustom(requestMappingFns, custom, abstractSqlModel, lambda, resource, propertyName, v, optionName)
							rewriteODataOptions(requestMappingFns, newResource, option, newCustom, abstractSqlModel, lambda)
					else if v.property?
						{ newCustom, newResource } = cloneCustom(requestMappingFns, custom, abstractSqlModel, lambda, resource, propertyName, v)
						rewriteODataOptions(requestMappingFns, newResource, v, newCustom, abstractSqlModel, lambda)
					else
						rewriteODataOptions(requestMappingFns, resource, v, custom, abstractSqlModel, lambda)

				else
					rewriteODataOptions(requestMappingFns, resource, v, custom, abstractSqlModel, lambda)
		for i in deletes by -1
			data.splice(i, 1)
		if data.length is 0
			requestMappingFns.empty()


	interceptResponse = (req, res, fn) ->
		originalJson = res.json
		res.json = ->
			# console.log('Got arguments', arguments)
			if arguments.length is 1
				[ body ] = arguments
			else if _.isNumber(arguments[1])
				[ body, statusCode ] = arguments
			else
				[ statusCode, body ] = arguments
			# console.log('intercept', body)
			# prevent body  from being undefined when post is rewritten to get but perm fail
			# if _.isUndefined(body)
			# 	body = {}
			return Promise.try ->
				fn(req, body)
			.then (body) ->
				if statusCode?
					originalJson.call(res, statusCode, body)
				else
					originalJson.call(res, body)
			.catch (err) ->
				console.error('error in pine intercept', err)
				res.send(500)

		return


	rewriteMappings = (resourceMappings, cb) ->
		_.mapValues resourceMappings, (resourceMapping, key) ->
			return resourceMapping if key[0] is '$'
			_.mapValues resourceMapping, (mapping) ->
				if _.isFunction(mapping)
					return mapping
				return cb(mapping)

	resourceRegex = /^[a-zA-Z_]*/

	# interface Mapping<T> {
	# 	[ resourceName: string ]: {
	# 		[ fieldName: string ]: T
	# 	}
	# }
	# interface RequestCallback {
	# 	(field: { name: string, lambda?: {}, options?: {}, property: {} }, fieldName: string, custom: { $optionName: string, [ key: string ]: any}): void
	# }
	# interface RequestBodyCallback {
	# 	(value: any, key: string, custom: {[ key: string ]: any}): void
	# }
	# interface ResponseBodyCallback {
	# 	(value: any, key: string, data: {}, custom: {[ key: string ]: any}): string
	# }
	# requestMappings: Mapping<RequestCallback | string>
	# requestBodyMappings: Mapping<RequestBodyCallback | string>
	# responseBodyMappings: Mapping<ResponseBodyCallback | string>
	exports.addMappingVersion = (fromVersion, toVersion, { requestMappings, requestBodyMappings, responseBodyMappings, resourceRenames, abstractSqlModel }) ->
		# Apply all application mappings to my_application, as my_application is just a view over it
		requestMappings.my_application = requestMappings.application
		if requestBodyMappings?
			requestBodyMappings.my_application = requestBodyMappings.application
		if responseBodyMappings?
			responseBodyMappings.my_application = responseBodyMappings.application

		requestMappings = rewriteMappings requestMappings, (mapping) ->
			return (v) ->
				v.name = mapping

		requestMappingsFns =
			start: (resource, data, custom) ->
				requestMappings[resource]?.$?(data, custom)
			resource: (resource, v, k, data, custom) ->
				requestMappings[resource]?[v.name]?(v, k, data, custom)

		requestBodyMappings = rewriteMappings requestBodyMappings, (mapping) ->
			return (data, from) ->
				data[mapping] = data[from]
				delete data[from]

		responseBodyMappings = rewriteMappings responseBodyMappings, (mapping) ->
			return (value, key, data) ->
				data[mapping] = value
				delete data[key]
				return mapping

		rewriteResponseBody = (resource, data, custom) ->
			mapping = responseBodyMappings[resource]
			return if !mapping?

			_.each data, (value, key) ->
				mappingFn = mapping[key]
				if mappingFn?
					key = mappingFn(value, key, data, custom)

				if _.isArray(value)
					newResource = resolveNavigationResource(abstractSqlModel, resource, key)
					rewriteResponseBody(newResource, value, custom)
				else if _.isObject(value)
					rewriteResponseBody(resource, value, custom)

		hook =
			POSTPARSE: ({ req, request }) ->
				if requestMappings.$?
					custom = requestMappings.$({ req, request })
					return if custom is false
				{ odataQuery } = request
				custom ?= {}
				custom.$req = req
				custom.$request = request
				requestMappingsFns.start?(odataQuery.resource, odataQuery, custom)
				# console.log('query: ', stringify(odataQuery.options))
				# console.log('custom request: ', stringify(custom.$request.custom))
				# console.log('custom req: ', stringify(custom.$req.custom))
				_.each odataQuery.options, (value, optionName) ->
					return if not _.startsWith(optionName, '$')
					# console.log('Rewriting odata options', value, optionName)
					rewriteODataOptions(requestMappingsFns, odataQuery.resource, [value], _.assign({
						$optionName: optionName
					}, custom), abstractSqlModel)
				# console.log('After rewrite', stringify(odataQuery.options))
				# console.log('custom request: ', stringify(custom.$request.custom))
				# console.log('custom req: ', stringify(custom.$req.custom))
				requestMappings.$x?(custom)
			requestBody: (req, body, res) ->
				# console.log('calling requestBody')
				custom = requestBodyMappings.$?({ req, res })
				# console.log('got custom'. custom)
				Promise.resolve(custom)
				.then (custom) ->
					return body if custom is false
					custom ?= {}
					custom.$req = req
					resource = resourceRegex.exec(req.params[0])[0]
					_.each requestBodyMappings[resource], (mappingFn, from) ->
						if body.hasOwnProperty(from)
							mappingFn(body, from, custom)
					return body
			responseBody: (req, body) ->
				resourceName = resourceRegex.exec(req.params[0])[0]
				custom = responseBodyMappings.$?({ req, resourceName, body })
				Promise.resolve(custom)
				.then (custom) ->
					return body if custom is false
					custom ?= {}
					rewriteResponseBody(resourceName, body?.d ? body, custom)
				.return(body)

		if resourceRenames?
			# TODO: This is done in addVersion as well, both version systems need to be merged into one and deduplicated
			resourceRenameFns = _.mapValues resourceRenames, (mapping) ->
				if _.isFunction(mapping)
					return mapping
				return -> mapping
			hook.resourceRenames = resourceRenameFns
			requestMappingsFns.resourceRename = (resourceName, $req) ->
				resourceRenameFns[resourceName]?($req)

		exports.addVersion(fromVersion, toVersion, hook)


	exports.addVersion = do ->
		versionsOrder = []
		postParseHooks = {}
		preParseHooks = {}
		postRunHooks = {}

		generateVersionHooks = (args, hooks) ->
			{ custom } = args.req
			return if not custom?.applyVersions?
			Promise.all(
				for version in versionsOrder
					if custom.applyVersions[version]
						hooks[version]?(args)
			)

		hook =
			PREPARSE: (obj) ->
				generateVersionHooks(obj, preParseHooks)
			POSTPARSE: (obj) ->
				generateVersionHooks(obj, postParseHooks)
			POSTRUN: (obj) ->
				generateVersionHooks(obj, postRunHooks)
		hooks =
			GET: hook
			POST: hook
			PUT: hook
			PATCH: hook
			DELETE: hook

		for method in [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE' ]
			mergedHooks = _(hook)
				.mapValues((v) -> [v])
				.mapValues (hooks) ->
					return (args) ->
						Promise.all(
							for hook in hooks
								hook(args)
						)
				.value()

			sbvrUtils.addHook(method, 'resin', 'all', mergedHooks)


		return (fromVersion, toVersion, rewrites = {}) ->
			if _.includes(versionsOrder, fromVersion)
				throw new Error("Version '#{fromVersion}' has already been added")
			versionsOrder.push(fromVersion)

			if rewrites.PREPARSE? or rewrites.POSTPARSE? or rewrites.POSTRUN?
				postParseHooks[fromVersion] = rewrites.POSTPARSE
				preParseHooks[fromVersion] = rewrites.PREPARSE
				postRunHooks[fromVersion] = rewrites.POSTRUN
				applyVersion = (req) ->
					req.custom ?= {}
					req.custom.applyVersions ?= {}
					req.custom.applyVersions[fromVersion] = true

			if rewrites.requestBody?
				rewriteRequestBody = (req, res) ->
					Promise.try ->
						rewrites.requestBody(req, req.body, res)
					.then (body) ->
						req.body = body

			if rewrites.resourceRenames
				resourceRenameFns = _.mapValues rewrites.resourceRenames, (mapping) ->
					if _.isFunction(mapping)
						return mapping
					return -> mapping
				doRename = (req, from, to) ->
					req.params[0] = req.params[0].replace(from, to)
					req.url = req.url.replace("/#{from}", "/#{to}")
				resourceRenames = (req) ->
					resourceName = resourceRegex.exec(req.params[0])[0]
					rename = resourceRenameFns[resourceName]?(req)
					if rename?
						doRename(req, resourceName, rename)
						return _.partialRight interceptResponse, (req, body) ->
							doRename(req, rename, resourceName)
							return body

			if rewrites.responseBody?
				rewriteResponseBody = _.partialRight(interceptResponse, rewrites.responseBody)

			interceptFn = (args...) ->
				undoRename = resourceRenames?(args...)
				Promise.try ->
					rewriteRequestBody?(args...)
				.then ->
					undoRename?(args...)
					applyVersion?(args...)
					rewriteResponseBody?(args...)

			forwardRequests(fromVersion, toVersion, interceptFn)

	exports.customRequestBuild = customRequestBuild = (req, url) ->
		uriParser = require('@resin/pinejs/out/sbvr-api/uri-parser')
		permissions = require('@resin/pinejs/out/sbvr-api/permissions')

		uriParser.parseOData({ method: 'GET', url, data: {} })
		.tap (request) ->
			permissions.addPermissions(req, request)
		.then(uriParser.translateUri)
		.then (request) ->
			# We clone the `abstractSqlQuery` as it's frozen by default in order to stop cache pollution,
			# but we're doing this custom request in order to get an `abstractSqlQuery` for modification
			{ extraBinds: request.odataBinds, abstractSqlQuery: _.cloneDeep(request.abstractSqlQuery) }

	exports.stripSqlAlias = stripSqlAlias = (field) ->
		if _.isArray(field[0])
			return field[0]
		return field

	wrapError = (err) ->
		if _.isError(err)
			return err
		return new Error(err)

	exports.selectMappingsToResourceMappings = (selectMappings, tables) ->
		# TODO: handle synonyms
		return _.mapValues selectMappings, (mapping, odataName) ->
			tableName = odataNameToSqlName(odataName)
			resourceName = _.findKey(tables, name: tableName)
			if !resourceName?
				throw new Error("Can't find table for '#{odataName}'")

			path = [ 'custom', 'addedDefinitions', resourceName ]

			if _.isFunction(mapping)
				mappingFn = mapping
			else
				mappingFn = (addDefinition, { $req }) ->
					addDefinition(
						customRequestBuild($req, "/resin/#{odataName}")
						.tap (definition) ->
							select = _.find(definition.abstractSqlQuery, 0: 'Select')
							console.log('In mappingFn, select[1]:', select[1])
							# Remove/update aliases
							select[1] = _.map select[1], (field) ->
								field = stripSqlAlias(field)
								alias = mapping[field[2]]
								if alias?
									field = [ field, alias ]
								return field
					)

			return $: (v, args) ->
				{ $request } = args
				return if $request.method isnt 'GET'

				return if _.get($request, path)?

				addDefinition = (definition) ->
					_.set($request, path, definition.catch(wrapError))

				mappingFn(addDefinition, args)

	getResinApi = (req, custom) ->
		resinApi = sbvrUtils.api.resin
		return resinApi.clone(
			passthrough: { req, custom }
		)

	exports.getSqlResponseBodyMappings = (selectMappings, applyVersions) ->
		$: ({ req, resourceName, body }) ->
			return if req.method isnt 'POST'
			if selectMappings[resourceName]? and body?.id?
				getResinApi(req, { applyVersions }).get({
					resource: resourceName
					id: body.id
				}).then (newBody) ->
					# This replaces all the contents of body with newBody via mutation,
					# since we need to modify the body passed in
					_.each body, (v, k) ->
						delete body[k]
					_.assign(body, newBody)
					return

	extendPermissions = (obj, permissions) ->
		# Add permissions to get the translated resources as otherwise the permissions system will reject the request
		if obj?
			Array::push.apply(obj.permissions, permissions)

	exports.getAbstractSqlQueryGenerator = (memoizedOdata2AbstractSQL, abstractSqlModel, extraPermissions) ->
		({ $req, $request }) ->
			return if $req.method isnt 'GET' or $request.abstractSqlQuery?
			if extraPermissions?
				extendPermissions($req.user, extraPermissions)
				extendPermissions($req.apiKey, extraPermissions)

			# This hack is so that abstractSqlQuery is non-null, which means we bypass permissions correctly - realistically we need the translations to be built in and ordered correctly
			$request.abstractSqlQuery = {}

			addedDefinitions = $request.custom.addedDefinitions ? {}
			# And then we manually add permissions to guarantee ordering, using the v3 model so that relations can be traversed properly
			$request.abstractSqlModel = abstractSqlModel
			permissions.addPermissions($req, $request)
			.then ->
				_.mapValues addedDefinitions, (addedDefinition) ->
					addedDefinition.tap (maybeErr) ->
						if _.isError(maybeErr)
							throw maybeErr
			.props()
			.then (addedDefinitions) ->
				addedDefinitions = _.mapValues addedDefinitions, (definition) -> { definition }
				$request.abstractSqlQuery = memoizedOdata2AbstractSQL($request.odataQuery, addedDefinitions, $request.method, $request.values, $request.odataBinds)
