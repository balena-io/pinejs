_ = require 'lodash'
Promise = require 'bluebird'
sbvrUtils = require '../sbvr-api/sbvr-utils'
{ sqlNameToODataName, odataNameToSqlName } = require '@resin/odata-to-abstract-sql'

rewriteMappings = (resourceMappings, cb) ->
	_.mapValues resourceMappings, (resourceMapping, key) ->
		return resourceMapping if key[0] is '$'
		_.mapValues resourceMapping, (mapping) ->
			if _.isFunction(mapping)
				return mapping
			return cb(mapping)

exports.applyVersions = (req) -> req

selectMappingsToResourceMappings = (selectMappings, tables) ->
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


exports.generateTranslations = (fromVersion, toVersion, { requestMappings, requestBodyMappings, resourceRenames }) ->
	# Apply all application mappings to my_application, as my_application is just a view over it
	requestMappings.my_application = requestMappings.application
	if requestBodyMappings?
		requestBodyMappings.my_application = requestBodyMappings.application

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

	return {
		requestMappingsFns
		requestBodyMappings
		resourceRenames
	}

exports.resolveNavigationResource = (abstractSqlModel, resourceName, navigationName) ->
	# If we don't have a model for the version then it should be an old one where the navigation name *is* the resource name
	return navigationName if not abstractSqlModel?

	navigation = _(odataNameToSqlName(navigationName))
		.split('-')
		.flatMap (resourceName) ->
			resolveSynonym(abstractSqlModel, resourceName).split('-')
		.concat('$')
		.value()
	resolvedResourceName = resolveSynonym(abstractSqlModel, resourceName)
	mapping = _.get(abstractSqlModel.relationships[resolvedResourceName], navigation)
	if !mapping?
		# If we don't have a mapping then the navigation name *is* the resource name
		return navigationName
	return sqlNameToODataName(mapping[1][0])

cloneCustom = (requestMappingFns, custom, abstractSqlModel, lambda, resourceName, propertyName, v, optionName) ->
	newResource = lambda[propertyName] ? resolveNavigationResource(abstractSqlModel, resourceName, propertyName)

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

rewriteMappings = (resourceMappings, cb) ->
	_.mapValues resourceMappings, (resourceMapping, key) ->
		return resourceMapping if key[0] is '$'
		_.mapValues resourceMapping, (mapping) ->
			if _.isFunction(mapping)
				return mapping
			return cb(mapping)
