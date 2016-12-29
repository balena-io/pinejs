_ = require 'lodash'
Promise = require 'bluebird'

# lifts f to map over the changeSet if present
exports.liftP = liftP = (fn) ->
	(a) ->
		if _.isArray a
			# This must not be a settle as if any operation fails in a cs
			# we want to discard the whole
			Promise.mapSeries(a, fn)
		else
			Promise.resolve(a).then(fn)

# Lifts f to ignore errors
exports.liftE = liftE = (fn) ->
	(a) ->
		if _.isError a then a else fn(a)

# Compose two functions, f can expect any number of arguments
compose = (f, g) ->
	(a...) -> g(f(a...))

# Map this function over every changeset while letting errors through
exports.liftPE = liftPE = compose(liftE, liftP)

# The settle- versions of
settleMap = (a, fn) ->
	runF = Promise.method(fn)
	Promise.map(a, compose(runF, wrap))

settleMapSeries = (a, fn) ->
  runF = Promise.method(fn)
  Promise.mapSeries(a, compose(runF, wrap))

# Wrap a promise with reflection. This promise will always succeed, either
# with the value or the error of the promise it is wrapping
# wrap :: P b  -> P c
wrap = (p) ->
	p.then(_.identity, _.identity)

# Maps fn over collection and returns an array of Promises. If any promise in the
# collection is rejected it returns an array with the error, along with all the
# promises that were fulfilled up to that point
mapTill = (a, fn) ->
	runF = Promise.method(fn)
	results = []
	Promise.each a, (p) ->
		runF(p)
		.then (result) ->
			results.push(result)
		.catch (err) ->
			results.push(err)
			throw err
	.return(results)
	.catchReturn(results)

# Used to obtain the appropriate mapping function depending on the
# semantics specified by the Prefer: header.
exports.getMappingFn = (headers) ->
	if headers?.prefer == 'odata.continue-on-error'
		return { mapPar: settleMap, mapSeries: settleMapSeries }
	else
		return { mapPar: mapTill, mapSeries: mapTill }
