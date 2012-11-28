define(['cs!database-layer/db'], (dbModule) ->
	exports = {}

	schedulerModel = '''
		Term: Integer
		Term: Date
		Term: Time
		Term: Short Text

		Term: stream
		Term: campaign
		Term: format
		Term: creative
		Term: slide

		Term: air time
			Concept Type: Integer

		Term: oversupply
			Concept Type: Integer

		Term: start date
			Concept Type: Date

		Term: end date
			Concept Type: Date

		Term: start time
			Concept Type: Time

		Term: end time
			Concept Type: Time

		Term: minimum frequency count
			Concept Type: Integer

		Term: maximum frequency count
			Concept Type: Integer

		Term: priority
			Concept Type: Integer

		Term: duration
			Concept Type: Integer

		Term: week day
			Concept Type: Short Text

		Fact Type: stream has campaign
			Synonymous Form: campaign belongs to stream

		Fact Type: campaign is date limited
		Fact Type: campaign is guaranteed
		Fact Type: campaign has limited hours
		Fact Type: campaign plays on week day
			Rule: It is obligatory that each campaign that is date limited, plays on at least one week day.
		Fact Type: campaign has start date
			Rule: It is obligatory that each campaign has at most one start date.
			Rule: It is obligatory that each campaign that has a start date, is date limited.
			Rule: It is obligatory that each campaign that is date limited, has exactly one start date.
		Fact Type: campaign has end date
			Rule: It is obligatory that each campaign has at most one end date.
			Rule: It is obligatory that each campaign that has a end date, is date limited.
			Rule: It is obligatory that each campaign that is date limited, has exactly one end date.
		Fact Type: campaign has air time
			Rule: It is obligatory that each campaign has at most one air time.
			Rule: It is obligatory that each campaign that has an air time, is guaranteed.
			Rule: It is obligatory that each campaign that is guaranteed, has exactly one air time.
		Fact Type: campaign has oversupply
			Rule: It is obligatory that each campaign has at most one oversupply.
			Rule: It is obligatory that each campaign that has an oversupply, is guaranteed.
			Rule: It is obligatory that each campaign that is guaranteed, has exactly one oversupply.
		Fact Type: campaign has start time
			Rule: It is obligatory that each campaign has at most one start time.
			Rule: It is obligatory that each campaign that has a start time, has limited hours.
			Rule: It is obligatory that each campaign that has limited hours, has exactly one start time.
		Fact Type: campaign has end time
			Rule: It is obligatory that each campaign has at most one end time.
			Rule: It is obligatory that each campaign that has an end time, has limited hours.
			Rule: It is obligatory that each campaign that has limited hours, has exactly one end time.
		Fact Type: campaign has minimum frequency count
			Rule: It is obligatory that each campaign has at most one minimum frequency count.
			Rule: It is obligatory that each campaign that has no minimum frequency count, is guaranteed.
		Fact Type: campaign has maximum frequency count
			Rule: It is obligatory that each campaign has exactly one maximum frequency count.
		Fact Type: campaign has priority
			Rule: It is obligatory that each campaign has exactly one priority.

		Fact Type: campaign has format
			Synonymous Form: format belongs to campaign

		Fact Type: format overrides hours
		Fact Type: format overrides frequency counts
		Fact Type: format overrides prioritisation
		Fact Type: format has start time
			Rule: It is obligatory that each format has at most one start time.
			Rule: It is obligatory that each format that has a start time, overrides hours.
			Rule: It is obligatory that each format that overrides hours, has exactly one start time.
		Fact Type: format has end time
			Rule: It is obligatory that each format has at most one end time.
			Rule: It is obligatory that each format that has an end time, overrides hours.
			Rule: It is obligatory that each format that overrides hours, has exactly one end time.
		Fact Type: format has minimum frequency count
			Rule: It is obligatory that each format has at most one minimum frequency count.
			Rule: It is obligatory that each format that has a minimum frequency count, overrides frequency counts.
			Rule: It is obligatory that each format that overrides frequency counts, has exactly one minimum frequency count.
		Fact Type: format has maximum frequency count
			Rule: It is obligatory that each format has at most one maximum frequency count.
			Rule: It is obligatory that each format that has a maximum frequency count, overrides frequency counts.
			Rule: It is obligatory that each format that overrides frequency counts, has exactly one maximum frequency count.
		Fact Type: format has priority
			Rule: It is obligatory that each format has at most one priority.
			Rule: It is obligatory that each format that has a priority, overrides prioritisation.
			Rule: It is obligatory that each format that overrides prioritisation, has exactly one priority.

		Fact Type: format has creative
			Synonymous Form: creative belongs to format
			Rule: It is obligatory that each format belongs to exactly one campaign.

		Fact Type: creative has duration
			Rule: It is obligatory that each creative has exactly one duration.
		Fact Type: creative is pinned

		Fact Type: creative has slide
			Synonymous Form: slide belongs to creative
			Rule: It is obligatory that each creative has exactly one slide.'''

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, isAuthed, databaseOptions) ->
		db = dbModule.connect(databaseOptions)

		db.transaction( (tx) ->
			sbvrUtils.executeModel(tx, 'scheduler', schedulerModel,
				->
					console.log('Sucessfully executed scheduler model.')
				(tx, error) ->
					console.error('Failed to execute scheduler model.', error)
			)
		)

		app.get('/scheduler/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runGet(req, res)
		)

		app.post('/scheduler/*', isAuthed, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPost(req, res)
		)

		app.put('/scheduler/*', isAuthed, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPut(req, res)
		)

		app.del('/scheduler/*', isAuthed, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runDelete(req, res)
		)
	return exports
)
