(function() {

  define([], function() {
    return function(successCallback, errorCallback, successCollectFunc, errorCollectFunc) {
      var checkFinished, endedAdding, error, errors, queriesFinished, results, totalQueries;
      if (successCollectFunc == null) {
        successCollectFunc = (function(arg) {
          return arg;
        });
      }
      if (errorCollectFunc == null) {
        errorCollectFunc = (function() {
          return Array.prototype.slice.call(arguments);
        });
      }
      totalQueries = 0;
      queriesFinished = 0;
      endedAdding = false;
      error = false;
      results = [];
      errors = [];
      checkFinished = function() {
        if (endedAdding && queriesFinished === totalQueries) {
          if (error) {
            return errorCallback(errors);
          } else {
            return successCallback(results);
          }
        }
      };
      return {
        addWork: function(amount) {
          if (amount == null) amount = 1;
          if (endedAdding) throw 'You cannot add after ending adding';
          return totalQueries += amount;
        },
        endAdding: function() {
          if (endedAdding) throw 'You cannot end adding twice';
          endedAdding = true;
          return checkFinished();
        },
        successCallback: function() {
          var collected;
          if ((successCollectFunc != null)) {
            collected = successCollectFunc.apply(null, arguments);
            results.push(collected);
          }
          queriesFinished++;
          return checkFinished();
        },
        errorCallback: function() {
          if ((errorCollectFunc != null)) {
            errors.push(errorCollectFunc.apply(null, arguments));
          }
          error = true;
          queriesFinished++;
          return checkFinished();
        }
      };
    };
  });

}).call(this);
