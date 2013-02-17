//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

/*
Copyright (c) 2010 Ryan Schuft (ryan.schuft@gmail.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

define("has", [ "module" ], function(module) {
    var config = module.config();
    return function(flag) {
        return config.hasOwnProperty(flag) && config[flag];
    };
});

(function() {
    var root = this, previousUnderscore = root._, breaker = {}, ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype, push = ArrayProto.push, slice = ArrayProto.slice, concat = ArrayProto.concat, toString = ObjProto.toString, hasOwnProperty = ObjProto.hasOwnProperty, nativeForEach = ArrayProto.forEach, nativeMap = ArrayProto.map, nativeReduce = ArrayProto.reduce, nativeReduceRight = ArrayProto.reduceRight, nativeFilter = ArrayProto.filter, nativeEvery = ArrayProto.every, nativeSome = ArrayProto.some, nativeIndexOf = ArrayProto.indexOf, nativeLastIndexOf = ArrayProto.lastIndexOf, nativeIsArray = Array.isArray, nativeKeys = Object.keys, nativeBind = FuncProto.bind, _ = function(obj) {
        if (obj instanceof _) return obj;
        if (!(this instanceof _)) return new _(obj);
        this._wrapped = obj;
        return void 0;
    };
    if ("undefined" != typeof exports) {
        "undefined" != typeof module && module.exports && (exports = module.exports = _);
        exports._ = _;
    } else root._ = _;
    _.VERSION = "1.4.4";
    var each = _.each = _.forEach = function(obj, iterator, context) {
        if (null != obj) if (nativeForEach && obj.forEach === nativeForEach) obj.forEach(iterator, context); else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; l > i; i++) if (iterator.call(context, obj[i], i, obj) === breaker) return;
        } else for (var key in obj) if (_.has(obj, key) && iterator.call(context, obj[key], key, obj) === breaker) return;
    };
    _.map = _.collect = function(obj, iterator, context) {
        var results = [];
        if (null == obj) return results;
        if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
        each(obj, function(value, index, list) {
            results[results.length] = iterator.call(context, value, index, list);
        });
        return results;
    };
    var reduceError = "Reduce of empty array with no initial value";
    _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
        var initial = arguments.length > 2;
        null == obj && (obj = []);
        if (nativeReduce && obj.reduce === nativeReduce) {
            context && (iterator = _.bind(iterator, context));
            return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
        }
        each(obj, function(value, index, list) {
            if (initial) memo = iterator.call(context, memo, value, index, list); else {
                memo = value;
                initial = !0;
            }
        });
        if (!initial) throw new TypeError(reduceError);
        return memo;
    };
    _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
        var initial = arguments.length > 2;
        null == obj && (obj = []);
        if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
            context && (iterator = _.bind(iterator, context));
            return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
        }
        var length = obj.length;
        if (length !== +length) {
            var keys = _.keys(obj);
            length = keys.length;
        }
        each(obj, function(value, index, list) {
            index = keys ? keys[--length] : --length;
            if (initial) memo = iterator.call(context, memo, obj[index], index, list); else {
                memo = obj[index];
                initial = !0;
            }
        });
        if (!initial) throw new TypeError(reduceError);
        return memo;
    };
    _.find = _.detect = function(obj, iterator, context) {
        var result;
        any(obj, function(value, index, list) {
            if (iterator.call(context, value, index, list)) {
                result = value;
                return !0;
            }
        });
        return result;
    };
    _.filter = _.select = function(obj, iterator, context) {
        var results = [];
        if (null == obj) return results;
        if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
        each(obj, function(value, index, list) {
            iterator.call(context, value, index, list) && (results[results.length] = value);
        });
        return results;
    };
    _.reject = function(obj, iterator, context) {
        return _.filter(obj, function(value, index, list) {
            return !iterator.call(context, value, index, list);
        }, context);
    };
    _.every = _.all = function(obj, iterator, context) {
        iterator || (iterator = _.identity);
        var result = !0;
        if (null == obj) return result;
        if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
        each(obj, function(value, index, list) {
            return (result = result && iterator.call(context, value, index, list)) ? void 0 : breaker;
        });
        return !!result;
    };
    var any = _.some = _.any = function(obj, iterator, context) {
        iterator || (iterator = _.identity);
        var result = !1;
        if (null == obj) return result;
        if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
        each(obj, function(value, index, list) {
            return result || (result = iterator.call(context, value, index, list)) ? breaker : void 0;
        });
        return !!result;
    };
    _.contains = _.include = function(obj, target) {
        return null == obj ? !1 : nativeIndexOf && obj.indexOf === nativeIndexOf ? -1 != obj.indexOf(target) : any(obj, function(value) {
            return value === target;
        });
    };
    _.invoke = function(obj, method) {
        var args = slice.call(arguments, 2), isFunc = _.isFunction(method);
        return _.map(obj, function(value) {
            return (isFunc ? method : value[method]).apply(value, args);
        });
    };
    _.pluck = function(obj, key) {
        return _.map(obj, function(value) {
            return value[key];
        });
    };
    _.where = function(obj, attrs, first) {
        return _.isEmpty(attrs) ? first ? null : [] : _[first ? "find" : "filter"](obj, function(value) {
            for (var key in attrs) if (attrs[key] !== value[key]) return !1;
            return !0;
        });
    };
    _.findWhere = function(obj, attrs) {
        return _.where(obj, attrs, !0);
    };
    _.max = function(obj, iterator, context) {
        if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && 65535 > obj.length) return Math.max.apply(Math, obj);
        if (!iterator && _.isEmpty(obj)) return -1/0;
        var result = {
            computed: -1/0,
            value: -1/0
        };
        each(obj, function(value, index, list) {
            var computed = iterator ? iterator.call(context, value, index, list) : value;
            computed >= result.computed && (result = {
                value: value,
                computed: computed
            });
        });
        return result.value;
    };
    _.min = function(obj, iterator, context) {
        if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && 65535 > obj.length) return Math.min.apply(Math, obj);
        if (!iterator && _.isEmpty(obj)) return 1/0;
        var result = {
            computed: 1/0,
            value: 1/0
        };
        each(obj, function(value, index, list) {
            var computed = iterator ? iterator.call(context, value, index, list) : value;
            result.computed > computed && (result = {
                value: value,
                computed: computed
            });
        });
        return result.value;
    };
    _.shuffle = function(obj) {
        var rand, index = 0, shuffled = [];
        each(obj, function(value) {
            rand = _.random(index++);
            shuffled[index - 1] = shuffled[rand];
            shuffled[rand] = value;
        });
        return shuffled;
    };
    var lookupIterator = function(value) {
        return _.isFunction(value) ? value : function(obj) {
            return obj[value];
        };
    };
    _.sortBy = function(obj, value, context) {
        var iterator = lookupIterator(value);
        return _.pluck(_.map(obj, function(value, index, list) {
            return {
                value: value,
                index: index,
                criteria: iterator.call(context, value, index, list)
            };
        }).sort(function(left, right) {
            var a = left.criteria, b = right.criteria;
            if (a !== b) {
                if (a > b || void 0 === a) return 1;
                if (b > a || void 0 === b) return -1;
            }
            return left.index < right.index ? -1 : 1;
        }), "value");
    };
    var group = function(obj, value, context, behavior) {
        var result = {}, iterator = lookupIterator(value || _.identity);
        each(obj, function(value, index) {
            var key = iterator.call(context, value, index, obj);
            behavior(result, key, value);
        });
        return result;
    };
    _.groupBy = function(obj, value, context) {
        return group(obj, value, context, function(result, key, value) {
            (_.has(result, key) ? result[key] : result[key] = []).push(value);
        });
    };
    _.countBy = function(obj, value, context) {
        return group(obj, value, context, function(result, key) {
            _.has(result, key) || (result[key] = 0);
            result[key]++;
        });
    };
    _.sortedIndex = function(array, obj, iterator, context) {
        iterator = null == iterator ? _.identity : lookupIterator(iterator);
        for (var value = iterator.call(context, obj), low = 0, high = array.length; high > low; ) {
            var mid = low + high >>> 1;
            value > iterator.call(context, array[mid]) ? low = mid + 1 : high = mid;
        }
        return low;
    };
    _.toArray = function(obj) {
        return obj ? _.isArray(obj) ? slice.call(obj) : obj.length === +obj.length ? _.map(obj, _.identity) : _.values(obj) : [];
    };
    _.size = function(obj) {
        return null == obj ? 0 : obj.length === +obj.length ? obj.length : _.keys(obj).length;
    };
    _.first = _.head = _.take = function(array, n, guard) {
        return null == array ? void 0 : null == n || guard ? array[0] : slice.call(array, 0, n);
    };
    _.initial = function(array, n, guard) {
        return slice.call(array, 0, array.length - (null == n || guard ? 1 : n));
    };
    _.last = function(array, n, guard) {
        return null == array ? void 0 : null == n || guard ? array[array.length - 1] : slice.call(array, Math.max(array.length - n, 0));
    };
    _.rest = _.tail = _.drop = function(array, n, guard) {
        return slice.call(array, null == n || guard ? 1 : n);
    };
    _.compact = function(array) {
        return _.filter(array, _.identity);
    };
    var flatten = function(input, shallow, output) {
        each(input, function(value) {
            _.isArray(value) ? shallow ? push.apply(output, value) : flatten(value, shallow, output) : output.push(value);
        });
        return output;
    };
    _.flatten = function(array, shallow) {
        return flatten(array, shallow, []);
    };
    _.without = function(array) {
        return _.difference(array, slice.call(arguments, 1));
    };
    _.uniq = _.unique = function(array, isSorted, iterator, context) {
        if (_.isFunction(isSorted)) {
            context = iterator;
            iterator = isSorted;
            isSorted = !1;
        }
        var initial = iterator ? _.map(array, iterator, context) : array, results = [], seen = [];
        each(initial, function(value, index) {
            if (isSorted ? !index || seen[seen.length - 1] !== value : !_.contains(seen, value)) {
                seen.push(value);
                results.push(array[index]);
            }
        });
        return results;
    };
    _.union = function() {
        return _.uniq(concat.apply(ArrayProto, arguments));
    };
    _.intersection = function(array) {
        var rest = slice.call(arguments, 1);
        return _.filter(_.uniq(array), function(item) {
            return _.every(rest, function(other) {
                return _.indexOf(other, item) >= 0;
            });
        });
    };
    _.difference = function(array) {
        var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
        return _.filter(array, function(value) {
            return !_.contains(rest, value);
        });
    };
    _.zip = function() {
        for (var args = slice.call(arguments), length = _.max(_.pluck(args, "length")), results = Array(length), i = 0; length > i; i++) results[i] = _.pluck(args, "" + i);
        return results;
    };
    _.object = function(list, values) {
        if (null == list) return {};
        for (var result = {}, i = 0, l = list.length; l > i; i++) values ? result[list[i]] = values[i] : result[list[i][0]] = list[i][1];
        return result;
    };
    _.indexOf = function(array, item, isSorted) {
        if (null == array) return -1;
        var i = 0, l = array.length;
        if (isSorted) {
            if ("number" != typeof isSorted) {
                i = _.sortedIndex(array, item);
                return array[i] === item ? i : -1;
            }
            i = 0 > isSorted ? Math.max(0, l + isSorted) : isSorted;
        }
        if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
        for (;l > i; i++) if (array[i] === item) return i;
        return -1;
    };
    _.lastIndexOf = function(array, item, from) {
        if (null == array) return -1;
        var hasIndex = null != from;
        if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
        for (var i = hasIndex ? from : array.length; i--; ) if (array[i] === item) return i;
        return -1;
    };
    _.range = function(start, stop, step) {
        if (1 >= arguments.length) {
            stop = start || 0;
            start = 0;
        }
        step = arguments[2] || 1;
        for (var len = Math.max(Math.ceil((stop - start) / step), 0), idx = 0, range = Array(len); len > idx; ) {
            range[idx++] = start;
            start += step;
        }
        return range;
    };
    _.bind = function(func, context) {
        if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
        var args = slice.call(arguments, 2);
        return function() {
            return func.apply(context, args.concat(slice.call(arguments)));
        };
    };
    _.partial = function(func) {
        var args = slice.call(arguments, 1);
        return function() {
            return func.apply(this, args.concat(slice.call(arguments)));
        };
    };
    _.bindAll = function(obj) {
        var funcs = slice.call(arguments, 1);
        0 === funcs.length && (funcs = _.functions(obj));
        each(funcs, function(f) {
            obj[f] = _.bind(obj[f], obj);
        });
        return obj;
    };
    _.memoize = function(func, hasher) {
        var memo = {};
        hasher || (hasher = _.identity);
        return function() {
            var key = hasher.apply(this, arguments);
            return _.has(memo, key) ? memo[key] : memo[key] = func.apply(this, arguments);
        };
    };
    _.delay = function(func, wait) {
        var args = slice.call(arguments, 2);
        return setTimeout(function() {
            return func.apply(null, args);
        }, wait);
    };
    _.defer = function(func) {
        return _.delay.apply(_, [ func, 1 ].concat(slice.call(arguments, 1)));
    };
    _.throttle = function(func, wait) {
        var context, args, timeout, result, previous = 0, later = function() {
            previous = new Date();
            timeout = null;
            result = func.apply(context, args);
        };
        return function() {
            var now = new Date(), remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (0 >= remaining) {
                clearTimeout(timeout);
                timeout = null;
                previous = now;
                result = func.apply(context, args);
            } else timeout || (timeout = setTimeout(later, remaining));
            return result;
        };
    };
    _.debounce = function(func, wait, immediate) {
        var timeout, result;
        return function() {
            var context = this, args = arguments, later = function() {
                timeout = null;
                immediate || (result = func.apply(context, args));
            }, callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            callNow && (result = func.apply(context, args));
            return result;
        };
    };
    _.once = function(func) {
        var ran = !1, memo;
        return function() {
            if (ran) return memo;
            ran = !0;
            memo = func.apply(this, arguments);
            func = null;
            return memo;
        };
    };
    _.wrap = function(func, wrapper) {
        return function() {
            var args = [ func ];
            push.apply(args, arguments);
            return wrapper.apply(this, args);
        };
    };
    _.compose = function() {
        var funcs = arguments;
        return function() {
            for (var args = arguments, i = funcs.length - 1; i >= 0; i--) args = [ funcs[i].apply(this, args) ];
            return args[0];
        };
    };
    _.after = function(times, func) {
        return 0 >= times ? func() : function() {
            return 1 > --times ? func.apply(this, arguments) : void 0;
        };
    };
    _.keys = nativeKeys || function(obj) {
        if (obj !== Object(obj)) throw new TypeError("Invalid object");
        var keys = [];
        for (var key in obj) _.has(obj, key) && (keys[keys.length] = key);
        return keys;
    };
    _.values = function(obj) {
        var values = [];
        for (var key in obj) _.has(obj, key) && values.push(obj[key]);
        return values;
    };
    _.pairs = function(obj) {
        var pairs = [];
        for (var key in obj) _.has(obj, key) && pairs.push([ key, obj[key] ]);
        return pairs;
    };
    _.invert = function(obj) {
        var result = {};
        for (var key in obj) _.has(obj, key) && (result[obj[key]] = key);
        return result;
    };
    _.functions = _.methods = function(obj) {
        var names = [];
        for (var key in obj) _.isFunction(obj[key]) && names.push(key);
        return names.sort();
    };
    _.extend = function(obj) {
        each(slice.call(arguments, 1), function(source) {
            if (source) for (var prop in source) obj[prop] = source[prop];
        });
        return obj;
    };
    _.pick = function(obj) {
        var copy = {}, keys = concat.apply(ArrayProto, slice.call(arguments, 1));
        each(keys, function(key) {
            key in obj && (copy[key] = obj[key]);
        });
        return copy;
    };
    _.omit = function(obj) {
        var copy = {}, keys = concat.apply(ArrayProto, slice.call(arguments, 1));
        for (var key in obj) _.contains(keys, key) || (copy[key] = obj[key]);
        return copy;
    };
    _.defaults = function(obj) {
        each(slice.call(arguments, 1), function(source) {
            if (source) for (var prop in source) null == obj[prop] && (obj[prop] = source[prop]);
        });
        return obj;
    };
    _.clone = function(obj) {
        return _.isObject(obj) ? _.isArray(obj) ? obj.slice() : _.extend({}, obj) : obj;
    };
    _.tap = function(obj, interceptor) {
        interceptor(obj);
        return obj;
    };
    var eq = function(a, b, aStack, bStack) {
        if (a === b) return 0 !== a || 1 / a == 1 / b;
        if (null == a || null == b) return a === b;
        a instanceof _ && (a = a._wrapped);
        b instanceof _ && (b = b._wrapped);
        var className = toString.call(a);
        if (className != toString.call(b)) return !1;
        switch (className) {
          case "[object String]":
            return a == b + "";

          case "[object Number]":
            return a != +a ? b != +b : 0 == a ? 1 / a == 1 / b : a == +b;

          case "[object Date]":
          case "[object Boolean]":
            return +a == +b;

          case "[object RegExp]":
            return a.source == b.source && a.global == b.global && a.multiline == b.multiline && a.ignoreCase == b.ignoreCase;
        }
        if ("object" != typeof a || "object" != typeof b) return !1;
        for (var length = aStack.length; length--; ) if (aStack[length] == a) return bStack[length] == b;
        aStack.push(a);
        bStack.push(b);
        var size = 0, result = !0;
        if ("[object Array]" == className) {
            size = a.length;
            result = size == b.length;
            if (result) for (;size-- && (result = eq(a[size], b[size], aStack, bStack)); ) ;
        } else {
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor && _.isFunction(bCtor) && bCtor instanceof bCtor)) return !1;
            for (var key in a) if (_.has(a, key)) {
                size++;
                if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
            }
            if (result) {
                for (key in b) if (_.has(b, key) && !size--) break;
                result = !size;
            }
        }
        aStack.pop();
        bStack.pop();
        return result;
    };
    _.isEqual = function(a, b) {
        return eq(a, b, [], []);
    };
    _.isEmpty = function(obj) {
        if (null == obj) return !0;
        if (_.isArray(obj) || _.isString(obj)) return 0 === obj.length;
        for (var key in obj) if (_.has(obj, key)) return !1;
        return !0;
    };
    _.isElement = function(obj) {
        return !(!obj || 1 !== obj.nodeType);
    };
    _.isArray = nativeIsArray || function(obj) {
        return "[object Array]" == toString.call(obj);
    };
    _.isObject = function(obj) {
        return obj === Object(obj);
    };
    each([ "Arguments", "Function", "String", "Number", "Date", "RegExp" ], function(name) {
        _["is" + name] = function(obj) {
            return toString.call(obj) == "[object " + name + "]";
        };
    });
    _.isArguments(arguments) || (_.isArguments = function(obj) {
        return !(!obj || !_.has(obj, "callee"));
    });
    _.isFunction = function(obj) {
        return "function" == typeof obj;
    };
    _.isFinite = function(obj) {
        return isFinite(obj) && !isNaN(parseFloat(obj));
    };
    _.isNaN = function(obj) {
        return _.isNumber(obj) && obj != +obj;
    };
    _.isBoolean = function(obj) {
        return obj === !0 || obj === !1 || "[object Boolean]" == toString.call(obj);
    };
    _.isNull = function(obj) {
        return null === obj;
    };
    _.isUndefined = function(obj) {
        return void 0 === obj;
    };
    _.has = function(obj, key) {
        return hasOwnProperty.call(obj, key);
    };
    _.noConflict = function() {
        root._ = previousUnderscore;
        return this;
    };
    _.identity = function(value) {
        return value;
    };
    _.times = function(n, iterator, context) {
        for (var accum = Array(n), i = 0; n > i; i++) accum[i] = iterator.call(context, i);
        return accum;
    };
    _.random = function(min, max) {
        if (null == max) {
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    };
    var entityMap = {
        escape: {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
            "/": "&#x2F;"
        }
    };
    entityMap.unescape = _.invert(entityMap.escape);
    var entityRegexes = {
        escape: RegExp("[" + _.keys(entityMap.escape).join("") + "]", "g"),
        unescape: RegExp("(" + _.keys(entityMap.unescape).join("|") + ")", "g")
    };
    _.each([ "escape", "unescape" ], function(method) {
        _[method] = function(string) {
            return null == string ? "" : ("" + string).replace(entityRegexes[method], function(match) {
                return entityMap[method][match];
            });
        };
    });
    _.result = function(object, property) {
        if (null == object) return null;
        var value = object[property];
        return _.isFunction(value) ? value.call(object) : value;
    };
    _.mixin = function(obj) {
        each(_.functions(obj), function(name) {
            var func = _[name] = obj[name];
            _.prototype[name] = function() {
                var args = [ this._wrapped ];
                push.apply(args, arguments);
                return result.call(this, func.apply(_, args));
            };
        });
    };
    var idCounter = 0;
    _.uniqueId = function(prefix) {
        var id = ++idCounter + "";
        return prefix ? prefix + id : id;
    };
    _.templateSettings = {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
    };
    var noMatch = /(.)^/, escapes = {
        "'": "'",
        "\\": "\\",
        "\r": "r",
        "\n": "n",
        "	": "t",
        "\u2028": "u2028",
        "\u2029": "u2029"
    }, escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
    _.template = function(text, data, settings) {
        var render;
        settings = _.defaults({}, settings, _.templateSettings);
        var matcher = RegExp([ (settings.escape || noMatch).source, (settings.interpolate || noMatch).source, (settings.evaluate || noMatch).source ].join("|") + "|$", "g"), index = 0, source = "__p+='";
        text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset).replace(escaper, function(match) {
                return "\\" + escapes[match];
            });
            escape && (source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'");
            interpolate && (source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'");
            evaluate && (source += "';\n" + evaluate + "\n__p+='");
            index = offset + match.length;
            return match;
        });
        source += "';\n";
        settings.variable || (source = "with(obj||{}){\n" + source + "}\n");
        source = "var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n" + source + "return __p;\n";
        try {
            render = Function(settings.variable || "obj", "_", source);
        } catch (e) {
            e.source = source;
            throw e;
        }
        if (data) return render(data, _);
        var template = function(data) {
            return render.call(this, data, _);
        };
        template.source = "function(" + (settings.variable || "obj") + "){\n" + source + "}";
        return template;
    };
    _.chain = function(obj) {
        return _(obj).chain();
    };
    var result = function(obj) {
        return this._chain ? _(obj).chain() : obj;
    };
    _.mixin(_);
    each([ "pop", "push", "reverse", "shift", "sort", "splice", "unshift" ], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
            var obj = this._wrapped;
            method.apply(obj, arguments);
            "shift" != name && "splice" != name || 0 !== obj.length || delete obj[0];
            return result.call(this, obj);
        };
    });
    each([ "concat", "join", "slice" ], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
            return result.call(this, method.apply(this._wrapped, arguments));
        };
    });
    _.extend(_.prototype, {
        chain: function() {
            this._chain = !0;
            return this;
        },
        value: function() {
            return this._wrapped;
        }
    });
}).call(this);

define("underscore", function(global) {
    return function() {
        var ret, fn;
        return ret || global._;
    };
}(this));

define("ometa!sbvr-parser/SBVRLibs", [ "underscore", "ometa-core" ], function(_) {
    var SBVRLibs = OMeta._extend({});
    SBVRLibs.TYPE_VOCAB = "Type";
    SBVRLibs.initialize = function() {
        this.currentVocabulary = "";
        this.vocabularies = {};
        this.factTypes = {};
    };
    SBVRLibs.ApplyFirstExisting = function(rules, ruleArgs) {
        null == ruleArgs && (ruleArgs = []);
        ruleArgs.unshift("");
        for (var i = 0; rules.length > i; i++) if (void 0 != this[rules[i]]) {
            if (null != ruleArgs && ruleArgs.length > 0) {
                ruleArgs[0] = rules[i];
                return this._applyWithArgs.apply(this, ruleArgs);
            }
            return this._apply(rules[i], ruleArgs);
        }
    };
    SBVRLibs.IdentifiersEqual = function(a, b) {
        return a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
    };
    SBVRLibs.IsPrimitive = function(term) {
        if (term[2] == this.TYPE_VOCAB) return term[1];
        var conceptTypes = this.vocabularies[term[2]].ConceptTypes;
        return conceptTypes.hasOwnProperty(term) && (term = conceptTypes[term]) && term[2] == this.TYPE_VOCAB ? term[1] : !1;
    };
    SBVRLibs.AddVocabulary = function(vocabulary, baseSynonym) {
        this.currentVocabulary = baseSynonym;
        this.vocabularies.hasOwnProperty(baseSynonym) || (this.vocabularies[baseSynonym] = {
            Term: {},
            Name: {},
            IdentifierChildren: {},
            ConceptTypes: {}
        });
        this.vocabularies.hasOwnProperty(vocabulary) || (this.vocabularies[vocabulary] = this.vocabularies[baseSynonym]);
    };
    SBVRLibs.AddFactType = function(factType, realFactType) {
        for (var mappedFactType = [], i = 0; realFactType.length > i; i++) {
            var realFactTypePart = realFactType[i];
            mappedFactType[i] = realFactTypePart.slice(0, 3);
            for (var j = 0; factType.length > j; j++) {
                var factTypePart = factType[j];
                "Verb" != realFactTypePart[0] && this.IdentifiersEqual(realFactTypePart, factTypePart) && realFactTypePart.length == factTypePart.length && (4 > realFactTypePart.length || realFactTypePart[3][1] == factTypePart[3][1]) && (mappedFactType[i][3] = j);
            }
        }
        this._traverseFactType(factType, mappedFactType);
        if (3 == factType.length && ("has" == factType[1][1] || "is of" == factType[1][1])) {
            mappedFactType = _.extend([], mappedFactType);
            mappedFactType[0] = mappedFactType[0].slice(0, 3).concat(2);
            mappedFactType[2] = mappedFactType[2].slice(0, 3).concat(0);
            "has" == factType[1][1] ? this._traverseFactType([ factType[2], [ "Verb", "is of", factType[1][2] ], factType[0] ], mappedFactType) : "is of" == factType[1][1] && this._traverseFactType([ factType[2], [ "Verb", "has", factType[1][2] ], factType[0] ], mappedFactType);
        }
    };
    SBVRLibs._traverseFactType = function(factType, create) {
        var $elf = this, traverseRecurse = function(currentFactTypePart, remainingFactType, currentLevel) {
            if (null == currentFactTypePart) {
                create && (currentLevel.__valid = create);
                return currentLevel;
            }
            var finalLevel, finalLevels = {};
            switch (currentFactTypePart[0]) {
              case "Verb":
                currentFactTypePart = currentFactTypePart.slice(0, 2);
                break;

              default:
                currentFactTypePart = currentFactTypePart.slice(0, 3);
            }
            if (currentLevel.hasOwnProperty(currentFactTypePart) || create && (currentLevel[currentFactTypePart] = {})) {
                finalLevel = traverseRecurse(remainingFactType[0], remainingFactType.slice(1), currentLevel[currentFactTypePart]);
                0 != finalLevel && _.extend(finalLevels, finalLevel);
            }
            if (!create && ("Term" == currentFactTypePart[0] || "Name" == currentFactTypePart[0])) for (var conceptTypes; (conceptTypes = $elf.vocabularies[currentFactTypePart[2]].ConceptTypes) && conceptTypes.hasOwnProperty(currentFactTypePart); ) {
                currentFactTypePart = conceptTypes[currentFactTypePart];
                if (currentLevel.hasOwnProperty(currentFactTypePart)) {
                    finalLevel = traverseRecurse(remainingFactType[0], remainingFactType.slice(1), currentLevel[currentFactTypePart]);
                    finalLevel !== !1 && _.extend(finalLevels, finalLevel);
                }
            }
            return _.isEmpty(finalLevels) === !0 ? !1 : finalLevels;
        };
        return traverseRecurse(factType[0], factType.slice(1), this.factTypes);
    };
    SBVRLibs.MappedFactType = function(factType) {
        var traverseInfo = this._traverseFactType(factType);
        return traverseInfo !== !1 && traverseInfo.hasOwnProperty("__valid") ? traverseInfo.__valid : !1;
    };
    SBVRLibs.ActualFactType = function(factType) {
        var mappedFactType = this.MappedFactType(factType);
        if (mappedFactType === !1) return !1;
        for (var actualFactType = [], i = 0; mappedFactType.length > i; i++) actualFactType[i] = mappedFactType[i].slice(0, 3);
        actualFactType[1][2] = factType[1][2];
        return actualFactType;
    };
    SBVRLibs.IsChild = function(child, parent) {
        var conceptTypes;
        do {
            if (this.IdentifiersEqual(child, parent)) return !0;
            conceptTypes = this.vocabularies[parent[2]].ConceptTypes;
        } while (conceptTypes.hasOwnProperty(child) && (child = conceptTypes[child]));
        return !1;
    };
    SBVRLibs.FactTypeRootTerms = function(factType) {
        var mappedFactType = this.MappedFactType(factType);
        if (mappedFactType === !1) return !1;
        for (var schemaInfo = [], schemaInfoIndex = 0, usedTermNames = {}, i = 0; factType.length > i; i += 2) for (var j = 0; mappedFactType.length > j; j += 2) {
            var mappedFactTypePart = mappedFactType[j];
            if (mappedFactTypePart[3] == i) {
                var term = mappedFactTypePart.slice(0, 3);
                schemaInfo[schemaInfoIndex++] = {
                    term: term,
                    field: mappedFactTypePart[1]
                };
                usedTermNames[term] = usedTermNames.hasOwnProperty(term) ? 0 : null;
            }
        }
        for (var i = 0; schemaInfo.length > i; i++) null != usedTermNames[schemaInfo[i].term] && (schemaInfo[i].field = schemaInfo[i].field + ++usedTermNames[schemaInfo[i].term]);
        return schemaInfo;
    };
    SBVRLibs.GetResourceName = function(termOrFactType) {
        var i = 0, resource = [];
        if (_.isString(termOrFactType)) return termOrFactType.replace(RegExp(" ", "g"), "_");
        for (void 0; termOrFactType.length > i; i++) resource.push(termOrFactType[i][1].replace(RegExp(" ", "g"), "_"));
        return resource.join("-");
    };
    SBVRLibs.GetTableID = function(termOrFactType) {
        switch (termOrFactType[0]) {
          case "Term":
          case "Name":
            return termOrFactType[1];

          default:
            return termOrFactType;
        }
    };
    SBVRLibs.GetTable = function(termNameOrFactType) {
        return this.tables[this.GetResourceName(termNameOrFactType)];
    };
    SBVRLibs.GetTableField = function(table, fieldName) {
        var fieldID = this.GetTableFieldID(table, fieldName);
        return fieldID === !1 ? !1 : table.fields[fieldID];
    };
    SBVRLibs.GetTableFieldID = function(table, fieldName) {
        for (var tableFields = table.fields, i = 0; tableFields.length > i; i++) if (tableFields[i][1] == fieldName) return i;
        return !1;
    };
    return SBVRLibs;
});

"undefined" == typeof window || window.InflectionJS || (window.InflectionJS = null);

InflectionJS = {
    uncountable_words: [ "equipment", "information", "rice", "money", "species", "series", "fish", "sheep", "moose", "deer", "news" ],
    plural_rules: [ [ RegExp("(m)an$", "gi"), "$1en" ], [ RegExp("(pe)rson$", "gi"), "$1ople" ], [ RegExp("(child)$", "gi"), "$1ren" ], [ RegExp("^(ox)$", "gi"), "$1en" ], [ RegExp("(ax|test)is$", "gi"), "$1es" ], [ RegExp("(octop|vir)us$", "gi"), "$1i" ], [ RegExp("(alias|status)$", "gi"), "$1es" ], [ RegExp("(bu)s$", "gi"), "$1ses" ], [ RegExp("(buffal|tomat|potat)o$", "gi"), "$1oes" ], [ RegExp("([ti])um$", "gi"), "$1a" ], [ RegExp("sis$", "gi"), "ses" ], [ RegExp("(?:([^f])fe|([lr])f)$", "gi"), "$1$2ves" ], [ RegExp("(hive)$", "gi"), "$1s" ], [ RegExp("([^aeiouy]|qu)y$", "gi"), "$1ies" ], [ RegExp("(x|ch|ss|sh)$", "gi"), "$1es" ], [ RegExp("(matr|vert|ind)ix|ex$", "gi"), "$1ices" ], [ RegExp("([m|l])ouse$", "gi"), "$1ice" ], [ RegExp("(quiz)$", "gi"), "$1zes" ], [ RegExp("s$", "gi"), "s" ], [ RegExp("$", "gi"), "s" ] ],
    singular_rules: [ [ RegExp("(m)en$", "gi"), "$1an" ], [ RegExp("(pe)ople$", "gi"), "$1rson" ], [ RegExp("(child)ren$", "gi"), "$1" ], [ RegExp("([ti])a$", "gi"), "$1um" ], [ RegExp("((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$", "gi"), "$1$2sis" ], [ RegExp("(hive)s$", "gi"), "$1" ], [ RegExp("(tive)s$", "gi"), "$1" ], [ RegExp("(curve)s$", "gi"), "$1" ], [ RegExp("([lr])ves$", "gi"), "$1f" ], [ RegExp("([^fo])ves$", "gi"), "$1fe" ], [ RegExp("([^aeiouy]|qu)ies$", "gi"), "$1y" ], [ RegExp("(s)eries$", "gi"), "$1eries" ], [ RegExp("(m)ovies$", "gi"), "$1ovie" ], [ RegExp("(x|ch|ss|sh)es$", "gi"), "$1" ], [ RegExp("([m|l])ice$", "gi"), "$1ouse" ], [ RegExp("(bus)es$", "gi"), "$1" ], [ RegExp("(o)es$", "gi"), "$1" ], [ RegExp("(shoe)s$", "gi"), "$1" ], [ RegExp("(cris|ax|test)es$", "gi"), "$1is" ], [ RegExp("(octop|vir)i$", "gi"), "$1us" ], [ RegExp("(alias|status)es$", "gi"), "$1" ], [ RegExp("^(ox)en", "gi"), "$1" ], [ RegExp("(vert|ind)ices$", "gi"), "$1ex" ], [ RegExp("(matr)ices$", "gi"), "$1ix" ], [ RegExp("(quiz)zes$", "gi"), "$1" ], [ RegExp("s$", "gi"), "" ] ],
    non_titlecased_words: [ "and", "or", "nor", "a", "an", "the", "so", "but", "to", "of", "at", "by", "from", "into", "on", "onto", "off", "out", "in", "over", "with", "for" ],
    id_suffix: RegExp("(_ids|_id)$", "g"),
    underbar: RegExp("_", "g"),
    space_or_underbar: RegExp("[ _]", "g"),
    uppercase: RegExp("([A-Z])", "g"),
    underbar_prefix: RegExp("^_"),
    apply_rules: function(str, rules, skip) {
        if (-1 === skip.indexOf(str.toLowerCase())) for (var x = 0, l = rules.length; l > x; x++) if (rules[x][0].test(str)) return str.replace(rules[x][0], rules[x][1]);
        return str;
    }
};

Array.prototype.indexOf || (Array.prototype.indexOf = function(item, fromIndex, compareFunc) {
    fromIndex || (fromIndex = -1);
    for (var index = -1, i = fromIndex; this.length > i; i++) if (this[i] === item || compareFunc && compareFunc(this[i], item)) {
        index = i;
        break;
    }
    return index;
});

String.prototype._uncountable_words || (String.prototype._uncountable_words = InflectionJS.uncountable_words);

String.prototype._plural_rules || (String.prototype._plural_rules = InflectionJS.plural_rules);

String.prototype._singular_rules || (String.prototype._singular_rules = InflectionJS.singular_rules);

String.prototype._non_titlecased_words || (String.prototype._non_titlecased_words = InflectionJS.non_titlecased_words);

String.prototype.pluralize || function() {
    var memo = {};
    String.prototype.pluralize = function(plural) {
        if (plural) return plural;
        var thisString = "" + this;
        memo.hasOwnProperty(thisString) || (memo[thisString] = InflectionJS.apply_rules("" + this, this._plural_rules, this._uncountable_words));
        return memo[thisString];
    };
}();

String.prototype.singularize || function() {
    var memo = {};
    String.prototype.singularize = function(singular) {
        if (singular) return singular;
        var thisString = "" + this;
        memo.hasOwnProperty(thisString) || (memo[thisString] = InflectionJS.apply_rules(thisString, this._singular_rules, this._uncountable_words));
        return memo[thisString];
    };
}();

String.prototype.camelize || (String.prototype.camelize = function(lowFirstLetter) {
    for (var str = this.toLowerCase(), str_path = str.split("/"), i = 0; str_path.length > i; i++) {
        for (var str_arr = str_path[i].split("_"), initX = lowFirstLetter && i + 1 === str_path.length ? 1 : 0, x = initX; str_arr.length > x; x++) str_arr[x] = str_arr[x].charAt(0).toUpperCase() + str_arr[x].substring(1);
        str_path[i] = str_arr.join("");
    }
    str = str_path.join("::");
    return str;
});

String.prototype.underscore || (String.prototype.underscore = function() {
    for (var str = this, str_path = str.split("::"), i = 0; str_path.length > i; i++) {
        str_path[i] = str_path[i].replace(InflectionJS.uppercase, "_$1");
        str_path[i] = str_path[i].replace(InflectionJS.underbar_prefix, "");
    }
    str = str_path.join("/").toLowerCase();
    return str;
});

String.prototype.humanize || (String.prototype.humanize = function(lowFirstLetter) {
    var str = this.toLowerCase();
    str = str.replace(InflectionJS.id_suffix, "");
    str = str.replace(InflectionJS.underbar, " ");
    lowFirstLetter || (str = str.capitalize());
    return str;
});

String.prototype.capitalize || (String.prototype.capitalize = function() {
    var str = this.toLowerCase();
    str = str.substring(0, 1).toUpperCase() + str.substring(1);
    return str;
});

String.prototype.dasherize || (String.prototype.dasherize = function() {
    var str = this;
    str = str.replace(InflectionJS.space_or_underbar, "-");
    return str;
});

String.prototype.titleize || (String.prototype.titleize = function() {
    var str = this.toLowerCase();
    str = str.replace(InflectionJS.underbar, " ");
    for (var str_arr = str.split(" "), x = 0; str_arr.length > x; x++) {
        for (var d = str_arr[x].split("-"), i = 0; d.length > i; i++) 0 > this._non_titlecased_words.indexOf(d[i].toLowerCase()) && (d[i] = d[i].capitalize());
        str_arr[x] = d.join("-");
    }
    str = str_arr.join(" ");
    str = str.substring(0, 1).toUpperCase() + str.substring(1);
    return str;
});

String.prototype.demodulize || (String.prototype.demodulize = function() {
    var str = this, str_arr = str.split("::");
    str = str_arr[str_arr.length - 1];
    return str;
});

String.prototype.tableize || (String.prototype.tableize = function() {
    var str = this;
    str = str.underscore().pluralize();
    return str;
});

String.prototype.classify || (String.prototype.classify = function() {
    var str = this;
    str = str.camelize().singularize();
    return str;
});

String.prototype.foreign_key || (String.prototype.foreign_key = function(dropIdUbar) {
    var str = this;
    str = str.demodulize().underscore() + (dropIdUbar ? "" : "_") + "id";
    return str;
});

String.prototype.ordinalize || (String.prototype.ordinalize = function() {
    for (var str = this, str_arr = str.split(" "), x = 0; str_arr.length > x; x++) {
        var i = parseInt(str_arr[x], 10);
        if (0/0 === i) {
            var ltd = str_arr[x].substring(str_arr[x].length - 2), ld = str_arr[x].substring(str_arr[x].length - 1), suf = "th";
            "11" != ltd && "12" != ltd && "13" != ltd && ("1" === ld ? suf = "st" : "2" === ld ? suf = "nd" : "3" === ld && (suf = "rd"));
            str_arr[x] += suf;
        }
    }
    str = str_arr.join(" ");
    return str;
});

define("inflection", function() {});

define("ometa!sbvr-parser/SBVRParser", [ "ometa!sbvr-parser/SBVRLibs", "underscore", "has", "ometa-core", "inflection" ], function(SBVRLibs, _, has) {
    var dataTypesInputHead, dataTypesVocabulary = "\n			Vocabulary: " + SBVRLibs.TYPE_VOCAB + "\n			Term:       Integer\n			Term:       Real\n			Term:       Text\n			Term:       Date\n			Term:       Date Time\n			Term:       Time\n			Term:       Interval\n			Term:       File\n\n			Term:       Serial\n				Concept Type: Integer\n				Note: An auto-incrementing 'Integer'.\n			Term:       JSON\n				Concept Type: Text\n				Note: A 'Text' type that will only allow valid JSON.\n			Term:       Hashed\n				Concept Type: Text\n				Note: A 'Text' type that will automatically be converted to a hash.\n\n			Term:       Length\n				Concept Type: Integer\n\n			Fact type:  Text has Length\n				Note: Length in characters\n				Necessity: Each Text has exactly one Length\n\n			Fact type:  Integer1 is greater than Integer2\n				Synonymous Form: Integer2 is less than or equal to Integer1\n			Fact type:  Integer1 is less than Integer2\n				Synonymous Form: Integer2 is greater than or equal to Integer1\n			Fact type:  Integer1 is equal to Integer2\n				Synonymous Form: Integer2 is equal to Integer1\n				Synonymous Form: Integer1 equals Integer2\n				Synonymous Form: Integer2 equals Integer1\n\n			Fact type:  Real1 is greater than Real2\n				Synonymous Form: Real2 is less than or equal to Real1\n			Fact type:  Real1 is less than Real2\n				Synonymous Form: Real2 is greater or equal to than Real1\n			Fact type:  Real1 is equal to Real2\n				Synonymous Form: Real2 is equal to Real1\n				Synonymous Form: Real1 equals Real2\n				Synonymous Form: Real2 equals Real1\n\n\n			Fact type:  Real is greater than Integer\n				Synonymous Form: Integer is less than or equal to Real\n			Fact type:  Integer is greater than Real\n				Synonymous Form: Real is less than or equal to Integer\n\n			Fact type:  Integer is less than Real\n				Synonymous Form: Real is greater than or equal to Integer\n			Fact type:  Real is less than Integer\n				Synonymous Form: Integer is greater than or equal to Real\n\n			Fact type:  Integer is equal to Real\n				Synonymous Form: Real is equal to Integer\n				Synonymous Form: Real equals Integer\n				Synonymous Form: Integer equals Real\n\n\n			Fact type:  Real1 is greater than Real2\n				Synonymous Form: Real2 is less than or equal to Real1\n			Fact type:  Real1 is less than Real2\n				Synonymous Form: Real2 is greater or equal to than Real1\n			Fact type:  Real1 is equal to Real2\n				Synonymous Form: Real2 is equal to Real1\n				Synonymous Form: Real1 equals Real2\n				Synonymous Form: Real2 equals Real1\n\n			Fact type:  Text1 is equal to Text2\n				Synonymous Form: Text2 is equal to Text1\n				Synonymous Form: Text1 equals Text2\n				Synonymous Form: Text2 equals Text1\n\n			Term:       Short Text\n				Concept Type: Text\n				--Necessity: each Short Text has a Length that is less than or equal to 255.\n\n			Term:       Red Component\n				Concept Type: Integer\n			Term:       Green Component\n				Concept Type: Integer\n			Term:       Blue Component\n				Concept Type: Integer\n			Term:       Alpha Component\n				Concept Type: Integer\n			Term:       Color\n				Concept Type: Integer\n			Fact type:  Color has Red Component\n				Necessity: Each Color has exactly one Red Component\n			Fact type:  Color has Green Component\n				Necessity: Each Color has exactly one Green Component\n			Fact type:  Color has Blue Component\n				Necessity: Each Color has exactly one Blue Component\n			Fact type:  Color has Alpha Component\n				Necessity: Each Color has exactly one Alpha Component", SBVRParser = SBVRLibs._extend({
        EOL: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return function() {
                switch (this._apply("anything")) {
                  case "\r":
                    return this._opt(function() {
                        return this._applyWithArgs("exactly", "\n");
                    });

                  case "\n":
                    return "\n";

                  default:
                    throw this._fail();
                }
            }.call(this);
        },
        EOLSpaces: function() {
            var $elf = this, eol, _fromIdx = this.input.idx;
            eol = !1;
            this._many(function() {
                return this._or(function() {
                    this._apply("EOL");
                    return eol = !0;
                }, function() {
                    return this._apply("space");
                });
            });
            return this._pred(eol);
        },
        Bind: function(identifier, bindings) {
            var $elf = this, varNumber, binding, _fromIdx = this.input.idx;
            varNumber = this.ruleVars[identifier];
            this._pred(null != varNumber);
            binding = [ "RoleBinding", identifier, varNumber ];
            this._opt(function() {
                this._pred(bindings);
                return bindings.push(binding);
            });
            return binding;
        },
        spaces: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._many(function() {
                this._not(function() {
                    return this._apply("EOL");
                });
                return this._apply("space");
            });
        },
        Number: function() {
            var n, $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                this._apply("spaces");
                n = this._consumedBy(function() {
                    return this._many1(function() {
                        return this._apply("digit");
                    });
                });
                return [ "Number", parseInt(n, 10) ];
            }, function() {
                this._applyWithArgs("token", "one");
                return [ "Number", 1 ];
            });
        },
        Real: function() {
            var n, $elf = this, _fromIdx = this.input.idx;
            this._apply("spaces");
            n = this._consumedBy(function() {
                this._many1(function() {
                    return this._apply("digit");
                });
                this._applyWithArgs("exactly", ".");
                return this._many1(function() {
                    return this._apply("digit");
                });
            });
            return [ "Real", Number(n) ];
        },
        Integer: function() {
            var n, $elf = this, _fromIdx = this.input.idx;
            this._apply("spaces");
            n = this._consumedBy(function() {
                return this._many1(function() {
                    return this._apply("digit");
                });
            });
            return [ "Integer", Number(n) ];
        },
        Text: function() {
            var $elf = this, text, _fromIdx = this.input.idx;
            this._apply("spaces");
            this._applyWithArgs("exactly", '"');
            text = this._consumedBy(function() {
                return this._many1(function() {
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "\\":
                                return this._applyWithArgs("exactly", '"');

                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        this._not(function() {
                            return this._applyWithArgs("exactly", '"');
                        });
                        return this._apply("anything");
                    });
                });
            });
            this._applyWithArgs("exactly", '"');
            return [ "Text", text ];
        },
        Value: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._apply("Real");
            }, function() {
                return this._apply("Integer");
            }, function() {
                return this._apply("Text");
            });
        },
        toSBVREOL: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._apply("spaces");
            return this._consumedBy(function() {
                return this._many(function() {
                    this._apply("spaces");
                    return this._or(function() {
                        return this._apply("InformalIdentifier");
                    }, function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "'":
                                return function() {
                                    this._apply("InformalIdentifier");
                                    return this._applyWithArgs("exactly", "'");
                                }.call(this);

                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        return this._many1(function() {
                            this._not(function() {
                                return this._apply("space");
                            });
                            return this._apply("anything");
                        });
                    });
                });
            });
        },
        toEOL: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._consumedBy(function() {
                return this._many(function() {
                    this._not(function() {
                        return this._apply("EOL");
                    });
                    return this._apply("anything");
                });
            });
        },
        token: function(x) {
            var s, $elf = this, _fromIdx = this.input.idx;
            this._apply("spaces");
            s = this._applyWithArgs("seq", x);
            this._lookahead(function() {
                return this._or(function() {
                    return this._apply("space");
                }, function() {
                    return this._apply("end");
                });
            });
            return s;
        },
        AddIdentifier: function(identifierType, baseSynonym) {
            var $elf = this, identifier, _fromIdx = this.input.idx;
            identifier = this._lookahead(function() {
                return this._many1(function() {
                    return this._apply("IdentifierPart");
                });
            });
            identifier = identifier.join(" ");
            this._applyWithArgs("_AddIdentifier", identifierType, identifier, baseSynonym);
            return this._applyWithArgs("apply", identifierType);
        },
        InformalIdentifier: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("Identifier", void 0, !0);
        },
        Identifier: function(factTypeSoFar, noAutoComplete) {
            var term, $elf = this, name, _fromIdx = this.input.idx;
            this._opt(function() {
                return this._not(function() {
                    return term = this._consumedBy(function() {
                        return this._opt(function() {
                            return this._applyWithArgs("Term", factTypeSoFar);
                        });
                    });
                });
            });
            this._opt(function() {
                return this._not(function() {
                    return name = this._consumedBy(function() {
                        return this._opt(function() {
                            return this._applyWithArgs("Name", factTypeSoFar);
                        });
                    });
                });
            });
            return this._or(function() {
                this._pred(term || name);
                return this._or(function() {
                    this._pred(term.length > name.length);
                    return this._applyWithArgs("Term", factTypeSoFar);
                }, function() {
                    return this._applyWithArgs("Name", factTypeSoFar);
                });
            }, function() {
                this._pred(!noAutoComplete);
                return this._or(function() {
                    return this._applyWithArgs("Term", factTypeSoFar);
                }, function() {
                    return this._applyWithArgs("Name", factTypeSoFar);
                });
            });
        },
        Vocabulary: function() {
            var $elf = this, _fromIdx = this.input.idx, vocabulary;
            vocabulary = this._apply("FindVocabulary");
            return [ "Vocabulary", vocabulary ];
        },
        Name: function(factTypeSoFar) {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("FindIdentifier", "Name", factTypeSoFar);
        },
        Term: function(factTypeSoFar) {
            var n, term, $elf = this, _fromIdx = this.input.idx;
            term = this._applyWithArgs("FindIdentifier", "Term", factTypeSoFar);
            this._opt(function() {
                n = this._consumedBy(function() {
                    return this._many1(function() {
                        return this._apply("digit");
                    });
                });
                return term.push([ "Number", Number(n) ]);
            });
            return term;
        },
        FindIdentifier: function(identifierType, factTypeSoFar) {
            var quote, $elf = this, identifier, _fromIdx = this.input.idx;
            this._apply("spaces");
            quote = this._opt(function() {
                return this._applyWithArgs("exactly", "'");
            });
            identifier = this._applyWithArgs("FindIdentifierNest", identifierType, factTypeSoFar);
            this._or(function() {
                return this._pred(!quote);
            }, function() {
                return this._applyWithArgs("seq", quote);
            });
            return identifier;
        },
        FindIdentifierNest: function(identifierType, factTypeSoFar, identifierSoFar) {
            var $elf = this, part, identifierSoFar, factTypeIdentifier, _fromIdx = this.input.idx, vocabulary;
            part = this._apply("IdentifierPart");
            identifierSoFar = this._or(function() {
                this._pred(identifierSoFar);
                return identifierSoFar + " " + part;
            }, function() {
                return part;
            });
            this._pred(identifierSoFar.length <= this.longestIdentifier[identifierType]);
            return this._or(function() {
                return this._applyWithArgs("FindIdentifierNest", identifierType, factTypeSoFar, identifierSoFar);
            }, function() {
                vocabulary = this._or(function() {
                    return this._applyWithArgs("FindVocabulary", identifierSoFar);
                }, function() {
                    return this.currentVocabulary;
                });
                factTypeIdentifier = this._applyWithArgs("IsFactTypeIdentifier", vocabulary, identifierType, factTypeSoFar, identifierSoFar);
                this._pred(factTypeIdentifier !== !1);
                return [ identifierType, factTypeIdentifier, vocabulary ];
            });
        },
        FindVocabulary: function(identifier) {
            var $elf = this, bracket, _fromIdx = this.input.idx, vocabulary;
            this._apply("spaces");
            bracket = this._opt(function() {
                return this._applyWithArgs("exactly", "(");
            });
            vocabulary = this._apply("FindVocabularyNest");
            this._pred(!identifier || this.vocabularies[vocabulary].IdentifierChildren.hasOwnProperty(identifier));
            this._or(function() {
                return this._pred(!bracket);
            }, function() {
                return function() {
                    switch (this._apply("anything")) {
                      case ")":
                        return ")";

                      default:
                        throw this._fail();
                    }
                }.call(this);
            });
            return vocabulary;
        },
        FindVocabularyNest: function(vocabularySoFar) {
            var vocabularySoFar, $elf = this, part, _fromIdx = this.input.idx;
            part = this._apply("IdentifierPart");
            vocabularySoFar = this._or(function() {
                this._pred(vocabularySoFar);
                return vocabularySoFar + " " + part;
            }, function() {
                return part;
            });
            this._pred(vocabularySoFar.length <= this.longestIdentifier.Vocabulary);
            return this._or(function() {
                return this._applyWithArgs("FindVocabularyNest", vocabularySoFar);
            }, function() {
                this._pred(this.vocabularies.hasOwnProperty(vocabularySoFar));
                return vocabularySoFar;
            });
        },
        IdentifierPart: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._apply("spaces");
            return this._consumedBy(function() {
                return this._many1(function() {
                    return this._or(function() {
                        return this._apply("letter");
                    }, function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "-":
                                return "-";

                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    });
                });
            });
        },
        addVerb: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._apply("ClearSuggestions");
            return this._applyWithArgs("Verb", !0);
        },
        Verb: function(factTypeSoFar) {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("FindVerb", factTypeSoFar);
        },
        FindVerb: function(factTypeSoFar, verbSoFar, negated) {
            var $elf = this, part, verb, verbSoFar, _fromIdx = this.input.idx, negated;
            this._opt(function() {
                this._pred(factTypeSoFar && !verbSoFar);
                this._applyWithArgs("Keyword", "isn't");
                verbSoFar = "is";
                return negated = !0;
            });
            part = this._apply("VerbPart");
            verbSoFar = this._or(function() {
                this._pred(verbSoFar);
                return verbSoFar + " " + part;
            }, function() {
                return part;
            });
            this._opt(function() {
                this._pred(factTypeSoFar && "is" == verbSoFar);
                this._apply("spaces");
                this._applyWithArgs("Keyword", "not");
                return negated = !0;
            });
            return this._or(function() {
                return this._applyWithArgs("FindVerb", factTypeSoFar, verbSoFar, negated);
            }, function() {
                this._or(function() {
                    return this._pred(factTypeSoFar === !0);
                }, function() {
                    return this._pred(this.isVerb(factTypeSoFar, verbSoFar));
                });
                verb = [ "Verb", this._verbForm(verbSoFar) ];
                this._or(function() {
                    this._pred(negated);
                    return verb.push(!0);
                }, function() {
                    return verb.push(!1);
                });
                return verb;
            });
        },
        VerbPart: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._apply("spaces");
            this._not(function() {
                return this._apply("Identifier");
            });
            return this._apply("IdentifierPart");
        },
        JoiningQuantifier: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("matchForAll", "Keyword", [ "and", "at", "most" ]);
        },
        Quantifier: function() {
            var n, m, $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                this._applyWithArgs("Keyword", "each");
                return [ "UniversalQuantification" ];
            }, function() {
                this._applyWithArgs("matchForAny", "Keyword", [ "a", "an", "some" ]);
                return [ "ExistentialQuantification" ];
            }, function() {
                this._applyWithArgs("matchForAll", "Keyword", [ "at", "most" ]);
                n = this._apply("Number");
                return [ "AtMostNQuantification", [ "MaximumCardinality", n ] ];
            }, function() {
                this._applyWithArgs("matchForAll", "Keyword", [ "at", "least" ]);
                n = this._apply("Number");
                return this._or(function() {
                    this._apply("JoiningQuantifier");
                    m = this._apply("Number");
                    return [ "NumericalRangeQuantification", [ "MinimumCardinality", n ], [ "MaximumCardinality", m ] ];
                }, function() {
                    return [ "AtLeastNQuantification", [ "MinimumCardinality", n ] ];
                });
            }, function() {
                this._applyWithArgs("matchForAll", "Keyword", [ "more", "than" ]);
                n = this._apply("Number");
                ++n[1];
                return [ "AtLeastNQuantification", [ "MinimumCardinality", n ] ];
            }, function() {
                this._applyWithArgs("Keyword", "exactly");
                n = this._apply("Number");
                return [ "ExactQuantification", [ "Cardinality", n ] ];
            }, function() {
                this._applyWithArgs("Keyword", "no");
                return [ "ExactQuantification", [ "Cardinality", [ "Number", 0 ] ] ];
            });
        },
        Keyword: function(word, noToken) {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                this._pred(noToken === !0);
                return this._applyWithArgs("seq", word);
            }, function() {
                this._pred(noToken !== !0);
                return this._applyWithArgs("token", word);
            });
        },
        addThat: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("Keyword", "that");
        },
        addThe: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("Keyword", "the");
        },
        addComma: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("Keyword", ",");
        },
        addOr: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("Keyword", "or");
        },
        CreateVar: function(identifier) {
            var $elf = this, varNumber, _fromIdx = this.input.idx;
            varNumber = this.ruleVars[identifier] = this.ruleVarsCount++;
            return [ "Variable", [ "Number", varNumber ], identifier ];
        },
        EmbedVar: function(identifier, data) {
            var $elf = this, _fromIdx = this.input.idx;
            return this.ruleVars[identifier] = data;
        },
        IsAtomicFormulation: function(factType, bindings) {
            var $elf = this, realFactType, _fromIdx = this.input.idx;
            realFactType = this._applyWithArgs("IsFactType", factType);
            this._pred(realFactType);
            return [ "AtomicFormulation" ].concat([ [ "FactType" ].concat(factType) ], bindings);
        },
        ClosedProjection: function(identifier, bind) {
            var $elf = this, verb, _fromIdx = this.input.idx, factType;
            this._apply("addThat");
            return this._or(function() {
                factType = [ identifier ];
                verb = this._applyWithArgs("Verb", factType);
                factType.push(verb);
                return this._or(function() {
                    return this._applyWithArgs("RuleBody", factType, [ bind ]);
                }, function() {
                    return this._applyWithArgs("IsAtomicFormulation", factType, [ bind ]);
                });
            }, function() {
                return this._applyWithArgs("RuleBody", [], [], identifier, bind);
            });
        },
        RuleBody: function(factType, bindings, parentIdentifier, parentBind) {
            var lf, $elf = this, data, thatLF, v, quant, bind, t, tVar, identifier, factTypeIdentifier, _fromIdx = this.input.idx;
            this._or(function() {
                quant = this._apply("Quantifier");
                t = this._applyWithArgs("Term", factType);
                tVar = this._applyWithArgs("CreateVar", t);
                bind = this._applyWithArgs("Bind", t, bindings);
                factType.push(t);
                return this._opt(function() {
                    thatLF = this._applyWithArgs("ClosedProjection", t, bind);
                    tVar.push(thatLF);
                    return this._opt(function() {
                        return this._apply("addComma");
                    });
                });
            }, function() {
                this._apply("addThe");
                identifier = this._applyWithArgs("Identifier", factType);
                this._or(function() {
                    return this._applyWithArgs("Bind", identifier, bindings);
                }, function() {
                    this._applyWithArgs("EmbedVar", identifier, identifier);
                    return this._applyWithArgs("Bind", identifier, bindings);
                });
                return factType.push(identifier);
            }, function() {
                data = this._apply("Value");
                factTypeIdentifier = this._applyWithArgs("IsFactTypeIdentifier", "Type", "Term", factType, data[0]);
                this._pred(factTypeIdentifier !== !1);
                identifier = [ "Term", factTypeIdentifier, "Type", data ];
                this._applyWithArgs("EmbedVar", identifier, data);
                bind = this._applyWithArgs("Bind", identifier, bindings);
                bind[2] = data;
                return factType.push(identifier);
            });
            lf = this._or(function() {
                v = this._applyWithArgs("Verb", factType);
                factType.push(v);
                (function() {
                    if (null != parentIdentifier) {
                        factType.push(parentIdentifier);
                        bindings.push(parentBind);
                    }
                }).call(this);
                return this._or(function() {
                    return this._applyWithArgs("RuleBody", factType, bindings);
                }, function() {
                    return this._applyWithArgs("IsAtomicFormulation", factType, bindings);
                });
            }, function() {
                return this._applyWithArgs("IsAtomicFormulation", factType, bindings);
            });
            return null == quant ? lf : quant.concat([ tVar, lf ]);
        },
        Modifier: function() {
            var $elf = this, r, _fromIdx = this.input.idx;
            this._applyWithArgs("token", "It");
            this._applyWithArgs("token", "is");
            r = this._or(function() {
                this._applyWithArgs("token", "obligatory");
                return [ "ObligationFormulation" ];
            }, function() {
                this._applyWithArgs("token", "necessary");
                return [ "NecessityFormulation" ];
            }, function() {
                this._applyWithArgs("token", "prohibited");
                return [ "ObligationFormulation", [ "LogicalNegation" ] ];
            }, function() {
                this._applyWithArgs("token", "impossible");
                return [ "NecessityFormulation", [ "LogicalNegation" ] ];
            }, function() {
                this._applyWithArgs("token", "not");
                this._applyWithArgs("token", "possible");
                return [ "NecessityFormulation", [ "LogicalNegation" ] ];
            }, function() {
                this._applyWithArgs("token", "possible");
                return [ "PossibilityFormulation" ];
            }, function() {
                this._applyWithArgs("token", "permitted");
                return [ "PermissibilityFormulation" ];
            });
            this._applyWithArgs("token", "that");
            return r;
        },
        StartRule: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._applyWithArgs("token", "R:");
            }, function() {
                return this._applyWithArgs("token", "Rule:");
            });
        },
        NewRule: function() {
            var ruleLF, ruleText, $elf = this, mod, _fromIdx = this.input.idx;
            this._apply("StartRule");
            this._apply("spaces");
            ruleText = this._lookahead(function() {
                return this._apply("toEOL");
            });
            this.ruleVarsCount = 0;
            mod = this._apply("Modifier");
            ruleLF = this._applyWithArgs("RuleBody", [], []);
            this._apply("EOLTerminator");
            2 == mod.length ? mod[1][1] = ruleLF : mod[1] = ruleLF;
            return [ "Rule", mod, [ "StructuredEnglish", ruleText ] ];
        },
        StartFactType: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._applyWithArgs("token", "F:");
            }, function() {
                return this._applyWithArgs("token", "Fact type:");
            });
        },
        NewFactType: function() {
            var $elf = this, v, identifier, _fromIdx = this.input.idx, factType;
            this._apply("StartFactType");
            factType = [];
            this._many1(function() {
                identifier = this._apply("Identifier");
                v = this._apply("addVerb");
                return factType.push(identifier, v);
            });
            this._opt(function() {
                identifier = this._apply("Identifier");
                return factType.push(identifier);
            });
            this._applyWithArgs("AddFactType", factType, factType);
            factType.push([ "Attributes" ]);
            return [ "FactType" ].concat(factType);
        },
        StartVocabulary: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._applyWithArgs("token", "Vocabulary:");
            return "Vocabulary";
        },
        StartTerm: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._or(function() {
                return this._applyWithArgs("token", "T:");
            }, function() {
                return this._applyWithArgs("token", "Term:");
            });
            return "Term";
        },
        StartName: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._or(function() {
                return this._applyWithArgs("token", "N:");
            }, function() {
                return this._applyWithArgs("token", "Name:");
            });
            return "Name";
        },
        NewIdentifier: function() {
            var $elf = this, identifier, identifierType, _fromIdx = this.input.idx;
            identifierType = this._or(function() {
                return this._apply("StartVocabulary");
            }, function() {
                return this._apply("StartTerm");
            }, function() {
                return this._apply("StartName");
            });
            this._apply("ClearSuggestions");
            identifier = this._applyWithArgs("AddIdentifier", identifierType);
            identifier.push([ "Attributes" ]);
            return identifier;
        },
        NewAttribute: function() {
            var currentLine, attrVal, $elf = this, attrName, _fromIdx = this.input.idx;
            currentLine = this.lines[this.lines.length - 1];
            attrName = this._applyWithArgs("AllowedAttrs", currentLine[0]);
            attrName = attrName.replace(/ /g, "");
            this._apply("spaces");
            attrVal = this._applyWithArgs("ApplyFirstExisting", [ "Attr" + attrName, "DefaultAttr" ], [ currentLine ]);
            return function() {
                var lastLine = this.lines.pop();
                lastLine[lastLine.length - 1].push([ attrName, attrVal ]);
                return lastLine;
            }.call(this);
        },
        AllowedAttrs: function(termOrFactType) {
            var $elf = this, attrName, _fromIdx = this.input.idx;
            attrName = this._applyWithArgs("matchForAny", "seq", this.branches.AllowedAttrs.call(this, termOrFactType));
            return attrName.replace(":", "");
        },
        DefaultAttr: function(currentLine) {
            var $elf = this, _fromIdx = this.input.idx;
            return this._apply("toSBVREOL");
        },
        AttrConceptType: function(currentLine) {
            var identifierName, identifierVocab, $elf = this, termName, term, termVocab, identifier, _fromIdx = this.input.idx;
            identifierName = currentLine[1];
            identifierVocab = currentLine[2];
            identifier = currentLine.slice(0, 3);
            this._pred(!this.vocabularies[identifierVocab].ConceptTypes.hasOwnProperty(identifier));
            term = this._apply("Term");
            this._or(function() {
                return this._pred("FactType" == currentLine[0]);
            }, function() {
                termName = term[1];
                termVocab = term[2];
                this._pred(identifierName != termName || identifierVocab != termVocab);
                this.vocabularies[identifierVocab].ConceptTypes[identifier] = term;
                return this.vocabularies[termVocab].IdentifierChildren[termName].push([ identifierName, identifierVocab ]);
            });
            return term;
        },
        AttrDefinition: function(currentLine) {
            var values, term, $elf = this, thatLF, moreValues, b, tVar, value, _fromIdx = this.input.idx;
            return this._or(function() {
                this._opt(function() {
                    return this._apply("addThe");
                });
                this.ruleVarsCount = 0;
                term = this._apply("Term");
                tVar = this._applyWithArgs("CreateVar", term);
                b = this._applyWithArgs("Bind", term);
                thatLF = this._applyWithArgs("ClosedProjection", term, b);
                tVar.push(thatLF);
                this._opt(function() {
                    return this._or(function() {
                        return this._pred("FactType" == currentLine[0]);
                    }, function() {
                        this.vocabularies[currentLine[2]].ConceptTypes[currentLine.slice(0, 3)] = term;
                        return this.vocabularies.IdentifierChildren[term[1]].push([ currentLine[1], currentLine[2] ]);
                    });
                });
                return tVar;
            }, function() {
                value = this._apply("Value");
                values = this._many(function() {
                    this._apply("addComma");
                    return this._apply("Value");
                });
                this._or(function() {
                    return moreValues = this._many1(function() {
                        this._opt(function() {
                            return this._apply("addComma");
                        });
                        this._apply("addOr");
                        return this._apply("Value");
                    });
                }, function() {
                    return this._pred(0 == values.length);
                });
                return [ "Enum", value.concat(values, moreValues) ];
            });
        },
        AttrGuidanceType: function(currentLine) {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("matchForAny", "seq", this.branches.AttrGuidanceType);
        },
        AttrNecessity: function(currentLine) {
            var lf, ruleText, $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                ruleText = this._lookahead(function() {
                    return this._apply("toEOL");
                });
                lf = this._applyWithArgs("RuleBody", [], []);
                this._apply("EOLTerminator");
                return [ "Rule", [ "NecessityFormulation", lf ], [ "StructuredEnglish", "It is necessary that " + ruleText ] ];
            }, function() {
                return this._apply("toSBVREOL");
            });
        },
        AttrReferenceScheme: function(currentLine) {
            var $elf = this, t, _fromIdx = this.input.idx;
            return this._or(function() {
                t = this._apply("Term");
                this._apply("EOLTerminator");
                return t;
            }, function() {
                return this._apply("toSBVREOL");
            });
        },
        AttrSynonym: function(currentLine) {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("AddIdentifier", currentLine[0], currentLine[1]);
        },
        AttrSynonymousForm: function(currentLine) {
            var $elf = this, v, identifier, _fromIdx = this.input.idx, factType;
            factType = [];
            this._many1(function() {
                identifier = this._apply("Identifier");
                v = this._apply("addVerb");
                return factType.push(identifier, v);
            });
            this._opt(function() {
                identifier = this._apply("Identifier");
                return factType.push(identifier);
            });
            this._applyWithArgs("AddFactType", factType, currentLine.slice(1, -1));
            return factType;
        },
        AttrTermForm: function(currentLine) {
            var term, $elf = this, _fromIdx = this.input.idx;
            term = this._applyWithArgs("AddIdentifier", "Term");
            (function() {
                for (var i = 0; currentLine.length > i; i++) if ("Term" == currentLine[i][0]) {
                    var factType = [ term, [ "Verb", "has", !1 ], currentLine[i] ];
                    this.AddFactType(factType, factType);
                }
            }).call(this);
            return term;
        },
        StartComment: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "-");
            this._applyWithArgs("exactly", "-");
            return "--";
        },
        NewComment: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._apply("StartComment");
            return this._apply("toEOL");
        },
        EOLTerminator: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._opt(function() {
                return this._apply("Terminator");
            });
            this._apply("spaces");
            return this._lookahead(function() {
                return this._or(function() {
                    return this._apply("EOL");
                }, function() {
                    return this._apply("end");
                });
            });
        },
        Terminator: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._apply("spaces");
            return this._applyWithArgs("Keyword", ".", !0);
        },
        Line: function() {
            var $elf = this, l, _fromIdx = this.input.idx;
            this._apply("spaces");
            return this._or(function() {
                l = this._or(function() {
                    return this._apply("NewIdentifier");
                }, function() {
                    return this._apply("NewFactType");
                }, function() {
                    return this._apply("NewRule");
                }, function() {
                    return this._apply("NewAttribute");
                });
                this._apply("ClearSuggestions");
                this.lines.push(l);
                return l;
            }, function() {
                return this._apply("NewComment");
            });
        },
        Process: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._opt(function() {
                return this._apply("EOLSpaces");
            });
            this._apply("Line");
            this._many(function() {
                this._apply("EOLSpaces");
                return this._apply("Line");
            });
            this._many(function() {
                return this._apply("space");
            });
            this._apply("end");
            return this.lines;
        }
    });
    SBVRParser.ClearSuggestions = function() {};
    SBVRParser.initialize = function() {
        this.tokensEnabled = !1;
        this.reset();
    };
    SBVRParser._enableTokens = function() {
        this.tokensEnabled = !0;
        SBVRLibs._enableTokens.call(this, [ "StartVocabulary", "StartTerm", "StartName", "StartFactType", "StartRule", "NewComment", "Vocabulary", "Term", "Name", "Modifier", "Verb", "Keyword", "AllowedAttrs", "AttrGuidanceType", "Number", "Value" ]);
    };
    SBVRParser._sideEffectingRules = [ "Process", "Line", "NewIdentifier", "AddIdentifier", "NewFactType", "AddFactType", "NewAttribute", "AttrConceptType", "AttrDefinition", "AttrSynonym", "AttrSynonymousForm", "AttrTermForm" ];
    SBVRParser._AddIdentifier = function(identifierType, identifier, baseSynonym) {
        null == baseSynonym && (baseSynonym = identifier);
        if ("Vocabulary" == identifierType) this.AddVocabulary(identifier, baseSynonym); else {
            var vocabulary = this.vocabularies[this.currentVocabulary];
            vocabulary.IdentifierChildren.hasOwnProperty(identifier) && this._pred(!1);
            baseSynonym == identifier ? vocabulary.IdentifierChildren[baseSynonym] = [] : vocabulary.IdentifierChildren[baseSynonym].push([ identifier, this.currentVocabulary ]);
            vocabulary[identifierType][identifier] = baseSynonym;
        }
        this.longestIdentifier[identifierType] = Math.max(identifier.length, identifier.pluralize().length, this.longestIdentifier[identifierType]);
    };
    SBVRParser.BaseSynonym = function(vocabulary, identifierType, identifier) {
        var identifiers = this.vocabularies[vocabulary][identifierType];
        if (identifiers.hasOwnProperty(identifier)) return identifiers[identifier];
        identifier = identifier.singularize();
        return identifiers.hasOwnProperty(identifier) ? identifiers[identifier] : !1;
    };
    SBVRParser.IsFactTypeIdentifier = function(vocabulary, identifierType, factTypeSoFar, identifier) {
        identifier = this.BaseSynonym(vocabulary, identifierType, identifier);
        if (identifier === !1) return !1;
        var identifiers = this.branches[identifierType].call(this, factTypeSoFar, vocabulary);
        return -1 !== identifiers.indexOf(identifier) ? identifier : !1;
    };
    SBVRParser.isVerb = function(factTypeSoFar, verb) {
        verb = [ "Verb", this._verbForm(verb) ];
        var currentLevel = this._traverseFactType(factTypeSoFar);
        return currentLevel === !1 ? !1 : currentLevel.hasOwnProperty(verb) ? !0 : currentLevel.hasOwnProperty("__valid") ? this.isVerb([], verb) : !1;
    };
    SBVRParser._verbForm = function(verb) {
        return "are " == verb.slice(0, 4) ? "is " + verb.slice(4) : "are" == verb ? "is" : "have" == verb ? "has" : verb;
    };
    SBVRParser.IsFactType = function(factType) {
        var currentLevel = this._traverseFactType(factType);
        return currentLevel === !1 ? !1 : currentLevel.__valid;
    };
    var removeRegex = RegExp("^(?:" + [ "" + [ "Term", "" ], "" + [ "Name", "" ], "" + [ "Verb", "" ] ].join("|") + ")(.*?)(?:,(.*))?$"), allowedAttrLists = [ "Concept Type:", "Definition:", "Definition (Informal):", "Description:", "Dictionary Basis:", "Example:", "General Concept:", "Namespace URI:", "Necessity:", "Note:", "Possibility:", "Reference Scheme:", "See:", "Source:", "Subject Field:" ];
    allowedAttrLists = [ "Database ID Field:", "Database Table Name:" ].concat(allowedAttrLists);
    allowedAttrLists = {
        Term: [ "Synonym:" ].concat(allowedAttrLists),
        Name: [ "Synonym:" ].concat(allowedAttrLists),
        FactType: [ "Synonymous Form:", "Term Form:" ].concat(allowedAttrLists),
        Rule: [ "Rule Name:", "Guidance Type:", "Source:", "Synonymous Statement:", "Note:", "Example:", "Enforcement Level:" ]
    };
    var getValidFactTypeParts = function(vocabulary, identifierType, factTypeSoFar) {
        var vocabularies = this.vocabularies;
        if (null == factTypeSoFar || 0 == factTypeSoFar.length) {
            var identifiers;
            identifiers = null == vocabulary ? vocabularies[this.currentVocabulary][identifierType] : vocabularies[vocabulary][identifierType];
            return _.keys(identifiers);
        }
        var factTypePart, currentLevel = this._traverseFactType(factTypeSoFar), factTypeParts = {}, followChildrenChain = function(vocabulary, identifier) {
            vocabulary = vocabularies[vocabulary];
            var identifiers = vocabulary[identifierType];
            identifiers.hasOwnProperty(identifier) && (factTypeParts[identifiers[identifier]] = !0);
            for (var i = 0; vocabulary.IdentifierChildren[identifier].length > i; i++) {
                var child = vocabulary.IdentifierChildren[identifier][i];
                followChildrenChain(child[1], child[0]);
            }
        };
        for (factTypePart in currentLevel) if (currentLevel.hasOwnProperty(factTypePart)) {
            var matches = removeRegex.exec(factTypePart), factTypePartVocabulary;
            if (null != matches) {
                factTypePart = matches[1];
                if (matches[2]) {
                    factTypePartVocabulary = matches[2];
                    followChildrenChain(factTypePartVocabulary, factTypePart);
                } else factTypeParts[factTypePart] = !0;
            }
        }
        return _.keys(factTypeParts);
    };
    SBVRParser.reset = function() {
        SBVRLibs.initialize.call(this);
        this.branches = {
            ClearSuggestions: [],
            StartVocabulary: [ "Vocabulary:" ],
            StartTerm: [ "Term:      " ],
            StartName: [ "Name:      " ],
            StartFactType: [ "Fact type: " ],
            StartRule: [ "Rule:      " ],
            Vocabulary: function(factTypeSoFar) {
                return _.keys(this.vocabularies);
            },
            Term: function(factTypeSoFar, vocabulary) {
                return getValidFactTypeParts.call(this, vocabulary, "Term", factTypeSoFar);
            },
            Name: function(factTypeSoFar, vocabulary) {
                return getValidFactTypeParts.call(this, vocabulary, "Name", factTypeSoFar);
            },
            Verb: function(factTypeSoFar, vocabulary) {
                return getValidFactTypeParts.call(this, vocabulary, "Verb", factTypeSoFar);
            },
            AllowedAttrs: function(termOrFactType) {
                return allowedAttrLists.hasOwnProperty(termOrFactType) ? allowedAttrLists[termOrFactType] : null == termOrFactType ? allowedAttrLists.Term.concat(allowedAttrLists.Name, allowedAttrLists.FactType) : [];
            },
            AttrGuidanceType: [ "operative business rule", "structural business rule", "advice of permission", "advice of possibility", "advice of optionality", "advice of contingency" ],
            Modifier: [ "It is obligatory that", "It is necessary that", "It is prohibited that", "It is impossible that", "It is not possible that", "It is possible that", "It is permitted that" ],
            Quantifier: [ "each", "a", "an", "some", "at most", "at least", "more than", "exactly", "no" ],
            JoiningQuantifier: [ "and at most" ],
            Number: [ "1", "2", "3", "4", "5", "6", "7", "8", "9", "one" ],
            addThat: [ "that", "that the" ],
            addThe: [ "the" ],
            addComma: [ "," ],
            addOr: [ "or" ],
            Terminator: [ "." ]
        };
        this.longestIdentifier = {
            Vocabulary: 0,
            Term: 0,
            Name: 0
        };
        this.ruleVars = {};
        this.ruleVarsCount = 0;
        this.lines = [ "Model" ];
        var origInputHead = this.inputHead;
        this.inputHead = dataTypesInputHead;
        this.matchAll(dataTypesVocabulary, "Process");
        dataTypesInputHead = this.inputHead;
        this.matchAll("Vocabulary: Default", "Process");
        this.inputHead = origInputHead;
    };
    SBVRParser.matchForAny = function(rule, arr) {
        for (var $elf = this, origInput = this.input, ref = {}, result = ref, idx = 0; arr.length > idx; idx++) {
            try {
                $elf.input = origInput;
                result = $elf._applyWithArgs.call($elf, rule, arr[idx]);
            } catch (e) {
                if (!(e instanceof SyntaxError)) throw e;
            } finally {}
            if (result !== ref) return result;
        }
        throw this._fail();
    };
    SBVRParser.matchForAll = function(rule, arr) {
        for (var idx = 0; arr.length > idx; idx++) this._applyWithArgs.call(this, rule, arr[idx]);
    };
    SBVRParser.exactly = function(wanted) {
        if (wanted.toLowerCase() === this._apply("lowerCaseAnything")) return wanted;
        throw this._fail();
    };
    SBVRParser.lowerCaseAnything = function() {
        return this._apply("anything").toLowerCase();
    };
    SBVRParser._disablePrependingInput();
    return SBVRParser;
});

define("ometa!sbvr-compiler/LFValidator", [ "ometa!sbvr-parser/SBVRLibs", "ometa-core" ], function(SBVRLibs) {
    var LFValidator = SBVRLibs._extend({
        trans: function() {
            var $elf = this, a, t, _fromIdx = this.input.idx;
            this._form(function() {
                t = this._apply("anything");
                return a = this._applyWithArgs("apply", t);
            });
            return a;
        },
        token: function(x) {
            var $elf = this, a, t, _fromIdx = this.input.idx;
            this._form(function() {
                t = this._apply("anything");
                this._pred(t == x);
                return a = this._applyWithArgs("apply", x);
            });
            return a;
        },
        letters: function() {
            var $elf = this, l, _fromIdx = this.input.idx;
            l = this._many1(function() {
                return this._apply("letter");
            });
            this._many(function() {
                return this._apply("space");
            });
            return l.join("");
        },
        Number: function() {
            var n, $elf = this, _fromIdx = this.input.idx;
            n = this._apply("number");
            this._pred(!isNaN(n));
            return [ "Number", parseInt(n, 10) ];
        },
        Model: function() {
            var xs, $elf = this, x, _fromIdx = this.input.idx;
            xs = [];
            this._many(function() {
                x = this._or(function() {
                    return this._applyWithArgs("token", "Vocabulary");
                }, function() {
                    return this._applyWithArgs("token", "Term");
                }, function() {
                    return this._applyWithArgs("token", "Name");
                }, function() {
                    return this._applyWithArgs("token", "FactType");
                }, function() {
                    return this._applyWithArgs("token", "Rule");
                });
                return this._opt(function() {
                    this._pred(null != x);
                    return xs.push(x);
                });
            });
            return [ "Model" ].concat(xs);
        },
        FactType: function() {
            var attrs, $elf = this, identifier, verb, _fromIdx = this.input.idx, factType;
            factType = [];
            this._many(function() {
                identifier = this._or(function() {
                    return this._applyWithArgs("token", "Term");
                }, function() {
                    return this._applyWithArgs("token", "Name");
                });
                verb = this._applyWithArgs("token", "Verb");
                return factType = factType.concat([ identifier, verb ]);
            });
            this._opt(function() {
                identifier = this._or(function() {
                    return this._applyWithArgs("token", "Term");
                }, function() {
                    return this._applyWithArgs("token", "Name");
                });
                return factType.push(identifier);
            });
            this._opt(function() {
                return this._lookahead(function() {
                    attrs = this._apply("anything");
                    return this._applyWithArgs("AddFactType", factType, factType);
                });
            });
            return this._applyWithArgs("addAttributes", [ "FactType" ].concat(factType));
        },
        Vocabulary: function() {
            var vocab, $elf = this, _fromIdx = this.input.idx;
            vocab = this._apply("anything");
            this._applyWithArgs("AddVocabulary", vocab, vocab);
            return this._applyWithArgs("addAttributes", [ "Vocabulary", vocab ]);
        },
        Term: function() {
            var vocab, term, $elf = this, data, _fromIdx = this.input.idx;
            term = this._apply("anything");
            vocab = this._apply("anything");
            return this._or(function() {
                data = this._or(function() {
                    return this._applyWithArgs("token", "Number");
                }, function() {
                    return this._apply("Value");
                });
                return [ "Term", term, vocab, data ];
            }, function() {
                return this._applyWithArgs("addAttributes", [ "Term", term, vocab ]);
            });
        },
        Name: function() {
            var vocab, $elf = this, name, _fromIdx = this.input.idx;
            name = this._apply("anything");
            vocab = this._apply("anything");
            return this._applyWithArgs("addAttributes", [ "Name", name, vocab ]);
        },
        Verb: function() {
            var $elf = this, v, negated, _fromIdx = this.input.idx;
            v = this._apply("anything");
            negated = this._or(function() {
                return this._apply("true");
            }, function() {
                return this._apply("false");
            });
            return [ "Verb", v, negated ];
        },
        Rule: function() {
            var $elf = this, x, t, _fromIdx = this.input.idx;
            x = this._or(function() {
                return this._applyWithArgs("token", "ObligationFormulation");
            }, function() {
                return this._applyWithArgs("token", "NecessityFormulation");
            }, function() {
                return this._applyWithArgs("token", "PossibilityFormulation");
            }, function() {
                return this._applyWithArgs("token", "PermissibilityFormulation");
            });
            t = this._applyWithArgs("token", "StructuredEnglish");
            return [ "Rule", x, t ];
        },
        addAttributes: function(termOrFactType) {
            var attrVal, $elf = this, attrsFound, attrName, _fromIdx = this.input.idx, attrs;
            this._or(function() {
                return this._apply("end");
            }, function() {
                attrsFound = {};
                attrs = [ "Attributes" ];
                this._form(function() {
                    this._applyWithArgs("exactly", "Attributes");
                    this._many(function() {
                        return this._form(function() {
                            attrName = this._apply("anything");
                            attrVal = this._applyWithArgs("ApplyFirstExisting", [ "Attr" + attrName, "DefaultAttr" ], [ termOrFactType ]);
                            return this._opt(function() {
                                this._pred(null != attrVal);
                                attrsFound[attrName] = attrVal;
                                return attrs.push([ attrName, attrVal ]);
                            });
                        });
                    });
                    return this._apply("end");
                });
                return this._applyWithArgs("defaultAttributes", termOrFactType, attrsFound, attrs);
            });
            return termOrFactType;
        },
        DefaultAttr: function(tableID) {
            var $elf = this, _fromIdx = this.input.idx;
            return this._apply("anything");
        },
        AttrConceptType: function(termOrFactType) {
            var vocab, term, $elf = this, conceptType, _fromIdx = this.input.idx;
            term = this._form(function() {
                this._applyWithArgs("exactly", "Term");
                conceptType = this._apply("anything");
                return vocab = this._apply("anything");
            });
            this.vocabularies[this.currentVocabulary].ConceptTypes[termOrFactType] = term;
            return term;
        },
        AttrDefinition: function(termOrFactType) {
            var values, $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._form(function() {
                    this._applyWithArgs("exactly", "Enum");
                    return values = this._apply("anything");
                });
            }, function() {
                return this._apply("trans");
            });
        },
        AttrNecessity: function(termOrFactType) {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._applyWithArgs("token", "Rule");
            }, function() {
                return this._apply("DefaultAttr");
            });
        },
        AttrSynonymousForm: function(factType) {
            var $elf = this, synForm, _fromIdx = this.input.idx;
            synForm = this._apply("anything");
            this._applyWithArgs("AddFactType", synForm, factType.slice(1));
            return synForm;
        },
        StructuredEnglish: function() {
            var $elf = this, a, _fromIdx = this.input.idx;
            a = this._apply("anything");
            return [ "StructuredEnglish", a ];
        },
        ObligationFormulation: function() {
            var xs, $elf = this, _fromIdx = this.input.idx;
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "ObligationFormulation" ].concat(xs);
        },
        NecessityFormulation: function() {
            var xs, $elf = this, _fromIdx = this.input.idx;
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "NecessityFormulation" ].concat(xs);
        },
        PossibilityFormulation: function() {
            var xs, $elf = this, _fromIdx = this.input.idx;
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "PossibilityFormulation" ].concat(xs);
        },
        PermissibilityFormulation: function() {
            var xs, $elf = this, _fromIdx = this.input.idx;
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "PermissibilityFormulation" ].concat(xs);
        },
        LogicalNegation: function() {
            var xs, $elf = this, _fromIdx = this.input.idx;
            xs = this._apply("trans");
            return [ "LogicalNegation" ].concat([ xs ]);
        },
        quant: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._applyWithArgs("token", "UniversalQuantification");
            }, function() {
                return this._applyWithArgs("token", "ExistentialQuantification");
            }, function() {
                return this._applyWithArgs("token", "ExactQuantification");
            }, function() {
                return this._applyWithArgs("token", "AtMostNQuantification");
            }, function() {
                return this._applyWithArgs("token", "AtLeastNQuantification");
            }, function() {
                return this._applyWithArgs("token", "NumericalRangeQuantification");
            });
        },
        UniversalQuantification: function() {
            var xs, $elf = this, v, _fromIdx = this.input.idx;
            v = this._applyWithArgs("token", "Variable");
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "UniversalQuantification", v ].concat(xs);
        },
        ExistentialQuantification: function() {
            var xs, $elf = this, v, _fromIdx = this.input.idx;
            v = this._applyWithArgs("token", "Variable");
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "ExistentialQuantification", v ].concat(xs);
        },
        ExactQuantification: function() {
            var xs, $elf = this, v, i, _fromIdx = this.input.idx;
            i = this._applyWithArgs("token", "Cardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "ExactQuantification", i, v ].concat(xs);
        },
        AtMostNQuantification: function() {
            var xs, $elf = this, a, v, _fromIdx = this.input.idx;
            a = this._applyWithArgs("token", "MaximumCardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "AtMostNQuantification", a, v ].concat(xs);
        },
        AtLeastNQuantification: function() {
            var xs, $elf = this, v, i, _fromIdx = this.input.idx;
            i = this._applyWithArgs("token", "MinimumCardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "AtLeastNQuantification", i, v ].concat(xs);
        },
        NumericalRangeQuantification: function() {
            var xs, $elf = this, a, v, i, _fromIdx = this.input.idx;
            i = this._applyWithArgs("token", "MinimumCardinality");
            a = this._applyWithArgs("token", "MaximumCardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "NumericalRangeQuantification", i, a, v ].concat(xs);
        },
        Cardinality: function() {
            var n, $elf = this, _fromIdx = this.input.idx;
            n = this._applyWithArgs("token", "Number");
            return [ "Cardinality", n ];
        },
        MinimumCardinality: function() {
            var n, $elf = this, _fromIdx = this.input.idx;
            n = this._applyWithArgs("token", "Number");
            return [ "MinimumCardinality", n ];
        },
        MaximumCardinality: function() {
            var n, $elf = this, _fromIdx = this.input.idx;
            n = this._applyWithArgs("token", "Number");
            return [ "MaximumCardinality", n ];
        },
        Variable: function() {
            var w, term, $elf = this, num, _fromIdx = this.input.idx;
            num = this._applyWithArgs("token", "Number");
            term = this._applyWithArgs("token", "Term");
            w = this._many(function() {
                return this._or(function() {
                    return this._applyWithArgs("token", "AtomicFormulation");
                }, function() {
                    return this._apply("quant");
                });
            });
            return [ "Variable", num, term ].concat(w);
        },
        Real: function() {
            var $elf = this, num, _fromIdx = this.input.idx;
            num = this._apply("number");
            this._pred(!isNaN(num));
            return [ "Real", num ];
        },
        Integer: function() {
            var $elf = this, num, _fromIdx = this.input.idx;
            num = this._apply("number");
            this._pred(!isNaN(num));
            return [ "Integer", num ];
        },
        Text: function() {
            var $elf = this, text, _fromIdx = this.input.idx;
            text = this._apply("anything");
            return [ "Text", text ];
        },
        Value: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._applyWithArgs("token", "Real");
            }, function() {
                return this._applyWithArgs("token", "Integer");
            }, function() {
                return this._applyWithArgs("token", "Text");
            });
        },
        RoleBinding: function() {
            var bindIdentifier, $elf = this, identifier, _fromIdx = this.input.idx;
            identifier = this._or(function() {
                return this._applyWithArgs("token", "Term");
            }, function() {
                return this._applyWithArgs("token", "Name");
            });
            bindIdentifier = this._or(function() {
                return this._apply("number");
            }, function() {
                return this._apply("Value");
            });
            return [ "RoleBinding", identifier, bindIdentifier ];
        },
        AtomicFormulation: function() {
            var f, $elf = this, b, _fromIdx = this.input.idx;
            f = this._applyWithArgs("token", "FactType");
            b = this._many(function() {
                return this._applyWithArgs("token", "RoleBinding");
            });
            return [ "AtomicFormulation", f ].concat(b);
        }
    });
    LFValidator.initialize = function() {
        SBVRLibs.initialize.call(this);
    };
    LFValidator.defaultAttributes = function(termOrVerb, attrsFound, attrs) {
        termOrVerb.push(attrs);
    };
    return LFValidator;
});

define("ometa!sbvr-compiler/LFOptimiser", [ "ometa!sbvr-compiler/LFValidator" ], function(LFValidator) {
    var LFOptimiser = LFValidator._extend({
        Helped: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._pred(this.helped === !0);
            return this.helped = !1;
        },
        SetHelped: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this.helped = !0;
        },
        Process: function() {
            var $elf = this, x, _fromIdx = this.input.idx;
            x = this._apply("anything");
            x = this._applyWithArgs("trans", x);
            this._many(function() {
                this._applyWithArgs("Helped", "disableMemoisation");
                return x = this._applyWithArgs("trans", x);
            });
            return x;
        },
        AtLeastNQuantification: function() {
            var xs, $elf = this, v, i, _fromIdx = this.input.idx;
            return this._or(function() {
                i = this._applyWithArgs("token", "MinimumCardinality");
                this._pred(1 == i[1][1]);
                v = this._applyWithArgs("token", "Variable");
                xs = this._many(function() {
                    return this._apply("trans");
                });
                this._apply("SetHelped");
                return [ "ExistentialQuantification", v ].concat(xs);
            }, function() {
                return LFValidator._superApplyWithArgs(this, "AtLeastNQuantification");
            });
        },
        NumericalRangeQuantification: function() {
            var xs, $elf = this, v, i, j, _fromIdx = this.input.idx;
            return this._or(function() {
                i = this._applyWithArgs("token", "MinimumCardinality");
                j = this._applyWithArgs("token", "MaximumCardinality");
                this._pred(i[1][1] == j[1][1]);
                v = this._applyWithArgs("token", "Variable");
                xs = this._many(function() {
                    return this._apply("trans");
                });
                this._apply("SetHelped");
                return [ "ExactQuantification", [ "Cardinality", i[1] ], v ].concat(xs);
            }, function() {
                return LFValidator._superApplyWithArgs(this, "NumericalRangeQuantification");
            });
        },
        LogicalNegation: function() {
            var xs, $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "LogicalNegation");
                    return xs = this._apply("trans");
                });
                this._apply("SetHelped");
                return xs;
            }, function() {
                return LFValidator._superApplyWithArgs(this, "LogicalNegation");
            });
        }
    });
    LFOptimiser.initialize = function() {
        LFValidator.initialize.call(this);
        this._didSomething = !1;
    };
    return LFOptimiser;
});

define("ometa!sbvr-compiler/LF2AbstractSQLPrep", [ "ometa!sbvr-compiler/LFOptimiser" ], function(LFOptimiser) {
    var LF2AbstractSQLPrep = LFOptimiser._extend({
        AttrConceptType: function(termName) {
            var $elf = this, conceptType, _fromIdx = this.input.idx;
            conceptType = LFOptimiser._superApplyWithArgs(this, "AttrConceptType", termName);
            this._opt(function() {
                this._pred(this.primitives[termName] === !1 && this.primitives[conceptType] !== !1);
                this.primitives[conceptType] = !1;
                return this._apply("SetHelped");
            });
            return conceptType;
        },
        AttrDatabaseAttribute: function(termOrFactType) {
            var attrVal, $elf = this, newAttrVal, _fromIdx = this.input.idx;
            attrVal = this._apply("anything");
            newAttrVal = "Term" == termOrFactType[0] && (!this.attributes.hasOwnProperty(termOrFactType[3]) || this.attributes[termOrFactType[3]] === !0) || "FactType" == termOrFactType[0] && 4 == termOrFactType.length && (!this.attributes.hasOwnProperty(termOrFactType[3]) || this.attributes[termOrFactType[3]] === !0) && this.primitives.hasOwnProperty(termOrFactType[3]) && this.primitives[termOrFactType[3]] !== !1;
            this.attributes[termOrFactType] = newAttrVal;
            this._opt(function() {
                this._pred(newAttrVal != attrVal);
                return this._apply("SetHelped");
            });
            return newAttrVal;
        },
        AttrDatabasePrimitive: function(termOrFactType) {
            var attrVal, $elf = this, newAttrVal, _fromIdx = this.input.idx;
            attrVal = this._apply("anything");
            newAttrVal = attrVal;
            this._opt(function() {
                this._pred(this.primitives.hasOwnProperty(termOrFactType));
                newAttrVal = this.primitives[termOrFactType];
                this._pred(newAttrVal != attrVal);
                return this._apply("SetHelped");
            });
            this.primitives[termOrFactType] = newAttrVal;
            return newAttrVal;
        },
        UniversalQuantification: function() {
            var xs, $elf = this, v, _fromIdx = this.input.idx;
            v = this._applyWithArgs("token", "Variable");
            xs = this._many(function() {
                return this._apply("trans");
            });
            this._apply("SetHelped");
            return [ "LogicalNegation", [ "ExistentialQuantification", v, [ "LogicalNegation" ].concat(xs) ] ];
        },
        AtMostNQuantification: function() {
            var xs, $elf = this, maxCard, v, _fromIdx = this.input.idx;
            maxCard = this._applyWithArgs("token", "MaximumCardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many(function() {
                return this._apply("trans");
            });
            this._apply("SetHelped");
            maxCard[1][1]++;
            return [ "LogicalNegation", [ "AtLeastNQuantification", [ "MinimumCardinality", maxCard[1] ], v ].concat(xs) ];
        },
        CardinalityOptimisation2: function(v1) {
            var atomicForm, required, $elf = this, actualFactType, card, v2, _fromIdx = this.input.idx, factType;
            this._pred(3 == v1.length);
            this._or(function() {
                return this._form(function() {
                    this._applyWithArgs("exactly", "ExactQuantification");
                    card = this._applyWithArgs("token", "Cardinality");
                    this._pred(1 == card[1][1]);
                    v2 = this._applyWithArgs("token", "Variable");
                    this._pred(3 == v2.length);
                    atomicForm = this._applyWithArgs("token", "AtomicFormulation");
                    return required = !0;
                });
            }, function() {
                return this._form(function() {
                    this._applyWithArgs("exactly", "AtMostNQuantification");
                    card = this._applyWithArgs("token", "MaximumCardinality");
                    this._pred(1 == card[1][1]);
                    v2 = this._applyWithArgs("token", "Variable");
                    this._pred(3 == v2.length);
                    atomicForm = this._applyWithArgs("token", "AtomicFormulation");
                    return required = !1;
                });
            });
            this._apply("end");
            factType = atomicForm[1];
            this._pred(4 == atomicForm.length && 4 == factType.length);
            actualFactType = this._applyWithArgs("ActualFactType", factType.slice(1));
            actualFactType = [ "FactType" ].concat(actualFactType);
            this._or(function() {
                this._pred(this.IdentifiersEqual(v1[2], actualFactType[1]) && this.IdentifiersEqual(v2[2], actualFactType[3]));
                return this.foreignKeys[actualFactType] = required;
            }, function() {
                this._pred(this.IdentifiersEqual(v1[2], actualFactType[3]) && this.IdentifiersEqual(v2[2], actualFactType[1]));
                return this.uniqueKeys[actualFactType] = required;
            });
            return this._apply("SetHelped");
        },
        CardinalityOptimisation: function() {
            var v1, $elf = this, _fromIdx = this.input.idx;
            return this._form(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "LogicalNegation":
                        return this._form(function() {
                            this._applyWithArgs("exactly", "ExistentialQuantification");
                            v1 = this._applyWithArgs("token", "Variable");
                            return this._form(function() {
                                this._applyWithArgs("exactly", "LogicalNegation");
                                return this._applyWithArgs("CardinalityOptimisation2", v1);
                            });
                        });

                      case "UniversalQuantification":
                        return function() {
                            v1 = this._applyWithArgs("token", "Variable");
                            this._pred(3 == v1.length);
                            return this._applyWithArgs("CardinalityOptimisation2", v1);
                        }.call(this);

                      default:
                        throw this._fail();
                    }
                }.call(this);
            });
        },
        NecessityOptimisation: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._apply("CardinalityOptimisation");
        },
        ObligationOptimisation: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._apply("CardinalityOptimisation");
        },
        Rule: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                this._form(function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case "NecessityFormulation":
                            return this._apply("NecessityOptimisation");

                          case "ObligationFormulation":
                            return this._apply("ObligationOptimisation");

                          default:
                            throw this._fail();
                        }
                    }.call(this);
                });
                this._applyWithArgs("token", "StructuredEnglish");
                return null;
            }, function() {
                return LFOptimiser._superApplyWithArgs(this, "Rule");
            });
        }
    });
    LF2AbstractSQLPrep.initialize = function() {
        LFOptimiser.initialize.call(this);
        this.foreignKeys = {};
        this.uniqueKeys = {};
        this.primitives = {};
        this.attributes = {};
    };
    LF2AbstractSQLPrep.defaultAttributes = function(termOrFactType, attrsFound, attrs) {
        switch (termOrFactType[0]) {
          case "Name":
          case "Term":
            if (!this.IsPrimitive(termOrFactType) && !attrsFound.hasOwnProperty("DatabaseIDField")) {
                attrs.splice(1, 0, [ "DatabaseIDField", "id" ]);
                this.SetHelped();
            }
            if (!attrsFound.hasOwnProperty("ReferenceScheme")) {
                attrs.splice(1, 0, [ "ReferenceScheme", "id" ]);
                this.SetHelped();
            }
            if (!attrsFound.hasOwnProperty("DatabaseTableName")) {
                attrs.splice(1, 0, [ "DatabaseTableName", termOrFactType[1].replace(RegExp(" ", "g"), "_") ]);
                this.SetHelped();
            }
            if (!attrsFound.hasOwnProperty("DatabasePrimitive")) {
                this.primitives.hasOwnProperty(termOrFactType) || (this.primitives[termOrFactType] = this.IsPrimitive(termOrFactType));
                attrs.splice(1, 0, [ "DatabasePrimitive", this.primitives[termOrFactType] ]);
                this.SetHelped();
            }
            break;

          case "FactType":
            if (!this.IsPrimitive(termOrFactType[1])) {
                if (!attrsFound.hasOwnProperty("DatabaseIDField")) {
                    attrs.splice(1, 0, [ "DatabaseIDField", "id" ]);
                    this.SetHelped();
                }
                if (!attrsFound.hasOwnProperty("DatabaseTableName")) {
                    for (var tableName = termOrFactType[1][1].replace(RegExp(" ", "g"), "_"), i = 2; termOrFactType.length > i; i++) tableName += "-" + termOrFactType[i][1].replace(RegExp(" ", "g"), "_");
                    attrs.splice(1, 0, [ "DatabaseTableName", tableName ]);
                    this.SetHelped();
                }
                if (this.uniqueKeys.hasOwnProperty(termOrFactType)) if (attrsFound.hasOwnProperty("Unique")) {
                    if (attrsFound.Unique != this.uniqueKeys[termOrFactType]) {
                        console.error(attrsFound.Unique, this.uniqueKeys[termOrFactType]);
                        ___MISMATCHED_UNIQUE_KEY___.die();
                    }
                } else {
                    attrs.splice(1, 0, [ "Unique", this.uniqueKeys[termOrFactType] ]);
                    this.SetHelped();
                }
                if (this.foreignKeys.hasOwnProperty(termOrFactType)) {
                    if (!attrsFound.hasOwnProperty("DatabaseAttribute")) {
                        attrs.splice(1, 0, [ "DatabaseAttribute", !1 ]);
                        this.SetHelped();
                    }
                    if (attrsFound.hasOwnProperty("ForeignKey")) {
                        if (attrsFound.ForeignKey != this.foreignKeys[termOrFactType]) {
                            console.error(attrsFound.ForeignKey, this.foreignKeys[termOrFactType]);
                            ___MISMATCHED_FOREIGN_KEY___.die();
                        }
                    } else {
                        attrs.splice(1, 0, [ "ForeignKey", this.foreignKeys[termOrFactType] ]);
                        this.SetHelped();
                    }
                }
                if (3 == termOrFactType.length) {
                    this.primitives.hasOwnProperty(termOrFactType[1]) && this.primitives[termOrFactType[1]] === !1 || this.SetHelped();
                    this.primitives[termOrFactType[1]] = !1;
                } else if (termOrFactType.length > 4) for (var i = 1; termOrFactType.length > i; i += 2) {
                    this.attributes.hasOwnProperty(termOrFactType[i]) && this.attributes[termOrFactType[i]] === !1 || this.SetHelped();
                    this.attributes[termOrFactType[i]] = !1;
                }
            }
        }
        termOrFactType.push(attrs);
    };
    return LF2AbstractSQLPrep;
});

define("ometa!sbvr-compiler/LF2AbstractSQL", [ "ometa!sbvr-parser/SBVRLibs", "ometa-core" ], function(SBVRLibs) {
    var _ = require("underscore"), LF2AbstractSQL = SBVRLibs._extend({
        Number: function() {
            var $elf = this, num, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Number");
                num = this._apply("number");
                return this._pred(!isNaN(num));
            });
            return num;
        },
        Real: function() {
            var $elf = this, num, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Real");
                num = this._apply("number");
                return this._pred(!isNaN(num));
            });
            return [ "Real", num ];
        },
        Integer: function() {
            var $elf = this, num, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Integer");
                num = this._apply("number");
                return this._pred(!isNaN(num));
            });
            return [ "Integer", num ];
        },
        Text: function() {
            var $elf = this, text, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Text");
                return text = this._apply("anything");
            });
            return [ "Text", text ];
        },
        Value: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._apply("Real");
            }, function() {
                return this._apply("Integer");
            }, function() {
                return this._apply("Text");
            });
        },
        Identifier: function() {
            var vocab, $elf = this, num, type, name, _fromIdx = this.input.idx;
            num = "";
            this._form(function() {
                type = function() {
                    switch (this._apply("anything")) {
                      case "Term":
                        return "Term";

                      case "Name":
                        return "Name";

                      default:
                        throw this._fail();
                    }
                }.call(this);
                name = this._apply("anything");
                vocab = this._apply("anything");
                return this._opt(function() {
                    return this._or(function() {
                        return num = this._apply("Number");
                    }, function() {
                        return this._apply("Value");
                    });
                });
            });
            return {
                type: type,
                name: name,
                num: num,
                vocab: vocab
            };
        },
        IdentifierName: function() {
            var identifierName, $elf = this, resourceName, _fromIdx = this.input.idx;
            identifierName = this._apply("anything");
            resourceName = this._applyWithArgs("GetResourceName", identifierName);
            this._or(function() {
                return this._pred(!this.tables.hasOwnProperty(resourceName));
            }, function() {
                console.error("We already have an identifier with a name of: " + identifierName);
                return this._pred(!1);
            });
            this.identifiers[identifierName] = identifierName;
            this.tables[resourceName] = {
                fields: [],
                primitive: !1,
                name: null,
                idField: null
            };
            return identifierName;
        },
        Attributes: function(termOrFactType) {
            var attributeValue, $elf = this, attributeName, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._apply("end");
            }, function() {
                return this._form(function() {
                    this._applyWithArgs("exactly", "Attributes");
                    return this._many(function() {
                        return this._form(function() {
                            attributeName = this._apply("anything");
                            return attributeValue = this._applyWithArgs("ApplyFirstExisting", [ "Attr" + attributeName, "DefaultAttr" ], [ termOrFactType ]);
                        });
                    });
                });
            });
        },
        DefaultAttr: function(termOrFactType) {
            var $elf = this, anything, _fromIdx = this.input.idx;
            anything = this._apply("anything");
            return console.log("Default", termOrFactType, anything);
        },
        AttrConceptType: function(termOrFactType) {
            var vocab, term, $elf = this, conceptTable, primitive, conceptType, dataType, fieldID, _fromIdx = this.input.idx, identifierTable;
            term = this._form(function() {
                this._applyWithArgs("exactly", "Term");
                conceptType = this._apply("anything");
                return vocab = this._apply("anything");
            });
            this.vocabularies[termOrFactType[2]].ConceptTypes[termOrFactType] = term;
            primitive = this._applyWithArgs("IsPrimitive", term);
            conceptTable = this._applyWithArgs("GetTable", conceptType);
            identifierTable = this._applyWithArgs("GetTable", termOrFactType[1]);
            this._or(function() {
                this._pred(primitive !== !1 && conceptType === primitive);
                dataType = primitive;
                this._opt(function() {
                    this._pred(identifierTable.hasOwnProperty("referenceScheme"));
                    fieldID = this._applyWithArgs("GetTableFieldID", identifierTable, identifierTable.referenceScheme);
                    this._pred(fieldID !== !1);
                    return identifierTable.fields.splice(fieldID, 1);
                });
                return identifierTable.referenceScheme = conceptType;
            }, function() {
                return dataType = "ConceptType";
            });
            return this._applyWithArgs("AddTableField", identifierTable, conceptType, dataType, !0, null, conceptTable.idField);
        },
        AttrDatabaseIDField: function(termOrFactType) {
            var tableID, $elf = this, table, fieldID, idField, _fromIdx = this.input.idx;
            idField = this._apply("anything");
            tableID = this._applyWithArgs("GetTableID", termOrFactType);
            table = this._applyWithArgs("GetTable", tableID);
            return this._or(function() {
                return this._pred(_.isString(table));
            }, function() {
                fieldID = this._applyWithArgs("AddTableField", table, idField, "Serial", !0, "PRIMARY KEY");
                this._opt(function() {
                    this._pred(fieldID !== !1);
                    return table.fields[fieldID][3] = "PRIMARY KEY";
                });
                return table.idField = idField;
            });
        },
        AttrReferenceScheme: function(termOrFactType) {
            var tableID, $elf = this, table, fieldID, _fromIdx = this.input.idx, referenceScheme;
            referenceScheme = this._apply("anything");
            referenceScheme = this._or(function() {
                this._pred(_.isArray(referenceScheme));
                return referenceScheme[1];
            }, function() {
                return referenceScheme;
            });
            tableID = this._applyWithArgs("GetTableID", termOrFactType);
            table = this._applyWithArgs("GetTable", tableID);
            return this._or(function() {
                return this._pred(_.isString(table));
            }, function() {
                this._opt(function() {
                    this._pred(table.hasOwnProperty("referenceScheme"));
                    fieldID = this._applyWithArgs("GetTableFieldID", table, table.referenceScheme);
                    this._pred(fieldID !== !1);
                    return table.fields[fieldID][1] = referenceScheme;
                });
                return table.referenceScheme = referenceScheme;
            });
        },
        AttrDatabaseTableName: function(termOrFactType) {
            var tableName, tableID, $elf = this, table, _fromIdx = this.input.idx;
            tableName = this._apply("anything");
            tableID = this._applyWithArgs("GetTableID", termOrFactType);
            table = this._applyWithArgs("GetTable", tableID);
            return this._or(function() {
                return this._pred(_.isString(table));
            }, function() {
                return table.name = tableName;
            });
        },
        AttrDatabasePrimitive: function(termOrFactType) {
            var attrVal, tableID, $elf = this, _fromIdx = this.input.idx;
            attrVal = this._apply("anything");
            tableID = this._applyWithArgs("GetTableID", termOrFactType);
            return this.GetTable(tableID).primitive = attrVal;
        },
        AttrDatabaseAttribute: function(factType) {
            var attrVal, $elf = this, attributeName, fieldID, baseTable, _fromIdx = this.input.idx, attributeTable;
            attrVal = this._apply("anything");
            return this._opt(function() {
                this._pred(attrVal);
                this.attributes[factType] = attrVal;
                this.tables[this.GetResourceName(factType)] = "Attribute";
                baseTable = this._applyWithArgs("GetTable", factType[0][1]);
                attributeName = factType[2][1];
                attributeTable = this._applyWithArgs("GetTable", attributeName);
                fieldID = this._applyWithArgs("GetTableFieldID", baseTable, attributeName);
                return baseTable.fields[fieldID][0] = attributeTable.primitive;
            });
        },
        AttrForeignKey: function(factType) {
            var required, $elf = this, fkName, fkTable, fieldID, baseTable, _fromIdx = this.input.idx;
            required = this._apply("anything");
            baseTable = this._applyWithArgs("GetTable", factType[0][1]);
            fkName = factType[2][1];
            fkTable = this._applyWithArgs("GetTable", fkName);
            this._opt(function() {
                this._pred(baseTable.idField == fkName);
                fieldID = this._applyWithArgs("GetTableFieldID", baseTable, fkName);
                this._pred(fieldID !== !1);
                return baseTable.fields.splice(fieldID, 1);
            });
            this._applyWithArgs("AddTableField", baseTable, fkName, "ForeignKey", required, null, [ fkTable.name, fkTable.idField ]);
            return this.tables[this.GetResourceName(factType)] = "ForeignKey";
        },
        AttrUnique: function(factType) {
            var required, $elf = this, uniqueField, baseTable, fieldID, _fromIdx = this.input.idx;
            required = this._apply("anything");
            baseTable = this._applyWithArgs("GetTable", factType);
            this._opt(function() {
                this._pred("Attribute" === baseTable || "ForeignKey" === baseTable);
                return baseTable = this._applyWithArgs("GetTable", factType[0][1]);
            });
            uniqueField = factType[2][1];
            fieldID = this._applyWithArgs("GetTableFieldID", baseTable, uniqueField);
            this._pred(fieldID !== !1);
            return baseTable.fields[fieldID][3] = "UNIQUE";
        },
        AttrSynonymousForm: function(factType) {
            var $elf = this, synForm, _fromIdx = this.input.idx;
            synForm = this._apply("anything");
            return this._applyWithArgs("AddFactType", synForm, factType);
        },
        AttrTermForm: function(factType) {
            var term, $elf = this, _fromIdx = this.input.idx;
            term = this._apply("anything");
            this.identifiers[term[1]] = factType;
            return this.tables[this.GetResourceName(term[1])] = this.GetTable(factType);
        },
        AttrNecessity: function(tableID) {
            var $elf = this, _fromIdx = this.input.idx;
            return this._apply("Rule");
        },
        FactType: function() {
            var factTypePart, $elf = this, linkTable, fkTable, resourceName, attributes, identifier, verb, negated, _fromIdx = this.input.idx, identifierTable, factType;
            this._lookahead(function() {
                return factType = this._many1(function() {
                    factTypePart = this._apply("anything");
                    this._lookahead(function() {
                        return attributes = this._apply("anything");
                    });
                    return factTypePart;
                });
            });
            this._applyWithArgs("AddFactType", factType, factType);
            this._or(function() {
                this._pred(this.IsPrimitive(factType[0]));
                return this._many1(function() {
                    factTypePart = this._apply("anything");
                    return this._lookahead(function() {
                        return attributes = this._apply("anything");
                    });
                });
            }, function() {
                resourceName = this._applyWithArgs("GetResourceName", factType);
                return this._or(function() {
                    this._pred(2 == factType.length);
                    this._many1(function() {
                        factTypePart = this._apply("anything");
                        return this._lookahead(function() {
                            return attributes = this._apply("anything");
                        });
                    });
                    identifierTable = this._applyWithArgs("GetTable", factType[0][1]);
                    this._applyWithArgs("AddTableField", identifierTable, factType[1][1], "Boolean", !0);
                    return this.tables[resourceName] = "BooleanAttribute";
                }, function() {
                    linkTable = this.tables[resourceName] = {
                        fields: [],
                        primitive: !1,
                        name: null
                    };
                    return this._many1(function() {
                        return this._or(function() {
                            identifier = this._apply("Identifier");
                            fkTable = this._applyWithArgs("GetTable", identifier.name);
                            return this._applyWithArgs("AddTableField", linkTable, identifier.name + identifier.num, "ForeignKey", !0, "", [ fkTable.name, fkTable.idField ]);
                        }, function() {
                            return this._form(function() {
                                this._applyWithArgs("exactly", "Verb");
                                verb = this._apply("anything");
                                return negated = this._apply("anything");
                            });
                        });
                    });
                });
            });
            return factType;
        },
        Cardinality: function() {
            var $elf = this, _fromIdx = this.input.idx, cardinality;
            this._form(function() {
                (function() {
                    switch (this._apply("anything")) {
                      case "Cardinality":
                        return "Cardinality";

                      case "MaximumCardinality":
                        return "MaximumCardinality";

                      case "MinimumCardinality":
                        return "MinimumCardinality";

                      default:
                        throw this._fail();
                    }
                }).call(this);
                return cardinality = this._apply("Number");
            });
            return cardinality;
        },
        Variable: function() {
            var varAlias, whereBody2, $elf = this, whereBody, num, bind, identifier, query, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Variable");
                num = this._apply("Number");
                identifier = this._apply("Identifier");
                this._or(function() {
                    bind = this.bindAttributes[num];
                    return this._pred(bind);
                }, function() {
                    varAlias = "var" + num;
                    query = [ "SelectQuery", [ "Select", [] ], [ "From", this.GetTable(identifier.name).name, varAlias + identifier.name ] ];
                    return this._applyWithArgs("ResolveConceptTypes", query, identifier, varAlias);
                });
                return this._opt(function() {
                    whereBody = this._apply("RulePart");
                    return this._opt(function() {
                        this._pred(query);
                        return this._applyWithArgs("AddWhereClause", query, whereBody);
                    });
                });
            });
            whereBody2 = this._apply("RulePart");
            return this._or(function() {
                this._pred(query);
                this._applyWithArgs("AddWhereClause", query, whereBody2);
                return query;
            }, function() {
                this._pred(bind.data);
                return {
                    identifier: identifier,
                    data: bind.data,
                    whereBody: whereBody
                };
            }, function() {
                return {
                    identifier: identifier,
                    tableAlias: "var" + bind.number + bind.identifier.name,
                    whereBody: whereBody
                };
            });
        },
        RoleBinding: function() {
            var number, $elf = this, data, identifier, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "RoleBinding");
                identifier = this._apply("Identifier");
                return this._or(function() {
                    return number = this._apply("number");
                }, function() {
                    return data = this._apply("Value");
                });
            });
            return {
                identifier: identifier,
                number: number,
                data: data
            };
        },
        NativeBinding: function() {
            var $elf = this, bindField, baseBind, bind, bindName, _fromIdx = this.input.idx;
            bind = this._apply("RoleBinding");
            return this._or(function() {
                this._pred(bind.data);
                return bind.data;
            }, function() {
                baseBind = this.bindAttributes[bind.number];
                this._pred(baseBind);
                this._pred(baseBind.data);
                return baseBind.data;
            }, function() {
                bindField = bind.identifier.name;
                bindName = this._or(function() {
                    this._pred(baseBind);
                    return this._or(function() {
                        this._pred(baseBind.data);
                        return baseBind.data;
                    }, function() {
                        return baseBind.number + baseBind.identifier.name;
                    });
                }, function() {
                    return bind.number + bindField;
                });
                return [ "ReferencedField", "var" + bindName, bindField ];
            });
        },
        NativeFactType: function(actualFactType, rootTerms) {
            var from, to, $elf = this, property, verb, comparator, _fromIdx = this.input.idx;
            this._pred(3 == actualFactType.length);
            this._pred(this.IsPrimitive(actualFactType[0]));
            this._pred(this.IsPrimitive(actualFactType[2]));
            return this._or(function() {
                from = this._apply("NativeBinding");
                to = this._apply("NativeBinding");
                this._apply("end");
                verb = actualFactType[1][1].toLowerCase();
                return this._or(function() {
                    comparator = this._or(function() {
                        this._pred("is equal to" == verb || "equals" == verb);
                        return "Equals";
                    }, function() {
                        this._pred("is greater than" == verb);
                        return "GreaterThan";
                    }, function() {
                        this._pred("is greater than or equal to" == verb);
                        return "GreaterThanOrEqual";
                    }, function() {
                        this._pred("is less than" == verb);
                        return "LessThan";
                    }, function() {
                        this._pred("is less than or equal to" == verb);
                        return "LessThanOrEqual";
                    });
                    return [ comparator, from, to ];
                }, function() {
                    this._pred("has" == verb);
                    property = actualFactType[2][1];
                    return this._or(function() {
                        this._pred("Length" == property);
                        return [ "CharacterLength", from ];
                    }, function() {
                        return this._pred(("Red Component" == property)[255]);
                    }, function() {
                        return this._pred(("Green Component" == property)[255]);
                    }, function() {
                        return this._pred(("Blue Component" == property)[255]);
                    }, function() {
                        return this._pred(("Alpha Component" == property)[255]);
                    });
                });
            }, function() {
                return this._applyWithArgs("foreign", ___NativeFactTypeMatchingFailed___, "die");
            });
        },
        LinkTable: function(actualFactType, rootTerms) {
            var $elf = this, tableAlias, termName, table, i, bind, query, _fromIdx = this.input.idx;
            tableAlias = "link" + this.linkTableBind++;
            query = [ "SelectQuery", [ "Select", [] ], [ "From", this.GetTable(actualFactType).name, tableAlias ] ];
            i = 0;
            this._many1(function() {
                this._pred(rootTerms.length > i);
                bind = this._apply("RoleBinding");
                termName = rootTerms[i].term[1];
                table = this._applyWithArgs("GetTable", termName);
                this._applyWithArgs("AddWhereClause", query, [ "Equals", [ "ReferencedField", tableAlias, rootTerms[i].field ], [ "ReferencedField", "var" + bind.number + termName, table.idField ] ]);
                return i++;
            });
            return [ "Exists", query ];
        },
        ForeignKey: function(actualFactType, rootTerms) {
            var varAlias, tableTo, temp, bindTo, toField, $elf = this, nameTable, fkFrom, bindFrom, fkTo, name, query, _fromIdx = this.input.idx;
            this._pred("ForeignKey" == this.GetTable(actualFactType));
            this._or(function() {
                bindFrom = this._apply("RoleBinding");
                bindTo = this._apply("RoleBinding");
                this._apply("end");
                this._or(function() {
                    this._pred(this.IsChild([ bindFrom.identifier.type, bindFrom.identifier.name, bindFrom.identifier.vocab ], actualFactType[0]));
                    fkFrom = rootTerms[0];
                    return fkTo = rootTerms[1];
                }, function() {
                    temp = bindTo;
                    bindTo = bindFrom;
                    bindFrom = temp;
                    fkFrom = rootTerms[1];
                    return fkTo = rootTerms[0];
                });
                return tableTo = this._applyWithArgs("GetTable", fkTo.term[1]);
            }, function() {
                return this._applyWithArgs("foreign", ___ForeignKeyMatchingFailed___, "die");
            });
            toField = this._or(function() {
                this._pred("Name" == bindTo.identifier.type);
                name = bindTo.identifier.name;
                nameTable = this._applyWithArgs("GetTable", name);
                varAlias = "name-" + name + "-";
                query = [ "SelectQuery", [ "Select", [ [ [ "ReferencedField", varAlias + fkTo.term[1], tableTo.idField ] ] ] ], [ "From", nameTable.name, varAlias + name ] ];
                this._applyWithArgs("ResolveConceptTypes", query, bindTo.identifier, varAlias, fkTo.term);
                return query;
            }, function() {
                return [ "ReferencedField", "var" + bindTo.number + fkTo.term[1], tableTo.idField ];
            });
            return [ "Equals", [ "ReferencedField", "var" + bindFrom.number + fkFrom.term[1], fkTo.field ], toField ];
        },
        BooleanAttribute: function(actualFactType) {
            var termFrom, $elf = this, attributeName, bindFrom, negated, _fromIdx = this.input.idx;
            this._pred("BooleanAttribute" == this.GetTable(actualFactType));
            this._or(function() {
                bindFrom = this._apply("RoleBinding");
                this._apply("end");
                termFrom = actualFactType[0][1];
                attributeName = actualFactType[1][1];
                return negated = actualFactType[1][2];
            }, function() {
                console.error(this.input);
                return this._applyWithArgs("foreign", ___BooleanAttributeMatchingFailed___, "die");
            });
            return [ "Equals", [ "ReferencedField", "var" + bindFrom.number + termFrom, attributeName ], [ "Boolean", !negated ] ];
        },
        Attribute: function(actualFactType, rootTerms) {
            var temp, $elf = this, baseTermName, bindAttr, bindReal, bind, _fromIdx = this.input.idx;
            this._pred("Attribute" == this.GetTable(actualFactType));
            this._or(function() {
                bindReal = this._apply("RoleBinding");
                bindAttr = this._apply("RoleBinding");
                this._apply("end");
                return this._or(function() {
                    return this._pred(this.IsChild([ bindReal.identifier.type, bindReal.identifier.name, bindReal.identifier.vocab ], actualFactType[0]));
                }, function() {
                    temp = bindAttr;
                    bindAttr = bindReal;
                    return bindReal = temp;
                });
            }, function() {
                return this._applyWithArgs("foreign", ___AttributeMatchingFailed___, "die");
            });
            baseTermName = this._applyWithArgs("AttributeFactTypeBaseTermName", actualFactType);
            return this._or(function() {
                bind = this.bindAttributes[bindAttr.number];
                this._pred(bind.number != bindReal.number);
                return [ "Equals", [ "ReferencedField", "var" + bind.number + bind.identifier.name, bindAttr.identifier.name ], [ "ReferencedField", "var" + bindReal.number + baseTermName, bindAttr.identifier.name ] ];
            }, function() {
                return [ "Equals", [ "Boolean", !0 ], [ "Boolean", !0 ] ];
            });
        },
        AtomicFormulation: function() {
            var $elf = this, actualFactType, whereClause, rootTerms, _fromIdx = this.input.idx, factType;
            this._form(function() {
                this._applyWithArgs("exactly", "AtomicFormulation");
                this._form(function() {
                    this._applyWithArgs("exactly", "FactType");
                    return factType = this._many1(function() {
                        return this._apply("anything");
                    });
                });
                actualFactType = this._applyWithArgs("ActualFactType", factType);
                rootTerms = this._applyWithArgs("FactTypeRootTerms", factType);
                return whereClause = this._or(function() {
                    return this._applyWithArgs("NativeFactType", actualFactType, rootTerms);
                }, function() {
                    return this._applyWithArgs("ForeignKey", actualFactType, rootTerms);
                }, function() {
                    return this._applyWithArgs("BooleanAttribute", actualFactType);
                }, function() {
                    return this._applyWithArgs("Attribute", actualFactType, rootTerms);
                }, function() {
                    return this._applyWithArgs("LinkTable", actualFactType, rootTerms);
                });
            });
            return whereClause;
        },
        AtLeast: function() {
            var variable, $elf = this, minCard, where, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "AtLeastNQuantification");
                minCard = this._apply("Cardinality");
                return variable = this._apply("Variable");
            });
            where = this._or(function() {
                this._pred(0 == minCard);
                return [ "Boolean", !0 ];
            }, function() {
                this._pred(_.isArray(variable));
                variable[1][1].push([ "Count", "*" ]);
                return [ "GreaterThanOrEqual", variable, [ "Number", minCard ] ];
            }, function() {
                this._pred(minCard > 1);
                return [ "Boolean", !1 ];
            }, function() {
                this._pred(variable.data);
                return [ "Boolean", !0 ];
            }, function() {
                return [ "Exists", [ "ReferencedField", variable.tableAlias, variable.identifier.name ] ];
            });
            return this._or(function() {
                this._pred(variable.whereBody);
                return [ "And", variable.whereBody, where ];
            }, function() {
                return where;
            });
        },
        Exactly: function() {
            var exists, variable, $elf = this, where, card, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "ExactQuantification");
                card = this._apply("Cardinality");
                return variable = this._apply("Variable");
            });
            where = this._or(function() {
                this._pred(_.isArray(variable));
                variable[1][1].push([ "Count", "*" ]);
                return [ "Equals", variable, [ "Number", card ] ];
            }, function() {
                exists = this._or(function() {
                    this._pred(variable.data);
                    return [ "Boolean", !0 ];
                }, function() {
                    return [ "Exists", [ "ReferencedField", variable.tableAlias, variable.identifier.name ] ];
                });
                return this._or(function() {
                    this._pred(0 == card);
                    return [ "Not", exists ];
                }, function() {
                    this._pred(1 == card);
                    return exists;
                }, function() {
                    return [ "Boolean", !1 ];
                });
            });
            return this._or(function() {
                this._pred(variable.whereBody);
                return [ "And", variable.whereBody, where ];
            }, function() {
                return where;
            });
        },
        Range: function() {
            var exists, variable, $elf = this, maxCard, minCard, where, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "NumericalRangeQuantification");
                minCard = this._apply("Cardinality");
                maxCard = this._apply("Cardinality");
                return variable = this._apply("Variable");
            });
            where = this._or(function() {
                this._pred(_.isArray(variable));
                variable[1][1].push([ "Count", "*" ]);
                return [ "Between", variable, [ "Number", minCard ], [ "Number", maxCard ] ];
            }, function() {
                exists = this._or(function() {
                    this._pred(variable.data);
                    return [ "Boolean", !0 ];
                }, function() {
                    return [ "Exists", [ "ReferencedField", variable.tableAlias, variable.identifier.name ] ];
                });
                return this._or(function() {
                    this._pred(0 == minCard);
                    return this._or(function() {
                        this._pred(0 == maxCard);
                        return [ "Not", exists ];
                    }, function() {
                        return [ "Boolean", !0 ];
                    });
                }, function() {
                    this._pred(1 == minCard);
                    return exists;
                }, function() {
                    return [ "Boolean", !1 ];
                });
            });
            return this._or(function() {
                this._pred(variable.whereBody);
                return [ "And", variable.whereBody, where ];
            }, function() {
                return where;
            });
        },
        Exists: function() {
            var variable, $elf = this, where, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "ExistentialQuantification");
                return variable = this._apply("Variable");
            });
            where = this._or(function() {
                this._pred(_.isArray(variable));
                return [ "Exists", variable ];
            }, function() {
                this._pred(variable.data);
                return [ "Boolean", !0 ];
            }, function() {
                return [ "Exists", [ "ReferencedField", variable.tableAlias, variable.identifier.name ] ];
            });
            return this._or(function() {
                this._pred(variable.whereBody);
                return [ "And", variable.whereBody, where ];
            }, function() {
                return where;
            });
        },
        Negation: function() {
            var $elf = this, whereBody, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "LogicalNegation");
                return whereBody = this._apply("RulePart");
            });
            return [ "Not", whereBody ];
        },
        RulePart: function() {
            var $elf = this, x, whereBody, _fromIdx = this.input.idx;
            whereBody = this._many1(function() {
                return this._or(function() {
                    return this._apply("AtomicFormulation");
                }, function() {
                    return this._apply("AtLeast");
                }, function() {
                    return this._apply("Exactly");
                }, function() {
                    return this._apply("Exists");
                }, function() {
                    return this._apply("Negation");
                }, function() {
                    return this._apply("Range");
                }, function() {
                    x = this._apply("anything");
                    console.error("Hit unhandled operation:", x);
                    return this._pred(!1);
                });
            });
            return this._or(function() {
                this._pred(1 == whereBody.length);
                return whereBody[0];
            }, function() {
                return [ "And" ].concat(whereBody);
            });
        },
        RuleBody: function() {
            var $elf = this, rule, _fromIdx = this.input.idx;
            this._form(function() {
                (function() {
                    switch (this._apply("anything")) {
                      case "NecessityFormulation":
                        return "NecessityFormulation";

                      case "PermissibilityFormulation":
                        return "PermissibilityFormulation";

                      case "ObligationFormulation":
                        return "ObligationFormulation";

                      case "PossibilityFormulation":
                        return "PossibilityFormulation";

                      default:
                        throw this._fail();
                    }
                }).call(this);
                return rule = this._apply("RulePart");
            });
            return rule;
        },
        AttributeFactTypeBaseTermName: function(actualFactType) {
            var $elf = this, _fromIdx = this.input.idx;
            return function() {
                for (var i = 0; actualFactType.length > i; i += 2) if (!this.IsPrimitive(actualFactType[i])) return actualFactType[i][1];
            }.call(this);
        },
        ProcessAtomicFormulations: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this.bindAttributes = [];
            this.bindAttributeDepth = [];
            this._lookahead(function() {
                return this._applyWithArgs("ProcessAtomicFormulationsRecurse", 0, "ProcessAtomicFormulationsAttributes");
            });
            return this._lookahead(function() {
                return this._applyWithArgs("ProcessAtomicFormulationsRecurse", 0, "ProcessAtomicFormulationsNativeAttributes");
            });
        },
        ProcessAtomicFormulationsRecurse: function(depth, rule) {
            var $elf = this, actualFactType, _fromIdx = this.input.idx, factType;
            return this._many(function() {
                return this._or(function() {
                    this._pred(_.isArray(this.input.lst));
                    return this._form(function() {
                        return this._or(function() {
                            return function() {
                                switch (this._apply("anything")) {
                                  case "AtomicFormulation":
                                    return function() {
                                        this._form(function() {
                                            this._applyWithArgs("exactly", "FactType");
                                            return factType = this._many1(function() {
                                                return this._apply("anything");
                                            });
                                        });
                                        actualFactType = this._applyWithArgs("ActualFactType", factType);
                                        return this._applyWithArgs(rule, depth, actualFactType);
                                    }.call(this);

                                  default:
                                    throw this._fail();
                                }
                            }.call(this);
                        }, function() {
                            return this._applyWithArgs("ProcessAtomicFormulationsRecurse", depth + 1, rule);
                        });
                    });
                }, function() {
                    return this._apply("anything");
                });
            });
        },
        ProcessAtomicFormulationsAttributes: function(depth, actualFactType) {
            var binds, $elf = this, baseTermName, _fromIdx = this.input.idx, baseBinding;
            this._pred(this.attributes.hasOwnProperty(actualFactType) && this.attributes[actualFactType]);
            binds = this._many(function() {
                return this._apply("RoleBinding");
            });
            baseTermName = this._applyWithArgs("AttributeFactTypeBaseTermName", actualFactType);
            baseBinding = null;
            (function() {
                for (var i = 0; binds.length > i; i++) if (!this.IsPrimitive([ binds[i].identifier.type, binds[i].identifier.name, binds[i].identifier.vocab ])) {
                    baseBinding = binds[i];
                    baseBinding.identifier.name = baseTermName;
                    break;
                }
            }).call(this);
            return function() {
                for (var i = 0; binds.length > i; i++) if (this.IsPrimitive([ binds[i].identifier.type, binds[i].identifier.name, binds[i].identifier.vocab ]) && (null == this.bindAttributeDepth[binds[i].number] || this.bindAttributeDepth[binds[i].number] > depth)) {
                    this.bindAttributeDepth[binds[i].number] = depth;
                    this.bindAttributes[binds[i].number] = baseBinding;
                    break;
                }
            }.call(this);
        },
        ProcessAtomicFormulationsNativeAttributes: function(depth, actualFactType) {
            var from, nativeBinds, binds, $elf = this, data, property, primitive, verb, _fromIdx = this.input.idx;
            this._lookahead(function() {
                return binds = this._many(function() {
                    return this._apply("RoleBinding");
                });
            });
            nativeBinds = this._many(function() {
                return this._apply("NativeBinding");
            });
            verb = actualFactType[1][1].toLowerCase();
            this._pred("has" == verb);
            primitive = actualFactType[0][1];
            property = actualFactType[2][1];
            binds = this._or(function() {
                this._pred(binds[0].identifier.name == property);
                from = nativeBinds[1];
                return [ binds[1], binds[0] ];
            }, function() {
                from = nativeBinds[0];
                return binds;
            });
            this._pred("Text" == primitive);
            this._pred("Length" == property);
            data = [ "CharacterLength", from ];
            return this.bindAttributes[binds[1].number] = {
                data: data
            };
        },
        Rule: function() {
            var ruleText, ruleBody, $elf = this, _fromIdx = this.input.idx;
            return this._form(function() {
                this._applyWithArgs("exactly", "Rule");
                this.linkTableBind = 0;
                this._lookahead(function() {
                    return this._apply("ProcessAtomicFormulations");
                });
                ruleBody = this._apply("RuleBody");
                this._form(function() {
                    this._applyWithArgs("exactly", "StructuredEnglish");
                    return ruleText = this._apply("anything");
                });
                return this.rules.push([ "Rule", [ "StructuredEnglish", ruleText ], [ "Body", ruleBody ] ]);
            });
        },
        Process: function() {
            var vocab, identifierName, $elf = this, attributes, type, _fromIdx = this.input.idx, tables, factType;
            this._form(function() {
                this._applyWithArgs("exactly", "Model");
                return this._many1(function() {
                    return this._or(function() {
                        return this._form(function() {
                            return this._or(function() {
                                return function() {
                                    switch (this._apply("anything")) {
                                      case "Vocabulary":
                                        return function() {
                                            vocab = this._apply("anything");
                                            return attributes = this._apply("anything");
                                        }.call(this);

                                      default:
                                        throw this._fail();
                                    }
                                }.call(this);
                            }, function() {
                                type = function() {
                                    switch (this._apply("anything")) {
                                      case "Term":
                                        return "Term";

                                      case "Name":
                                        return "Name";

                                      default:
                                        throw this._fail();
                                    }
                                }.call(this);
                                identifierName = this._apply("IdentifierName");
                                vocab = this._apply("anything");
                                this._applyWithArgs("AddVocabulary", vocab);
                                return this._applyWithArgs("Attributes", [ type, identifierName, vocab ]);
                            }, function() {
                                return function() {
                                    switch (this._apply("anything")) {
                                      case "FactType":
                                        return function() {
                                            factType = this._apply("FactType");
                                            return this._applyWithArgs("Attributes", factType);
                                        }.call(this);

                                      default:
                                        throw this._fail();
                                    }
                                }.call(this);
                            });
                        });
                    }, function() {
                        return this._apply("Rule");
                    });
                });
            });
            tables = {};
            return {
                tables: this.tables,
                rules: this.rules
            };
        }
    });
    LF2AbstractSQL.AddTableField = function(table, fieldName, dataType, required, index, references) {
        var fieldID = this.GetTableFieldID(table, fieldName);
        fieldID === !1 && table.fields.push([ dataType, fieldName, required, index, references ]);
        return fieldID;
    };
    LF2AbstractSQL.AddWhereClause = function(query, whereBody) {
        if ("Exists" != whereBody[0] || "SelectQuery" != whereBody[1][0] && "InsertQuery" != whereBody[1][0] && "UpdateQuery" != whereBody[1][0] && "UpsertQuery" != whereBody[1][0]) {
            for (var i = 1; query.length > i; i++) if ("Where" == query[i][0]) {
                query[i][1] = [ "And", query[i][1], whereBody ];
                return void 0;
            }
            query.push([ "Where", whereBody ]);
        } else {
            whereBody = whereBody[1].slice(1);
            for (var i = 0; whereBody.length > i; i++) "From" == whereBody[i][0] && query.push(whereBody[i]);
            for (var i = 0; whereBody.length > i; i++) "Where" == whereBody[i][0] && this.AddWhereClause(query, whereBody[i][1]);
        }
    };
    LF2AbstractSQL.ResolveConceptTypes = function(query, identifier, varAlias, untilConcept) {
        for (var conceptTypes, conceptAlias, parentAlias = varAlias + identifier.name, concept = [ identifier.type, identifier.name, identifier.vocab ], conceptTable; (null == untilConcept || concept[1] != untilConcept[1] || concept[2] != untilConcept[2]) && (conceptTypes = this.vocabularies[concept[2]].ConceptTypes) && conceptTypes.hasOwnProperty(concept[1]); ) {
            concept = conceptTypes[concept[1]];
            conceptAlias = varAlias + concept[1];
            conceptTable = this.GetTable(concept[1]);
            if (conceptTable.primitive !== !1) break;
            query.push([ "From", conceptTable.name, conceptAlias ]);
            this.AddWhereClause(query, [ "Equals", [ "ReferencedField", parentAlias, concept[1] ], [ "ReferencedField", conceptAlias, conceptTable.idField ] ]);
            parentAlias = conceptAlias;
        }
    };
    LF2AbstractSQL.initialize = function() {
        SBVRLibs.initialize.call(this);
        this.tables = {};
        this.identifiers = {};
        this.rules = [];
        this.linkTableBind = 0;
        this.attributes = {};
        this.bindAttributes = [];
        this.bindAttributeDepth = [];
    };
    return LF2AbstractSQL;
});

define("ometa!sbvr-compiler/AbstractSQLRules2SQL", [ "has", "ometa-core" ], function() {
    var comparisons = {
        Equals: " = ",
        GreaterThan: " > ",
        GreaterThanOrEqual: " >= ",
        LessThan: " < ",
        LessThanOrEqual: " <= ",
        NotEquals: " != "
    }, AbstractSQLRules2SQL = OMeta._extend({
        NestedIndent: function(indent) {
            var $elf = this, _fromIdx = this.input.idx;
            return indent + "	";
        },
        Not: function(indent) {
            var notStatement, ruleBody, $elf = this, _fromIdx = this.input.idx, nestedIndent;
            this._form(function() {
                this._applyWithArgs("exactly", "Not");
                nestedIndent = this._applyWithArgs("NestedIndent", indent);
                ruleBody = this._applyWithArgs("RuleBody", nestedIndent);
                return notStatement = "NOT (" + nestedIndent + ruleBody + indent + ")";
            });
            return notStatement;
        },
        Exists: function(indent) {
            var ruleBody, $elf = this, comparator, _fromIdx = this.input.idx, nestedIndent;
            this._form(function() {
                this._applyWithArgs("exactly", "Exists");
                return this._or(function() {
                    nestedIndent = this._applyWithArgs("NestedIndent", indent);
                    return ruleBody = this._applyWithArgs("SelectQuery", nestedIndent);
                }, function() {
                    return comparator = this._apply("Comparator");
                });
            });
            return this._or(function() {
                this._pred(comparator);
                return comparator + " IS NOT NULL";
            }, function() {
                return "EXISTS (" + nestedIndent + ruleBody + indent + ")";
            });
        },
        ProcessQuery: function() {
            var $elf = this, query, _fromIdx = this.input.idx;
            return this._or(function() {
                query = this._or(function() {
                    return this._applyWithArgs("SelectQuery", "\n");
                }, function() {
                    return this._applyWithArgs("InsertQuery", "\n");
                }, function() {
                    return this._applyWithArgs("UpdateQuery", "\n");
                }, function() {
                    return this._applyWithArgs("DeleteQuery", "\n");
                });
                return {
                    query: query,
                    bindings: this.fieldOrderings
                };
            }, function() {
                return this._applyWithArgs("UpsertQuery", "\n");
            });
        },
        SelectQuery: function(indent) {
            var limit, offset, $elf = this, orderBy, where, fields, table, _fromIdx = this.input.idx, tables, nestedIndent;
            nestedIndent = this._applyWithArgs("NestedIndent", indent);
            tables = [];
            where = "";
            orderBy = "";
            limit = "";
            offset = "";
            this._form(function() {
                this._applyWithArgs("exactly", "SelectQuery");
                return this._many(function() {
                    return this._form(function() {
                        return this._or(function() {
                            return fields = this._apply("Select");
                        }, function() {
                            table = this._apply("Table");
                            return tables.push(table);
                        }, function() {
                            where = this._applyWithArgs("Where", indent);
                            return where = indent + where;
                        }, function() {
                            orderBy = this._applyWithArgs("OrderBy", indent);
                            return orderBy = indent + orderBy;
                        }, function() {
                            limit = this._applyWithArgs("Limit", indent);
                            return limit = indent + limit;
                        }, function() {
                            offset = this._applyWithArgs("Offset", indent);
                            return offset = indent + offset;
                        });
                    });
                });
            });
            return "SELECT " + fields.join(", ") + indent + "FROM " + tables.join("," + nestedIndent) + where + orderBy + limit + offset;
        },
        DeleteQuery: function(indent) {
            var $elf = this, where, table, _fromIdx = this.input.idx, tables;
            tables = [];
            where = "";
            this._form(function() {
                this._applyWithArgs("exactly", "DeleteQuery");
                return this._many(function() {
                    return this._form(function() {
                        return this._or(function() {
                            table = this._apply("Table");
                            return tables.push(table);
                        }, function() {
                            where = this._applyWithArgs("Where", indent);
                            return where = indent + where;
                        });
                    });
                });
            });
            return "DELETE FROM " + tables.join(", ") + where;
        },
        InsertBody: function(indent) {
            var fieldValues, $elf = this, table, _fromIdx = this.input.idx, tables;
            tables = [];
            this._many(function() {
                return this._form(function() {
                    return this._or(function() {
                        return fieldValues = this._apply("Fields");
                    }, function() {
                        table = this._apply("Table");
                        return tables.push(table);
                    }, function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "Where":
                                return this._many(function() {
                                    return this._apply("anything");
                                });

                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    });
                });
            });
            return this._or(function() {
                this._pred(fieldValues[0].length > 0);
                return "INSERT INTO " + tables.join(", ") + " (" + fieldValues[0].join(", ") + ")" + indent + " VALUES (" + fieldValues[1].join(", ") + ")";
            }, function() {
                return "INSERT INTO " + tables.join(", ") + " DEFAULT VALUES";
            });
        },
        UpdateBody: function(indent) {
            var fieldValues, $elf = this, where, sets, table, _fromIdx = this.input.idx, tables;
            tables = [];
            where = "";
            this._many(function() {
                return this._form(function() {
                    return this._or(function() {
                        return fieldValues = this._apply("Fields");
                    }, function() {
                        table = this._apply("Table");
                        return tables.push(table);
                    }, function() {
                        where = this._applyWithArgs("Where", indent);
                        return where = indent + where;
                    });
                });
            });
            this._or(function() {
                return this._pred(fieldValues[0].length > 0);
            }, function() {
                return this._applyWithArgs("foreign", ___UPDATE_QUERY_WITH_NO_FIELDS___, "die");
            });
            sets = [];
            (function() {
                for (var i = 0; fieldValues[0].length > i; i++) sets[i] = fieldValues[0][i] + " = " + fieldValues[1][i];
            }).call(this);
            return "UPDATE " + tables.join(", ") + indent + " SET " + sets.join("," + indent) + where;
        },
        UpsertQuery: function(indent) {
            var insert, $elf = this, update, _fromIdx = this.input.idx, tables;
            tables = [];
            this._form(function() {
                this._applyWithArgs("exactly", "UpsertQuery");
                insert = this._lookahead(function() {
                    return this._applyWithArgs("InsertBody", indent);
                });
                insert = {
                    query: insert,
                    bindings: this.fieldOrderings
                };
                this.fieldOrderings = [];
                update = this._applyWithArgs("UpdateBody", indent);
                return update = {
                    query: update,
                    bindings: this.fieldOrderings
                };
            });
            return [ insert, update ];
        },
        InsertQuery: function(indent) {
            var $elf = this, _fromIdx = this.input.idx, insert;
            this._form(function() {
                this._applyWithArgs("exactly", "InsertQuery");
                return insert = this._applyWithArgs("InsertBody", indent);
            });
            return insert;
        },
        UpdateQuery: function(indent) {
            var $elf = this, update, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "UpdateQuery");
                return update = this._applyWithArgs("UpdateBody", indent);
            });
            return update;
        },
        Null: function() {
            var $elf = this, _fromIdx = this.input.idx, next;
            next = this._apply("anything");
            this._pred(null === next);
            return null;
        },
        Fields: function() {
            var field, values, $elf = this, fields, value, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "Fields");
            fields = [];
            values = [];
            this._form(function() {
                return this._many(function() {
                    return this._form(function() {
                        field = this._apply("anything");
                        fields.push('"' + field + '"');
                        value = this._or(function() {
                            return function() {
                                switch (this._apply("anything")) {
                                  case "?":
                                    return "?";

                                  default:
                                    throw this._fail();
                                }
                            }.call(this);
                        }, function() {
                            this._apply("true");
                            return 1;
                        }, function() {
                            this._apply("false");
                            return 0;
                        }, function() {
                            this._apply("Null");
                            return "NULL";
                        }, function() {
                            return this._apply("Bind");
                        }, function() {
                            value = this._apply("anything");
                            return "'" + value + "'";
                        });
                        return values.push(value);
                    });
                });
            });
            return [ fields, values ];
        },
        Select: function() {
            var field, $elf = this, as, fields, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "Select");
            fields = [];
            this._form(function() {
                return this._or(function() {
                    this._apply("end");
                    return fields.push("1");
                }, function() {
                    return this._many(function() {
                        return this._or(function() {
                            return this._form(function() {
                                field = this._or(function() {
                                    return function() {
                                        switch (this._apply("anything")) {
                                          case "Count":
                                            return function() {
                                                this._applyWithArgs("exactly", "*");
                                                return "COUNT(*)";
                                            }.call(this);

                                          default:
                                            throw this._fail();
                                        }
                                    }.call(this);
                                }, function() {
                                    field = this._or(function() {
                                        return this._apply("Field");
                                    }, function() {
                                        return this._apply("ReferencedField");
                                    });
                                    return this._or(function() {
                                        as = this._apply("anything");
                                        return field + ' AS "' + as + '"';
                                    }, function() {
                                        return field;
                                    });
                                });
                                return fields.push(field);
                            });
                        }, function() {
                            return function() {
                                switch (this._apply("anything")) {
                                  case "*":
                                    return fields.push("*");

                                  default:
                                    throw this._fail();
                                }
                            }.call(this);
                        }, function() {
                            this._apply("Null");
                            return fields.push("NULL");
                        }, function() {
                            field = this._apply("anything");
                            return fields.push('"' + field + '"');
                        });
                    });
                });
            });
            return fields;
        },
        Table: function() {
            var alias, $elf = this, table, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "From");
            table = this._apply("anything");
            alias = [];
            this._opt(function() {
                alias = this._apply("anything");
                return alias = [ '"' + alias + '"' ];
            });
            return [ '"' + table + '"' ].concat(alias).join(" AS ");
        },
        Where: function(indent) {
            var ruleBody, $elf = this, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "Where");
            ruleBody = this._applyWithArgs("RuleBody", indent);
            return "WHERE " + ruleBody;
        },
        OrderBy: function(indent) {
            var field, $elf = this, order, _fromIdx = this.input.idx, orders;
            this._applyWithArgs("exactly", "OrderBy");
            orders = [];
            this._many1(function() {
                return this._form(function() {
                    order = function() {
                        switch (this._apply("anything")) {
                          case "DESC":
                            return "DESC";

                          case "ASC":
                            return "ASC";

                          default:
                            throw this._fail();
                        }
                    }.call(this);
                    field = this._or(function() {
                        return this._apply("Field");
                    }, function() {
                        return this._apply("ReferencedField");
                    });
                    return orders.push(field + " " + order);
                });
            });
            return "ORDER BY " + orders.join(", ");
        },
        Limit: function(indent) {
            var $elf = this, num, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "Limit");
            num = this._apply("Number");
            return "LIMIT " + num;
        },
        Offset: function(indent) {
            var $elf = this, num, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "Offset");
            num = this._apply("Number");
            return "OFFSET " + num;
        },
        Field: function() {
            var field, $elf = this, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Field");
                return field = this._apply("anything");
            });
            return '"' + field + '"';
        },
        ReferencedField: function() {
            var field, $elf = this, binding, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "ReferencedField");
                binding = this._apply("anything");
                return field = this._apply("anything");
            });
            return '"' + binding + '"."' + field + '"';
        },
        Number: function() {
            var number, $elf = this, _fromIdx = this.input.idx;
            this._form(function() {
                (function() {
                    switch (this._apply("anything")) {
                      case "Number":
                        return "Number";

                      case "Integer":
                        return "Integer";

                      case "Real":
                        return "Real";

                      default:
                        throw this._fail();
                    }
                }).call(this);
                return number = this._apply("anything");
            });
            return number;
        },
        Boolean: function() {
            var $elf = this, bool, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Boolean");
                return bool = this._or(function() {
                    this._apply("true");
                    return 1;
                }, function() {
                    this._apply("false");
                    return 0;
                });
            });
            return bool;
        },
        Bind: function() {
            var field, tableName, $elf = this, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Bind");
                tableName = this._apply("anything");
                return field = this._apply("anything");
            });
            this.fieldOrderings.push([ tableName, field ]);
            return "?";
        },
        Text: function() {
            var $elf = this, text, _fromIdx = this.input.idx;
            this._form(function() {
                (function() {
                    switch (this._apply("anything")) {
                      case "Value":
                        return "Value";

                      case "Text":
                        return "Text";

                      default:
                        throw this._fail();
                    }
                }).call(this);
                return text = this._apply("anything");
            });
            return "'" + text + "'";
        },
        CharacterLength: function() {
            var $elf = this, text, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "CharacterLength");
                return text = this._or(function() {
                    return this._apply("ReferencedField");
                }, function() {
                    return this._apply("Field");
                }, function() {
                    return this._apply("Text");
                });
            });
            return this._or(function() {
                this._pred(!1);
                return "CHAR_LENGTH(" + text + ")";
            }, function() {
                return "LENGTH(" + text + ")";
            });
        },
        BitwiseAnd: function() {
            var $elf = this, operand, mask, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "BitwiseAnd");
                operand = this._or(function() {
                    return this._apply("ReferencedField");
                }, function() {
                    return this._apply("Field");
                }, function() {
                    return this._apply("Number");
                });
                return mask = this._or(function() {
                    return this._apply("ReferencedField");
                }, function() {
                    return this._apply("Field");
                }, function() {
                    return this._apply("Number");
                });
            });
            return "(" + operand + " & " + mask + ")";
        },
        BitwiseShiftRight: function() {
            var shift, $elf = this, operand, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "BitwiseShiftRight");
                operand = this._or(function() {
                    return this._apply("ReferencedField");
                }, function() {
                    return this._apply("Field");
                }, function() {
                    return this._apply("Number");
                });
                return shift = this._or(function() {
                    return this._apply("ReferencedField");
                }, function() {
                    return this._apply("Field");
                }, function() {
                    return this._apply("Number");
                });
            });
            return "(" + operand + " >> " + shift + ")";
        },
        And: function(indent) {
            var ruleBodies, $elf = this, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "And");
                return ruleBodies = this._many(function() {
                    return this._applyWithArgs("RuleBody", indent);
                });
            });
            return ruleBodies.join(indent + "AND ");
        },
        Comparison: function(indent) {
            var comparison, $elf = this, a, b, _fromIdx = this.input.idx;
            this._form(function() {
                comparison = function() {
                    switch (this._apply("anything")) {
                      case "NotEquals":
                        return "NotEquals";

                      case "GreaterThan":
                        return "GreaterThan";

                      case "LessThan":
                        return "LessThan";

                      case "LessThanOrEqual":
                        return "LessThanOrEqual";

                      case "Equals":
                        return "Equals";

                      case "GreaterThanOrEqual":
                        return "GreaterThanOrEqual";

                      default:
                        throw this._fail();
                    }
                }.call(this);
                a = this._applyWithArgs("RuleBody", indent);
                return b = this._applyWithArgs("RuleBody", indent);
            });
            return a + comparisons[comparison] + b;
        },
        Between: function(indent) {
            var $elf = this, a, b, val, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Between");
                val = this._applyWithArgs("Comparator", indent);
                a = this._applyWithArgs("Comparator", indent);
                return b = this._applyWithArgs("Comparator", indent);
            });
            return val + " BETWEEN " + a + " AND " + b;
        },
        Comparator: function(indent) {
            var $elf = this, query, _fromIdx = this.input.idx, nestedIndent;
            return this._or(function() {
                nestedIndent = this._applyWithArgs("NestedIndent", indent);
                query = this._applyWithArgs("SelectQuery", nestedIndent);
                return "(" + nestedIndent + query + indent + ")";
            }, function() {
                return this._apply("Field");
            }, function() {
                return this._apply("ReferencedField");
            }, function() {
                return this._apply("Number");
            }, function() {
                return this._apply("Boolean");
            }, function() {
                return this._apply("Text");
            }, function() {
                return this._apply("Bind");
            }, function() {
                return this._apply("CharacterLength");
            });
        },
        RuleBody: function(indent) {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._applyWithArgs("Comparator", indent);
            }, function() {
                return this._applyWithArgs("Not", indent);
            }, function() {
                return this._applyWithArgs("Exists", indent);
            }, function() {
                return this._applyWithArgs("Comparison", indent);
            }, function() {
                return this._applyWithArgs("Between", indent);
            }, function() {
                return this._applyWithArgs("And", indent);
            }, function() {
                return this._apply("Boolean");
            });
        },
        Process: function() {
            var ruleBody, $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._applyWithArgs("SelectQuery", "\n");
            }, function() {
                ruleBody = this._applyWithArgs("RuleBody", "\n");
                return "SELECT " + ruleBody + ' AS "result";';
            });
        }
    });
    AbstractSQLRules2SQL.initialize = function() {
        this.fieldOrderings = [];
    };
    return AbstractSQLRules2SQL;
});

define("ometa!Prettify", [ "ometa-core" ], function() {
    var Prettify = OMeta._extend({
        Elem: function(indent) {
            var s, $elf = this, _fromIdx = this.input.idx, e;
            this._form(function() {
                return e = this._many(function() {
                    return this._or(function() {
                        s = this._apply("string");
                        return '"' + s + '"';
                    }, function() {
                        return this._applyWithArgs("Elem", indent + "	");
                    }, function() {
                        return this._apply("number");
                    }, function() {
                        return this._apply("true");
                    }, function() {
                        return this._apply("false");
                    });
                });
            });
            return "[" + e.join(",\n" + indent) + "]";
        },
        Process: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._applyWithArgs("Elem", "	");
        }
    });
    return Prettify;
});

define("ometa!sbvr-compiler/AbstractSQLOptimiser", [ "ometa!Prettify", "underscore", "ometa-core" ], function(Prettify) {
    var AbstractSQLValidator = OMeta._extend({
        Query: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._apply("SelectQuery");
        },
        SelectQuery: function() {
            var from, select, $elf = this, where, queryPart, query, _fromIdx = this.input.idx;
            query = [ "SelectQuery" ];
            this._form(function() {
                this._applyWithArgs("exactly", "SelectQuery");
                this._many1(function() {
                    queryPart = this._or(function() {
                        this._pred(null == select);
                        return select = this._apply("Select");
                    }, function() {
                        return from = this._apply("From");
                    }, function() {
                        return this._apply("Join");
                    }, function() {
                        this._pred(null == where);
                        return where = this._apply("Where");
                    });
                    return query = query.concat(queryPart);
                });
                this._pred(null != select);
                return this._pred(null != from);
            });
            return query;
        },
        Select: function() {
            var $elf = this, fields, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Select");
                return this._or(function() {
                    return this._form(function() {
                        return fields = this._many(function() {
                            return this._apply("Count");
                        });
                    });
                }, function() {
                    return fields = this._applyWithArgs("exactly", "*");
                });
            });
            return [ [ "Select", fields ] ];
        },
        Count: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._form(function() {
                this._applyWithArgs("exactly", "Count");
                return this._applyWithArgs("exactly", "*");
            });
        },
        From: function() {
            var from, $elf = this, as, table, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "From");
                table = this._apply("anything");
                from = [ "From", table ];
                return this._opt(function() {
                    as = this._apply("anything");
                    return from.push(as);
                });
            });
            return [ from ];
        },
        Join: function() {
            var boolStatement, $elf = this, table, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Join");
                this._form(function() {
                    this._applyWithArgs("exactly", "With");
                    return table = this._apply("anything");
                });
                return this._form(function() {
                    this._applyWithArgs("exactly", "On");
                    return boolStatement = this._apply("BooleanStatement");
                });
            });
            return [ [ "Join", [ "With", table ], [ "On", boolStatement ] ] ];
        },
        BooleanStatement: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._apply("Not");
            }, function() {
                return this._apply("And");
            }, function() {
                return this._apply("Exists");
            }, function() {
                return this._apply("Equals");
            }, function() {
                return this._apply("GreaterThan");
            }, function() {
                return this._apply("GreaterThanOrEqual");
            }, function() {
                return this._apply("LessThan");
            }, function() {
                return this._apply("LessThanOrEqual");
            }, function() {
                return this._apply("Between");
            }, function() {
                return this._apply("Boolean");
            });
        },
        Where: function() {
            var boolStatement, $elf = this, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Where");
                return boolStatement = this._apply("BooleanStatement");
            });
            return [ [ "Where", boolStatement ] ];
        },
        Not: function() {
            var boolStatement, $elf = this, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Not");
                return boolStatement = this._apply("BooleanStatement");
            });
            return [ "Not", boolStatement ];
        },
        And: function() {
            var boolStatement1, $elf = this, boolStatement2, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "And");
                boolStatement1 = this._apply("BooleanStatement");
                return boolStatement2 = this._many1(function() {
                    return this._apply("BooleanStatement");
                });
            });
            return [ "And", boolStatement1 ].concat(boolStatement2);
        },
        Exists: function() {
            var $elf = this, comparator, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Exists");
                return comparator = this._apply("Comparator");
            });
            return [ "Exists", comparator ];
        },
        NotEquals: function() {
            var $elf = this, comp1, comp2, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "NotEquals");
                comp1 = this._apply("Comparator");
                return comp2 = this._apply("Comparator");
            });
            return [ "NotEquals", comp1, comp2 ];
        },
        Equals: function() {
            var $elf = this, comp1, comp2, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Equals");
                comp1 = this._apply("Comparator");
                return comp2 = this._apply("Comparator");
            });
            return [ "Equals", comp1, comp2 ];
        },
        GreaterThan: function() {
            var $elf = this, comp1, comp2, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "GreaterThan");
                comp1 = this._apply("Comparator");
                return comp2 = this._apply("Comparator");
            });
            return [ "GreaterThan", comp1, comp2 ];
        },
        GreaterThanOrEqual: function() {
            var $elf = this, comp1, comp2, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "GreaterThanOrEqual");
                comp1 = this._apply("Comparator");
                return comp2 = this._apply("Comparator");
            });
            return [ "GreaterThanOrEqual", comp1, comp2 ];
        },
        LessThan: function() {
            var $elf = this, comp1, comp2, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "LessThan");
                comp1 = this._apply("Comparator");
                return comp2 = this._apply("Comparator");
            });
            return [ "LessThan", comp1, comp2 ];
        },
        LessThanOrEqual: function() {
            var $elf = this, comp1, comp2, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "LessThanOrEqual");
                comp1 = this._apply("Comparator");
                return comp2 = this._apply("Comparator");
            });
            return [ "LessThanOrEqual", comp1, comp2 ];
        },
        Between: function() {
            var $elf = this, comp1, comp2, comp3, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Between");
                comp1 = this._apply("Comparator");
                comp2 = this._apply("Comparator");
                return comp3 = this._apply("Comparator");
            });
            return [ "Between", comp1, comp2, comp3 ];
        },
        Comparator: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                return this._apply("Query");
            }, function() {
                return this._apply("Field");
            }, function() {
                return this._apply("ReferencedField");
            }, function() {
                return this._apply("Number");
            }, function() {
                return this._apply("Text");
            }, function() {
                return this._apply("Boolean");
            }, function() {
                return this._apply("CharacterLength");
            }, function() {
                return this._apply("BitwiseAnd");
            }, function() {
                return this._apply("BitwiseShiftRight");
            });
        },
        Field: function() {
            var field, $elf = this, table, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Field");
                table = this._apply("anything");
                return field = this._apply("anything");
            });
            return [ "Field", table, field ];
        },
        ReferencedField: function() {
            var field, $elf = this, binding, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "ReferencedField");
                binding = this._apply("anything");
                return field = this._apply("anything");
            });
            return [ "ReferencedField", binding, field ];
        },
        Number: function() {
            var number, $elf = this, _fromIdx = this.input.idx;
            this._form(function() {
                (function() {
                    switch (this._apply("anything")) {
                      case "Number":
                        return "Number";

                      case "Integer":
                        return "Integer";

                      case "Real":
                        return "Real";

                      default:
                        throw this._fail();
                    }
                }).call(this);
                return number = this._apply("anything");
            });
            return [ "Number", number ];
        },
        Text: function() {
            var $elf = this, text, _fromIdx = this.input.idx;
            this._form(function() {
                (function() {
                    switch (this._apply("anything")) {
                      case "Value":
                        return "Value";

                      case "Text":
                        return "Text";

                      default:
                        throw this._fail();
                    }
                }).call(this);
                return text = this._apply("anything");
            });
            return [ "Text", text ];
        },
        Boolean: function() {
            var $elf = this, bool, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "Boolean");
                return bool = this._or(function() {
                    return this._apply("true");
                }, function() {
                    return this._apply("false");
                });
            });
            return [ "Boolean", bool ];
        },
        CharacterLength: function() {
            var $elf = this, text, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "CharacterLength");
                return text = this._or(function() {
                    return this._apply("ReferencedField");
                }, function() {
                    return this._apply("Field");
                }, function() {
                    return this._apply("Text");
                });
            });
            return [ "CharacterLength", text ];
        },
        BitwiseAnd: function() {
            var $elf = this, operand, mask, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "BitwiseAnd");
                operand = this._or(function() {
                    return this._apply("ReferencedField");
                }, function() {
                    return this._apply("Field");
                }, function() {
                    return this._apply("Number");
                });
                return mask = this._or(function() {
                    return this._apply("ReferencedField");
                }, function() {
                    return this._apply("Field");
                }, function() {
                    return this._apply("Number");
                });
            });
            return [ "BitwiseAnd", operand, mask ];
        },
        BitwiseShiftRight: function() {
            var shift, $elf = this, operand, _fromIdx = this.input.idx;
            this._form(function() {
                this._applyWithArgs("exactly", "BitwiseShiftRight");
                operand = this._or(function() {
                    return this._apply("ReferencedField");
                }, function() {
                    return this._apply("Field");
                }, function() {
                    return this._apply("Number");
                });
                return shift = this._or(function() {
                    return this._apply("ReferencedField");
                }, function() {
                    return this._apply("Field");
                }, function() {
                    return this._apply("Number");
                });
            });
            return [ "BitwiseShiftRight", operand, shift ];
        }
    }), AbstractSQLOptimiser = AbstractSQLValidator._extend({
        Not: function() {
            var boolStatement, $elf = this, _fromIdx = this.input.idx;
            return this._or(function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "Not");
                    return this._or(function() {
                        return this._form(function() {
                            this._applyWithArgs("exactly", "Not");
                            return boolStatement = this._apply("BooleanStatement");
                        });
                    }, function() {
                        boolStatement = this._apply("Equals");
                        return boolStatement[0] = "NotEquals";
                    });
                });
                this._apply("SetHelped");
                return boolStatement;
            }, function() {
                return this._form(function() {
                    this._applyWithArgs("exactly", "Exists");
                    return this._form(function() {
                        return this._applyWithArgs("exactly", "SelectQuery");
                    });
                });
            }, function() {
                return AbstractSQLValidator._superApplyWithArgs(this, "Not");
            });
        },
        Helped: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._pred(this.helped === !0);
            return this.helped = !1;
        },
        SetHelped: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this.helped = !0;
        },
        Process: function() {
            var $elf = this, query, _fromIdx = this.input.idx;
            query = this._apply("anything");
            query = this._or(function() {
                return this._applyWithArgs("BooleanStatement", query);
            }, function() {
                return this._applyWithArgs("SelectQuery", query);
            });
            this._many(function() {
                this._applyWithArgs("Helped", "disableMemoisation");
                query = this._or(function() {
                    return this._applyWithArgs("BooleanStatement", query);
                }, function() {
                    return this._applyWithArgs("SelectQuery", query);
                });
                return query = this._apply("anything");
            });
            return query;
        }
    });
    AbstractSQLOptimiser.initialize = function() {
        this.helped = !1;
    };
    return AbstractSQLOptimiser;
});

(function() {
    var __hasProp = {}.hasOwnProperty;
    define("cs!sbvr-compiler/AbstractSQL2SQL", [ "ometa!sbvr-compiler/AbstractSQLRules2SQL", "ometa!sbvr-compiler/AbstractSQLOptimiser", "ometa!Prettify", "underscore" ], function(AbstractSQLRules2SQL, AbstractSQLOptimiser, Prettify, _) {
        var dataTypeValidate, generate, mysqlDataType, postgresDataType, websqlDataType;
        dataTypeValidate = function(originalValue, field) {
            var bcrypt, component, componentValue, salt, validated, value;
            value = originalValue;
            validated = !0;
            if (null === value || "" === value) {
                value = null;
                field[2] === !0 && (validated = "cannot be null");
            } else switch (field[0]) {
              case "Serial":
              case "Integer":
              case "ForeignKey":
              case "ConceptType":
                value = parseInt(value, 10);
                _.isNaN(value) && (validated = "is not a number: " + originalValue);
                break;

              case "Date":
              case "Date Time":
              case "Time":
                value = new Date(value);
                _.isNaN(value) && (validated = "is not a " + field[0] + ": " + originalValue);
                break;

              case "Interval":
                value = parseInt(value, 10);
                _.isNaN(value) && (validated = "is not a number: " + originalValue);
                break;

              case "Real":
                value = parseFloat(value);
                _.isNaN(value) && (validated = "is not a number: " + originalValue);
                break;

              case "Short Text":
                _.isString(value) ? value.length > 255 && (validated = "longer than 255 characters (" + value.length + ")") : validated = "is not a string: " + originalValue;
                break;

              case "Text":
                _.isString(value) || (validated = "is not a string: " + originalValue);
                break;

              case "JSON":
                try {
                    value = JSON.stringify(value);
                } catch (e) {
                    validated = "cannot be turned into JSON: " + originalValue;
                }
                break;

              case "Boolean":
                value = Number(value);
                (_.isNaN(value) || 0 !== value && 1 !== value) && (validated = "is not a boolean: " + originalValue);
                break;

              case "Hashed":
                if (_.isString(value)) if ("undefined" != typeof window && null !== window && window === function() {
                    return this;
                }()) value.length > 60 && (validated = "longer than 60 characters (" + value.length + ")"); else {
                    bcrypt = require("bcrypt");
                    salt = bcrypt.genSaltSync();
                    value = bcrypt.hashSync(value, salt);
                } else validated = "is not a string";
                break;

              case "Color":
                if (_.isObject(value)) {
                    value = 0;
                    for (component in originalValue) if (__hasProp.call(originalValue, component)) {
                        componentValue = originalValue[component];
                        (_.isNaN(componentValue) || componentValue > 255) && (validated = "has invalid component value of " + componentValue + " for component " + component);
                        switch (component.toLowerCase()) {
                          case "r":
                          case "red":
                            value |= componentValue >> 16;
                            break;

                          case "g":
                          case "green":
                            value |= componentValue >> 8;
                            break;

                          case "b":
                          case "blue":
                            value |= componentValue;
                            break;

                          case "a":
                          case "alpha":
                            value |= componentValue >> 24;
                        }
                    }
                } else {
                    value = parseInt(value, 10);
                    _.isNaN(value) && (validated = "is neither an integer or color object: " + originalValue);
                }
                break;

              default:
                validated = "is an unsupported type: " + field[0];
            }
            return {
                validated: validated,
                value: value
            };
        };
        postgresDataType = function(dataType, necessity, index) {
            null == index && (index = "");
            necessity = necessity ? " NOT NULL" : " NULL";
            "" !== index && (index = " " + index);
            switch (dataType) {
              case "Serial":
                return "SERIAL" + necessity + index;

              case "Date":
                return "DATE" + necessity + index;

              case "Date Time":
                return "TIMESTAMP" + necessity + index;

              case "Time":
                return "TIME" + necessity + index;

              case "Interval":
                return "INTERVAL" + necessity + index;

              case "Real":
                return "REAL" + necessity + index;

              case "Integer":
              case "ForeignKey":
              case "ConceptType":
                return "INTEGER" + necessity + index;

              case "Short Text":
                return "VARCHAR(255)" + necessity + index;

              case "Text":
              case "JSON":
                return "TEXT" + necessity + index;

              case "File":
                return "BYTEA" + necessity + index;

              case "Boolean":
                return "INTEGER NOT NULL DEFAULT 0" + index;

              case "Hashed":
                return "CHAR(60)" + necessity + index;

              default:
                return "VARCHAR(100)" + necessity + index;
            }
        };
        mysqlDataType = function(dataType, necessity, index) {
            null == index && (index = "");
            necessity = necessity ? " NOT NULL" : " NULL";
            "" !== index && (index = " " + index);
            switch (dataType) {
              case "Serial":
                return "INTEGER" + necessity + index + " AUTO_INCREMENT";

              case "Date":
                return "DATE" + necessity + index;

              case "Date Time":
                return "TIMESTAMP" + necessity + index;

              case "Time":
                return "TIME" + necessity + index;

              case "Interval":
                return "INTEGER" + necessity + index;

              case "Real":
                return "REAL" + necessity + index;

              case "Integer":
              case "ForeignKey":
              case "ConceptType":
                return "INTEGER" + necessity + index;

              case "Short Text":
                return "VARCHAR(255) " + necessity + index;

              case "Text":
              case "JSON":
                return "TEXT" + necessity + index;

              case "File":
                return "BLOB" + necessity + index;

              case "Boolean":
                return "INTEGER NOT NULL DEFAULT 0" + index;

              case "Hashed":
                return "CHAR(60)" + necessity + index;

              default:
                return "VARCHAR(100)" + necessity + index;
            }
        };
        websqlDataType = function(dataType, necessity, index) {
            null == index && (index = "");
            necessity = necessity ? " NOT NULL" : " NULL";
            "" !== index && (index = " " + index);
            switch (dataType) {
              case "Serial":
                return "INTEGER" + necessity + index + " AUTOINCREMENT";

              case "Date":
                return "TEXT" + necessity + index;

              case "Date Time":
                return "TEXT" + necessity + index;

              case "Time":
                return "TEXT" + necessity + index;

              case "Interval":
                return "INTEGER" + necessity + index;

              case "Real":
                return "REAL" + necessity + index;

              case "Integer":
              case "ForeignKey":
              case "ConceptType":
                return "INTEGER" + necessity + index;

              case "Short Text":
                return "VARCHAR(255) " + necessity + index;

              case "Text":
              case "JSON":
                return "TEXT" + necessity + index;

              case "File":
                return "BLOB" + necessity + index;

              case "Boolean":
                return "INTEGER NOT NULL DEFAULT 0" + index;

              case "Hashed":
                return "CHAR(60)" + necessity + index;

              default:
                return "VARCHAR(100)" + necessity + index;
            }
        };
        generate = function(sqlModel, dataTypeGen, ifNotExists) {
            var createSQL, createSchemaStatements, dependency, depends, dropSQL, dropSchemaStatements, field, foreignKey, foreignKeys, hasDependants, instance, resourceName, rule, ruleSQL, ruleStatements, schemaDependencyMap, schemaInfo, table, tableName, tableNames, unsolvedDependency, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _m, _n, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
            ifNotExists = ifNotExists ? "IF NOT EXISTS " : "";
            hasDependants = {};
            schemaDependencyMap = {};
            _ref = sqlModel.tables;
            for (resourceName in _ref) if (__hasProp.call(_ref, resourceName)) {
                table = _ref[resourceName];
                if (!_.isString(table)) {
                    foreignKeys = [];
                    depends = [];
                    dropSQL = 'DROP TABLE "' + table.name + '";';
                    createSQL = "CREATE TABLE " + ifNotExists + '"' + table.name + '" (\n	';
                    _ref1 = table.fields;
                    for (_i = 0, _len = _ref1.length; _len > _i; _i++) {
                        field = _ref1[_i];
                        createSQL += '"' + field[1] + '" ' + dataTypeGen(field[0], field[2], field[3]) + "\n,	";
                        if ("ForeignKey" === (_ref2 = field[0]) || "ConceptType" === _ref2) {
                            foreignKeys.push([ field[1] ].concat(field[4]));
                            depends.push(field[4][0]);
                            hasDependants[field[4][0]] = !0;
                        }
                    }
                    for (_j = 0, _len1 = foreignKeys.length; _len1 > _j; _j++) {
                        foreignKey = foreignKeys[_j];
                        createSQL += 'FOREIGN KEY ("' + foreignKey[0] + '") REFERENCES "' + foreignKey[1] + '" ("' + foreignKey[2] + '")' + "\n,	";
                    }
                    createSQL = createSQL.slice(0, -2) + ");";
                    schemaDependencyMap[table.name] = {
                        resourceName: resourceName,
                        primitive: table.primitive,
                        createSQL: createSQL,
                        dropSQL: dropSQL,
                        depends: depends
                    };
                }
            }
            createSchemaStatements = [];
            dropSchemaStatements = [];
            tableNames = [];
            for (;tableNames.length !== (tableNames = Object.keys(schemaDependencyMap)).length && tableNames.length > 0; ) for (_k = 0, 
            _len2 = tableNames.length; _len2 > _k; _k++) {
                tableName = tableNames[_k];
                schemaInfo = schemaDependencyMap[tableName];
                unsolvedDependency = !1;
                _ref3 = schemaInfo.depends;
                for (_l = 0, _len3 = _ref3.length; _len3 > _l; _l++) {
                    dependency = _ref3[_l];
                    if (dependency !== schemaInfo.resourceName && schemaDependencyMap.hasOwnProperty(dependency)) {
                        unsolvedDependency = !0;
                        break;
                    }
                }
                if (unsolvedDependency === !1) {
                    if (sqlModel.tables[schemaInfo.resourceName].exists = schemaInfo.primitive === !1 || null != hasDependants[tableName]) {
                        schemaInfo.primitive !== !1 && console.warn("We're adding a primitive table??", schemaInfo.resourceName);
                        createSchemaStatements.push(schemaInfo.createSQL);
                        dropSchemaStatements.push(schemaInfo.dropSQL);
                        console.log(schemaInfo.createSQL);
                    }
                    delete schemaDependencyMap[tableName];
                }
            }
            if (schemaDependencyMap.length > 0) {
                console.error("Failed to resolve all schema dependencies", schemaDependencyMap);
                throw "Failed to resolve all schema dependencies";
            }
            dropSchemaStatements = dropSchemaStatements.reverse();
            try {
                _ref4 = sqlModel.rules;
                for (_m = 0, _len4 = _ref4.length; _len4 > _m; _m++) {
                    rule = _ref4[_m];
                    instance = AbstractSQLOptimiser.createInstance();
                    rule[2][1] = instance.match(rule[2][1], "Process");
                }
            } catch (e) {
                console.error(e);
                console.error(instance.input);
                throw e;
            }
            ruleStatements = [];
            try {
                _ref5 = sqlModel.rules;
                for (_n = 0, _len5 = _ref5.length; _len5 > _n; _n++) {
                    rule = _ref5[_n];
                    instance = AbstractSQLRules2SQL.createInstance();
                    ruleSQL = instance.match(rule[2][1], "Process");
                    console.log(rule[1][1]);
                    console.log(ruleSQL);
                    ruleStatements.push({
                        structuredEnglish: rule[1][1],
                        sql: ruleSQL
                    });
                }
            } catch (e) {
                console.error(e);
                console.error(instance.input);
                throw e;
            }
            return {
                tables: sqlModel.tables,
                createSchema: createSchemaStatements,
                dropSchema: dropSchemaStatements,
                rules: ruleStatements
            };
        };
        return {
            websql: {
                generate: function(sqlModel) {
                    return generate(sqlModel, websqlDataType, !1);
                },
                dataTypeValidate: dataTypeValidate
            },
            postgres: {
                generate: function(sqlModel) {
                    return generate(sqlModel, postgresDataType, !0);
                },
                dataTypeValidate: dataTypeValidate
            },
            mysql: {
                generate: function(sqlModel) {
                    return generate(sqlModel, mysqlDataType, !0);
                },
                dataTypeValidate: dataTypeValidate
            }
        };
    });
}).call(this);

(function() {
    define("cs!sbvr-compiler/AbstractSQL2CLF", [ "underscore" ], function() {
        var getField, _;
        _ = require("underscore");
        getField = function(table, fieldName) {
            var tableField, tableFields, _i, _len;
            tableFields = table.fields;
            for (_i = 0, _len = tableFields.length; _len > _i; _i++) {
                tableField = tableFields[_i];
                if (tableField[1] === fieldName) return tableField;
            }
            return !1;
        };
        return function(sqlModel) {
            var addMapping, idParts, part, resourceField, resourceName, resourceToSQLMappings, resources, sqlField, sqlFieldName, sqlTable, sqlTableName, table, tables, _i, _len, _ref;
            tables = sqlModel.tables;
            resources = {};
            resourceToSQLMappings = {};
            addMapping = function(resourceName, resourceField, sqlTableName, sqlFieldName) {
                return resourceToSQLMappings[resourceName][resourceField] = [ sqlTableName, sqlFieldName ];
            };
            for (resourceName in tables) {
                table = tables[resourceName];
                if (table.exists !== !1) {
                    idParts = resourceName.split("-");
                    resourceToSQLMappings[resourceName] = {};
                    if (_.isString(table)) {
                        sqlTable = tables[idParts[0]];
                        sqlFieldName = sqlTable.idField;
                        resourceField = sqlTableName = sqlTable.name;
                        addMapping(resourceName, resourceField, sqlTableName, sqlFieldName);
                        resources[resourceName] = {
                            resourceName: resourceName,
                            modelName: function() {
                                var _i, _len, _results;
                                _results = [];
                                for (_i = 0, _len = idParts.length; _len > _i; _i++) {
                                    part = idParts[_i];
                                    _results.push(part.replace(/_/g, " "));
                                }
                                return _results;
                            }().join(" "),
                            topLevel: 1 === idParts.length,
                            fields: [ [ "ForeignKey", resourceField, !0, null, [ sqlTableName, sqlFieldName ] ] ],
                            idField: resourceField,
                            referenceScheme: resourceField,
                            actions: [ "view", "add", "delete" ]
                        };
                        switch (table) {
                          case "Attribute":
                          case "ForeignKey":
                            resourceField = sqlFieldName = tables[idParts[2]].name;
                            sqlTableName = sqlTable.name;
                            addMapping(resourceName, resourceField, sqlTableName, sqlFieldName);
                            resources[resourceName].fields.push(getField(sqlTable, sqlFieldName));
                            resources[resourceName].referenceScheme = resourceField;
                            break;

                          case "BooleanAttribute":
                            resourceField = sqlFieldName = idParts[1].replace(/_/g, " ");
                            sqlTableName = sqlTable.name;
                            addMapping(resourceName, resourceField, sqlTableName, sqlFieldName);
                            resources[resourceName].fields.push(getField(sqlTable, sqlFieldName));
                            resources[resourceName].referenceScheme = resourceField;
                            break;

                          default:
                            throw "Unrecognised table type";
                        }
                    } else {
                        resources[resourceName] = {
                            resourceName: resourceName,
                            modelName: function() {
                                var _i, _len, _results;
                                _results = [];
                                for (_i = 0, _len = idParts.length; _len > _i; _i++) {
                                    part = idParts[_i];
                                    _results.push(part.replace(/_/g, " "));
                                }
                                return _results;
                            }().join(" "),
                            topLevel: 1 === idParts.length,
                            fields: table.fields,
                            idField: table.idField,
                            referenceScheme: table.referenceScheme,
                            actions: [ "view", "add", "edit", "delete" ]
                        };
                        _ref = table.fields;
                        for (_i = 0, _len = _ref.length; _len > _i; _i++) {
                            sqlField = _ref[_i];
                            addMapping(resourceName, sqlField[1], table.name, sqlField[1]);
                        }
                    }
                }
            }
            return {
                resources: resources,
                resourceToSQLMappings: resourceToSQLMappings
            };
        };
    });
}).call(this);

(function() {
    define("cs!sbvr-compiler/ODataMetadataGenerator", [ "underscore" ], function(_) {
        var resolveFieldType;
        resolveFieldType = function(fieldType) {
            switch (fieldType) {
              case "Serial":
              case "Integer":
                return "Edm.Int64";

              case "Interval":
                return "Edm.Int64";

              case "Date":
              case "Date Time":
              case "Time":
                return "Edm.Int64";

              case "Real":
                return "Edm.Double";

              case "Short Text":
              case "Hashed":
                return "Edm.String";

              case "Text":
              case "JSON":
                return "Edm.String";

              case "Boolean":
                return "Edm.Boolean";

              case "Color":
                return "Self.Color";

              default:
                return console.error("Could not resolve type", fieldType);
            }
        };
        return function(vocabulary, sqlModel) {
            var associations, cardinality, ends, fieldName, fieldType, fields, i, idField, indexes, key, model, name, primitive, referencedField, referencedResource, references, required, resourceName, _i, _len, _ref, _ref1;
            model = sqlModel.tables;
            associations = [];
            for (key in model) {
                _ref = model[key], resourceName = _ref.name, fields = _ref.fields, primitive = _ref.primitive;
                if (!_.isString(model[key]) && !primitive) for (i = _i = 0, _len = fields.length; _len > _i; i = ++_i) {
                    _ref1 = fields[i], fieldType = _ref1[0], fieldName = _ref1[1], required = _ref1[2], 
                    indexes = _ref1[3], references = _ref1[4];
                    if ("ForeignKey" === fieldType) {
                        referencedResource = references[0], referencedField = references[1];
                        associations.push({
                            name: resourceName + referencedResource,
                            ends: [ {
                                resourceName: resourceName,
                                cardinality: required ? "1" : "0..1"
                            }, {
                                resourceName: referencedResource,
                                cardinality: "*"
                            } ]
                        });
                    }
                }
            }
            return '<?xml version="1.0" encoding="iso-8859-1" standalone="yes"?>\n<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">\n	<edmx:DataServices xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" m:DataServiceVersion="2.0">\n		<ComplexType Name="Color">\n			 <Property Name="r" Nullable="false" Type="Edm.Int8"/>\n			 <Property Name="g" Nullable="false" Type="Edm.Int8"/>\n			 <Property Name="b" Nullable="false" Type="Edm.Int8"/>\n			 <Property Name="a" Nullable="false" Type="Edm.Int8"/>\n		</ComplexType>\n		<Schema Namespace="' + vocabulary + '" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://schemas.microsoft.com/ado/2007/05/edm">\n				' + function() {
                var _ref2, _results;
                _results = [];
                for (key in model) {
                    _ref2 = model[key], idField = _ref2.idField, resourceName = _ref2.name, fields = _ref2.fields, 
                    primitive = _ref2.primitive;
                    _.isString(model[key]) || primitive || _results.push('<EntityType Name="' + resourceName + '">\n	<Key>\n		<PropertyRef Name="' + idField + '" />\n	</Key>\n	' + function() {
                        var _j, _len1, _ref3, _results1;
                        _results1 = [];
                        for (_j = 0, _len1 = fields.length; _len1 > _j; _j++) {
                            _ref3 = fields[_j], fieldType = _ref3[0], fieldName = _ref3[1], required = _ref3[2], 
                            indexes = _ref3[3], references = _ref3[4];
                            if ("ForeignKey" !== fieldType) {
                                fieldType = resolveFieldType(fieldType);
                                _results1.push('<Property Name="' + fieldName + '" Type="' + fieldType + '" Nullable="' + !required + '" />');
                            }
                        }
                        return _results1;
                    }().join("\n") + "\n" + function() {
                        var _j, _len1, _ref3, _results1;
                        _results1 = [];
                        for (_j = 0, _len1 = fields.length; _len1 > _j; _j++) {
                            _ref3 = fields[_j], fieldType = _ref3[0], fieldName = _ref3[1], required = _ref3[2], 
                            indexes = _ref3[3], references = _ref3[4];
                            if ("ForeignKey" === fieldType) {
                                referencedResource = references[0], referencedField = references[1];
                                _results1.push('<NavigationProperty Name="' + fieldName + '" Relationship="' + vocabulary + "." + (resourceName + referencedResource) + '" FromRole="' + resourceName + '" ToRole="' + referencedResource + '" />');
                            }
                        }
                        return _results1;
                    }().join("\n") + "\n" + "</EntityType>");
                }
                return _results;
            }().join("\n\n") + function() {
                var _j, _len1, _ref2, _results;
                _results = [];
                for (_j = 0, _len1 = associations.length; _len1 > _j; _j++) {
                    _ref2 = associations[_j], name = _ref2.name, ends = _ref2.ends;
                    _results.push('<Association Name="' + name + '">' + "\n	" + function() {
                        var _k, _len2, _ref3, _results1;
                        _results1 = [];
                        for (_k = 0, _len2 = ends.length; _len2 > _k; _k++) {
                            _ref3 = ends[_k], resourceName = _ref3.resourceName, cardinality = _ref3.cardinality;
                            _results1.push('<End Role="' + resourceName + '" Type="' + vocabulary + "." + resourceName + '" Multiplicity="' + cardinality + '" />');
                        }
                        return _results1;
                    }().join("\n	") + "\n" + "</Association>");
                }
                return _results;
            }().join("\n") + ('<EntityContainer Name="' + vocabulary + 'Service" m:IsDefaultEntityContainer="true">\n') + function() {
                var _results;
                _results = [];
                for (key in model) {
                    resourceName = model[key].name;
                    _.isString(model[key]) || primitive || _results.push('<EntitySet Name="' + resourceName + '" EntityType="' + vocabulary + "." + resourceName + '" />');
                }
                return _results;
            }().join("\n") + "\n" + function() {
                var _j, _len1, _ref2, _results;
                _results = [];
                for (_j = 0, _len1 = associations.length; _len1 > _j; _j++) {
                    _ref2 = associations[_j], name = _ref2.name, ends = _ref2.ends;
                    _results.push('<AssociationSet Name="' + name + '" Association="' + vocabulary + "." + name + '">' + "\n	" + function() {
                        var _k, _len2, _ref3, _results1;
                        _results1 = [];
                        for (_k = 0, _len2 = ends.length; _len2 > _k; _k++) {
                            _ref3 = ends[_k], resourceName = _ref3.resourceName, cardinality = _ref3.cardinality;
                            _results1.push('<End Role="' + resourceName + '" EntitySet="' + vocabulary + "." + resourceName + '" />');
                        }
                        return _results1;
                    }().join("\n	") + "</AssociationSet>");
                }
                return _results;
            }().join("\n") + "			</EntityContainer>\n		</Schema>\n	</edmx:DataServices>\n</edmx:Edmx>";
        };
    });
}).call(this);

define("ometa!server-glue/uri-parser", [ "ometa!sbvr-parser/SBVRLibs", "underscore", "ometa-core" ], function(SBVRLibs, _) {
    var URIParser = SBVRLibs._extend({
        Process: function() {
            var vocab, $elf = this, requests, body, method, _fromIdx = this.input.idx;
            this._form(function() {
                method = function() {
                    switch (this._apply("anything")) {
                      case "GET":
                        return "GET";

                      case "PUT":
                        return "PUT";

                      case "DELETE":
                        return "DELETE";

                      case "POST":
                        return "POST";

                      default:
                        throw this._fail();
                    }
                }.call(this);
                this.currentMethod = method;
                body = this._apply("anything");
                return this._form(function() {
                    this._applyWithArgs("exactly", "/");
                    vocab = this._apply("Vocabulary");
                    this.currentVocab = vocab;
                    requests = this._opt(function() {
                        return this._applyWithArgs("ProcessURI", body);
                    });
                    return this._opt(function() {
                        return this._applyWithArgs("exactly", "/");
                    });
                });
            });
            return {
                type: this.type,
                requests: requests,
                vocabulary: vocab
            };
        },
        Vocabulary: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._consumedBy(function() {
                return this._many1(function() {
                    this._not(function() {
                        return this._applyWithArgs("exactly", "/");
                    });
                    return this._apply("anything");
                });
            });
        }
    });
    URIParser.initialize = function() {
        this.sqlModels = {};
        this.clientModels = {};
        this.currentVocab = "";
        this.currentMethod = "";
        this.currentBody = [];
        this.currentResource = null;
    };
    URIParser.GetTableField = function(mapping) {
        return SBVRLibs.GetTableField.call(this, this.sqlModels[this.currentVocab].tables[mapping[0]], mapping[1]);
    };
    URIParser.GetMapping = function(resourceName, resourceFieldName) {
        var resourceMapping = this.clientModels[this.currentVocab].resourceToSQLMappings[resourceName];
        if (resourceMapping.hasOwnProperty(resourceFieldName)) return resourceMapping[resourceFieldName];
        resourceFieldName = resourceFieldName.replace(/ /g, "_");
        if (resourceMapping.hasOwnProperty(resourceFieldName)) return resourceMapping[resourceFieldName];
        throw "Could not map resource: " + resourceName + " - " + resourceFieldName;
    };
    URIParser.setSQLModel = function(vocab, model) {
        this.sqlModels[vocab] = model;
    };
    URIParser.setClientModel = function(vocab, model) {
        this.clientModels[vocab] = model;
    };
    URIParser.AddWhereClause = function(query, whereBody) {
        if ("Exists" != whereBody[0] || "SelectQuery" != whereBody[1][0] && "InsertQuery" != whereBody[1][0] && "UpdateQuery" != whereBody[1][0] && "UpsertQuery" != whereBody[1][0]) {
            for (var i = 1; query.length > i; i++) if ("Where" == query[i][0]) {
                query[i][1] = [ "And", query[i][1], whereBody ];
                return void 0;
            }
            query.push([ "Where", whereBody ]);
        } else {
            whereBody = whereBody[1].slice(1);
            for (var i = 0; whereBody.length > i; i++) "From" == whereBody[i][0] && query.push(whereBody[i]);
            for (var i = 0; whereBody.length > i; i++) "Where" == whereBody[i][0] && this.AddWhereClause(query, whereBody[i][1]);
        }
        if ("UpsertQuery" == query[0] && "Equals" == whereBody[0]) {
            var field, bind;
            "Field" == whereBody[1][0] ? field = whereBody[1][1] : "ReferencedField" == whereBody[1][0] ? field = whereBody[1][2] : "Field" == whereBody[2][0] ? field = whereBody[2][1] : "ReferencedField" == whereBody[2][0] && (field = whereBody[2][2]);
            "Bind" == whereBody[1][0] ? bind = whereBody[1] : "Bind" == whereBody[2][0] && (bind = whereBody[2]);
            for (var i = 1; query.length > i; i++) {
                var queryPart = query[i];
                if ("Fields" == queryPart[0]) {
                    for (var j = 0; queryPart[1].length > j; j++) {
                        var queryFields = queryPart[1][j];
                        if (queryFields[0] == field) {
                            queryFields[1] = bind;
                            break;
                        }
                    }
                    j === queryPart[1].length && queryPart[1].push([ field, bind ]);
                    break;
                }
            }
        }
    };
    URIParser.AddBodyVar = function(query, resourceName, resourceFieldName, mapping, value) {
        if (void 0 === value) if (this.currentBody.hasOwnProperty(resourceName + "/" + resourceFieldName)) value = this.currentBody[resourceName + "/" + resourceFieldName]; else if (this.currentBody.hasOwnProperty(resourceName + "." + resourceFieldName)) value = this.currentBody[resourceName + "." + resourceFieldName]; else {
            if (!this.currentBody.hasOwnProperty(resourceFieldName)) {
                var sqlTable = this.sqlModels[this.currentVocab].tables[mapping[0]];
                if (sqlTable.hasOwnProperty("fields")) for (var i = 0; sqlTable.fields.length > i; i++) {
                    var sqlField = sqlTable.fields[i];
                    if (sqlField[1] == mapping[1]) {
                        "Serial" == sqlField[0] && this.AddQueryTable(query, mapping[0]);
                        return void 0;
                    }
                }
                return void 0;
            }
            value = this.currentBody[resourceFieldName];
        }
        this.AddQueryTable(query, mapping[0]);
        return this.newBody[mapping.join(".")] = value;
    };
    URIParser.AddQueryTable = function(query, tableName) {
        var i = 0;
        for (void 0; query.length > i; i++) if ("From" === query[i][0] && query[i][1] === tableName) return void 0;
        query.push([ "From", tableName ]);
    };
    URIParser.AddQueryResource = function(query, resourceName) {
        var newValue, fieldName, fields, mapping, resourceFieldName, $elf = this, clientModel = this.clientModels[this.currentVocab], resourceModel = clientModel.resources[resourceName], resourceToSQLMappings = clientModel.resourceToSQLMappings[resourceName], getSelectFields = function() {
            var mapping, resourceField, fields = [];
            for (resourceField in resourceToSQLMappings) if (resourceToSQLMappings.hasOwnProperty(resourceField)) {
                mapping = resourceToSQLMappings[resourceField];
                $elf.AddQueryTable(query, mapping[0]);
                fields.push([ [ "ReferencedField" ].concat(mapping), resourceField ]);
            }
            return fields;
        };
        this.currentResource = resourceName;
        switch (this.sqlModels[this.currentVocab].tables[resourceName]) {
          case "ForeignKey":
            switch (this.currentMethod) {
              case "GET":
                query[0] = "SelectQuery";
                query.push([ "Select", getSelectFields() ]);
                break;

              default:
                __TODO__.die();
            }
            break;

          case "Attribute":
            resourceFieldName = resourceModel.referenceScheme;
            mapping = this.GetMapping(resourceName, resourceFieldName);
            switch (this.currentMethod) {
              case "DELETE":
                query[0] = "UpdateQuery";
                this.AddQueryTable(query, mapping[0]);
                query.push([ "Fields", [ [ mapping[1], "NULL" ] ] ]);
                break;

              case "GET":
                query[0] = "SelectQuery";
                query.push([ "Select", getSelectFields() ]);
                break;

              case "PUT":
              case "POST":
                query[0] = "UpdateQuery";
                void 0 !== this.AddBodyVar(query, resourceName, resourceFieldName, mapping) && query.push([ "Fields", [ [ mapping[1], [ "Bind", mapping[0], this.GetTableField(mapping) ] ] ] ]);
            }
            resourceFieldName = resourceModel.idField;
            mapping = this.GetMapping(resourceName, resourceFieldName);
            fieldName = mapping[1];
            void 0 !== this.AddBodyVar(query, resourceName, resourceFieldName, mapping) && this.AddWhereClause(query, [ "Equals", [ "ReferencedField" ].concat(mapping), [ "Bind", mapping[0], this.GetTableField(mapping) ] ]);
            break;

          case "BooleanAttribute":
            resourceFieldName = resourceModel.referenceScheme;
            mapping = this.GetMapping(resourceName, resourceFieldName);
            switch (this.currentMethod) {
              case "GET":
                query[0] = "SelectQuery";
                query.push([ "Select", getSelectFields() ]);
                this.AddQueryTable(query, mapping[0]);
                this.AddWhereClause(query, [ "Equals", [ "ReferencedField" ].concat(mapping), [ "Boolean", !0 ] ]);
                break;

              case "DELETE":
                newValue = !1;

              case "PUT":
              case "POST":
                null == newValue && (newValue = !0);
                query[0] = "UpdateQuery";
                query.push([ "Fields", [ [ mapping[1], newValue ] ] ]);
                this.AddQueryTable(query, mapping[0]);
                resourceFieldName = resourceModel.idField;
                mapping = this.GetMapping(resourceName, resourceFieldName);
                fieldName = mapping[1];
                void 0 !== this.AddBodyVar(query, resourceName, resourceFieldName, mapping) && this.AddWhereClause(query, [ "Equals", [ "ReferencedField" ].concat(mapping), [ "Bind", mapping[0], this.GetTableField(mapping) ] ]);
            }
            break;

          default:
            switch (this.currentMethod) {
              case "DELETE":
                query[0] = "DeleteQuery";
                break;

              case "GET":
                query[0] = "SelectQuery";
                query.push([ "Select", getSelectFields() ]);
                break;

              case "PUT":
              case "POST":
                query[0] = "PUT" === this.currentMethod ? "UpsertQuery" : "InsertQuery";
                fields = [];
                for (resourceFieldName in resourceToSQLMappings) if (resourceToSQLMappings.hasOwnProperty(resourceFieldName)) {
                    mapping = resourceToSQLMappings[resourceFieldName];
                    void 0 !== this.AddBodyVar(query, resourceName, resourceFieldName, mapping) && fields.push([ mapping[1], [ "Bind", mapping[0], this.GetTableField(mapping) ] ]);
                }
                query.push([ "Fields", fields ]);
            }
        }
    };
    return URIParser;
});

define("ometa!server-glue/odata-parser", [ "ometa!server-glue/uri-parser", "underscore", "ometa-core" ], function(URIParser, _) {
    var ODataParser = URIParser._extend({
        ProcessURI: function(body) {
            var $elf = this, body, resourceName, query, _fromIdx = this.input.idx;
            this._opt(function() {
                this._pred(!_.isObject(body));
                return body = {};
            });
            this._applyWithArgs("exactly", "/");
            this._or(function() {
                this.currentBody = body;
                this.newBody = {};
                resourceName = this._apply("ResourceName");
                return this._opt(function() {
                    query = [ "Query" ];
                    this._applyWithArgs("AddQueryResource", query, resourceName);
                    return this._applyWithArgs("Modifiers", query);
                });
            }, function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "$":
                        return function() {
                            this._applyWithArgs("exactly", "m");
                            this._applyWithArgs("exactly", "e");
                            this._applyWithArgs("exactly", "t");
                            this._applyWithArgs("exactly", "a");
                            this._applyWithArgs("exactly", "d");
                            this._applyWithArgs("exactly", "a");
                            this._applyWithArgs("exactly", "t");
                            this._applyWithArgs("exactly", "a");
                            return resourceName = "$metadata";
                        }.call(this);

                      default:
                        throw this._fail();
                    }
                }.call(this);
            });
            return [ {
                resourceName: resourceName,
                query: query,
                values: this.newBody
            } ];
        },
        Vocabulary: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._consumedBy(function() {
                return this._many1(function() {
                    this._not(function() {
                        return this._applyWithArgs("exactly", "/");
                    });
                    return this._apply("anything");
                });
            });
        },
        ResourcePart: function() {
            var $elf = this, resourcePart, _fromIdx = this.input.idx;
            resourcePart = this._consumedBy(function() {
                return this._many1(function() {
                    return this._or(function() {
                        return this._apply("letter");
                    }, function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "_":
                                return "_";

                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    });
                });
            });
            return resourcePart.replace(RegExp("_", "g"), " ");
        },
        ResourceName: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._consumedBy(function() {
                this._apply("ResourcePart");
                return this._many(function() {
                    this._applyWithArgs("exactly", "-");
                    return this._apply("ResourcePart");
                });
            });
        },
        Comparator: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return function() {
                switch (this._apply("anything")) {
                  case "l":
                    return function() {
                        switch (this._apply("anything")) {
                          case "t":
                            return this._or(function() {
                                "lt";
                                return "LessThan";
                            }, function() {
                                return function() {
                                    switch (this._apply("anything")) {
                                      case "e":
                                        return function() {
                                            "lte";
                                            return "LessThanOrEqual";
                                        }.call(this);

                                      default:
                                        throw this._fail();
                                    }
                                }.call(this);
                            });

                          default:
                            throw this._fail();
                        }
                    }.call(this);

                  case "e":
                    return function() {
                        this._applyWithArgs("exactly", "q");
                        return "Equals";
                    }.call(this);

                  case "g":
                    return function() {
                        switch (this._apply("anything")) {
                          case "t":
                            return this._or(function() {
                                "gt";
                                return "GreaterThan";
                            }, function() {
                                return function() {
                                    switch (this._apply("anything")) {
                                      case "e":
                                        return function() {
                                            "gte";
                                            return "GreaterThanOrEqual";
                                        }.call(this);

                                      default:
                                        throw this._fail();
                                    }
                                }.call(this);
                            });

                          default:
                            throw this._fail();
                        }
                    }.call(this);

                  case "n":
                    return function() {
                        this._applyWithArgs("exactly", "e");
                        return "NotEquals";
                    }.call(this);

                  default:
                    throw this._fail();
                }
            }.call(this);
        },
        Modifiers: function(query) {
            var limit, offset, $elf = this, sorts, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "?");
            return this._many(function() {
                this._opt(function() {
                    return this._applyWithArgs("exactly", "&");
                });
                return this._or(function() {
                    return this._applyWithArgs("Filters", query);
                }, function() {
                    sorts = this._apply("Sorts");
                    return query.push(sorts);
                }, function() {
                    limit = this._apply("Limit");
                    return query.push(limit);
                }, function() {
                    offset = this._apply("Offset");
                    return query.push(offset);
                });
            });
        },
        Field: function() {
            var $elf = this, resourceFieldName, resourceName, mapping, _fromIdx = this.input.idx;
            this._or(function() {
                resourceName = this._apply("ResourcePart");
                this._applyWithArgs("exactly", "/");
                return resourceFieldName = this._apply("ResourcePart");
            }, function() {
                resourceName = this.currentResource;
                return resourceFieldName = this._apply("ResourcePart");
            });
            mapping = this._applyWithArgs("GetMapping", resourceName, resourceFieldName);
            return [ "ReferencedField" ].concat(mapping);
        },
        Filters: function(query) {
            var field, $elf = this, resourceFieldName, resourceName, mapping, value, comparator, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "$");
            this._applyWithArgs("exactly", "f");
            this._applyWithArgs("exactly", "i");
            this._applyWithArgs("exactly", "l");
            this._applyWithArgs("exactly", "t");
            this._applyWithArgs("exactly", "e");
            this._applyWithArgs("exactly", "r");
            this._applyWithArgs("exactly", "=");
            return this._many1(function() {
                field = this._apply("Field");
                this._applyWithArgs("exactly", " ");
                comparator = this._apply("Comparator");
                this._applyWithArgs("exactly", " ");
                value = this._consumedBy(function() {
                    return this._many1(function() {
                        this._not(function() {
                            return this._apply("ValueBreak");
                        });
                        return this._apply("anything");
                    });
                });
                this._opt(function() {
                    this._applyWithArgs("exactly", " ");
                    this._applyWithArgs("exactly", "a");
                    this._applyWithArgs("exactly", "n");
                    this._applyWithArgs("exactly", "d");
                    this._applyWithArgs("exactly", " ");
                    return " and ";
                });
                resourceName = field[1];
                resourceFieldName = field[2];
                mapping = this._applyWithArgs("GetMapping", resourceName, resourceFieldName);
                this._applyWithArgs("AddWhereClause", query, [ comparator, field, [ "Bind", mapping[0], this.GetTableField(mapping) ] ]);
                return this._applyWithArgs("AddBodyVar", query, resourceName, resourceFieldName, mapping, value);
            });
        },
        Number: function() {
            var d, $elf = this, _fromIdx = this.input.idx;
            d = this._consumedBy(function() {
                return this._many1(function() {
                    return this._apply("digit");
                });
            });
            return [ "Number", parseInt(d, 10) ];
        },
        Limit: function() {
            var $elf = this, num, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "$");
            this._applyWithArgs("exactly", "t");
            this._applyWithArgs("exactly", "o");
            this._applyWithArgs("exactly", "p");
            this._applyWithArgs("exactly", "=");
            num = this._apply("Number");
            return [ "Limit", num ];
        },
        Offset: function() {
            var $elf = this, num, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "$");
            this._applyWithArgs("exactly", "s");
            this._applyWithArgs("exactly", "k");
            this._applyWithArgs("exactly", "i");
            this._applyWithArgs("exactly", "p");
            this._applyWithArgs("exactly", "=");
            num = this._apply("Number");
            return [ "Offset", num ];
        },
        Sorts: function() {
            var field, $elf = this, direction, sorts, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "$");
            this._applyWithArgs("exactly", "o");
            this._applyWithArgs("exactly", "r");
            this._applyWithArgs("exactly", "d");
            this._applyWithArgs("exactly", "e");
            this._applyWithArgs("exactly", "r");
            this._applyWithArgs("exactly", "b");
            this._applyWithArgs("exactly", "y");
            this._applyWithArgs("exactly", "=");
            sorts = this._many1(function() {
                field = this._apply("Field");
                this._or(function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case " ":
                            return direction = function() {
                                switch (this._apply("anything")) {
                                  case "a":
                                    return function() {
                                        this._applyWithArgs("exactly", "s");
                                        this._applyWithArgs("exactly", "c");
                                        return "asc";
                                    }.call(this);

                                  case "d":
                                    return function() {
                                        this._applyWithArgs("exactly", "e");
                                        this._applyWithArgs("exactly", "s");
                                        this._applyWithArgs("exactly", "c");
                                        return "desc";
                                    }.call(this);

                                  default:
                                    throw this._fail();
                                }
                            }.call(this);

                          default:
                            throw this._fail();
                        }
                    }.call(this);
                }, function() {
                    return "ASC";
                });
                this._opt(function() {
                    this._applyWithArgs("exactly", ",");
                    this._applyWithArgs("exactly", " ");
                    return ", ";
                });
                return [ direction.toUpperCase(), field ];
            });
            return [ "OrderBy" ].concat(sorts);
        },
        ValueBreak: function() {
            var $elf = this, _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", " ");
            this._applyWithArgs("exactly", "a");
            this._applyWithArgs("exactly", "n");
            this._applyWithArgs("exactly", "d");
            this._applyWithArgs("exactly", " ");
            return " and ";
        }
    });
    ODataParser.type = "OData";
    return ODataParser;
});

(function() {
    function only_once(fn) {
        var called = !1;
        return function() {
            if (called) throw Error("Callback was already called.");
            called = !0;
            fn.apply(root, arguments);
        };
    }
    var async = {}, root, previous_async;
    root = this;
    null != root && (previous_async = root.async);
    async.noConflict = function() {
        root.async = previous_async;
        return async;
    };
    var _each = function(arr, iterator) {
        if (arr.forEach) return arr.forEach(iterator);
        for (var i = 0; arr.length > i; i += 1) iterator(arr[i], i, arr);
    }, _map = function(arr, iterator) {
        if (arr.map) return arr.map(iterator);
        var results = [];
        _each(arr, function(x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    }, _reduce = function(arr, iterator, memo) {
        if (arr.reduce) return arr.reduce(iterator, memo);
        _each(arr, function(x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    }, _keys = function(obj) {
        if (Object.keys) return Object.keys(obj);
        var keys = [];
        for (var k in obj) obj.hasOwnProperty(k) && keys.push(k);
        return keys;
    };
    async.nextTick = "undefined" != typeof process && process.nextTick ? process.nextTick : "function" == typeof setImmediate ? function(fn) {
        setImmediate(fn);
    } : function(fn) {
        setTimeout(fn, 0);
    };
    async.each = function(arr, iterator, callback) {
        callback = callback || function() {};
        if (!arr.length) return callback();
        var completed = 0;
        _each(arr, function(x) {
            iterator(x, only_once(function(err) {
                if (err) {
                    callback(err);
                    callback = function() {};
                } else {
                    completed += 1;
                    completed >= arr.length && callback(null);
                }
            }));
        });
    };
    async.forEach = async.each;
    async.eachSeries = function(arr, iterator, callback) {
        callback = callback || function() {};
        if (!arr.length) return callback();
        var completed = 0, iterate = function() {
            var sync = !0;
            iterator(arr[completed], function(err) {
                if (err) {
                    callback(err);
                    callback = function() {};
                } else {
                    completed += 1;
                    completed >= arr.length ? callback(null) : sync ? async.nextTick(iterate) : iterate();
                }
            });
            sync = !1;
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;
    async.eachLimit = function(arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [ arr, iterator, callback ]);
    };
    async.forEachLimit = async.eachLimit;
    var _eachLimit = function(limit) {
        return function(arr, iterator, callback) {
            callback = callback || function() {};
            if (!arr.length || 0 >= limit) return callback();
            var completed = 0, started = 0, running = 0;
            (function replenish() {
                if (completed >= arr.length) return callback();
                for (;limit > running && arr.length > started; ) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function(err) {
                        if (err) {
                            callback(err);
                            callback = function() {};
                        } else {
                            completed += 1;
                            running -= 1;
                            completed >= arr.length ? callback() : replenish();
                        }
                    });
                }
            })();
        };
    }, doParallel = function(fn) {
        return function() {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [ async.each ].concat(args));
        };
    }, doParallelLimit = function(limit, fn) {
        return function() {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [ _eachLimit(limit) ].concat(args));
        };
    }, doSeries = function(fn) {
        return function() {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [ async.eachSeries ].concat(args));
        };
    }, _asyncMap = function(eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function(x, i) {
            return {
                index: i,
                value: x
            };
        });
        eachfn(arr, function(x, callback) {
            iterator(x.value, function(err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function(err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function(arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };
    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };
    async.reduce = function(arr, memo, iterator, callback) {
        async.eachSeries(arr, function(x, callback) {
            iterator(memo, x, function(err, v) {
                memo = v;
                callback(err);
            });
        }, function(err) {
            callback(err, memo);
        });
    };
    async.inject = async.reduce;
    async.foldl = async.reduce;
    async.reduceRight = function(arr, memo, iterator, callback) {
        var reversed = _map(arr, function(x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    async.foldr = async.reduceRight;
    var _filter = function(eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function(x, i) {
            return {
                index: i,
                value: x
            };
        });
        eachfn(arr, function(x, callback) {
            iterator(x.value, function(v) {
                v && results.push(x);
                callback();
            });
        }, function(err) {
            callback(_map(results.sort(function(a, b) {
                return a.index - b.index;
            }), function(x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    async.select = async.filter;
    async.selectSeries = async.filterSeries;
    var _reject = function(eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function(x, i) {
            return {
                index: i,
                value: x
            };
        });
        eachfn(arr, function(x, callback) {
            iterator(x.value, function(v) {
                v || results.push(x);
                callback();
            });
        }, function(err) {
            callback(_map(results.sort(function(a, b) {
                return a.index - b.index;
            }), function(x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);
    var _detect = function(eachfn, arr, iterator, main_callback) {
        eachfn(arr, function(x, callback) {
            iterator(x, function(result) {
                if (result) {
                    main_callback(x);
                    main_callback = function() {};
                } else callback();
            });
        }, function(err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);
    async.some = function(arr, iterator, main_callback) {
        async.each(arr, function(x, callback) {
            iterator(x, function(v) {
                if (v) {
                    main_callback(!0);
                    main_callback = function() {};
                }
                callback();
            });
        }, function(err) {
            main_callback(!1);
        });
    };
    async.any = async.some;
    async.every = function(arr, iterator, main_callback) {
        async.each(arr, function(x, callback) {
            iterator(x, function(v) {
                if (!v) {
                    main_callback(!1);
                    main_callback = function() {};
                }
                callback();
            });
        }, function(err) {
            main_callback(!0);
        });
    };
    async.all = async.every;
    async.sortBy = function(arr, iterator, callback) {
        async.map(arr, function(x, callback) {
            iterator(x, function(err, criteria) {
                err ? callback(err) : callback(null, {
                    value: x,
                    criteria: criteria
                });
            });
        }, function(err, results) {
            if (err) return callback(err);
            var fn = function(left, right) {
                var a = left.criteria, b = right.criteria;
                return b > a ? -1 : a > b ? 1 : 0;
            };
            callback(null, _map(results.sort(fn), function(x) {
                return x.value;
            }));
        });
    };
    async.auto = function(tasks, callback) {
        callback = callback || function() {};
        var keys = _keys(tasks);
        if (!keys.length) return callback(null);
        var results = {}, listeners = [], addListener = function(fn) {
            listeners.unshift(fn);
        }, removeListener = function(fn) {
            for (var i = 0; listeners.length > i; i += 1) if (listeners[i] === fn) {
                listeners.splice(i, 1);
                return;
            }
        }, taskComplete = function() {
            _each(listeners.slice(0), function(fn) {
                fn();
            });
        };
        addListener(function() {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function() {};
            }
        });
        _each(keys, function(k) {
            var task = tasks[k] instanceof Function ? [ tasks[k] ] : tasks[k], taskCallback = function(err) {
                if (err) {
                    callback(err);
                    callback = function() {};
                } else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    1 >= args.length && (args = args[0]);
                    results[k] = args;
                    async.nextTick(taskComplete);
                }
            }, requires = task.slice(0, Math.abs(task.length - 1)) || [], ready = function() {
                return _reduce(requires, function(a, x) {
                    return a && results.hasOwnProperty(x);
                }, !0) && !results.hasOwnProperty(k);
            };
            if (ready()) task[task.length - 1](taskCallback, results); else {
                var listener = function() {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };
    async.waterfall = function(tasks, callback) {
        callback = callback || function() {};
        if (!tasks.length) return callback();
        var wrapIterator = function(iterator) {
            return function(err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function() {};
                } else {
                    var args = Array.prototype.slice.call(arguments, 1), next = iterator.next();
                    next ? args.push(wrapIterator(next)) : args.push(callback);
                    async.nextTick(function() {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };
    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function() {};
        if (tasks.constructor === Array) eachfn.map(tasks, function(fn, callback) {
            fn && fn(function(err) {
                var args = Array.prototype.slice.call(arguments, 1);
                1 >= args.length && (args = args[0]);
                callback.call(null, err, args);
            });
        }, callback); else {
            var results = {};
            eachfn.each(_keys(tasks), function(k, callback) {
                tasks[k](function(err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    1 >= args.length && (args = args[0]);
                    results[k] = args;
                    callback(err);
                });
            }, function(err) {
                callback(err, results);
            });
        }
    };
    async.parallel = function(tasks, callback) {
        _parallel({
            map: async.map,
            each: async.each
        }, tasks, callback);
    };
    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({
            map: _mapLimit(limit),
            each: _eachLimit(limit)
        }, tasks, callback);
    };
    async.series = function(tasks, callback) {
        callback = callback || function() {};
        if (tasks.constructor === Array) async.mapSeries(tasks, function(fn, callback) {
            fn && fn(function(err) {
                var args = Array.prototype.slice.call(arguments, 1);
                1 >= args.length && (args = args[0]);
                callback.call(null, err, args);
            });
        }, callback); else {
            var results = {};
            async.eachSeries(_keys(tasks), function(k, callback) {
                tasks[k](function(err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    1 >= args.length && (args = args[0]);
                    results[k] = args;
                    callback(err);
                });
            }, function(err) {
                callback(err, results);
            });
        }
    };
    async.iterator = function(tasks) {
        var makeCallback = function(index) {
            var fn = function() {
                tasks.length && tasks[index].apply(null, arguments);
                return fn.next();
            };
            fn.next = function() {
                return tasks.length - 1 > index ? makeCallback(index + 1) : null;
            };
            return fn;
        };
        return makeCallback(0);
    };
    async.apply = function(fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function() {
            return fn.apply(null, args.concat(Array.prototype.slice.call(arguments)));
        };
    };
    var _concat = function(eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function(x, cb) {
            fn(x, function(err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function(err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);
    async.whilst = function(test, iterator, callback) {
        if (test()) {
            var sync = !0;
            iterator(function(err) {
                if (err) return callback(err);
                sync ? async.nextTick(function() {
                    async.whilst(test, iterator, callback);
                }) : async.whilst(test, iterator, callback);
                return void 0;
            });
            sync = !1;
        } else callback();
    };
    async.doWhilst = function(iterator, test, callback) {
        var sync = !0;
        iterator(function(err) {
            if (err) return callback(err);
            test() ? sync ? async.nextTick(function() {
                async.doWhilst(iterator, test, callback);
            }) : async.doWhilst(iterator, test, callback) : callback();
            return void 0;
        });
        sync = !1;
    };
    async.until = function(test, iterator, callback) {
        if (test()) callback(); else {
            var sync = !0;
            iterator(function(err) {
                if (err) return callback(err);
                sync ? async.nextTick(function() {
                    async.until(test, iterator, callback);
                }) : async.until(test, iterator, callback);
                return void 0;
            });
            sync = !1;
        }
    };
    async.doUntil = function(iterator, test, callback) {
        var sync = !0;
        iterator(function(err) {
            if (err) return callback(err);
            test() ? callback() : sync ? async.nextTick(function() {
                async.doUntil(iterator, test, callback);
            }) : async.doUntil(iterator, test, callback);
            return void 0;
        });
        sync = !1;
    };
    async.queue = function(worker, concurrency) {
        function _insert(q, data, pos, callback) {
            data.constructor !== Array && (data = [ data ]);
            _each(data, function(task) {
                var item = {
                    data: task,
                    callback: "function" == typeof callback ? callback : null
                };
                pos ? q.tasks.unshift(item) : q.tasks.push(item);
                q.saturated && q.tasks.length === concurrency && q.saturated();
                async.nextTick(q.process);
            });
        }
        var workers = 0, q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function(data, callback) {
                _insert(q, data, !1, callback);
            },
            unshift: function(data, callback) {
                _insert(q, data, !0, callback);
            },
            process: function() {
                if (q.concurrency > workers && q.tasks.length) {
                    var task = q.tasks.shift();
                    q.empty && 0 === q.tasks.length && q.empty();
                    workers += 1;
                    var sync = !0, next = function() {
                        workers -= 1;
                        task.callback && task.callback.apply(task, arguments);
                        q.drain && 0 === q.tasks.length + workers && q.drain();
                        q.process();
                    }, cb = only_once(function() {
                        var cbArgs = arguments;
                        sync ? async.nextTick(function() {
                            next.apply(null, cbArgs);
                        }) : next.apply(null, arguments);
                    });
                    worker(task.data, cb);
                    sync = !1;
                }
            },
            length: function() {
                return q.tasks.length;
            },
            running: function() {
                return workers;
            }
        };
        return q;
    };
    async.cargo = function(worker, payload) {
        var working = !1, tasks = [], cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function(data, callback) {
                data.constructor !== Array && (data = [ data ]);
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: "function" == typeof callback ? callback : null
                    });
                    cargo.saturated && tasks.length === payload && cargo.saturated();
                });
                async.nextTick(cargo.process);
            },
            process: function process() {
                if (!working) if (0 !== tasks.length) {
                    var ts = "number" == typeof payload ? tasks.splice(0, payload) : tasks.splice(0), ds = _map(ts, function(task) {
                        return task.data;
                    });
                    cargo.empty && cargo.empty();
                    working = !0;
                    worker(ds, function() {
                        working = !1;
                        var args = arguments;
                        _each(ts, function(data) {
                            data.callback && data.callback.apply(null, args);
                        });
                        process();
                    });
                } else cargo.drain && cargo.drain();
            },
            length: function() {
                return tasks.length;
            },
            running: function() {
                return working;
            }
        };
        return cargo;
    };
    var _console_fn = function(name) {
        return function(fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([ function(err) {
                var args = Array.prototype.slice.call(arguments, 1);
                "undefined" != typeof console && (err ? console.error && console.error(err) : console[name] && _each(args, function(x) {
                    console[name](x);
                }));
            } ]));
        };
    };
    async.log = _console_fn("log");
    async.dir = _console_fn("dir");
    async.memoize = function(fn, hasher) {
        var memo = {}, queues = {};
        hasher = hasher || function(x) {
            return x;
        };
        var memoized = function() {
            var args = Array.prototype.slice.call(arguments), callback = args.pop(), key = hasher.apply(null, args);
            if (key in memo) callback.apply(null, memo[key]); else if (key in queues) queues[key].push(callback); else {
                queues[key] = [ callback ];
                fn.apply(null, args.concat([ function() {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; l > i; i++) q[i].apply(null, arguments);
                } ]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };
    async.unmemoize = function(fn) {
        return function() {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    };
    async.times = function(count, iterator, callback) {
        for (var counter = [], i = 0; count > i; i++) counter.push(i);
        return async.map(counter, iterator, callback);
    };
    async.timesSeries = function(count, iterator, callback) {
        for (var counter = [], i = 0; count > i; i++) counter.push(i);
        return async.mapSeries(counter, iterator, callback);
    };
    async.compose = function() {
        var fns = Array.prototype.reverse.call(arguments);
        return function() {
            var that = this, args = Array.prototype.slice.call(arguments), callback = args.pop();
            async.reduce(fns, args, function(newargs, fn, cb) {
                fn.apply(that, newargs.concat([ function() {
                    var err = arguments[0], nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                } ]));
            }, function(err, results) {
                callback.apply(that, [ err ].concat(results));
            });
        };
    };
    "undefined" != typeof define && define.amd ? define("async", [], function() {
        return async;
    }) : "undefined" != typeof module && module.exports ? module.exports = async : root.async = async;
})();

define("ometa!database-layer/SQLBinds", [ "ometa-core" ], function() {
    var SQLBinds = OMeta._extend({
        skipToEnd: function(quote) {
            var prev, $elf = this, text, found, _fromIdx = this.input.idx;
            text = this._many(function() {
                this._not(function() {
                    return found == quote;
                });
                return this._or(function() {
                    this._not(function() {
                        return prev == quote || "\\" == prev;
                    });
                    return found = this._applyWithArgs("seq", quote);
                }, function() {
                    return prev = this._apply("anything");
                });
            });
            return text.join("");
        },
        parse: function(nextBind) {
            var quote, $elf = this, text, sql, _fromIdx = this.input.idx;
            sql = this._many(function() {
                return this._or(function() {
                    quote = function() {
                        switch (this._apply("anything")) {
                          case "'":
                            return "'";

                          case '"':
                            return '"';

                          default:
                            throw this._fail();
                        }
                    }.call(this);
                    text = this._applyWithArgs("skipToEnd", quote);
                    return [ quote, text ].join("");
                }, function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case "?":
                            return nextBind();

                          default:
                            throw this._fail();
                        }
                    }.call(this);
                }, function() {
                    return this._apply("anything");
                });
            });
            return sql.join("");
        }
    });
    return SQLBinds;
});

(function() {
    define("cs!database-layer/db", [ "ometa!database-layer/SQLBinds", "has" ], function(SQLBinds, has) {
        var exports;
        exports = {};
        exports.websql = function(databaseName) {
            var createResult, tx, _db;
            _db = openDatabase(databaseName, "1.0", "rulemotion", 2097152);
            createResult = function(result) {
                var insertId;
                try {
                    insertId = result.insertId;
                } catch (e) {
                    insertId = null;
                }
                return {
                    rows: {
                        length: result.rows.length,
                        item: function(i) {
                            return result.rows.item(i);
                        },
                        forEach: function(iterator, thisArg) {
                            var i, _i, _ref, _results;
                            _results = [];
                            for (i = _i = 0, _ref = result.rows.length; _ref >= 0 ? _ref > _i : _i > _ref; i = _ref >= 0 ? ++_i : --_i) _results.push(iterator.call(thisArg, result.rows.item(i), i, result.rows));
                            return _results;
                        }
                    },
                    insertId: insertId
                };
            };
            tx = function(_tx) {
                return {
                    executeSql: function(sql, bindings, callback, errorCallback) {
                        var thisTX;
                        thisTX = this;
                        try {
                            return ___STACK_TRACE___.please;
                        } catch (stackTrace) {
                            null != callback && (callback = function(callback) {
                                return function(_tx, _results) {
                                    return callback(thisTX, createResult(_results));
                                };
                            }(callback));
                            errorCallback = function(errorCallback) {
                                return function(_tx, _err) {
                                    console.log(sql, bindings, _err, stackTrace.stack);
                                    return "function" == typeof errorCallback ? errorCallback(thisTX, _err) : void 0;
                                };
                            }(errorCallback);
                            return _tx.executeSql(sql, bindings, callback, errorCallback);
                        }
                    },
                    begin: function() {},
                    end: function() {},
                    rollback: function() {
                        return _tx.executeSql("DROP TABLE '__Fo0oFoo'");
                    },
                    tableList: function(callback, errorCallback, extraWhereClause) {
                        null == extraWhereClause && (extraWhereClause = "");
                        "" !== extraWhereClause && (extraWhereClause = " AND " + extraWhereClause);
                        return this.executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('__WebKitDatabaseInfoTable__', 'sqlite_sequence')" + extraWhereClause + ";", [], callback, errorCallback);
                    },
                    dropTable: function(tableName, ifExists, callback, errorCallback) {
                        null == ifExists && (ifExists = !0);
                        return this.executeSql("DROP TABLE " + (ifExists === !0 ? "IF EXISTS " : "") + '"' + tableName + '";', [], callback, errorCallback);
                    }
                };
            };
            return {
                transaction: function(callback) {
                    return _db.transaction(function(_tx) {
                        return callback(tx(_tx));
                    });
                }
            };
        };
        exports.connect = function(databaseOptions) {
            return exports[databaseOptions.engine](databaseOptions.params);
        };
        return exports;
    });
}).call(this);

(function() {
    define("cs!server-glue/sbvr-utils", [ "has", "ometa!sbvr-parser/SBVRParser", "ometa!sbvr-compiler/LF2AbstractSQLPrep", "ometa!sbvr-compiler/LF2AbstractSQL", "cs!sbvr-compiler/AbstractSQL2SQL", "ometa!sbvr-compiler/AbstractSQLRules2SQL", "cs!sbvr-compiler/AbstractSQL2CLF", "cs!sbvr-compiler/ODataMetadataGenerator", "ometa!server-glue/odata-parser", "async", "cs!database-layer/db", "underscore" ], function(has, SBVRParser, LF2AbstractSQLPrep, LF2AbstractSQL, AbstractSQL2SQL, AbstractSQLRules2SQL, AbstractSQL2CLF, ODataMetadataGenerator, ODataParser, async, dbModule, _) {
        var checkForConstraintError, checkPermissions, clientModels, db, devModel, endTransaction, executeModel, executeModels, executeStandardModels, exports, getAndCheckBindValues, getID, getUserPermissions, odataMetadata, odataParser, parseURITree, processInstances, processOData, runDelete, runGet, runPost, runPut, runURI, seModels, sqlModels, transactionModel, userModel, validateDB;
        exports = {};
        db = null;
        devModel = "Term:      model value\n	Concept Type: JSON (Type)\nTerm:      model\n	Reference Scheme: model value\nTerm:      vocabulary\n	Concept Type: Short Text (Type)\nTerm:      model type\n	Concept Type: Short Text (Type)\n\nFact Type: model is of vocabulary\n	Necessity: Each model is of exactly one vocabulary\nFact Type: model has model type\n	Necessity: Each model has exactly one model type\nFact Type: model has model value\n	Necessity: Each model has exactly one model value";
        transactionModel = 'Term:      resource id\n	Concept type: Integer (Type)\nTerm:      resource type\n	Concept type: Text (Type)\nTerm:      field name\n	Concept type: Text (Type)\nTerm:      field value\n	Concept type: Text (Type)\nTerm:      placeholder\n	Concept type: Short Text (Type)\n\nTerm:      resource\n	Reference Scheme: resource id\nFact type: resource has resource id\n	Necessity: Each resource has exactly 1 resource id.\nFact type: resource has resource type\n	Necessity: Each resource has exactly 1 resource type.\n\nTerm:      transaction\n\nTerm:      lock\nFact type: lock is exclusive\nFact type: lock belongs to transaction\n	Necessity: Each lock belongs to exactly 1 transaction.\nFact type: resource is under lock\n	Synonymous Form: lock is on resource\nRule:      It is obligatory that each resource that is under a lock that is exclusive, is under at most 1 lock.\n\nTerm:      conditional type\n	Concept Type: Short Text (Type)\n	Definition: "ADD", "EDIT" or "DELETE"\n\nTerm:      conditional resource\nFact type: conditional resource belongs to transaction\n	Necessity: Each conditional resource belongs to exactly 1 transaction.\nFact type: conditional resource has lock\n	Necessity: Each conditional resource has at most 1 lock.\nFact type: conditional resource has resource type\n	Necessity: Each conditional resource has exactly 1 resource type.\nFact type: conditional resource has conditional type\n	Necessity: Each conditional resource has exactly 1 conditional type.\nFact type: conditional resource has placeholder\n	Necessity: Each conditional resource has at most 1 placeholder.\n--Rule:      It is obligatory that each conditional resource that has a placeholder, has a conditional type that is of "ADD".\n\nTerm:      conditional field\n	Reference Scheme: field name\nFact type: conditional field has field name\n	Necessity: Each conditional field has exactly 1 field name.\nFact type: conditional field has field value\n	Necessity: Each conditional field has at most 1 field value.\nFact type: conditional field is of conditional resource\n	Necessity: Each conditional field is of exactly 1 conditional resource.\n\n--Rule:      It is obligatory that each conditional resource that has a conditional type that is of "EDIT" or "DELETE", has a lock that is exclusive\nRule:      It is obligatory that each conditional resource that has a lock, has a resource type that is of a resource that the lock is on.\nRule:      It is obligatory that each conditional resource that has a lock, belongs to a transaction that the lock belongs to.';
        userModel = "Vocabulary: Auth\n\nTerm:       username\n	Concept Type: Short Text (Type)\nTerm:       password\n	Concept Type: Hashed (Type)\nTerm:       name\n	Concept Type: Short Text (Type)\n\nTerm:       permission\n	Reference Scheme: name\nFact type:  permission has name\n	Necessity: Each permission has exactly one name.\n	Necessity: Each name is of exactly one permission.\n\nTerm:       role\n	Reference Scheme: name\nFact type:  role has name\n	Necessity: Each role has exactly one name.\n	Necessity: Each name is of exactly one role.\nFact type:  role has permission\n\nTerm:       user\n	Reference Scheme: username\nFact type:  user has username\n	Necessity: Each user has exactly one username.\n	Necessity: Each username is of exactly one user.\nFact type:  user has password\n	Necessity: Each user has exactly one password.\nFact type:  user has role\n	Note: A 'user' will inherit all the 'permissions' that the 'role' has.\nFact type:  user has permission";
        odataParser = ODataParser.createInstance();
        seModels = {};
        sqlModels = {};
        clientModels = {};
        odataMetadata = {};
        checkForConstraintError = function(err, tableName) {
            var matches;
            return "could not execute statement (19 constraint failed)" === err ? [ "Constraint failed" ] : !1;
        };
        getAndCheckBindValues = function(bindings, values) {
            var bindValues, binding, field, fieldName, referencedName, validated, value, _i, _len, _ref;
            bindValues = [];
            for (_i = 0, _len = bindings.length; _len > _i; _i++) {
                binding = bindings[_i];
                field = binding[1];
                fieldName = field[1];
                referencedName = binding[0] + "." + fieldName;
                value = void 0 === values[referencedName] ? values[fieldName] : values[referencedName];
                _ref = AbstractSQL2SQL.dataTypeValidate(value, field), validated = _ref.validated, 
                value = _ref.value;
                if (validated !== !0) return '"' + fieldName + '" ' + validated;
                bindValues.push(value);
            }
            return bindValues;
        };
        endTransaction = function(transactionID, callback) {
            return db.transaction(function(tx) {
                var getFieldsObject, getLockedRow, placeholders, resolvePlaceholder;
                placeholders = {};
                getLockedRow = function(lockID, callback) {
                    return tx.executeSql('SELECT r."resource type", r."resource id"\nFROM "resource-is_under-lock" rl\nJOIN "resource" r ON rl."resource" = r."id"\nWHERE "lock" = ?;', [ lockID ], function(tx, row) {
                        return callback(null, row);
                    }, function(tx, err) {
                        return callback(err);
                    });
                };
                getFieldsObject = function(conditionalResourceID, clientModel, callback) {
                    return tx.executeSql('SELECT "field name", "field value" FROM "conditional_field" WHERE "conditional resource" = ?;', [ conditionalResourceID ], function(tx, fields) {
                        var fieldsObject;
                        fieldsObject = {};
                        return async.forEach(fields.rows, function(field, callback) {
                            var fieldName, fieldValue;
                            fieldName = field["field name"];
                            fieldName = fieldName.replace(clientModel.resourceName + ".", "");
                            fieldValue = field["field value"];
                            return async.forEach(clientModel.fields, function(modelField, callback) {
                                var placeholderCallback;
                                placeholderCallback = function(placeholder, resolvedID) {
                                    if (resolvedID === !1) return callback("Placeholder failed" + fieldValue);
                                    fieldsObject[fieldName] = resolvedID;
                                    return callback();
                                };
                                if (modelField[1] === fieldName && "ForeignKey" === modelField[0] && _.isNaN(Number(fieldValue))) return placeholders.hasOwnProperty(fieldValue) ? _.isArray(placeholders[fieldValue]) ? placeholders[fieldValue].push(placeholderCallback) : placeholderCallback(fieldValue, placeholders[fieldValue]) : callback("Cannot resolve placeholder" + fieldValue);
                                fieldsObject[fieldName] = fieldValue;
                                return callback();
                            }, callback);
                        }, function(err) {
                            return callback(err, fieldsObject);
                        });
                    }, function(tx, err) {
                        return callback(err);
                    });
                };
                resolvePlaceholder = function(placeholder, resolvedID) {
                    var placeholderCallback, placeholderCallbacks, _i, _len, _results;
                    placeholderCallbacks = placeholders[placeholder];
                    placeholders[placeholder] = resolvedID;
                    _results = [];
                    for (_i = 0, _len = placeholderCallbacks.length; _len > _i; _i++) {
                        placeholderCallback = placeholderCallbacks[_i];
                        _results.push(placeholderCallback(placeholder, resolvedID));
                    }
                    return _results;
                };
                return tx.executeSql('SELECT * FROM "conditional_resource" WHERE "transaction" = ?;', [ transactionID ], function(tx, conditionalResources) {
                    conditionalResources.rows.forEach(function(conditionalResource) {
                        var placeholder;
                        placeholder = conditionalResource.placeholder;
                        return null != placeholder && placeholder.length > 0 ? placeholders[placeholder] = [] : void 0;
                    });
                    return async.forEach(conditionalResources.rows, function(conditionalResource, callback) {
                        var clientModel, doCleanup, lockID, placeholder, uri;
                        placeholder = conditionalResource.placeholder;
                        lockID = conditionalResource.lock;
                        doCleanup = function() {
                            return async.parallel([ function(callback) {
                                return tx.executeSql('DELETE FROM "conditional_field" WHERE "conditional resource" = ?;', [ conditionalResource.id ], function() {
                                    return callback();
                                }, function(tx, err) {
                                    return callback(err);
                                });
                            }, function(callback) {
                                return tx.executeSql('DELETE FROM "conditional_resource" WHERE "lock" = ?;', [ lockID ], function() {
                                    return callback();
                                }, function(tx, err) {
                                    return callback(err);
                                });
                            }, function(callback) {
                                return tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock" = ?;', [ lockID ], function() {
                                    return callback();
                                }, function(tx, err) {
                                    return callback(err);
                                });
                            }, function(callback) {
                                return tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [ lockID ], function() {
                                    return callback();
                                }, function(tx, err) {
                                    return callback(err);
                                });
                            } ], callback);
                        };
                        clientModel = clientModels.data.resources[conditionalResource["resource type"]];
                        uri = "/data/" + conditionalResource["resource type"];
                        switch (conditionalResource["conditional type"]) {
                          case "DELETE":
                            return getLockedRow(lockID, function(err, lockedRow) {
                                if (null != err) return callback(err);
                                lockedRow = lockedRow.rows.item(0);
                                uri = uri + "?$filter=" + clientModel.idField + " eq " + lockedRow["resource id"];
                                return runURI("DELETE", uri, {}, tx, doCleanup, function() {
                                    return callback(arguments);
                                });
                            });

                          case "EDIT":
                            return getLockedRow(lockID, function(err, lockedRow) {
                                if (null != err) return callback(err);
                                lockedRow = lockedRow.rows.item(0);
                                uri = uri + "?$filter=" + clientModel.idField + " eq " + lockedRow["resource id"];
                                return getFieldsObject(conditionalResource.id, clientModel, function(err, fields) {
                                    return null != err ? callback(err) : runURI("PUT", uri, fields, tx, doCleanup, function() {
                                        return callback(arguments);
                                    });
                                });
                            });

                          case "ADD":
                            return getFieldsObject(conditionalResource.id, clientModel, function(err, fields) {
                                if (null != err) {
                                    resolvePlaceholder(placeholder, !1);
                                    return callback(err);
                                }
                                return runURI("POST", uri, fields, tx, function(result) {
                                    resolvePlaceholder(placeholder, result.id);
                                    return doCleanup();
                                }, function() {
                                    resolvePlaceholder(placeholder, !1);
                                    return callback(arguments);
                                });
                            });
                        }
                    }, function(err) {
                        return null != err ? callback(err) : tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [ transactionID ], function(tx, result) {
                            return validateDB(tx, sqlModels.data, function() {
                                return callback();
                            }, function(tx, err) {
                                return callback(err);
                            });
                        }, function(tx, err) {
                            return callback(err);
                        });
                    });
                });
            });
        };
        validateDB = function(tx, sqlmod, successCallback, failureCallback) {
            return async.forEach(sqlmod.rules, function(rule, callback) {
                return tx.executeSql(rule.sql, [], function(tx, result) {
                    var _ref;
                    return (_ref = result.rows.item(0).result) === !1 || 0 === _ref || "0" === _ref ? callback(rule.structuredEnglish) : callback();
                }, function(tx, err) {
                    return callback(err);
                });
            }, function(err) {
                if (null != err) {
                    tx.rollback();
                    return failureCallback(tx, err);
                }
                tx.end();
                return successCallback(tx);
            });
        };
        exports.executeModel = executeModel = function(tx, vocab, seModel, successCallback, failureCallback) {
            var models;
            models = {};
            models[vocab] = seModel;
            return executeModels(tx, models, function(err) {
                null != err && failureCallback(tx, err);
                return successCallback(tx);
            });
        };
        exports.executeModels = executeModels = function(tx, models, callback) {
            var validateFuncs;
            validateFuncs = [];
            return async.forEach(_.keys(models), function(vocab, callback) {
                var abstractSqlModel, clientModel, lfModel, metadata, seModel, slfModel, sqlModel;
                seModel = models[vocab];
                try {
                    lfModel = SBVRParser.matchAll(seModel, "Process");
                } catch (e) {
                    console.error("Error parsing model", vocab, e);
                    return callback("Error parsing model");
                }
                try {
                    slfModel = LF2AbstractSQLPrep.match(lfModel, "Process");
                    abstractSqlModel = LF2AbstractSQL.match(slfModel, "Process");
                    sqlModel = AbstractSQL2SQL.generate(abstractSqlModel);
                    clientModel = AbstractSQL2CLF(sqlModel);
                    metadata = ODataMetadataGenerator(vocab, sqlModel);
                } catch (e) {
                    console.error("Error compiling model", vocab, e);
                    return callback("Error compiling model");
                }
                return async.forEach(sqlModel.createSchema, function(createStatement, callback) {
                    return tx.executeSql(createStatement, null, function() {
                        return callback();
                    }, function() {
                        return callback();
                    });
                }, function(err, results) {
                    validateFuncs.push(function(callback) {
                        return validateDB(tx, sqlModel, function(tx) {
                            seModels[vocab] = seModel;
                            sqlModels[vocab] = sqlModel;
                            clientModels[vocab] = clientModel;
                            odataMetadata[vocab] = metadata;
                            odataParser.setSQLModel(vocab, abstractSqlModel);
                            odataParser.setClientModel(vocab, clientModel);
                            runURI("PUT", "/dev/model?$filter=model_type eq se", {
                                vocabulary: vocab,
                                "model value": seModel
                            }, tx);
                            runURI("PUT", "/dev/model?$filter=model_type eq lf", {
                                vocabulary: vocab,
                                "model value": lfModel
                            }, tx);
                            runURI("PUT", "/dev/model?$filter=model_type eq slf", {
                                vocabulary: vocab,
                                "model value": slfModel
                            }, tx);
                            runURI("PUT", "/dev/model?$filter=model_type eq abstractsql", {
                                vocabulary: vocab,
                                "model value": abstractSqlModel
                            }, tx);
                            runURI("PUT", "/dev/model?$filter=model_type eq sql", {
                                vocabulary: vocab,
                                "model value": sqlModel
                            }, tx);
                            runURI("PUT", "/dev/model?$filter=model_type eq client", {
                                vocabulary: vocab,
                                "model value": clientModel
                            }, tx);
                            return callback();
                        }, function(tx, err) {
                            return callback(err);
                        });
                    });
                    return callback(err);
                });
            }, function(err, results) {
                return err ? callback(err) : async.parallel(validateFuncs, callback);
            });
        };
        exports.deleteModel = function(vocabulary) {
            return db.transaction(function(tx) {
                var dropStatement, _i, _len, _ref;
                _ref = sqlModels[vocabulary].dropSchema;
                for (_i = 0, _len = _ref.length; _len > _i; _i++) {
                    dropStatement = _ref[_i];
                    tx.executeSql(dropStatement);
                }
                runURI("DELETE", "/dev/model?$filter=model_type eq se", {
                    vocabulary: vocabulary
                }, tx);
                runURI("DELETE", "/dev/model?$filter=model_type eq lf", {
                    vocabulary: vocabulary
                }, tx);
                runURI("DELETE", "/dev/model?$filter=model_type eq slf", {
                    vocabulary: vocabulary
                }, tx);
                runURI("DELETE", "/dev/model?$filter=model_type eq abstractsql", {
                    vocabulary: vocabulary
                }, tx);
                runURI("DELETE", "/dev/model?$filter=model_type eq sql", {
                    vocabulary: vocabulary
                }, tx);
                runURI("DELETE", "/dev/model?$filter=model_type eq client", {
                    vocabulary: vocabulary
                }, tx);
                seModels[vocabulary] = "";
                sqlModels[vocabulary] = [];
                odataParser.setSQLModel(vocabulary, sqlModels[vocabulary]);
                clientModels[vocabulary] = [];
                odataParser.setClientModel(vocabulary, clientModels[vocabulary]);
                return odataMetadata[vocabulary] = "";
            });
        };
        getID = function(tree) {
            var comparison, query, whereClause, _i, _j, _len, _len1, _ref, _ref1;
            query = tree.requests[0].query;
            for (_i = 0, _len = query.length; _len > _i; _i++) {
                whereClause = query[_i];
                if ("Where" === whereClause[0]) {
                    _ref = whereClause.slice(1);
                    for (_j = 0, _len1 = _ref.length; _len1 > _j; _j++) {
                        comparison = _ref[_j];
                        if ("Equals" === comparison[0] && "id" === (_ref1 = comparison[1][2])) return comparison[2][1];
                    }
                }
            }
            return 0;
        };
        processInstances = function(resourceModel, rows) {
            var field, instances, processInstance, processRequired, _i, _len, _ref;
            processRequired = !1;
            _ref = resourceModel.fields;
            for (_i = 0, _len = _ref.length; _len > _i; _i++) {
                field = _ref[_i];
                if ("JSON" === field[0]) {
                    processRequired = !0;
                    break;
                }
            }
            instances = [];
            processInstance = processRequired ? function(instance) {
                var _j, _len1, _ref1;
                instance = _.clone(instance);
                _ref1 = resourceModel.fields;
                for (_j = 0, _len1 = _ref1.length; _len1 > _j; _j++) {
                    field = _ref1[_j];
                    "JSON" === field[0] && instance.hasOwnProperty(field[1]) && (instance[field[1]] = JSON.parse(instance[field[1]]));
                }
                return instances.push(instance);
            } : function(instance) {
                return instances.push(instance);
            };
            rows.forEach(processInstance);
            return instances;
        };
        processOData = function(vocab, resourceModel, rows) {
            var field, instances, processInstance, processRequired, _i, _len, _ref;
            processRequired = !1;
            _ref = resourceModel.fields;
            for (_i = 0, _len = _ref.length; _len > _i; _i++) {
                field = _ref[_i];
                if ("ForeignKey" === field[0] || "JSON" === field[0] || "Color" === field[0]) {
                    processRequired = !0;
                    break;
                }
            }
            instances = [];
            processInstance = processRequired ? function(instance) {
                var _j, _len1, _ref1;
                instance = _.clone(instance);
                instance.__metadata = {
                    uri: "",
                    type: ""
                };
                _ref1 = resourceModel.fields;
                for (_j = 0, _len1 = _ref1.length; _len1 > _j; _j++) {
                    field = _ref1[_j];
                    if (instance.hasOwnProperty(field[1])) switch (field[0]) {
                      case "ForeignKey":
                        instance[field[1]] = {
                            __deferred: {
                                uri: "/" + vocab + "/" + field[4][0] + "?$filter=" + field[4][1] + " eq " + instance[field[1]]
                            },
                            __id: instance[field[1]]
                        };
                        break;

                      case "JSON":
                        instance[field[1]] = JSON.parse(instance[field[1]]);
                        break;

                      case "Color":
                        instance[field[1]] = {
                            r: 255 & instance[field[1]] >> 16,
                            g: 255 & instance[field[1]] >> 8,
                            b: 255 & instance[field[1]],
                            a: 255 & instance[field[1]] >> 24
                        };
                    }
                }
                return instances.push(instance);
            } : function(instance) {
                instance = _.clone(instance);
                instance.__metadata = {
                    uri: "",
                    type: ""
                };
                return instances.push(instance);
            };
            rows.forEach(processInstance);
            return instances;
        };
        exports.runRule = function() {
            var LF2AbstractSQLPrepHack;
            LF2AbstractSQLPrepHack = _.extend({}, LF2AbstractSQLPrep, {
                CardinalityOptimisation: function() {
                    return this._pred(!1);
                }
            });
            return function(vocab, rule, callback) {
                var abstractSqlModel, lfModel, ruleAbs, ruleLF, ruleSQL, seModel, slfModel;
                seModel = seModels[vocab];
                try {
                    lfModel = SBVRParser.matchAll(seModel + "\nRule: " + rule, "Process");
                } catch (e) {
                    console.error("Error parsing rule", rule, e);
                    return;
                }
                ruleLF = lfModel[lfModel.length - 1];
                lfModel = lfModel.slice(0, -1);
                try {
                    slfModel = LF2AbstractSQLPrep.match(lfModel, "Process");
                    slfModel.push(ruleLF);
                    slfModel = LF2AbstractSQLPrepHack.match(slfModel, "Process");
                    abstractSqlModel = LF2AbstractSQL.match(slfModel, "Process");
                } catch (e) {
                    console.error("Failed to compile rule", rule, e);
                }
                ruleAbs = abstractSqlModel.rules.slice(-1)[0];
                ruleAbs[2][1] = ruleAbs[2][1][1][1];
                ruleAbs[2][1][1][1] = "*";
                ruleSQL = AbstractSQL2SQL.generate({
                    tables: {},
                    rules: [ ruleAbs ]
                }).rules[0].sql;
                return db.transaction(function(tx) {
                    return tx.executeSql(ruleSQL, [], function(tx, result) {
                        var clientModel, data, resourceModel;
                        clientModel = clientModels[vocab];
                        resourceModel = clientModel.resources[ruleLF[1][1][1][2][1]];
                        data = {
                            __model: resourceModel,
                            d: processOData(vocab, resourceModel, result.rows)
                        };
                        return callback(null, data);
                    }, function(tx, err) {
                        return callback(err);
                    });
                });
            };
        }();
        exports.runURI = runURI = function(method, uri, body, tx, successCallback, failureCallback) {
            var req, res, tree;
            null == body && (body = {});
            uri = decodeURI(uri);
            console.log("Running URI", method, uri, body);
            try {
                tree = odataParser.match([ method, body, uri ], "Process");
            } catch (e) {
                console.log("Failed to match uri: ", e);
                return;
            }
            req = {
                user: {
                    permissions: {
                        "resource.all": !0
                    }
                },
                tree: tree,
                body: body
            };
            res = {
                send: function(statusCode) {
                    return 404 === statusCode ? "function" == typeof failureCallback ? failureCallback() : void 0 : "function" == typeof successCallback ? successCallback() : void 0;
                },
                json: function(data, statusCode) {
                    return 404 === statusCode ? "function" == typeof failureCallback ? failureCallback(data) : void 0 : "function" == typeof successCallback ? successCallback(data) : void 0;
                },
                set: function() {}
            };
            switch (method) {
              case "GET":
                return runGet(req, res, tx);

              case "POST":
                return runPost(req, res, tx);

              case "PUT":
                return runPut(req, res, tx);

              case "DELETE":
                return runDelete(req, res, tx);
            }
        };
        exports.getUserPermissions = getUserPermissions = function(userId, callback) {
            return async.parallel({
                userPermissions: function(callback) {
                    return runURI("GET", "/Auth/user-has-permission?$filter=user eq " + userId, {}, null, function(result) {
                        return callback(!1, result.d);
                    }, function() {
                        return callback(!0);
                    });
                },
                userRoles: function(callback) {
                    return runURI("GET", "/Auth/user-has-role?$filter=user eq " + userId, {}, null, function(result) {
                        return callback(!1, result.d);
                    }, function() {
                        return callback(!0);
                    });
                },
                rolePermissions: function(callback) {
                    return runURI("GET", "/Auth/role-has-permission", {}, null, function(result) {
                        return callback(!1, result.d);
                    }, function() {
                        return callback(!0);
                    });
                },
                permissions: function(callback) {
                    return runURI("GET", "/Auth/permission", {}, null, function(result) {
                        return callback(!1, result.d);
                    }, function() {
                        return callback(!0);
                    });
                }
            }, function(err, result) {
                var permission, permissions, rolePermission, rolePermissions, userPermission, userPermissions, userRole, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _name, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
                if (null != err) {
                    console.error("Error loading permissions");
                    return callback(err);
                }
                permissions = {};
                rolePermissions = {};
                userPermissions = {};
                _ref = result.permissions;
                for (_i = 0, _len = _ref.length; _len > _i; _i++) {
                    permission = _ref[_i];
                    permissions[permission.id] = permission.name;
                }
                _ref1 = result.rolePermissions;
                for (_j = 0, _len1 = _ref1.length; _len1 > _j; _j++) {
                    rolePermission = _ref1[_j];
                    null == (_ref2 = rolePermissions[_name = rolePermission.role.__id]) && (rolePermissions[_name] = []);
                    rolePermissions[rolePermission.role.__id].push(permissions[rolePermission.permission.__id]);
                }
                _ref3 = result.userPermissions;
                for (_k = 0, _len2 = _ref3.length; _len2 > _k; _k++) {
                    userPermission = _ref3[_k];
                    userPermissions[permissions[userPermission.permission.__id]] = !0;
                }
                _ref4 = result.userRoles;
                for (_l = 0, _len3 = _ref4.length; _len3 > _l; _l++) {
                    userRole = _ref4[_l];
                    _ref5 = rolePermissions[userRole.role.__id];
                    for (_m = 0, _len4 = _ref5.length; _len4 > _m; _m++) {
                        rolePermission = _ref5[_m];
                        userPermissions[rolePermission] = !0;
                    }
                }
                return callback(null, userPermissions);
            });
        };
        checkPermissions = function() {
            var _getGuestPermissions;
            _getGuestPermissions = function() {
                var _guestPermissions;
                _guestPermissions = !1;
                return function(callback) {
                    return _guestPermissions !== !1 ? callback(null, _guestPermissions) : runURI("GET", "/Auth/user?$filter=user/username eq guest", {}, null, function(result) {
                        return result.d.length > 0 ? getUserPermissions(result.d[0].id, function(err, permissions) {
                            if (null != err) return callback(err);
                            _guestPermissions = permissions;
                            return callback(null, _guestPermissions);
                        }) : callback(!0);
                    }, function() {
                        return callback(!0);
                    });
                };
            }();
            return function(req, res, action, request, callback) {
                var vocabulary, _checkPermissions;
                if (null == callback) {
                    callback = request;
                    request = null;
                }
                vocabulary = req.tree.vocabulary;
                _checkPermissions = function(permissions) {
                    return permissions.hasOwnProperty("resource.all") || permissions.hasOwnProperty("resource." + action) || permissions.hasOwnProperty(vocabulary + ".all") || permissions.hasOwnProperty(vocabulary + "." + action) ? !0 : null != request && (permissions.hasOwnProperty(vocabulary + "." + request.resourceName + ".all") || permissions.hasOwnProperty(vocabulary + "." + request.resourceName + "." + action)) ? !0 : !1;
                };
                return null != req.user && _checkPermissions(req.user.permissions) ? callback() : _getGuestPermissions(function(err, permissions) {
                    if (!err && _checkPermissions(permissions)) return callback();
                    err && console.error(err);
                    return res.send(403);
                });
            };
        }();
        exports.runGet = runGet = function(req, res, tx) {
            var request, tree;
            res.set("Cache-Control", "no-cache");
            tree = req.tree;
            if (void 0 === tree.requests) return checkPermissions(req, res, "model", function() {
                return res.json(clientModels[tree.vocabulary].resources);
            });
            if (null != tree.requests[0].query) {
                request = tree.requests[0];
                return checkPermissions(req, res, "get", request, function() {
                    var bindings, query, runQuery, values, _ref;
                    try {
                        _ref = AbstractSQLRules2SQL.match(request.query, "ProcessQuery"), query = _ref.query, 
                        bindings = _ref.bindings;
                    } catch (e) {
                        console.error("Failed to compile abstract sql: ", e);
                    }
                    values = getAndCheckBindValues(bindings, request.values);
                    console.log(query, values);
                    if (_.isArray(values)) {
                        runQuery = function(tx) {
                            return tx.executeSql(query, values, function(tx, result) {
                                var clientModel, data, resourceModel;
                                clientModel = clientModels[tree.vocabulary];
                                resourceModel = clientModel.resources[request.resourceName];
                                switch (tree.type) {
                                  case "OData":
                                    data = {
                                        __model: resourceModel,
                                        d: processOData(tree.vocabulary, resourceModel, result.rows)
                                    };
                                    return res.json(data);
                                }
                            }, function() {
                                return res.send(404);
                            });
                        };
                        return null != tx ? runQuery(tx) : db.transaction(runQuery);
                    }
                    return res.json(values, 404);
                });
            }
            return checkPermissions(req, res, "model", tree.requests[0], function() {
                var clientModel, data;
                if ("$metadata" === tree.requests[0].resourceName) return res.send(odataMetadata[tree.vocabulary]);
                clientModel = clientModels[tree.vocabulary];
                data = {
                    __model: clientModel.resources[tree.requests[0].resourceName]
                };
                return res.json(data);
            });
        };
        exports.runPost = runPost = function(req, res, tx) {
            var request, tree;
            res.set("Cache-Control", "no-cache");
            tree = req.tree;
            if (void 0 === tree.requests) return res.send(404);
            request = tree.requests[0];
            return checkPermissions(req, res, "set", tree.requests[0], function() {
                var bindings, query, runQuery, values, vocab, _ref;
                try {
                    _ref = AbstractSQLRules2SQL.match(request.query, "ProcessQuery"), query = _ref.query, 
                    bindings = _ref.bindings;
                } catch (e) {
                    console.error("Failed to compile abstract sql: ", e);
                }
                values = getAndCheckBindValues(bindings, request.values);
                console.log(query, values);
                if (_.isArray(values)) {
                    vocab = tree.vocabulary;
                    runQuery = function(tx) {
                        tx.begin();
                        return tx.executeSql(query, values, function(tx, sqlResult) {
                            return validateDB(tx, sqlModels[vocab], function(tx) {
                                var insertID;
                                tx.end();
                                insertID = "UpdateQuery" === request.query[0] ? values[0] : sqlResult.insertId;
                                console.log("Insert ID: ", insertID);
                                return res.json({
                                    id: insertID
                                }, {
                                    location: "/" + vocab + "/" + request.resourceName + "?$filter=" + request.resourceName + "/" + clientModels[vocab].resources[request.resourceName].idField + " eq " + insertID
                                }, 201);
                            }, function(tx, errors) {
                                return res.json(errors, 404);
                            });
                        }, function(tx, err) {
                            var constraintError;
                            constraintError = checkForConstraintError(err, request.resourceName);
                            return constraintError !== !1 ? res.json(constraintError, 404) : res.send(404);
                        });
                    };
                    return null != tx ? runQuery(tx) : db.transaction(runQuery);
                }
                return res.json(values, 404);
            });
        };
        exports.runPut = runPut = function(req, res, tx) {
            var request, tree;
            res.set("Cache-Control", "no-cache");
            tree = req.tree;
            if (void 0 === tree.requests) return res.send(404);
            request = tree.requests[0];
            return checkPermissions(req, res, "set", tree.requests[0], function() {
                var doValidate, id, insertQuery, queries, runQuery, updateQuery, values, vocab;
                try {
                    queries = AbstractSQLRules2SQL.match(request.query, "ProcessQuery");
                } catch (e) {
                    console.error("Failed to compile abstract sql: ", e);
                }
                if (_.isArray(queries)) {
                    insertQuery = queries[0];
                    updateQuery = queries[1];
                } else insertQuery = queries;
                values = getAndCheckBindValues(insertQuery.bindings, request.values);
                console.log(insertQuery.query, values);
                if (_.isArray(values)) {
                    vocab = tree.vocabulary;
                    doValidate = function(tx) {
                        return validateDB(tx, sqlModels[vocab], function(tx) {
                            tx.end();
                            return res.send(200);
                        }, function(tx, errors) {
                            return res.json(errors, 404);
                        });
                    };
                    id = getID(tree);
                    runQuery = function(tx) {
                        tx.begin();
                        return tx.executeSql('SELECT NOT EXISTS(\n	SELECT 1\n	FROM "resource" r\n	JOIN "resource-is_under-lock" AS rl ON rl."resource" = r."id"\n	WHERE r."resource type" = ?\n	AND r."id" = ?\n) AS result;', [ request.resourceName, id ], function(tx, result) {
                            var _ref;
                            return (_ref = result.rows.item(0).result) === !1 || 0 === _ref || "0" === _ref ? res.json([ "The resource is locked and cannot be edited" ], 404) : tx.executeSql(insertQuery.query, values, function(tx, result) {
                                return doValidate(tx);
                            }, function(tx) {
                                if (null != updateQuery) {
                                    values = getAndCheckBindValues(updateQuery.bindings, request.values);
                                    console.log(updateQuery.query, values);
                                    return _.isArray(values) ? tx.executeSql(updateQuery.query, values, function(tx, result) {
                                        return doValidate(tx);
                                    }, function(tx, err) {
                                        var constraintError;
                                        constraintError = checkForConstraintError(err, request.resourceName);
                                        return constraintError !== !1 ? res.json(constraintError, 404) : res.send(404);
                                    }) : res.json(values, 404);
                                }
                                return res.send(404);
                            });
                        });
                    };
                    return null != tx ? runQuery(tx) : db.transaction(runQuery);
                }
                return res.json(values, 404);
            });
        };
        exports.runDelete = runDelete = function(req, res, tx) {
            var request, tree;
            res.set("Cache-Control", "no-cache");
            tree = req.tree;
            if (void 0 === tree.requests) return res.send(404);
            request = tree.requests[0];
            return checkPermissions(req, res, "delete", tree.requests[0], function() {
                var bindings, query, runQuery, values, vocab, _ref;
                try {
                    _ref = AbstractSQLRules2SQL.match(request.query, "ProcessQuery"), query = _ref.query, 
                    bindings = _ref.bindings;
                } catch (e) {
                    console.error("Failed to compile abstract sql: ", e);
                }
                values = getAndCheckBindValues(bindings, request.values);
                console.log(query, values);
                if (_.isArray(values)) {
                    vocab = tree.vocabulary;
                    runQuery = function(tx) {
                        tx.begin();
                        return tx.executeSql(query, values, function(tx, result) {
                            return validateDB(tx, sqlModels[vocab], function(tx) {
                                tx.end();
                                return res.send(200);
                            }, function(tx, errors) {
                                return res.json(errors, 404);
                            });
                        }, function() {
                            return res.send(404);
                        });
                    };
                    return null != tx ? runQuery(tx) : db.transaction(runQuery);
                }
                return res.json(values, 404);
            });
        };
        exports.parseURITree = parseURITree = function(req, res, next) {
            var uri;
            if (null == req.tree) try {
                uri = decodeURI(req.url);
                req.tree = odataParser.match([ req.method, req.body, uri ], "Process");
                console.log(uri, req.tree, req.body);
            } catch (e) {
                console.error("Failed to parse URI tree", req.url, e.message, e.stack);
                req.tree = !1;
            }
            return req.tree === !1 ? next("route") : next();
        };
        exports.executeStandardModels = executeStandardModels = function(tx, callback) {
            return executeModels(tx, {
                dev: devModel,
                transaction: transactionModel,
                Auth: userModel
            }, function(err) {
                if (null != err) console.error("Failed to execute standard models.", err); else {
                    async.parallel([ function(callback) {
                        return runURI("POST", "/Auth/user", {
                            username: "root",
                            password: "test123"
                        }, null, function() {
                            return callback();
                        }, function() {
                            return callback(!0);
                        });
                    }, function(callback) {
                        return runURI("POST", "/Auth/permission", {
                            name: "resource.all"
                        }, null, function() {
                            return callback();
                        }, function() {
                            return callback(!0);
                        });
                    } ], function(err) {
                        return null == err ? runURI("POST", "/Auth/user-has-permission", {
                            user: 1,
                            permission: 1
                        }, null) : void 0;
                    });
                    console.log("Sucessfully executed standard models.");
                }
                return "function" == typeof callback ? callback(err) : void 0;
            });
        };
        exports.setup = function(app, requirejs, databaseOptions, callback) {
            db = dbModule.connect(databaseOptions);
            AbstractSQL2SQL = AbstractSQL2SQL[databaseOptions.engine];
            db.transaction(function(tx) {
                return executeStandardModels(tx, function(err) {
                    if (null != err) {
                        console.error("Could not execute standard models");
                        process.exit();
                    }
                    runURI("GET", "/dev/model?$filter=model_type eq sql and vocabulary eq data", null, tx, function(result) {
                        var clientModel, instance, sqlModel, vocab, _i, _len, _ref, _results;
                        _ref = result.d;
                        _results = [];
                        for (_i = 0, _len = _ref.length; _len > _i; _i++) {
                            instance = _ref[_i];
                            vocab = instance.vocabulary;
                            sqlModel = instance["model value"];
                            clientModel = AbstractSQL2CLF(sqlModel);
                            sqlModels[vocab] = sqlModel;
                            odataParser.setSQLModel(vocab, sqlModel);
                            clientModels[vocab] = clientModel;
                            odataParser.setClientModel(vocab, clientModel);
                            _results.push(odataMetadata[vocab] = ODataMetadataGenerator(vocab, sqlModel));
                        }
                        return _results;
                    });
                    runURI("GET", "/dev/model?$filter=model_type eq se and vocabulary eq data", null, tx, function(result) {
                        var instance, seModel, vocab, _i, _len, _ref, _results;
                        _ref = result.d;
                        _results = [];
                        for (_i = 0, _len = _ref.length; _len > _i; _i++) {
                            instance = _ref[_i];
                            vocab = instance.vocabulary;
                            seModel = instance["model value"];
                            _results.push(seModels[vocab] = seModel);
                        }
                        return _results;
                    });
                    return setTimeout(callback, 0);
                });
            });
            app.get("/dev/*", parseURITree, function(req, res, next) {
                return runGet(req, res);
            });
            app.post("/transaction/execute", function(req, res, next) {
                var id;
                id = Number(req.body.id);
                return _.isNaN(id) ? res.send(404) : endTransaction(id, function(err) {
                    if (null != err) {
                        console.error(err);
                        return res.json(err, 404);
                    }
                    return res.send(200);
                });
            });
            app.get("/transaction", function(req, res, next) {
                return res.json({
                    transactionURI: "/transaction/transaction",
                    conditionalResourceURI: "/transaction/conditional_resource",
                    conditionalFieldURI: "/transaction/conditional_field",
                    lockURI: "/transaction/lock",
                    transactionLockURI: "/transaction/lock-belongs_to-transaction",
                    resourceURI: "/transaction/resource",
                    lockResourceURI: "/transaction/resource-is_under-lock",
                    exclusiveLockURI: "/transaction/lock-is_exclusive",
                    commitTransactionURI: "/transaction/execute"
                });
            });
            app.get("/transaction/*", parseURITree, function(req, res, next) {
                return runGet(req, res);
            });
            app.post("/transaction/*", parseURITree, function(req, res, next) {
                return runPost(req, res);
            });
            app.put("/transaction/*", parseURITree, function(req, res, next) {
                return runPut(req, res);
            });
            return app.del("/transaction/*", parseURITree, function(req, res, next) {
                return runDelete(req, res);
            });
        };
        return exports;
    });
}).call(this);

(function() {
    define("cs!passport-bcrypt/passportBCrypt", [ "async" ], function() {
        return function(options, sbvrUtils, app, passport) {
            var LocalStrategy, checkPassword, compare, exports;
            exports = {};
            checkPassword = function(username, password, done) {
                return sbvrUtils.runURI("GET", "/Auth/user?$filter=user/username eq " + username, {}, null, function(result) {
                    var hash, userId;
                    if (result.d.length > 0) {
                        hash = result.d[0].password;
                        userId = result.d[0].id;
                        return compare(password, hash, function(err, res) {
                            return res ? sbvrUtils.getUserPermissions(userId, function(err, permissions) {
                                return null != err ? done(null, !1) : done(null, {
                                    username: username,
                                    permissions: permissions
                                });
                            }) : done(null, !1);
                        });
                    }
                    return done(null, !1);
                }, function() {
                    return done(null, !1);
                });
            };
            if (null != passport) {
                compare = require("bcrypt").compare;
                LocalStrategy = require("passport-local").Strategy;
                app.post(options.loginUrl, passport.authenticate("local", {
                    failureRedirect: options.failureRedirect
                }), function(req, res, next) {
                    return res.redirect(options.successRedirect);
                });
                passport.serializeUser(function(user, done) {
                    return done(null, user);
                });
                passport.deserializeUser(function(user, done) {
                    return done(null, user);
                });
                passport.use(new LocalStrategy(checkPassword));
                exports.isAuthed = function(req, res, next) {
                    return req.isAuthenticated() ? next() : res.redirect(options.failureRedirect);
                };
            } else {
                compare = function(value, hash, callback) {
                    return callback(null, value === hash);
                };
                (function() {
                    var _user;
                    _user = !1;
                    app.post(options.loginUrl, function(req, res, next) {
                        return checkPassword(req.body.username, req.body.password, function(err, user) {
                            _user = user;
                            return res === !1 ? res.redirect(options.failureRedirect) : res.redirect(options.successRedirect);
                        });
                    });
                    return exports.isAuthed = function(req, res, next) {
                        return next();
                    };
                })();
            }
            return exports;
        };
    });
}).call(this);

(function() {
    var __hasProp = {}.hasOwnProperty;
    define("cs!data-server/SBVRServer", [ "async", "underscore", "cs!database-layer/db" ], function(async, _, dbModule) {
        var db, exports, isServerOnAir, serverIsOnAir, uiModel, uiModelLoaded;
        exports = {};
        db = null;
        uiModel = "Term:      text\n	Concept type: Text (Type)\nTerm:      name\n	Concept type: Short Text (Type)\nTerm:      textarea\n	--Database id Field: name\n	Reference Scheme: text\nFact type: textarea is disabled\nFact type: textarea has name\n	Necessity: Each textarea has exactly 1 name\n	Necessity: Each name is of exactly 1 textarea\nFact type: textarea has text\n	Necessity: Each textarea has exactly 1 text";
        isServerOnAir = function() {
            var onAir, pendingCallbacks;
            onAir = null;
            pendingCallbacks = [];
            return function(funcOrVal) {
                var callback, _i, _len;
                if (funcOrVal === !0 || funcOrVal === !1) {
                    onAir = funcOrVal;
                    isServerOnAir = function(funcOrVal) {
                        return funcOrVal === !0 || funcOrVal === !1 ? onAir = funcOrVal : funcOrVal(onAir);
                    };
                    for (_i = 0, _len = pendingCallbacks.length; _len > _i; _i++) {
                        callback = pendingCallbacks[_i];
                        callback(onAir);
                    }
                    return pendingCallbacks = null;
                }
                return pendingCallbacks.push(funcOrVal);
            };
        }();
        serverIsOnAir = function(req, res, next) {
            return isServerOnAir(function(onAir) {
                return onAir ? next() : next("route");
            });
        };
        uiModelLoaded = function() {
            var runNext, _nexts;
            _nexts = [];
            runNext = function(next, loaded) {
                var _i, _len, _results;
                if (loaded === !0) {
                    runNext = function(next) {
                        return next();
                    };
                    _results = [];
                    for (_i = 0, _len = _nexts.length; _len > _i; _i++) {
                        next = _nexts[_i];
                        _results.push(setTimeout(next, 0));
                    }
                    return _results;
                }
                return _nexts.push(next);
            };
            return function(req, res, next) {
                return runNext(next, req);
            };
        }();
        exports.setup = function(app, requirejs, sbvrUtils, isAuthed, databaseOptions) {
            db = dbModule.connect(databaseOptions);
            db.transaction(function(tx) {
                sbvrUtils.executeStandardModels(tx);
                sbvrUtils.executeModel(tx, "ui", uiModel, function() {
                    console.log("Sucessfully executed ui model.");
                    return uiModelLoaded(!0);
                }, function(tx, error) {
                    return console.error("Failed to execute ui model.", error);
                });
                return sbvrUtils.runURI("GET", "/dev/model?$filter=model_type eq sql and vocabulary eq data", null, tx, function(result) {
                    return isServerOnAir(result.d.length > 0);
                }, function() {
                    return isServerOnAir(!1);
                });
            });
            app.get("/onair", function(req, res, next) {
                return isServerOnAir(function(onAir) {
                    return res.json(onAir);
                });
            });
            app.post("/update", isAuthed, serverIsOnAir, function(req, res, next) {
                return res.send(404);
            });
            app.post("/execute", isAuthed, uiModelLoaded, function(req, res, next) {
                return sbvrUtils.runURI("GET", "/ui/textarea?$filter=name eq model_area", null, null, function(result) {
                    var seModel;
                    if (result.d.length > 0) {
                        seModel = result.d[0].text;
                        return db.transaction(function(tx) {
                            tx.begin();
                            return sbvrUtils.executeModel(tx, "data", seModel, function(tx, lfModel, slfModel, abstractSqlModel, sqlModel, clientModel) {
                                sbvrUtils.runURI("PUT", "/ui/textarea-is_disabled?$filter=textarea/name eq model_area", {
                                    value: !0
                                }, tx);
                                isServerOnAir(!0);
                                return res.send(200);
                            }, function(tx, errors) {
                                return res.json(errors, 404);
                            });
                        });
                    }
                    return res.send(404);
                }, function() {
                    return res.send(404);
                });
            });
            app.post("/validate", isAuthed, uiModelLoaded, function(req, res, next) {
                console.log(req.body);
                return sbvrUtils.runRule("data", req.body.rule, function(err, results) {
                    return null != err ? res.send(404) : res.json(results);
                });
            });
            app.del("/cleardb", isAuthed, function(req, res, next) {
                return db.transaction(function(tx) {
                    return tx.tableList(function(tx, result) {
                        return async.forEach(result.rows, function(table, callback) {
                            return tx.dropTable(table.name, null, function() {
                                return callback();
                            }, function() {
                                return callback(arguments);
                            });
                        }, function(err) {
                            if (null != err) return res.send(404);
                            sbvrUtils.executeStandardModels(tx);
                            sbvrUtils.executeModel(tx, "ui", uiModel, function() {
                                return console.log("Sucessfully executed ui model.");
                            }, function(tx, error) {
                                return console.log("Failed to execute ui model.", error);
                            });
                            return res.send(200);
                        });
                    });
                });
            });
            app.put("/importdb", isAuthed, function(req, res, next) {
                var queries;
                queries = req.body.split(";");
                return db.transaction(function(tx) {
                    return async.forEach(queries, function(query, callback) {
                        query = query.trim();
                        return query.length > 0 ? tx.executeSql(query, [], function() {
                            return callback();
                        }, function(tx, err) {
                            return callback([ query, err ]);
                        }) : void 0;
                    }, function(err) {
                        if (null != err) {
                            console.error(err);
                            return res.send(404);
                        }
                        return res.send(200);
                    });
                });
            });
            app.get("/exportdb", isAuthed, function(req, res, next) {
                var env;
                return db.transaction(function(tx) {
                    return tx.tableList(function(tx, result) {
                        var exported;
                        exported = "";
                        return async.forEach(result.rows, function(currRow, callback) {
                            var tableName;
                            tableName = currRow.name;
                            exported += 'DROP TABLE IF EXISTS "' + tableName + '";\n';
                            exported += currRow.sql + ";\n";
                            return tx.executeSql('SELECT * FROM "' + tableName + '";', [], function(tx, result) {
                                var insQuery;
                                insQuery = "";
                                result.rows.forEach(function(currRow) {
                                    var notFirst, propName, valQuery;
                                    notFirst = !1;
                                    insQuery += 'INSERT INTO "' + tableName + '" (';
                                    valQuery = "";
                                    for (propName in currRow) if (__hasProp.call(currRow, propName)) {
                                        if (notFirst) {
                                            insQuery += ",";
                                            valQuery += ",";
                                        } else notFirst = !0;
                                        insQuery += '"' + propName + '"';
                                        valQuery += "'" + currRow[propName] + "'";
                                    }
                                    return insQuery += ") values (" + valQuery + ");\n";
                                });
                                exported += insQuery;
                                return callback();
                            }, function(tx, err) {
                                return callback(err);
                            });
                        }, function(err) {
                            if (null != err) {
                                console.error(err);
                                return res.send(404);
                            }
                            return res.json(exported);
                        });
                    }, null, "name NOT LIKE '%_buk'");
                });
            });
            app.post("/backupdb", isAuthed, serverIsOnAir, function(req, res, next) {
                return db.transaction(function(tx) {
                    return tx.tableList(function(tx, result) {
                        return async.forEach(result.rows, function(currRow, callback) {
                            var tableName;
                            tableName = currRow.name;
                            return async.parallel([ function(callback) {
                                return tx.dropTable(tableName + "_buk", !0, function() {
                                    return callback();
                                }, function(tx, err) {
                                    return callback(err);
                                });
                            }, function(callback) {
                                return tx.executeSql('ALTER TABLE "' + tableName + '" RENAME TO "' + tableName + '_buk";', [], function() {
                                    return callback();
                                }, function(tx, err) {
                                    return callback(err);
                                });
                            } ], callback);
                        }, function(err) {
                            if (null != err) {
                                console.error(err);
                                return res.send(404);
                            }
                            return res.send(200);
                        });
                    }, function(tx, err) {
                        console.error(err);
                        return res.send(404);
                    }, "name NOT LIKE '%_buk'");
                });
            });
            app.post("/restoredb", isAuthed, serverIsOnAir, function(req, res, next) {
                return db.transaction(function(tx) {
                    return tx.tableList(function(tx, result) {
                        return async.forEach(result.rows, function(currRow, callback) {
                            var tableName;
                            tableName = currRow.name;
                            return async.parallel([ function(callback) {
                                return tx.dropTable(tableName.slice(0, -4), !0, function() {
                                    return callback();
                                }, function(tx, err) {
                                    return callback(err);
                                });
                            }, function(callback) {
                                return tx.executeSql('ALTER TABLE "' + tableName + '" RENAME TO "' + tableName.slice(0, -4) + '";', [], function() {
                                    return callback();
                                }, function(tx, err) {
                                    return callback(err);
                                });
                            } ], callback);
                        }, function(err) {
                            if (null != err) {
                                console.error(err);
                                return res.send(404);
                            }
                            return res.send(200);
                        });
                    }, function(tx, err) {
                        console.error(err);
                        return res.send(404);
                    }, "name LIKE '%_buk'");
                });
            });
            app.get("/ui/*", uiModelLoaded, sbvrUtils.parseURITree, function(req, res, next) {
                return sbvrUtils.runGet(req, res);
            });
            app.get("/data/*", serverIsOnAir, sbvrUtils.parseURITree, function(req, res, next) {
                return sbvrUtils.runGet(req, res);
            });
            app.get("/Auth/*", serverIsOnAir, sbvrUtils.parseURITree, function(req, res, next) {
                return sbvrUtils.runGet(req, res);
            });
            app.post("/data/*", serverIsOnAir, sbvrUtils.parseURITree, function(req, res, next) {
                return sbvrUtils.runPost(req, res);
            });
            app.post("/Auth/*", serverIsOnAir, sbvrUtils.parseURITree, function(req, res, next) {
                return sbvrUtils.runPost(req, res);
            });
            app.put("/ui/*", uiModelLoaded, sbvrUtils.parseURITree, function(req, res, next) {
                return sbvrUtils.runPut(req, res);
            });
            app.put("/data/*", serverIsOnAir, sbvrUtils.parseURITree, function(req, res, next) {
                return sbvrUtils.runPut(req, res);
            });
            app.put("/Auth/*", serverIsOnAir, sbvrUtils.parseURITree, function(req, res, next) {
                return sbvrUtils.runPut(req, res);
            });
            app.del("/data/*", serverIsOnAir, sbvrUtils.parseURITree, function(req, res, next) {
                return sbvrUtils.runDelete(req, res);
            });
            app.del("/Auth/*", serverIsOnAir, sbvrUtils.parseURITree, function(req, res, next) {
                return sbvrUtils.runDelete(req, res);
            });
            return app.del("/", uiModelLoaded, serverIsOnAir, function(req, res, next) {
                sbvrUtils.runURI("DELETE", "/ui/textarea-is_disabled?$filter=textarea/name eq model_area/");
                sbvrUtils.runURI("PUT", "/ui/textarea?$filter=name eq model_area/", {
                    text: ""
                });
                sbvrUtils.deleteModel("data");
                isServerOnAir(!1);
                return res.send(200);
            });
        };
        return exports;
    });
}).call(this);

(function() {
    define("cs!editor-server/editorServer", [ "require", "exports", "module" ], function(requirejs, exports, module) {
        var db, decodeBase, toBase;
        db = null;
        toBase = function(decimal, base) {
            var chars, symbols;
            symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
            chars = "";
            if (base > symbols.length || 1 >= base) return !1;
            for (;decimal >= 1; ) {
                chars = symbols[decimal - base * Math.floor(decimal / base)] + chars;
                decimal = Math.floor(decimal / base);
            }
            return chars;
        };
        decodeBase = function(url, base) {
            var alphaChar, alphaNum, sum, symbols, _i, _len, _ref;
            symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
            sum = 0;
            _ref = url.split("");
            for (_i = 0, _len = _ref.length; _len > _i; _i++) {
                alphaChar = _ref[_i];
                alphaNum = alphaChar.charCodeAt(0);
                if (alphaNum >= 48 && 57 >= alphaNum) alphaNum -= 48; else if (alphaNum >= 65 && 90 >= alphaNum) alphaNum -= 29; else {
                    if (!(alphaNum >= 97 && 122 >= alphaNum)) return !1;
                    alphaNum -= 87;
                }
                sum *= base;
                sum += alphaNum;
            }
            return sum;
        };
        exports.setup = function(app, requirejs, sbvrUtils, isAuthed, databaseOptions) {
            requirejs([ "cs!database-layer/db" ], function(dbModule) {
                db = dbModule.connect(databaseOptions);
                return db.transaction(function(tx) {
                    return tx.tableList(function(tx, result) {
                        return 0 === result.rows.length ? tx.executeSql('CREATE TABLE "_sbvr_editor_cache" ("id" INTEGER PRIMARY KEY AUTOINCREMENT,"value" TEXT );') : void 0;
                    }, null, "name = '_sbvr_editor_cache'");
                });
            });
            app.post("/publish", function(req, res, next) {
                return db.transaction(function(tx) {
                    var lfmod, value;
                    try {
                        lfmod = SBVRParser.matchAll(req.body, "Process");
                    } catch (e) {
                        console.log("Error parsing model", e);
                        res.json("Error parsing model");
                        return null;
                    }
                    value = JSON.stringify(req.body);
                    return tx.executeSql('INSERT INTO "_sbvr_editor_cache" ("value") VALUES (?);', [ value ], function(tx, result) {
                        return res.json(toBase(result.insertId, 62));
                    }, function(tx, error) {
                        return res.json(error);
                    });
                });
            });
            return app.get("/publish/:key", function(req, res, next) {
                var key;
                key = decodeBase(req.params.key, 62);
                if (key === !1) return res.send(404);
                console.log("key: ", key);
                return db.transaction(function(tx) {
                    return tx.executeSql('SELECT * FROM "_sbvr_editor_cache" WHERE id = ?;', [ key ], function(tx, result) {
                        return 0 === result.rows.length ? res.json("Error") : res.send(result.rows.item(0).value);
                    }, function(tx, error) {
                        return res.json(error);
                    });
                });
            });
        };
        return exports;
    });
}).call(this);

(function() {
    var __slice = [].slice;
    define("cs!express-emulator/express", [ "require", "exports", "module" ], function(requirejs, exports, module) {
        var app;
        "undefined" != typeof window && null !== window && (window.GLOBAL_PERMISSIONS = {
            "resource.all": !0
        });
        app = function() {
            var addHandler, handlers;
            handlers = {
                POST: [],
                PUT: [],
                DELETE: [],
                GET: []
            };
            addHandler = function() {
                var handlerName, match, middleware, paramMatch, paramName, _ref;
                handlerName = arguments[0], match = arguments[1], middleware = arguments.length >= 3 ? __slice.call(arguments, 2) : [];
                match = match.replace(/[\/\*]*$/, "").toLowerCase();
                paramMatch = /:(.*)$/.exec(match);
                paramName = null != (_ref = null === paramMatch) ? _ref : {
                    "null": paramMatch[1]
                };
                return handlers[handlerName].push({
                    match: match,
                    paramName: paramName,
                    middleware: middleware
                });
            };
            return {
                post: function() {
                    var args;
                    args = arguments.length >= 1 ? __slice.call(arguments, 0) : [];
                    return addHandler.apply(null, [ "POST" ].concat(args));
                },
                get: function() {
                    var args;
                    args = arguments.length >= 1 ? __slice.call(arguments, 0) : [];
                    return addHandler.apply(null, [ "GET" ].concat(args));
                },
                put: function() {
                    var args;
                    args = arguments.length >= 1 ? __slice.call(arguments, 0) : [];
                    return addHandler.apply(null, [ "PUT" ].concat(args));
                },
                del: function() {
                    var args;
                    args = arguments.length >= 1 ? __slice.call(arguments, 0) : [];
                    return addHandler.apply(null, [ "DELETE" ].concat(args));
                },
                all: function() {
                    this.post.apply(this, arguments);
                    this.get.apply(this, arguments);
                    this.put.apply(this, arguments);
                    return this.del.apply(this, arguments);
                },
                process: function(method, uri, headers, body, successCallback, failureCallback) {
                    var checkMethodHandlers, i, j, methodHandlers, next, req, res;
                    null == body && (body = "");
                    handlers[method] || failureCallback(404);
                    req = {
                        user: {
                            permissions: window.GLOBAL_PERMISSIONS
                        },
                        method: method,
                        body: body,
                        headers: headers,
                        url: uri,
                        params: {}
                    };
                    console.log(method, uri, body);
                    "/" === uri.slice(-1) && (uri = uri.slice(0, uri.length - 1));
                    uri = uri.toLowerCase();
                    res = {
                        json: function(obj, headers, statusCode) {
                            var _ref;
                            null == headers && (headers = 200);
                            "number" == typeof headers && null == statusCode && (_ref = [ headers, {} ], statusCode = _ref[0], 
                            headers = _ref[1]);
                            obj = JSON.parse(JSON.stringify(obj));
                            return 404 === statusCode ? failureCallback(statusCode, obj, headers) : successCallback(statusCode, obj, headers);
                        },
                        send: function(statusCode, headers) {
                            return 404 === statusCode ? failureCallback(statusCode, null, headers) : successCallback(statusCode, null, headers);
                        },
                        redirect: function() {
                            return failureCallback(307);
                        },
                        set: function() {}
                    };
                    next = function(route) {
                        j++;
                        return "route" === route || j >= methodHandlers[i].middleware.length ? checkMethodHandlers() : methodHandlers[i].middleware[j](req, res, next);
                    };
                    methodHandlers = handlers[method];
                    i = -1;
                    j = -1;
                    checkMethodHandlers = function() {
                        i++;
                        if (methodHandlers.length > i) {
                            if (uri.slice(0, methodHandlers[i].match.length) === methodHandlers[i].match) {
                                j = -1;
                                null !== methodHandlers[i].paramName && (req.params[methodHandlers[i].paramName] = uri.slice(methodHandlers[i].match.length));
                                return next();
                            }
                            return checkMethodHandlers();
                        }
                        return res.send(404);
                    };
                    return checkMethodHandlers();
                }
            };
        }();
        return {
            app: app
        };
    });
}).call(this);

(function() {
    define("cs!config-loader/config-loader", [ "has", "cs!database-layer/db", "async" ], function(has, dbModule, async) {
        var exports;
        exports = {};
        exports.setup = function(app, requirejs, sbvrUtils, isAuthed, databaseOptions) {
            var fs;
            console.error("Config loader only works in a nodejs environment.");
        };
        return exports;
    });
}).call(this);

(function() {
    define("cs!server-glue/server", [ "has", "cs!server-glue/sbvr-utils", "cs!passport-bcrypt/passportBCrypt", "cs!data-server/SBVRServer", "cs!editor-server/editorServer", "cs!express-emulator/express", "cs!config-loader/config-loader" ], function(has, sbvrUtils, passportBCrypt, sbvrServer, editorServer, express, configLoader) {
        var app, databaseOptions, passport, setupCallback;
        databaseOptions = {
            engine: "websql",
            params: "rulemotion"
        };
        setupCallback = function(app) {
            return sbvrUtils.setup(app, require, databaseOptions, function(err) {
                passportBCrypt = passportBCrypt({
                    loginUrl: "/login",
                    failureRedirect: "/login.html",
                    successRedirect: "/"
                }, sbvrUtils, app, passport);
                sbvrServer.setup(app, require, sbvrUtils, passportBCrypt.isAuthed, databaseOptions);
            });
        };
        app = express.app;
        setupCallback(express.app);
        return {
            app: app,
            sbvrUtils: sbvrUtils
        };
    });
}).call(this);