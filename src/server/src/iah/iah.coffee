define(['cs!database-layer/db'], (dbModule) ->
	exports = {}

	iahModel = '''
		Term:       name
			Concept Type: Short Text (Type)

		Term:       species
			Reference Scheme: name
		Term:       genus
			Reference Scheme: name
		Fact type:  species belongs to genus
			Necessity: each species belongs to exactly 1 genus

		Term:       senior synonym
			Concept Type: Short Text (Type)
		Term:       note
			Concept Type: Text (Type)
		Term:       habitat
			Concept Type: Text (Type)

		Fact type:  species has note
			Necessity: each species has at most 1 note
		Fact type:  species has habitat
			Necessity: each species has at most 1 habitat
		Fact type:  species has senior synonym
			Necessity: each species has exactly 1 senior synonym

		Fact type:  species has name
			Necessity: each species has exactly 1 name
			Necessity: each name is of at most 1 species

		Fact type:  genus has name
			Necessity: each genus has exactly 1 name
			Necessity: each name is of at most 1 genus

		Term:       image

		Fact type:  species is documented in image

		Term:       image type
			Definition: "wing" or "other"

		Fact type:  image has image type
			Necessity: each image has exactly 1 image type

		Term:       publication
			Reference Scheme: name
		Fact type:  publication has name
			Necessity: each publication has exactly 1 name
		Term:       author
			Reference Scheme: name
		Fact type:  author has name
			Necessity: each author has exactly 1 name
		Term:       year
			Concept Type: Integer (Type)
		Fact type:  publication has author
			Necessity: each publication has at least 1 author
		Fact type:  publication was in year
			Necessity: each publication was in exactly 1 year

		Term:       DOI
		Fact type:  publication has DOI
		Fact type:  publication is in library

		Term:       pathogen
			Reference Scheme: name
		Fact type:  pathogen has name
			Necessity: each pathogen has exactly 1 name
		Fact type:  species is vector for pathogen
			Term Form: vector relationship

		Fact type:  vector relationship is documented in publication

		Term:       host
			Reference Scheme: name
		Fact type:  host has name
			Necessity: each host has exactly 1 name
		Fact type:  species feeds on host
			Term Form: feeding relationship
		Fact type:  feeding relationship is documented in publication

		Term:       region
		Fact type:  species lives in region
			Term form: species residence
		Fact type:  species residence is documented in publication

		Term:       description
		Fact type:  species has description
		Fact type:  description assigns name
			Necessity: each description assigns exactly 1 name
		Fact type:  publication makes description
		Fact type:  description is within genus
		Fact type:  description was first made in publication'''

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, isAuthed, databaseOptions) ->
		db = dbModule.connect(databaseOptions)
		
		db.transaction( (tx) ->
			sbvrUtils.executeModel(tx, 'data', iahModel,
				() ->
					console.log('Sucessfully executed iah model.')
				(tx, error) ->
					console.error('Failed to execute iah model.', error)
			)
		)
		
		app.get('/dev/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runGet(req, res)
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
