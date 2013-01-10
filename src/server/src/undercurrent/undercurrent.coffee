define(['cs!database-layer/db'], (dbModule) ->
	exports = {}

	undercurrentModel = '''
		Term:      value
			Concept Type: Short Text (Type)

		Term:      dataset
			Database Value Field: name

		Term:      note
			Concept Type: Text (Type)
		Fact type: dataset has note
			Necessity: Each dataset has at most one note

		Term:      product
		Fact type: dataset is about product
			Necessity: Each dataset is about exactly 1 product

		Term:      species
			Concept Type: Short Text (Type)
		Fact type: product is about species
			Necessity: Each product is about exactly 1 species

		Term:      origin
			Concept Type: Short Text (Type)
		Fact type: product has origin
			Necessity: Each product has at most 1 origin

		Term:      type
		-- Farmed or Wild
		Fact type: type has value
			Necessity: Each type has exactly 1 value 
		Fact type: product has type
			Necessity: Each product has exactly 1 type

		Term:      size
			Concept Type: Short Text (Type)
		Fact type: product has size
			Necessity: Each product has at most 1 size

		Term:      point_of_trade
			Concept Type: Short Text (Type)
		Fact type: product has point_of_trade
			Necessity: Each product has exactly 1 point_of_trade

		Term:      name
			Concept Type: Text (Type)
		Fact type: dataset has name
			Necessity: Each dataset has exactly 1 name

		Term:      title
			Concept Type: Text (Type)
		Fact type: dataset has title
			Necessity: Each dataset has exactly 1 title

		Term:      short title
			Concept Type: Text (Type)
		Fact type: dataset has short title
			Necessity: Each dataset has exactly 1 short title

		Term:      caption
			Concept Type: Text (Type)
		Fact type: dataset has caption
			Necessity: Each dataset has exactly 1 caption

		Term:      explanation
			Concept Type: Text (Type)
		Fact type: dataset has explanation
			Necessity: Each dataset has at most 1 explanation

		Term:      currency
		Fact type: currency has value
			Necessity: Each currency has exactly 1 value
		Fact type: dataset is in currency
			Necessity: Each dataset is in exactly 1 currency

		Term:      frequency
		-- Weekly, Monthly or Seasonal
		Fact type: frequency has value
			Necessity: Each frequency has exactly 1 value 
		Fact type: dataset has frequency
			Necessity: Each dataset has exactly 1 frequency 

		Term:      colour
			Concept Type: Short Text (Type)
		Fact type: dataset has colour
			Necessity: Each dataset has exactly 1 colour

		Term:      source
		Fact Type: source is anonymous

		Term:      source type
		Fact type: source type has value
			Necessity: Each source type has exactly one value

		Fact type: source has source type
			Necessity: Each source has exactly one source type

		Fact type: dataset has source
		Rule:      It is obligatory that each dataset has at least 1 source

		Fact type: dataset is showcase

		Term:      quote
			Database Value Field: price
		Fact type: quote belongs to dataset
			Necessity: Each quote belongs to exactly one dataset

		-- Concept Type: Currency (Type)
		Term:      price
			Concept Type: Integer (Type)
		Fact type: quote has price
			Necessity: Each quote has at most 1 price

		Term:      date
			Concept Type: Date (Type)
		Fact type: quote has date
			Necessity: Each quote has exactly 1 date'''

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
