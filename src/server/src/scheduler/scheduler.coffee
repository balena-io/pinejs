define(['cs!database-layer/db'], (dbModule) ->
	exports = {}

	error = console.error
	log = console.log
	console.error = ->
	console.log = ->

	schedulerModel = '''
		Term: description
			Concept Type: Text (Type)

		Term: air time
			Concept Type: Integer (Type)

		Term: oversupply
			Concept Type: Real (Type)

		Term: start date
			Concept Type: Date (Type)

		Term: end date
			Concept Type: Date (Type)

		Term: start time
			Concept Type: Time (Type)

		Term: end time
			Concept Type: Time (Type)

		Term: minimum frequency count
			Concept Type: Integer (Type)

		Term: maximum frequency count
			Concept Type: Integer (Type)

		Term: priority
			Concept Type: Real (Type)

		Term: duration
			Concept Type: Real (Type)

		Term: week day set
			Concept Type: Integer (Type)

		Term: width
			Concept Type: Integer (Type)

		Term: height
			Concept Type: Integer (Type)

		Term: url
			Concept Type: Text (Type)

		Term: stream
			Reference Scheme: description
		Term: campaign
			Reference Scheme: description
		Term: format
			Reference Scheme: description
		Term: creative
			Reference Scheme: description
		Term: slide
			Reference Scheme: description

		Fact Type: stream has description
			Necessity: each stream has exactly one description.

		Fact Type: stream has campaign
			Synonymous Form: campaign belongs to stream

		Fact Type: campaign is date limited
		Fact Type: campaign is guaranteed
		Fact Type: campaign has limited hours
		Fact Type: campaign has week day set
			Necessity: each campaign has at most one week day set.
			Rule: It is obligatory that each campaign that is date limited, has a week day set.
		Fact Type: campaign has start date
			Necessity: each campaign has at most one start date.
			Rule: It is obligatory that each campaign that has a start date, is date limited.
			Rule: It is obligatory that each campaign that is date limited, has a start date.
		Fact Type: campaign has end date
			Necessity: each campaign has at most one end date.
			Rule: It is obligatory that each campaign that has a end date, is date limited.
			Rule: It is obligatory that each campaign that is date limited, has an end date.
		Fact Type: campaign has air time
			Necessity: each campaign has at most one air time.
			Rule: It is obligatory that each campaign that has an air time, is guaranteed.
			Rule: It is obligatory that each campaign that is guaranteed, has an air time.
		Fact Type: campaign has oversupply
			Necessity: each campaign has at most one oversupply.
			Rule: It is obligatory that each campaign that has an oversupply, is guaranteed.
			Rule: It is obligatory that each campaign that is guaranteed, has an oversupply.
		Fact Type: campaign has start time
			Necessity: each campaign has at most one start time.
			Rule: It is obligatory that each campaign that has a start time, has limited hours.
			Rule: It is obligatory that each campaign that has limited hours, has a start time.
		Fact Type: campaign has end time
			Necessity: each campaign has at most one end time.
			Rule: It is obligatory that each campaign that has an end time, has limited hours.
			Rule: It is obligatory that each campaign that has limited hours, has an end time.
		Fact Type: campaign has minimum frequency count
			Necessity: each campaign has at most one minimum frequency count.
			Rule: It is obligatory that each campaign that has no minimum frequency count, is guaranteed.
		Fact Type: campaign has maximum frequency count
			Necessity: each campaign has at most one maximum frequency count.
			Necessity: each campaign has a maximum frequency count.
		Fact Type: campaign has priority
			Necessity: each campaign has at most one priority.
			Necessity: each campaign has a priority.
		Fact Type: campaign has description
			Necessity: each campaign has exactly one description.

		Fact Type: campaign has format
			Synonymous Form: format belongs to campaign

		Fact Type: format overrides hours
		Fact Type: format has limited hours
		Fact Type: format overrides frequency counts
		Fact Type: format overrides prioritisation
		Fact Type: format has start time
			Necessity: each format has at most one start time.
			Rule: It is obligatory that each format that has a start time, has limited hours.
			Rule: It is obligatory that each format that has limited hours, has a start time.
		Fact Type: format has end time
			Necessity: each format has at most one end time.
			Rule: It is obligatory that each format that has an end time, has limited hours.
			Rule: It is obligatory that each format that has limited hours, has an end time.
		Fact Type: format has minimum frequency count
			Necessity: each format has at most one minimum frequency count.
			Rule: It is obligatory that each format that has a minimum frequency count, overrides frequency counts.
			Rule: It is obligatory that each format that overrides frequency counts, has a minimum frequency count.
		Fact Type: format has maximum frequency count
			Necessity: each format has at most one maximum frequency count.
			Rule: It is obligatory that each format that has a maximum frequency count, overrides frequency counts.
			Rule: It is obligatory that each format that overrides frequency counts, has a maximum frequency count.
		Fact Type: format has priority
			Necessity: each format has at most one priority.
			Rule: It is obligatory that each format that has a priority, overrides prioritisation.
			Rule: It is obligatory that each format that overrides prioritisation, has a priority.
		Fact Type: format has description
			Necessity: each format has exactly one description.

		Fact Type: format has creative
			Synonymous Form: creative belongs to format

		Fact Type: creative has duration
			Necessity: each creative has exactly one duration.
		Fact Type: creative is pinned
		Fact Type: creative has description
			Necessity: each creative has exactly one description.

		Fact Type: creative has slide
			Synonymous Form: slide belongs to creative

		Fact Type: slide has description
			Necessity: each slide has exactly one description.
		Fact Type: slide has width
			Necessity: each slide has exactly one width.
		Fact Type: slide has height
			Necessity: each slide has exactly one height.
		Fact Type: slide has url
			Necessity: each slide has exactly one url.

	'''

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, isAuthed, databaseOptions) ->
		db = dbModule.connect(databaseOptions)

		db.transaction( (tx) ->
			sbvrUtils.executeModel(tx, 'scheduler', schedulerModel,
				->
					console.log = log
					console.error = error
					console.log('Sucessfully executed scheduler model.')
				(tx, error) ->
					console.log = log
					console.error = error
					console.error('Failed to execute scheduler model.', error)
			)
		)

		app.get('/scheduler/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runGet(req, res)
		)

		app.post('/scheduler/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPost(req, res)
		)

		app.put('/scheduler/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPut(req, res)
		)

		app.del('/scheduler/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runDelete(req, res)
		)

	return exports
)
