_ = require 'lodash'
Promise = require 'bluebird'

# lifts f to map over the changeSet if present
exports.liftP = liftP = (fn) ->
	(a) ->
		if _.isArray a
			# This must not be a settle as if any operation fails in a cs
			# we want to discard the whole
			Promise.map(a, fn)
		else
			Promise.resolve(a).then(fn)

# Lifts f to ignore errors
exports.liftE = liftE = (fn) ->
	(a) ->
		if _.isError a then a else fn(a)

# compose two functions, f can expect any number of arguments
compose = (f, g) ->
	(a...) -> g(f(a...))

# Map this function over every changeset while letting errors through
exports.liftPE = liftPE = compose(liftE, liftP)

# a :: [a]
# f :: a -> P b
# settleMap :: [a] -> (a -> P b) -> [P b]
exports.settleMap = settleMap = (a, fn) ->
	runF = Promise.method(fn)
	Promise.map(a, compose(runF, wrap))

exports.settleMapSeries = settleMapSeries = (a, fn) ->
  runF = Promise.method(fn)
  Promise.mapSeries(a, compose(runF, wrap))

# Wrap a promise with reflection. This promise will always succeed, either
# with the value or the error of the promise it is wrapping
# wrap :: P b  -> P c
wrap = (p) ->
	p.reflect()
	.then (i) ->
		if i.isFulfilled()
			return i.value()
		else
			return i.reason()
