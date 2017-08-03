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

# The settle- versions of
settleMapSeries = (a, fn) ->
	runF = Promise.method(fn)
	Promise.mapSeries(a, _.flow(runF, wrap))

# Wrap a promise with reflection. This promise will always succeed, either
# with the value or the error of the promise it is wrapping
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
		.tapCatch (err) ->
			results.push(err)
	.return(results)
	.catchReturn(results)

# Used to obtain the appropriate mapping function depending on the
# semantics specified by the Prefer: header.
exports.getMappingFn = (headers) ->
	if headers?.prefer == 'odata.continue-on-error'
		return settleMapSeries
	else
		return mapTill
