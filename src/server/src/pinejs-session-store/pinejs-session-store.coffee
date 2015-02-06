define [
	'has'
	'lodash'
], (has, _) ->
	if not has 'ENV_NODEJS'
		return
	sessionAPI = null

	sessionModel = '''
		Vocabulary: session

		Term:       session id
			Concept Type: Short Text (Type)
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

	class PinejsSessionStore extends require('express').session.Store
		constructor: ->
		get: (sid, callback) ->
			sessionAPI.get(
				resource: 'session'
				id: sid 
				options:
					select: 'data'
			).then (session) ->
				return session?.data
			.nodeify(callback)

		set: (sid, data, callback) ->
			body =
				session_id: sid
				data: data
				expiry_time: data?.cookie?.expires ? null
			sessionAPI.put(
				resource: 'session'
				id: sid
				body: body
			).nodeify(callback)

		destroy: (sid, callback) ->
			sessionAPI.delete(
				resource: 'session'
				id: sid
			).nodeify(callback)

		all: (callback) ->
			sessionAPI.get(
				resource: 'session'
				options:
					select: 'session_id'
					filter: expiry_time: $ge: Date.now()
			).then (sessions) ->
				_.map(sessions, 'session_id')
			.nodeify(callback)

		clear: (callback) ->
			# TODO: Use a truncate
			sessionAPI.delete(
				resource: 'session'
			).nodeify(callback)

		length: (callback) ->
			# TODO: Use a proper count
			sessionAPI.get(
				resource: 'session'
				options:
					select: 'session_id'
					filter: expiry_time: $ge: Date.now()
			).then (sessions) ->
				sessions.length
			.nodeify(callback)
	PinejsSessionStore.config =
		models: [
			modelName: 'session',
			modelText: sessionModel
			apiRoot: 'session'
			logging:
				default: false
				error: true
			customServerCode: PinejsSessionStore
		]
	PinejsSessionStore.setup = (app, requirejs, sbvrUtils, db, callback) ->
		sessionAPI = sbvrUtils.api.session
		callback()
	return PinejsSessionStore
