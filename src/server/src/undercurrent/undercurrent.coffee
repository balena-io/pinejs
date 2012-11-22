define(['cs!database-layer/db'], (dbModule) ->
	exports = {}

	undercurrentModel = '''
		Term:      Integer
		Term:      Date
		Term:      Short Text
		Term:      Long Text

		Term:      value
			Concept Type: Short Text

		Term:      dataset
			Database Value Field: name

		Term:      note
			Concept Type: Long Text
		Fact type: dataset has note
		Rule:      It is obligatory that each dataset has at most one note

		Term:      product
		Fact type: dataset is about product
		Rule:      It is obligatory that each dataset is about exactly 1 product

		Term:      species
			Concept Type: Short Text
		Fact type: product is about species
		Rule:      It is obligatory that each product is about exactly 1 species

		Term:      origin
			Concept Type: Short Text
		Fact type: product has origin
		Rule:      It is obligatory that each product has at most 1 origin

		Term:      type
		-- Farmed or Wild
		Fact type: type has value
		Rule:      It is obligatory that each type has exactly 1 value 
		Fact type: product has type
		Rule:      It is obligatory that each product has exactly 1 type

		Term:      size
			Concept Type: Short Text
		Fact type: product has size
		Rule:      It is obligatory that each product has at most 1 size

		Term:      point of trade
			Concept Type: Short Text
		Fact type: product has point of trade
		Rule:      It is obligatory that each product has exactly 1 point of trade

		Term:      name
			Concept Type: Long Text
		Fact type: dataset has name
		Rule:      It is obligatory that each dataset has exactly 1 name

		Term:      title
			Concept Type: Long Text
		Fact type: dataset has title
		Rule:      It is obligatory that each dataset has exactly 1 title

		Term:      short title
			Concept Type: Long Text
		Fact type: dataset has short title
		Rule:      It is obligatory that each dataset has exactly 1 short title

		Term:      caption
			Concept Type: Long Text
		Fact type: dataset has caption
		Rule:      It is obligatory that each dataset has exactly 1 caption

		Term:      explanation
			Concept Type: Long Text
		Fact type: dataset has explanation
		Rule:      It is obligatory that each dataset has at most 1 explanation

		Term:      currency
		Fact type: currency has value
		Rule:      It is obligatory that each currency has exactly 1 value
		Fact type: dataset is in currency
		Rule:      It is obligatory that each dataset is in exactly 1 currency

		Term:      frequency
		-- Weekly, Monthly or Seasonal
		Fact type: frequency has value
		Rule:      It is obligatory that each frequency has exactly 1 value 
		Fact type: dataset has frequency
		Rule:      It is obligatory that each dataset has exactly 1 frequency 

		Term:      colour
			Concept Type: Short Text
		Fact type: dataset has colour
		Rule:      It is obligatory that each dataset has exactly 1 colour

		Term:      source
		Fact Type: source is anonymous

		Term:      source type
		Fact type: source type has value
		Rule:      It is obligatory that each source type has exactly one value

		Fact type: source has source type
		Rule:      It is obligatory that each source has exactly one source type

		Fact type: dataset has source
		Rule:      It is obligatory that each dataset has at least 1 source

		Fact type: dataset is showcase

		Term:      quote
			Database Value Field: price
		Fact type: quote belongs to dataset
		Rule:      It is obligatory that each quote belongs to exactly one dataset

		-- Concept Type: Currency
		Term:      price
			Concept Type: Integer
		Fact type: quote has price
		Rule:      It is obligatory that each quote has at most 1 price

		Term:      date
			Concept Type: Date
		Fact type: quote has date
		Rule:      It is obligatory that each quote has exactly 1 date'''

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, isAuthed, databaseOptions) ->
		db = dbModule.connect(databaseOptions)
		
		db.transaction( (tx) ->
			sbvrUtils.executeModel(tx, 'data', undercurrentModel,
				() ->
					console.log('Sucessfully executed undercurrent model.')
				(tx, error) ->
					console.error('Failed to execute undercurrent model.', error)
			)
		)
		
		app.get('/data/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runGet(req, res)
		)

		app.post('/data/*', isAuthed, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPost(req, res)
		)

		app.put('/data/*', isAuthed, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPut(req, res)
		)

		app.del('/data/*', isAuthed, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runDelete(req, res)
		)
	return exports
)
