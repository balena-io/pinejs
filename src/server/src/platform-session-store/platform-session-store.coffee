define [
	'exports'
	'has'
	'lodash'
	'cs!sbvr-api/sbvr-utils'
], (exports, has, _, sbvrUtils) ->
	if not has 'ENV_NODEJS'
		return
	{PlatformAPI} = sbvrUtils

	sessionModel = '''
		Vocabulary: session

		Term:       session id
			Concept Type: Text (Type)
		Term:       data
			Concept Type: JSON (Type)
		Term:       expiry time
			Concept type: Date Time (Type)

		Term:       session
			Database ID Field: session id
			Reference Scheme: session id

		Fact type:  session has data
			Necessity: Each session has exactly 1 data
		Fact type:  session has session id
			Necessity: Each session has exactly 1 session id
			Necessity: Each session id is of exactly 1 session
		Fact type:  session has expiry time
			Necessity: Each session has at most 1 expiry time'''

	class PlatformSessionStore extends require('express').session.Store
		constructor: ->
		get: (sid, callback) ->
			PlatformAPI::get(url: "/session/session('" + sid + "')?$select=data")
			.then (session) ->
				if session.d.length is 0
					return null
				return session.d[0].data
			.nodeify(callback)

		set: (sid, data, callback) ->
			body =
				session_id: sid
				data: data
				expiry_time: data?.cookie?.expires ? null
			PlatformAPI::put(
				url: "/session/session('" + sid + "')"
				body: body
			).nodeify(callback)

		destroy: (sid, callback) ->
			PlatformAPI::delete(url: "/session/session('" + sid + "')")
			.nodeify(callback)

		all: (callback) ->
			PlatformAPI::get(url: '/session/session?$select=session_id&$filter=expiry_time gte ' + Date.now())
			.then (sessions) ->
				_.map(sessions.d, 'session_id')
			.nodeify(callback)

		clear: (callback) ->
			# TODO: Use a truncate
			PlatformAPI::delete(url: '/session/session')
			.nodeify(callback)

		length: (callback) ->
			# TODO: Use a proper count
			PlatformAPI::get(url: '/session/session$select=session_id&$filter=expiry_time gte ' + Date.now())
			.then (sessions) ->
				sessions.d.length
			.nodeify(callback)
	PlatformSessionStore.config =
		models: [
			modelName: 'session',
			modelText: sessionModel
			apiRoot: 'session'
		]
	return PlatformSessionStore
