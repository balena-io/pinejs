define  ->
	return (successCallback, errorCallback, successCollectFunc = ((arg) -> return arg), errorCollectFunc = (() -> return Array.prototype.slice.call(arguments))) ->
		totalQueries = 0
		queriesFinished = 0
		endedAdding = false
		error = false
		results = []
		errors = []
		checkFinished = () ->
			if(endedAdding && queriesFinished == totalQueries)
				if(error)
					errorCallback(errors)
				else
					successCallback(results)
		return {
			addWork: (amount = 1) ->
				if(endedAdding)
					throw 'You cannot add after ending adding'
				totalQueries += amount
			endAdding: () ->
				if(endedAdding)
					throw 'You cannot end adding twice'
				endedAdding = true
				checkFinished()
			successCallback: () ->
				if(successCollectFunc?)
					collected = successCollectFunc.apply(null, arguments)
					# console.log(arguments, collected)
					results.push(collected)
				queriesFinished++
				checkFinished()
			errorCallback: () ->
				if(errorCollectFunc?)
					errors.push(errorCollectFunc.apply(null, arguments))
				error = true
				queriesFinished++
				checkFinished()
		}
