
// try to use StringBuffer instead of string concatenation to improve performance

function StringBuffer() {
  this.strings = []
  for (var idx = 0; idx < arguments.length; idx++)
    this.nextPutAll(arguments[idx])
}
StringBuffer.prototype.nextPutAll = function(s) { this.strings.push(s) }
StringBuffer.prototype.contents   = function()  { return this.strings.join("") }
String.prototype.writeStream      = function() { return new StringBuffer(this) }

// make Arrays print themselves sensibly

printOn = function(x, ws) {
  if (x === undefined || x === null)
    ws.nextPutAll("" + x)
  else if (x.constructor === Array) {
    ws.nextPutAll("[")
    for (var idx = 0; idx < x.length; idx++) {
      if (idx > 0)
        ws.nextPutAll(", ")
      printOn(x[idx], ws)
    }
    ws.nextPutAll("]")
  }
  else
    ws.nextPutAll(x.toString())
}

Array.prototype.toString = function() { var ws = "".writeStream(); printOn(this, ws); return ws.contents() }

// delegation

objectThatDelegatesTo = function(x, props) {
  var f = function() { }
  f.prototype = x
  var r = new f()
  for (var p in props)
    if (props.hasOwnProperty(p))
      r[p] = props[p]
  return r
}

// some reflective stuff

ownPropertyNames = function(x) {
  var r = []
  for (var name in x)
    if (x.hasOwnProperty(name))
      r.push(name)
  return r
}

isImmutable = function(x) {
   return x === null || x === undefined || typeof x === "boolean" || typeof x === "number" || typeof x === "string"
}

String.prototype.digitValue  = function() { return this.charCodeAt(0) - "0".charCodeAt(0) }

isSequenceable = function(x) { return typeof x == "string" || x.constructor === Array }

// some functional programming stuff

Array.prototype.map = function(f) {
  var r = []
  for (var idx = 0; idx < this.length; idx++)
    r[idx] = f(this[idx])
  return r
}

Array.prototype.reduce = function(f, z) {
  var r = z
  for (var idx = 0; idx < this.length; idx++)
    r = f(r, this[idx])
  return r
}

Array.prototype.delimWith = function(d) {
  return this.reduce(
    function(xs, x) {
      if (xs.length > 0)
        xs.push(d)
      xs.push(x)
      return xs
    },
   [])
}

// Squeak's ReadStream, kind of

function ReadStream(anArrayOrString) {
  this.src = anArrayOrString
  this.pos = 0
}
ReadStream.prototype.atEnd = function() { return this.pos >= this.src.length }
ReadStream.prototype.next  = function() { return this.src.at(this.pos++) }

// escape characters

String.prototype.pad = function(s, len) {
  var r = this
  while (r.length < len)
    r = s + r
  return r
}

escapeStringFor = new Object()
for (var c = 0; c < 128; c++)
  escapeStringFor[c] = String.fromCharCode(c)
escapeStringFor["'".charCodeAt(0)]  = "\\'"
escapeStringFor['"'.charCodeAt(0)]  = '\\"'
escapeStringFor["\\".charCodeAt(0)] = "\\\\"
escapeStringFor["\b".charCodeAt(0)] = "\\b"
escapeStringFor["\f".charCodeAt(0)] = "\\f"
escapeStringFor["\n".charCodeAt(0)] = "\\n"
escapeStringFor["\r".charCodeAt(0)] = "\\r"
escapeStringFor["\t".charCodeAt(0)] = "\\t"
escapeStringFor["\v".charCodeAt(0)] = "\\v"
escapeChar = function(c) {
  var charCode = c.charCodeAt(0)
  if (charCode < 128)
    return escapeStringFor[charCode]
  else if (128 <= charCode && charCode < 256)
    return "\\x" + charCode.toString(16).pad("0", 2)
  else
    return "\\u" + charCode.toString(16).pad("0", 4)
}

function unescape(s) {
  if (s.charAt(0) == '\\')
    switch (s.charAt(1)) {
      case "'":  return "'"
      case '"':  return '"'
      case '\\': return '\\'
      case 'b':  return '\b'
      case 'f':  return '\f'
      case 'n':  return '\n'
      case 'r':  return '\r'
      case 't':  return '\t'
      case 'v':  return '\v'
      case 'x':  return String.fromCharCode(parseInt(s.substring(2, 4), 16))
      case 'u':  return String.fromCharCode(parseInt(s.substring(2, 6), 16))
      default:   return s.charAt(1)
    }
  else
    return s
}

String.prototype.toProgramString = function() {
  var ws = '"'.writeStream()
  for (var idx = 0; idx < this.length; idx++)
    ws.nextPutAll(escapeChar(this.charAt(idx)))
  ws.nextPutAll('"')
  return ws.contents()
}

// C-style tempnam function

function tempnam(s) { return (s ? s : "_tmpnam_") + tempnam.n++ }
tempnam.n = 0

// unique tags for objects (useful for making "hash tables")

getTag = (function() {
  var numIdx = 0
  return function(x) {
    if (x === null || x === undefined)
      return x
    switch (typeof x) {
      case "boolean": return x == true ? "Btrue" : "Bfalse"
      case "string":  return "S" + x
      case "number":  return "N" + x
      default:        return x.hasOwnProperty("_id_") ? x._id_ : x._id_ = "R" + numIdx++
    }
  }
})()


define("../ometa-js/lib", function(){});

/*
  new syntax:
    #foo and `foo	match the string object 'foo' (it's also accepted in my JS)
    'abc'		match the string object 'abc'
    'c'			match the string object 'c'
    ``abc''		match the sequence of string objects 'a', 'b', 'c'
    "abc"		token('abc')
    [1 2 3]		match the array object [1, 2, 3]
    foo(bar)		apply rule foo with argument bar
    -> ...		semantic actions written in JS (see OMetaParser's atomicHostExpr rule)
*/

/*
ometa M {
  number = number:n digit:d -> { n * 10 + d.digitValue() }
         | digit:d          -> { d.digitValue() }
}

translates to...

M = objectThatDelegatesTo(OMeta, {
  number: function() {
            return this._or(function() {
                              var n = this._apply("number"),
                                  d = this._apply("digit")
                              return n * 10 + d.digitValue()
                            },
                            function() {
                              var d = this._apply("digit")
                              return d.digitValue()
                            }
                           )
          }
})
M.matchAll("123456789", "number")
*/

// the failure exception

fail = { toString: function() { return "match failed" } }

// streams and memoization

function OMInputStream(hd, tl) {
  this.memo = { }
  this.lst  = tl.lst
  this.idx  = tl.idx
  this.hd   = hd
  this.tl   = tl
}
OMInputStream.prototype.head = function() { return this.hd }
OMInputStream.prototype.tail = function() { return this.tl }
OMInputStream.prototype.type = function() { return this.lst.constructor }
OMInputStream.prototype.upTo = function(that) {
  var r = [], curr = this
  while (curr != that) {
    r.push(curr.head())
    curr = curr.tail()
  }
  return this.type() == String ? r.join('') : r
}

function OMInputStreamEnd(lst, idx) {
  this.memo = { }
  this.lst = lst
  this.idx = idx
}
OMInputStreamEnd.prototype = objectThatDelegatesTo(OMInputStream.prototype)
OMInputStreamEnd.prototype.head = function() { throw fail }
OMInputStreamEnd.prototype.tail = function() { throw fail }

// This is necessary b/c in IE, you can't say "foo"[idx]
Array.prototype.at  = function(idx) { return this[idx] }
String.prototype.at = String.prototype.charAt

function ListOMInputStream(lst, idx) {
  this.memo = { }
  this.lst  = lst
  this.idx  = idx
  this.hd   = lst.at(idx)
}
ListOMInputStream.prototype = objectThatDelegatesTo(OMInputStream.prototype)
ListOMInputStream.prototype.head = function() { return this.hd }
ListOMInputStream.prototype.tail = function() { return this.tl || (this.tl = makeListOMInputStream(this.lst, this.idx + 1)) }

function makeListOMInputStream(lst, idx) { return new (idx < lst.length ? ListOMInputStream : OMInputStreamEnd)(lst, idx) }

Array.prototype.toOMInputStream  = function() { return makeListOMInputStream(this, 0) }
String.prototype.toOMInputStream = function() { return makeListOMInputStream(this, 0) }

function makeOMInputStreamProxy(target) {
  return objectThatDelegatesTo(target, {
    memo:   { },
    target: target,
    tl: undefined,
    tail:   function() { return this.tl || (this.tl = makeOMInputStreamProxy(target.tail())) }
  })
}

// Failer (i.e., that which makes things fail) is used to detect (direct) left recursion and memoize failures

function Failer() { }
Failer.prototype.used = false

// the OMeta "class" and basic functionality

OMeta = {
  _addToken: function(startIdx,endIdx,rule) {
    if(this.keyTokens != undefined) {
      if(startIdx != endIdx) {
	    if(this.keyTokens.indexOf(rule)!=-1) {
          if(this._tokens == undefined) {
            this._tokens = []
          }
          if(this._tokens[startIdx] == undefined) {
            this._tokens[startIdx] = []
          }
          this._tokens[startIdx].push([endIdx,rule])
		}
      }
	}
  },
  
  _storePossibility: function(rule) {
    if(this.possMap != undefined && this.possMap.hasOwnProperty(rule)) {
      if(this.__possibilities == undefined) {
        this.__possibilities = []
      }
	  var idx = this.input.idx;
      if(this.__possibilities[idx] == undefined) {
        this.__possibilities[idx] = []
      }
      this.__possibilities[idx].push(rule)
	  }
  },
  
  _apply: function(rule) {
    var memoRec = this.input.memo[rule]
    if (memoRec == undefined) {
      var origInput = this.input,
          failer    = new Failer()
      if (this[rule] === undefined)
        throw 'tried to apply undefined rule "' + rule + '"'
      this.input.memo[rule] = failer
      this._storePossibility(rule)
      this.input.memo[rule] = memoRec = {ans: this[rule].call(this), nextInput: this.input}
      if (failer.used) {
        var sentinel = this.input
        while (true) {
          try {
            this.input = origInput
            var ans = this[rule].call(this)
            if (this.input == sentinel)
              throw fail
            memoRec.ans       = ans
            memoRec.nextInput = this.input
          }
          catch (f) {
            if (f != fail) {
              console.log(f.stack)
              throw f
            }
            break
          }
        }
      }
      this._addToken(origInput.idx, this.input.idx, rule);
    }
    else if (memoRec instanceof Failer) {
      memoRec.used = true
      throw fail
    }
    this.input = memoRec.nextInput
    return memoRec.ans
  },

  // note: _applyWithArgs and _superApplyWithArgs are not memoized, so they can't be left-recursive
  _applyWithArgs: function(rule) {
    var argsIdx = this[rule].length+1
    for (var idx = arguments.length - 1; idx >= argsIdx; idx--) // Add parameters passed via input in reverse order
      this._prependInput(arguments[idx])
    var origIdx = this.input.idx
    var ans = argsIdx>1 ? this[rule].apply(this,Array.prototype.slice.call(arguments,1,argsIdx)) : this[rule].call(this)
    this._addToken(origIdx, this.input.idx, rule)
	return ans
  },
  _superApplyWithArgs: function(recv, rule) {
    var argsIdx = this[rule].length+2
    for (var idx = arguments.length - 1; idx >= argsIdx; idx--) // Add parameters passed via input in reverse order
      recv._prependInput(arguments[idx])
    var origIdx = recv.input.idx
    var ans = argsIdx>2 ? this[rule].apply(recv,Array.prototype.slice.call(arguments,2,argsIdx)) : this[rule].call(recv)
    this._addToken(origIdx, recv.input.idx, rule)
	return ans
  },
  _prependInput: function(v) {
    this.input = new OMInputStream(v, this.input)
  },
  
  // if you want your grammar (and its subgrammars) to memoize parameterized rules, invoke this method on it:
  memoizeParameterizedRules: function() {
    this._prependInput = function(v) {
      var newInput
      if (isImmutable(v)) {
        newInput = this.input[getTag(v)]
        if (!newInput) {
          newInput = new OMInputStream(v, this.input)
          this.input[getTag(v)] = newInput
        }
      }
      else newInput = new OMInputStream(v, this.input)
      this.input = newInput
    }
    this._applyWithArgs = function(rule) {
      for (var idx = arguments.length - 1; idx > 0; idx--)
        this._prependInput(arguments[idx])
      return this._apply(rule)
    }
  },

  _pred: function(b) {
    if (b)
      return true
    throw fail
  },
  _not: function(x) {
    var origInput = this.input
    try { x.call(this) }
    catch (f) {
      if (f != fail) {
        console.log(f.stack)
        throw f
      }
      this.input = origInput
      return true
    }
    throw fail
  },
  _lookahead: function(x) {
    var origInput = this.input,
        r         = x.call(this)
    this.input = origInput
    return r
  },
  _or: function() {
    var origInput = this.input
    for (var idx = 0; idx < arguments.length; idx++)
      try { this.input = origInput; return arguments[idx].call(this) }
      catch (f) {
        if (f != fail) {
          console.log(f.stack)
          throw f
        }
      }
    throw fail
  },
  _xor: function(ruleName) {
    var origInput = this.input, idx = 1, newInput, ans
    while (idx < arguments.length) {
      try {
        this.input = origInput
        ans = arguments[idx].call(this)
        if (newInput)
          throw 'more than one choice matched by "exclusive-OR" in ' + ruleName
        newInput = this.input
      }
      catch (f) {
        if (f != fail) {
          console.log(f.stack)
          throw f
      }
      }
      idx++
    }
    if (newInput) {
      this.input = newInput
      return ans
    }
    else
      throw fail
  },
  disableXORs: function() {
    this._xor = function(ruleName) {
      var origInput = this.input
      for (var idx = 1; idx < arguments.length; idx++)
        try { this.input = origInput; return arguments[idx].call(this) }
        catch (f) {
          if (f != fail) {
            console.log(f.stack)
            throw f
        }
        }
      throw fail
    }
  },
  _opt: function(x) {
    var origInput = this.input, ans
    try { ans = x.call(this) }
    catch (f) {
      if (f != fail) {
        console.log(f.stack)
        throw f
      }
      this.input = origInput
    }
    return ans
  },
  _many: function(x) {
    var ans = arguments[1] != undefined ? [arguments[1]] : []
    while (true) {
      var origInput = this.input
      try { ans.push(x.call(this)) }
      catch (f) {
        if (f != fail) {
          console.log(f.stack)
          throw f
        }
        this.input = origInput
        break
      }
    }
    return ans
  },
  _many1: function(x) { return this._many(x, x.call(this)) },
  _form: function(x) {
    var v = this._apply("anything")
    if (!isSequenceable(v))
      throw fail
    var origInput = this.input
    this.input = v.toOMInputStream()
    var r = x.call(this)
    this._apply("end")
    this.input = origInput
    return v
  },
  _consumedBy: function(x) {
    var origInput = this.input
    x.call(this)
    return origInput.upTo(this.input)
  },
  _idxConsumedBy: function(x) {
    var origInput = this.input
    x.call(this)
    return {fromIdx: origInput.idx, toIdx: this.input.idx}
  },
  _interleave: function(mode1, part1, mode2, part2 /* ..., moden, partn */) {
    var currInput = this.input, ans = []
    for (var idx = 0; idx < arguments.length; idx += 2)
      ans[idx / 2] = (arguments[idx] == "*" || arguments[idx] == "+") ? [] : undefined
    while (true) {
      var idx = 0, allDone = true
      while (idx < arguments.length) {
        if (arguments[idx] != "0")
          try {
            this.input = currInput
            switch (arguments[idx]) {
              case "*": ans[idx / 2].push(arguments[idx + 1].call(this));                       break
              case "+": ans[idx / 2].push(arguments[idx + 1].call(this)); arguments[idx] = "*"; break
              case "?": ans[idx / 2] =    arguments[idx + 1].call(this);  arguments[idx] = "0"; break
              case "1": ans[idx / 2] =    arguments[idx + 1].call(this);  arguments[idx] = "0"; break
              default:  throw "invalid mode '" + arguments[idx] + "' in OMeta._interleave"
            }
            currInput = this.input
            break
          }
          catch (f) {
            if (f != fail) {
              console.log(f.stack)
              throw f
            }
            // if this (failed) part's mode is "1" or "+", we're not done yet
            allDone = allDone && (arguments[idx] == "*" || arguments[idx] == "?")
          }
        idx += 2
      }
      if (idx == arguments.length) {
        if (allDone)
          return ans
        else
          throw fail
      }
    }
  },
  _currIdx: function() { return this.input.idx },

  // some basic rules
  anything: function() {
    var r = this.input.head()
    this.input = this.input.tail()
    return r
  },
  end: function() {
    return this._not(function() { return this._apply("anything") })
  },
  pos: function() {
    return this.input.idx
  },
  empty: function() { return true },
  apply: function(r) {
    return this._apply(r)
  },
  foreign: function(g, r) {
    var gi  = objectThatDelegatesTo(g, {input: makeOMInputStreamProxy(this.input)}),
        ans = gi._apply(r)
    this.input = gi.input.target
    return ans
  },

  //  some useful "derived" rules
  exactly: function(wanted) {
    if (wanted === this._apply("anything"))
      return wanted
    throw fail
  },
  "true": function() {
    var r = this._apply("anything")
    this._pred(r === true)
    return r
  },
  "false": function() {
    var r = this._apply("anything")
    this._pred(r === false)
    return r
  },
  "undefined": function() {
    var r = this._apply("anything")
    this._pred(r === undefined)
    return r
  },
  number: function() {
    var r = this._apply("anything")
    this._pred(typeof r === "number")
    return r
  },
  string: function() {
    var r = this._apply("anything")
    this._pred(typeof r === "string")
    return r
  },
  "char": function() {
    var r = this._apply("anything")
    this._pred(typeof r === "string" && r.length == 1)
    return r
  },
  space: function() {
    var r = this._apply("char")
    this._pred(r.charCodeAt(0) <= 32)
    return r
  },
  spaces: function() {
    return this._many(function() { return this._apply("space") })
  },
  digit: function() {
    var r = this._apply("char")
    this._pred(r >= "0" && r <= "9")
    return r
  },
  lower: function() {
    var r = this._apply("char")
    this._pred(r >= "a" && r <= "z")
    return r
  },
  upper: function() {
    var r = this._apply("char")
    this._pred(r >= "A" && r <= "Z")
    return r
  },
  letter: function() {
    return this._or(function() { return this._apply("lower") },
                    function() { return this._apply("upper") })
  },
  letterOrDigit: function() {
    return this._or(function() { return this._apply("letter") },
                    function() { return this._apply("digit")  })
  },
  firstAndRest: function(first, rest)  {
     return this._many(function() { return this._apply(rest) }, this._apply(first))
  },
  seq: function(xs) {
    for (var idx = 0; idx < xs.length; idx++)
      this._applyWithArgs("exactly", xs.at(idx))
    return xs
  },
  notLast: function(rule) {
    var r = this._apply(rule)
    this._lookahead(function() { return this._apply(rule) })
    return r
  },
  listOf: function(rule, delim) {
    return this._or(function() {
                      var r = this._apply(rule)
                      return this._many(function() {
                                          this._applyWithArgs("token", delim)
                                          return this._apply(rule)
                                        },
                                        r)
                    },
                    function() { return [] })
  },
  token: function(cs) {
    this._apply("spaces")
    return this._applyWithArgs("seq", cs)
  },
  fromTo: function (x, y) {
    return this._consumedBy(function() {
                              this._applyWithArgs("seq", x)
                              this._many(function() {
                                this._not(function() { this._applyWithArgs("seq", y) })
                                this._apply("char")
                              })
                              this._applyWithArgs("seq", y)
                            })
  },

  initialize: function() { },
  // match and matchAll are a grammar's "public interface"
  _genericMatch: function(input, rule, args, matchFailed) {
    if (args == undefined)
      args = []
    var realArgs = [rule]
    for (var idx = 0; idx < args.length; idx++)
      realArgs.push(args[idx])
    var m = objectThatDelegatesTo(this, {input: input})
    m.initialize()
    try { return realArgs.length == 1 ? m._apply.call(m, realArgs[0]) : m._applyWithArgs.apply(m, realArgs) }
    catch (f) {
      if (f == fail && matchFailed != undefined) {
        var input = m.input
        if (input.idx != undefined) {
          while (input.tl != undefined && input.tl.idx != undefined)
            input = input.tl
          input.idx--
        }
        return matchFailed(m, input.idx)
      }
      console.log(f.stack)
      throw f
    }
  },
  match: function(obj, rule, args, matchFailed) {
    return this._genericMatch([obj].toOMInputStream(),    rule, args, matchFailed)
  },
  matchAll: function(listyObj, rule, args, matchFailed) {
    return this._genericMatch(listyObj.toOMInputStream(), rule, args, matchFailed)
  },
  createInstance: function() {
    var m = objectThatDelegatesTo(this)
    m.initialize()
    m.matchAll = function(listyObj, aRule) {
      this.input = listyObj.toOMInputStream()
      return this._apply(aRule)
    }
    return m
  }
}

define("../ometa-js/ometa-base", function(){});

/*
    http://www.JSON.org/json2.js
    2011-02-23

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, strict: false, regexp: false */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON;
if (!JSON) {
    JSON = {};
}

(function () {
    

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                this.getUTCFullYear()     + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate())      + 'T' +
                f(this.getUTCHours())     + ':' +
                f(this.getUTCMinutes())   + ':' +
                f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());

define("mylibs/json2", function(){});

/*
Copyright 2011 University of Surrey

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

function getBranch(branch, loc){
	for(var i=0;i<loc.length;i++){
		branch = branch[loc[i]+2];
	}
	//console.log(branch[1][0]);
	return branch;
}

function getPid(branch, loc){
	pid = branch[1][0];
	for(var i=0;i<loc.length;i++){
		branch = branch[loc[i]+2];
		if(branch[0]=='col'){
			pid += '--' + branch[1][0];
		} else {
			pid += '--' + branch[1][1];
		}
	}
	return pid;
}

function getTarg(tree, loc, actn, newb){
	//console.log(tree, loc, actn, newb);
	
	//create ''pointer''
	var ptree = jQuery.extend(true, [], tree);
	var pnt = 'ntree';
	var parr = ptree
	
	for(var i=0;i<loc.length;i++){
		parr = parr[loc[i]+2];
	}
	
	switch(actn){
		case 'add':
			parr.push(newb);
			break;
		case 'del':
			//this works with child#, perhaps id is better?
			parr.splice((newb+2),1);
			break;
	}

	//render tree into hash
	var pHash = ClientURIUnparser.match(ptree, 'trans');
	//console.log('pHash: ', pHash)
	return pHash
}

function serverAPI(about, filters){
	//does not work right for fact types

	var op = {"eq":"=", "ne":"!=", "lk":"~"};
	flts = '';
	
	//render filters
	for(var i=1;i<filters.length;i++){
		if(about == filters[i][1]){
			flts = flts + filters[i][1] + '.' + filters[i][2] + op[filters[i][0]] + filters[i][3] + ';';
		}
	}
	
	if(flts!=''){flts = '*filt:' + flts;}
	return '/data/' + about + flts;
}

function drawData(tree){
	var rootURI = location.pathname;
	var pos = '/data';
	var pid = 'data';
	var filters = ["filters"];

	$("#dataTab").html(
		"<table id='terms'><tbody><tr><td></td></tr></tbody></table>" + //this tbl must be removed
		"<div align='left'><br/><input type='button' value='Apply All Changes' " + 
		" onClick='runTrans();return false;'></div>"
		// + "<table id='fcTps'><tbody><tr><td>Fact Types:</td></tr></tbody></table>"
	);
	
	serverRequest("GET", "/data/", [], '', function(headers, result){
		//console.log(result);
		var reslt = JSON.parse(result);
		
		objcb = {
			callback: function(n, prod){
				//console.log(n,prod);
				this.data.push([n,prod]);
				if(++this.totend==this.totsub){
					this.data.sort(function(a,b){ return a[0] - b[0]; });
					for(var i=0;i<this.data.length;i++){
						$("#terms").append(this.data[i][1]);
					}
				}
			}
		}
		
		objcb.totsub = reslt.terms.length;
		objcb.totend = 0;
		objcb.data = [];
		
		/*ftcb = {
			callback: function(n, prod){
				//console.log(n,prod);
				this.data.push([n,prod]);
				if(++this.totend==this.totsub){
					this.data.sort(function(a,b){ return a[0] - b[0]; });
					for(var i=0;i<this.data.length;i++){
						$("#fcTps").append(this.data[i][1]);
					}
				}
			}
		}
		ftcb.totsub = reslt.fcTps.length;
		ftcb.totend = 0;
		ftcb.data = [];*/
		
		for(var i=0;i<reslt.terms.length;i++){
			launch = -1;
			for(var j=3;j<tree.length;j++){
				if(tree[j][1][0] == reslt.terms[i].id){ launch = j; }
			}
			
			pre = "<tr id='tr--data--" + reslt.terms[i].id + "'><td>"; 
			if(launch == -1){
				pre += reslt.terms[i].name;
			} else {
				pre += "<div style='display:inline; background-color:#FFFFFF; " +  
				"'>" + reslt.terms[i].name + "</div>";
			}
			post = "</td></tr>"
			
			if(launch != -1){
				npos = getTarg(tree, [], 'del', launch-2);
				
				pre += "<div style='display:inline;background-color:#FFFFFF" + "'> " +
				"<a href='" + rootURI + "#!/" + npos + "' " + 
				"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
				
				//console.log(3);
				uid = new uidraw(i, objcb, pre, post, rootURI, [], [], filters, [launch-2], true, tree); 
				uid.subRowIn();
			}else{
				newb = ['col', [reslt.terms[i].id], ['mod']];
				npos = getTarg(tree, [], 'add', newb);

				pre += " <a href='" + rootURI + "#!/" + npos + "' " + 
				"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
				
				objcb.callback(i,pre+post);
			}
		}
		
		/*for(var i=0;i<reslt.fcTps.length;i++){
			pre = "<tr id='tr--tr--data--" + reslt.terms[i].id + "'><td>" + reslt.fcTps[i].name;
			post = "</td></tr>"
			
			launch = -1;
			for(var j=3;j<tree.length;j++){
				if(tree[j][1][0] == reslt.fcTps[i].id){ launch = j; }
			}
			//console.log(launch);
			
			if(launch != -1){
				npos = getTarg(tree, [], 'del', launch-2);
				
				pre += "<div style='display:inline;background-color:#FFFFFF'>" + 
				" <a href='" + rootURI + "#!/" + npos + "' " + 
				"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
				
				//console.log(4);
				uid = new uidraw(i, ftcb, pre, post, 
				rootURI, [], [], filters, [launch-2], true, tree); 
				uid.subRowIn();
			}else{
				newb = ['col', [reslt.fcTps[i].id], ['mod']];
				npos = getTarg(tree, [], 'add', newb);

				pre += " <a href='" + rootURI + "#!/" + npos + "' " + 
				"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
				
				ftcb.callback(i,pre+post);
			}
		}*/
	});
}

function uidraw(idx, objcb, pre, post, rootURI, pos, pid, filters, loc, even, ftree){
	//console.log(loc);
	this.idx = idx;
	this.objcb = objcb; //issue here
	this.pre = pre;
	this.post = post;
	this.rootURI = rootURI;
	this.pos = pos;
	this.loc = loc;
	this.even = even;
	this.ftree = ftree;
	this.branch = getBranch(this.ftree,this.loc);
	this.filters = filters;
	//if(this.filters == []){this.filters == ['filters'];}
	this.filters = filtmerge(this.branch, this.filters);
	this.pid = getPid(this.ftree, this.loc);
	this.about = this.branch[1][0];
	this.data = [];
	this.items = 0;
	this.submitted = 0;
	this.html = '';
	this.adds = 0;
	this.addsout = 0;
	this.cols = 0;
	this.colsout = 0;
	this.rows = 0;
	this.targ = '';
	this.type = 'term';
	this.schema = [];
	if(even){this.bg = '#FFFFFF';this.unbg = '#EEEEEE'} else {this.bg = '#EEEEEE';this.unbg = '#FFFFFF'}
	
	//is the thing we're talking about a term or a fact type?
	for(var j=1;j<cmod.length;j++){
		if(cmod[j][1]==this.about){
			this.type = cmod[j][0];
			if(this.type == 'fcTp'){
				this.schema = cmod[j][6];
			}
		}
	}
	
	this.subRowIn = function(){
		//console.log(this.branch);
		if(this.branch[0]=='col'){
			this.pre += "<div class='panel' style='background-color:" + this.bg +
			";'>" + "<table id='tbl--" + pid + "'><tbody>";
			this.post += "</tbody></table></div>";
			//this.filters = filtmerge(this.branch, ['filters']); //this.filters);
			//this.targ = getTarg(ftree,loc,"del",1);
			this.targ = serverAPI(this.about, this.filters);
			
			//are there children with 'add' modifiers? huh?
			for(var j=3;j<this.branch.length;j++){ //iterate children
				//console.log(this.branch[j]);
				if(this.branch[j][0] == 'ins' &&
				this.branch[j][1][0] == this.about &&
				this.branch[j][1][1] == undefined){ //iterate modifiers
					for(var k=1;k<this.branch[j][2].length;k++){
						if(this.branch[j][2][k][0] == 'add'){
							this.adds++;
						}
					}
				}
			}
			
			//are there any subcollections?
			for(i=1;i<cmod.length;i++){
				if(cmod[i][0] == 'fcTp'){
					for(j=0;j<cmod[i][6].length;j++){
						if(cmod[i][6][j][1] == this.about){
							this.cols++;
						}
					}
				}
			}
			
			//are there expanded collection children? huh?
			//for(var j=3;j<this.branch.length;j++){ //iterate children
			//	if(this.branch[j][0] == 'col'){ //iterate collections
			//		this.cols++;
			//	}
			//}
			
			///load collection data
			//console.log(this.targ);
			
			serverRequest("GET", this.targ, [], '', function(headers, result, parent){
				//console.log(result);
			
				var reslt = JSON.parse(result);
				resl = ''
				
				parent.rows = reslt.instances.length;
				parent.items = parent.rows + 2 + parent.adds + 1 + parent.cols;
				
				//get link which adds an 'add inst' dialog.
				newb = ['ins', [parent.about], ['mod', ['add']]];
				npos = getTarg(parent.ftree, parent.loc, 'add', newb);
				
				parent.data.push([parent.rows + 1,"<tr><td><a href = '" + rootURI + "#!/" + 
				npos + "' onClick='location.hash=\"#!/" + npos + "\";return false;'>" + 
				"[(+)add new]</a></td></tr>"]);
				
				//render each child and call back
				for(var i=0;i<reslt.instances.length;i++){
					launch = -1;
					actn = 'view'
					for(var j=3;j<parent.branch.length;j++){
						//console.log(parent.branch[j], reslt.instances[i].name, reslt.instances[i].id);
					
						if(parent.branch[j][0] == 'ins' &&
						parent.branch[j][1][0] == parent.about && 
						(parent.branch[j][1][1] == reslt.instances[i].id || 
						parent.branch[j][1][1] == reslt.instances[i].name)
						&& parent.branch[j][1][1] != undefined){
							launch = j;
							
							//find action.
							for(var k=1;k<parent.branch[j][2].length;k++){
								if(parent.branch[j][2][k][0]=='edit'){ actn = 'edit'; break; }
								if(parent.branch[j][2][k][0]=='del'){ actn = 'del'; break; }
							}
						}
					}
					//console.log(launch,actn);
					
					posl = parent.targ + '/' + parent.about + "." + reslt.instances[i].id;
					
					prel = "<tr id='tr--" + pid + "--" + reslt.instances[i].id + "'><td>";
					
					if(launch != -1){
						prel+="<div style='display:inline;background-color:" + parent.unbg + "'>"
					}
					
					if(parent.type == "term"){
						prel += reslt.instances[i].name;
					}else if(parent.type == "fcTp"){
						//console.log(reslt.instances[i], parent.schema);
						for (var j=0;j<parent.schema.length;j++){
							if(parent.schema[j][0]=='term'){
								prel += reslt.instances[i][parent.schema[j][1] + '_name'] + ' ';
							}else if(parent.schema[j][0]=='verb'){
								prel += '<em>' + parent.schema[j][1] + '</em> ';
							}
						}
					}
					
					if(launch != -1){prel+="</div>"}
					
					if(launch != -1 && actn == 'view'){
						npos = getTarg(parent.ftree, parent.loc, 'del', launch-2);
						
						prel += "<div style='display:inline;background-color:" + parent.unbg + 
						"'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + 
						npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
					} else if(launch == -1){
						newb = ['ins', [parent.about, reslt.instances[i].id], ['mod']];
						npos = getTarg(parent.ftree, parent.loc, 'add', newb);
						
						prel += " <a href='" + rootURI + "#!/" + npos + "' " + 
						"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='View' class='ui-icon ui-icon-search'></span></a>";
					}
					
					if(launch != -1 && actn == 'edit'){
						npos = getTarg(parent.ftree, parent.loc, 'del', launch-2);
						
						prel += "<div style='display:inline;background-color:" + parent.unbg + 
						"'> <a href='" + rootURI + "#!/" + npos + "' " + 
						"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
					} else if(launch == -1){
						newb = ['ins', [parent.about, reslt.instances[i].id], ['mod', ['edit']]];
						npos = getTarg(parent.ftree, parent.loc, 'add', newb);
						
						prel +=	" <a href='" + rootURI + "#!/" + npos + "' " + 
						"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Edit' class='ui-icon ui-icon-pencil'></span></a>";
					}
					
					if(launch != -1 && actn == 'del'){
						npos = getTarg(parent.ftree, parent.loc, 'del', launch-2);
						prel += "<div style='display:inline;background-color:" + parent.unbg + 
						"'> <a href='" + rootURI + "#!/" + npos + "' " + 
						"onClick='location.hash=\"#!/" + npos + "\";return false'>[unmark]</a></div>";
					} else if(launch == -1){
						newb = ['ins', [parent.about, reslt.instances[i].id], ['mod', ['del']]];
						npos = getTarg(parent.ftree, parent.loc, 'add', newb);

						prel +=	" <a href='" + rootURI + "#!/" + npos + "' " + 
						"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Delete' class='ui-icon ui-icon-trash'></span></a>";
					}
					
					postl = "</td></tr>";
					
					if(launch != -1){
						locn = parent.loc.concat([launch-2]);
						uid = new uidraw(i, parent, prel, postl, rootURI, 
						[], [], parent.filters, locn, !parent.even, parent.ftree); 
						uid.subRowIn();
					}else{
						parent.callback(i,prel+postl);
					}
				}
				
				parent.callback(parent.rows,"<tr><td>" + 
				"<hr style='border:0px; width:90%; background-color: #999; height:1px;'>" +
				"</td></tr>");
				
				//launch more uids to render the adds
				posl = parent.targ + '/' + parent.about
				for(var j=3;j<parent.branch.length;j++){ //iterate children
					if(parent.branch[j][0] == 'ins' &&
					parent.branch[j][1][0] == parent.about && 
					parent.branch[j][1][1] == undefined){
						var isadd = false;
						for(var k=1;k<parent.branch[j][2].length;k++){ //iterate modifiers
							if(parent.branch[j][2][k][0] == 'add'){
								isadd=true;
							}
						}
						if(isadd){
							locn = parent.loc.concat([j-2]);
							uid = new uidraw(parent.rows + 1 + ++parent.addsout, parent, "<tr><td>",
							"</td></tr>", rootURI, [], [], 
							parent.filters, locn, !parent.even, parent.ftree);
							uid.subRowIn();
						}
					}
				}
				
				parent.callback(parent.rows + 1 + parent.adds + 1,
				"<tr><td>" + 
				"<hr style='border:0px; width:90%; background-color: #999; height:1px;'>" +
				"</td></tr>");
				
				//launch a final callback to add the subcollections.
				for(i=1;i<cmod.length;i++){
					if(cmod[i][0] == 'fcTp'){
						//console.log(cmod[i]);
						for(j=0;j<cmod[i][6].length;j++){
							//console.log(cmod[i][6][j],parent.about);
							if(cmod[i][6][j][1] == parent.about){
								launch = -1;
								for(var j=3;j<parent.branch.length;j++){
									//console.log(reslt,i,j);
									if(parent.branch[j][1][0] == cmod[i][1]){ launch = j-2; break; }
								}
								
								//console.log(cmod[i][2]);
								parent.colsout++;
								//console.log('aaa' + parent.colsout)
								res = '';
								
								pre = "<tr id='tr--data--" + cmod[i][1] + "'><td>"; 
								
								if(launch == -1){
									pre += cmod[i][2];
								} else {
									pre += "<div style='display:inline;background-color:" + parent.unbg + 
						            "'>" + cmod[i][2] + "</div>";
								}
								
								post = "</td></tr>";
								
								if(launch != -1){
									npos = getTarg(parent.ftree, parent.loc, 'del', launch);
									
									pre += "<div style='display:inline;background-color:" + parent.unbg + 
						            "'>" + " <a href='" + rootURI + "#!/" + npos + "' " + 
									"onClick='location.hash=\"#!/" + npos + 
									"\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a>" + "</div>";
									
									subcolcb = {
										callback: function(n, prod){
											//console.log('a', n);
											parent.callback(n, prod);
										}
									}
									
									//console.log(pre, post);
									uid = new uidraw(parent.rows + 1 + parent.adds + 1 + parent.colsout, 
									subcolcb, pre, post, rootURI, [], [],
									parent.filters, loc.concat([launch]), !parent.even, parent.ftree);
									uid.subRowIn();
								}else{
									newb = ['col', [cmod[i][1]], ['mod']];
									//console.log(parent.ftree, parent.loc);
									npos = getTarg(parent.ftree, parent.loc, 'add', newb);

									pre += " <a href='" + parent.rootURI + "#!/" + npos + "' " + 
									"onClick='location.hash=\"#!/" + npos + 
									"\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
						
									res += (pre + post);
									//console.log('b', parent.rows + 1 + parent.adds + parent.colsout);
									parent.callback(parent.rows + 1 + parent.adds + 1 + 
									parent.colsout, res);
								}
							}
						}
					}
				}
			}, null, this);
			
		} else if (this.branch[0]=='ins'){
			//console.log(branch);
			this.items = 1;
			this.pre += "<div class='panel' style='background-color:" + this.bg +	";'>"
			this.post += "</div>"
			targ = serverAPI(this.about, this.filters);
			posl = targ;
			this.id = this.branch[1][1];
			actn = 'view'
			
			//find first action.
			for(var i=1;i<this.branch[2].length;i++){
				if      (this.branch[2][i][0]=='add' ){ actn = 'add';  break; 
				}else if(this.branch[2][i][0]=='edit'){ actn = 'edit'; break; 
				}else if(this.branch[2][i][0]=='del' ){ actn = 'del';  break; 
				}
			}
			
			switch(actn){
				case "view":
					if(this.type == "term"){
						//this.filters = filters;
						//this.filters = filtmerge(this.branch, this.filters);
						this.targ = serverAPI(this.about, this.filters);
						//console.log(this.targ, getTarg(this.ftree, this.loc, "del", 1));
						serverRequest("GET", this.targ, [], '', function(headers, result, parent){
							res = ''
							var reslt = JSON.parse(result);
							//console.log(result);
							for(item in reslt.instances[0]){
								if(item != '__clone'){
									//alert([item,typeof(item),reslt.instances[0][item]])
									res += item + ": " + reslt.instances[0][item] + "<br/>"
									//could it have a child? yes, of course! a fact type for instance.
								}
							}
							//console.log(res);
							parent.callback(1,res);
						}, null, this);
					} else if(this.type == "fcTp"){
						this.targ = serverAPI(this.about, this.filters);
						//console.log(this.targ);
						serverRequest("GET", this.targ, [], '', function(headers, result, parent){
							res = '';
							var reslt = JSON.parse(result);
							res += "id: " + reslt.instances[0].id + "<br/>"
							//loop around terms
							for(var j=0;j<parent.schema.length;j++){
								if(parent.schema[j][0]=='term'){
									res += reslt.instances[0][parent.schema[j][1] + "_name"] + ' ';
								}else if(parent.schema[j][0]=='verb'){
									res += parent.schema[j][1] + ' ';
								}
							}
							parent.callback(1,res);
						}, null, this);
					}
					break;
				case "add":
					if(this.type == "term"){
						//get schema
						var schm = '';
						for(var j=1;j<cmod.length;j++){
							if(cmod[j][1]==this.about){
								schm = cmod[j][3];
							}
						}
						
						//print form.
						var res = "<div align='right'>";
						res += "<form class = 'action' >";
						res += "<input type='hidden' id='__actype' value='addterm'>";
						res += "<input type='hidden' id='__serverURI' value='" + serverAPI(this.about,[]) + "'>";
						res += "<input type='hidden' id='__backURI' value='" + targ + "'>";
						console.log('addterm backURI='+targ);
						res += "<input type='hidden' id='__type' value='" + this.about + "'>";
						for(var j=0;j<schm.length;j++){
							switch(schm[j][0]){
								case 'Text':
									res += schm[j][2] + ": <input type='text' id='" + 
									schm[j][1] + "' /><br />";
									//console.log(schm[j]);
									break;
								case 'ForeignKey':
									alert(schm[j]);
									break;
							}
						}
						res += "<input type='submit' value='Submit This'" +
						" onClick='processForm(" + "this.parentNode" + ");return false;'>";
						res += "</form>";
						res += "</div>";

						//res += "<input type='submit' value='Cancel'" +
						//" onClick='return false;'></div>";
						
						this.callback(1,res);
					}else if(this.type == "fcTp"){
						//initialize vars
						var trms = [];
						var trmres = [];
						var trmsel = {};
						var addftcb = function(headers, result, parent){
							//console.log(result);
							
							res = ''
							var reslt = JSON.parse(result);
							
							trmres.push(reslt.instances);
							
							//construct dropdowns & form
							if(trms.length == trmres.length){
								//console.log(trmres);
								//loop through terms/results
								var res = '';

								for(var j=0;j<trms.length;j++){
									res = "<select id='" + trms[j] + "_id'>"
									//Loop through options
									for(var k=0;k<trmres[j].length;k++){
										//console.log(trmres[j][k]);
										res += "<option value='" + trmres[j][k].id + "'>" + 
										trmres[j][k].name + "</option>";
									}
									res += "</select>"
									trmsel[trms[j]] = res;
								}
								
								res = '';
								res += "<form class = 'action' >";
								res += "<input type='hidden' id='__actype' value='addfctp'>";
								res += "<input type='hidden' id='__serverURI' value='" + 
											serverAPI(parent.about,[]) + "'>";
								res += "<input type='hidden' id='__backURI' value='" + posl + "'>";
								//console.log('addfctp backURI='+posl);
								res += "<input type='hidden' id='__type' value='" + parent.about + "'>";
								for(var j=0;j<parent.schema.length;j++){
									//console.log(parent.schema[j]);
									if(parent.schema[j][0]=='term'){
										res += trmsel[parent.schema[j][1]] + ' ';
									}else if(parent.schema[j][0]=='verb'){
										res += parent.schema[j][1] + ' ';
									}
								}										
								//console.log(res);
								
								//add submit button etc.
								res += "<div align='right'>";
								res += "<input type='submit' value='Submit This'" +
								" onClick='processForm(this.parentNode.parentNode);return false;'>";
								res += "</div>";
								res += "</form>";

								parent.callback(1,res);
							}
							
							//shoot off children
							
							//for(item in reslt.instances[0]){
								//alert([item,typeof(item),reslt.instances[0][item]])
							//	res += item + ": " + reslt.instances[0][item] + "<br/>"
								//could it have a child? yes, of course! a fact type for instance.
							//}
						}
						
						for(var j=0;j<this.schema.length;j++){
							if(this.schema[j][0]=='term'){
								trms.push(this.schema[j][1]);
							}
						}
						
						//loop around terms
						for(var j=0;j<this.schema.length;j++){
							if(this.schema[j][0]=='term'){
								var tar = serverAPI(this.schema[j][1], this.filters);
								serverRequest("GET", tar, [], '', addftcb, null, this);
							}else if(this.schema[j][0]=='verb'){
							}
						}
					}
					break;
				case "edit":
					if(this.type == "term"){
						//get schema
						var schm = '';
						for(var j=1;j<cmod.length;j++){
							if(cmod[j][1]==this.about){
								schm = cmod[j][3];
							}
						}
						
						//get data
						//this.filters = filters;
						//this.filters = filtmerge(this.branch, this.filters);
						this.targ = serverAPI(this.about, this.filters);
						//console.log(this.targ);
						serverRequest("GET", this.targ, [], '', function(headers, result, parent){
							//console.log(result);
							var res = ''
							var reslt = JSON.parse(result);
							var id = reslt.instances[0].id
							var res = "<div align='left'>";
							res += "<form class = 'action' >";
							res += "<input type='hidden' id='__actype' value='editterm'>";
							res += "<input type='hidden' id='__serverURI' value='" + 
										serverAPI(parent.about,[]) + "." + id + "'>";
							res += "<input type='hidden' id='__backURI' value='" + serverAPI(parent.about,[]) + "'>";
							res += "<input type='hidden' id='__id' value='" + id + "'>";
							res += "<input type='hidden' id='__type' value='" + parent.about + "'>";
							res += "id: " + id + "<br/>"
							for(var j=0;j<schm.length;j++){
								switch(schm[j][0]){
									case 'Text':
										res += schm[j][2] + ": <input type='text' id='" + 
										schm[j][1] + "' value = '" + reslt.instances[0][schm[j][1]] + 
										"' /><br />";
										break;
									case 'ForeignKey':
										console.log(schm[j]);
										break;
								}
							}
							res += "<div align = 'right'>"
							res += "<input type='submit' value='Submit This' " + 
										"onClick='processForm(this.parentNode.parentNode);return false;'>";
							res += "</div>";
							res += "</form>";
							res += "</div>";
							//console.log(res);
							parent.callback(1,res);
						}, null, this);
					}else if(this.type == "fcTp"){
						this.targ = serverAPI(this.about, this.filters);
						serverRequest("GET", targ, [], '', function(headers, result, parent){
							//console.log(result);
							
							resu = JSON.parse(result);
							
							//initialize vars
							var trms = [];
							var trmres = [];
							var trmsel = {};
							var editftcb = function(headers, result, parent){
								//console.log(result);
								
								res = ''
								var reslt = JSON.parse(result);
								
								trmres.push(reslt.instances);
								
								//construct dropdowns & form
								if(trms.length == trmres.length){
									//console.log(trmres);
									//loop through terms/results
									var res = '';
									var respo = '';
									var respr = "<div align='left'>";
									respr += "<form class = 'action' >";
									respr += "<input type='hidden' id='__actype' value='editfctp'>";
									respr += "<input type='hidden' id='__serverURI' value='" + 
												serverAPI(parent.about,[]) + "." + resu.instances[0].id + "'>";
									respr += "<input type='hidden' id='__backURI' value='" + 
												serverAPI(parent.about,[]) + "'>";
									console.log('editfctp backURI='+serverAPI(parent.about,[]));
									respr += "<input type='hidden' id='__id' value='" + resu.instances[0].id + "'>";
									respr += "<input type='hidden' id='__type' value='" + parent.about + "'>";
									
									for(var j=0;j<trms.length;j++){
										res = "<select id='" + trms[j] + "_id'>"
										//Loop through options
										for(var k=0;k<trmres[j].length;k++){
											//console.log(trmres[j][k]);
											res += "<option value='" + trmres[j][k].id + "'";
											//if current value, print selected
											if(resu.instances[0][trms[j] + '_id']==trmres[j][k].id){
												res += ' selected';
											}
											res += ">" + trmres[j][k].name + "</option>";
										}
										res += "</select>"
										trmsel[trms[j]] = res;
									}
									
									//console.log(JSON.stringify(trmsel));
									
									//merge dropdowns with verbs to create 'form'
									res = '';
									
									for(var j=0;j<parent.schema.length;j++){
										//console.log(parent.schema[j]);
										if(parent.schema[j][0]=='term'){
											res += trmsel[parent.schema[j][1]] + ' ';
										}else if(parent.schema[j][0]=='verb'){
											res += parent.schema[j][1] + ' ';
										}
									}										
									//console.log(res);
									
									//add submit button etc.
									respo += "<div align = 'right'>"

									respo += "<input type='submit' value='Submit This' " 	+
									"onClick='processForm(this.parentNode.parentNode);return false;'>";
									respo += "</div>";
									respo += "</form>";
									respo += "</div>"
									
									parent.callback(1, respr + res + respo);
								}
								
								//shoot off children
								
								//for(item in reslt.instances[0]){
									//alert([item,typeof(item),reslt.instances[0][item]])
								//	res += item + ": " + reslt.instances[0][item] + "<br/>"
									//could it have a child? yes, of course! a fact type for instance.
								//}
							}
							
							for(var j=0;j<parent.schema.length;j++){
								if(parent.schema[j][0]=='term'){
									trms.push(parent.schema[j][1]);
								}
							}
							//console.log(trms);
					
							//loop around terms
							for(var j=0;j<parent.schema.length;j++){
								if(parent.schema[j][0]=='term'){
									var tar = serverAPI(parent.schema[j][1], parent.filters);
									serverRequest("GET", tar, [], '', editftcb, null, parent);
								}else if(parent.schema[j][0]=='verb'){
								}
							}
						}, null, this);
					}
					break;
				case "del":
					//console.log(getTarg(this.ftree, this.loc, "del", 1), this.ftree, this.loc);
					
					var res = "<div align='left'>";
					res += "marked for deletion";
					res += "<div align = 'right'>";
					
					//make this a function
					res += "<form class = 'action' >";
					res += "<input type='hidden' id='__actype' value='del'>";
					res += "<input type='hidden' id='__serverURI' value='" + 
								serverAPI(this.about,[]) + "." + this.id + "'>";
					res += "<input type='hidden' id='__id' value='" + this.id + "'>";
					res += "<input type='hidden' id='__type' value='" + this.about + "'>";
					res += "<input type='hidden' id='__backURI' value='" + serverAPI(this.about,[]) + "'>";
					//console.log('del backURI='+serverAPI(this.about,[])+' this.about='+this.about, this.ftree);
					res += "<input type='submit' value='Confirm' " +
					"onClick='processForm(this.parentNode.parentNode);return false;'>";
					res += "</form>";
					
					res += "</div>";
					res += "</div>";
					this.callback(1,res);
					break;
			}
		}
	}
	
	this.callback = function(n, prod){
		this.data.push([n,prod]);
		//console.log(n,prod);
		if(this.data.length==this.items){
			//>sort'em
			this.data.sort(function(a,b){
				return a[0] - b[0];
			});
			
			//console.log(this.data);
			
			this.html = this.pre;
			for(var i=0;i<this.data.length;i++){
				this.html += this.data[i][1];
			}
			this.html += this.post;
			//console.log(this.html);
			this.objcb.callback(this.idx, this.html);
		}
	}
};

function processForm(forma){
	var action = $("#__actype", forma).val();
	var serverURI = $("#__serverURI", forma).val();
	var id = $("#__id", forma).val();
	var type = $("#__type", forma).val();
	var backURI = $("#__backURI", forma).val();
	
	//id and type (and half of actype) are not yet used. 
	//Should they be used instead of serverURI?
	
	switch(action){
		case 'editterm':
		case 'editfctp':
			editInst(forma,serverURI,backURI);
			break;
		case 'addterm':
		case 'addfctp':
			addInst(forma,serverURI,backURI);
			break;	
		case 'del':
			delInst(forma,serverURI,backURI);
			break;
	}
}

function delInst(forma,uri,backURI){
	this.backURI=backURI;
	serverRequest("DELETE", uri, [], '', function(headers, result, parent){
		location.hash = '#!' + backURI;
	}, 
	undefined, this)
	return false;
}

function editInst(forma,serverURI,backURI){
	this.backURI=backURI;
	//console.log(backURI);
	var inputs = $(":input:not(:submit)", forma);
	var obj = $.map(inputs, function(n, i){
		if(n.id.slice(0,2)!="__"){
			var o = {};
			o[n.id] = $(n).val();
			return o;
		}
	});
	console.log(JSON.stringify(obj));
	serverRequest("PUT", serverURI, [], JSON.stringify(obj), function(headers, result, parent){
		//console.log("succ!", result);
		location.hash = '#!' + backURI;
	}, 
	function(error){
		exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
	    msg = error.join('\n');
	    $( "#dialog-message" ).html( exc + msg );
	    $( "#dialog-message" ).dialog( "open" );
		//console.log("fale!", error);
	}, 
	this)
	return false;
}

function addInst(forma,uri,backURI){
	this.backURI=backURI;
	//console.log(uri);
	var inputs = $(":input:not(:submit)", forma);
	var obj = $.map(inputs, function(n, i){
		if(n.id.slice(0,2)!="__"){
			var o = {};
			o[n.id] = $(n).val();
			return o;
		}
	});
	//console.log(JSON.stringify(obj));
	serverRequest("POST", uri, [], JSON.stringify(obj), function(headers, result, parent){
		location.hash = '#!' + backURI;
	},
	function(error){
		exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
	    msg = error.join('\n');
	    $( "#dialog-message" ).html( exc + msg );
	    $( "#dialog-message" ).dialog( "open" );
		//console.log("fale!", error);
	}, this)
	return false;
}

//needs to somehow travel to the servurr...
function filtmerge(branch, fltrs){
	//filters = fltrs.__clone();
	var filters = jQuery.extend(true, [], fltrs);
	rootURI = '/data/' + branch[1][0];
	
	//filter -> API uri processing
	
	//append uri filters
	for(var i=1;i<branch[2].length;i++){
		if(branch[2][i][0] == 'filt'){
			if(branch[2][i][1][1][0] == undefined){ branch[2][i][1][1] = branch[1][0]; }
			//flts = flts + branch[2][i][1][2] + op[branch[2][i][1][0]] + branch[2][i][1][3] + ';';
			filters.push(branch[2][i][1]);
		}
	}
	return filters;
}

define("mylibs/drawDataUI", function(){});

ClientURIParser = objectThatDelegatesTo(OMeta, {
    "word": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            l;
        return (function() {
            l = this._many1((function() {
                return this._or((function() {
                    return this._apply("letter")
                }), (function() {
                    return (function() {
                        switch (this._apply('anything')) {
                        case "-":
                            return "-";
                        case "_":
                            return "_";
                        default:
                            throw fail
                        }
                    }).call(this)
                }))
            }));
            return l.join("")
        }).call(this)
    },
    "dgit": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            d;
        return (function() {
            d = OMeta._superApplyWithArgs(this, 'digit');
            return d.digitValue()
        }).call(this)
    },
    "nmbr": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            n, d;
        return this._or((function() {
            return (function() {
                n = this._apply("nmbr");
                d = this._apply("dgit");
                return ((n * (10)) + d)
            }).call(this)
        }), (function() {
            return this._apply("dgit")
        }))
    },
    "part": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            l;
        return (function() {
            l = this._many1((function() {
                return this._or((function() {
                    return this._apply("letter")
                }), (function() {
                    return this._apply("digit")
                }), (function() {
                    return (function() {
                        switch (this._apply('anything')) {
                        case "-":
                            return "-";
                        case "_":
                            return "_";
                        default:
                            throw fail
                        }
                    }).call(this)
                }))
            }));
            return l.join("")
        }).call(this)
    },
    "parm": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            t, o, f, v;
        return (function() {
            t = this._apply("part");
            f = this._or((function() {
                return (function() {
                    switch (this._apply('anything')) {
                    case ".":
                        return (function() {
                            ".";
                            o = this._apply("word");
                            return o
                        }).call(this);
                    default:
                        throw fail
                    }
                }).call(this)
            }), (function() {
                return (function() {
                    (f = t);
                    (t = []);
                    return f
                }).call(this)
            }));
            o = (function() {
                switch (this._apply('anything')) {
                case "=":
                    return (function() {
                        "=";
                        return "eq"
                    }).call(this);
                case "!":
                    return (function() {
                        this._applyWithArgs("exactly", "=");
                        "!=";
                        return "ne"
                    }).call(this);
                case "~":
                    return (function() {
                        "~";
                        return "lk"
                    }).call(this);
                default:
                    throw fail
                }
            }).call(this);
            v = this._apply("part");
            this._opt((function() {
                return (function() {
                    this._applyWithArgs("exactly", ";");
                    return ";"
                }).call(this)
            }));
            return [o, t, f, v]
        }).call(this)
    },
    "imod": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return (function() {
            switch (this._apply('anything')) {
            case "d":
                return (function() {
                    this._applyWithArgs("exactly", "e");
                    this._applyWithArgs("exactly", "l");
                    return "del"
                }).call(this);
            case "a":
                return (function() {
                    this._applyWithArgs("exactly", "d");
                    this._applyWithArgs("exactly", "d");
                    return "add"
                }).call(this);
            case "v":
                return (function() {
                    this._applyWithArgs("exactly", "i");
                    this._applyWithArgs("exactly", "e");
                    this._applyWithArgs("exactly", "w");
                    return "view"
                }).call(this);
            case "e":
                return (function() {
                    this._applyWithArgs("exactly", "d");
                    this._applyWithArgs("exactly", "i");
                    this._applyWithArgs("exactly", "t");
                    return "edit"
                }).call(this);
            default:
                throw fail
            }
        }).call(this)
    },
    "cmod": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return (function() {
            switch (this._apply('anything')) {
            case "d":
                return (function() {
                    this._applyWithArgs("exactly", "e");
                    this._applyWithArgs("exactly", "l");
                    return "del"
                }).call(this);
            case "f":
                return (function() {
                    this._applyWithArgs("exactly", "i");
                    this._applyWithArgs("exactly", "l");
                    this._applyWithArgs("exactly", "t");
                    return "filt"
                }).call(this);
            case "s":
                return (function() {
                    this._applyWithArgs("exactly", "o");
                    this._applyWithArgs("exactly", "r");
                    this._applyWithArgs("exactly", "t");
                    return "sort"
                }).call(this);
            default:
                throw fail
            }
        }).call(this)
    },
    "iact": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            a, p;
        return this._or((function() {
            return this._many1((function() {
                return (function() {
                    this._applyWithArgs("exactly", "*");
                    "*";
                    a = this._apply("imod");
                    p = this._or((function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case ":":
                                return (function() {
                                    ":";
                                    return this._many1((function() {
                                        return this._apply("parm")
                                    }))
                                }).call(this);
                            default:
                                throw fail
                            }
                        }).call(this)
                    }), (function() {
                        return []
                    }));
                    return [a].concat(p)
                }).call(this)
            }))
        }), (function() {
            return []
        }))
    },
    "cact": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            a, p;
        return this._or((function() {
            return this._many1((function() {
                return (function() {
                    this._applyWithArgs("exactly", "*");
                    "*";
                    a = this._apply("cmod");
                    p = this._or((function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case ":":
                                return (function() {
                                    ":";
                                    return this._many1((function() {
                                        return this._apply("parm")
                                    }))
                                }).call(this);
                            default:
                                throw fail
                            }
                        }).call(this)
                    }), (function() {
                        return []
                    }));
                    return [a].concat(p)
                }).call(this)
            }))
        }), (function() {
            return []
        }))
    },
    "cole": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            t, s;
        return (function() {
            t = this._apply("part");
            s = this._apply("cact");
            return [[t]].concat([
                ["mod"].concat(s)])
        }).call(this)
    },
    "inst": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            t, f, s;
        return this._or((function() {
            return (function() {
                t = this._apply("part");
                this._applyWithArgs("exactly", ".");
                ".";
                f = this._apply("word");
                s = this._apply("iact");
                return [[t, f]].concat([
                    ["mod"].concat([
                        ["filt", ["eq", [], "name", f]]
                    ]).concat(s)])
            }).call(this)
        }), (function() {
            return (function() {
                t = this._apply("part");
                this._applyWithArgs("exactly", ".");
                ".";
                f = this._apply("nmbr");
                s = this._apply("iact");
                return [[t, f]].concat([
                    ["mod"].concat([
                        ["filt", ["eq", [], "id", f]]
                    ]).concat(s)])
            }).call(this)
        }), (function() {
            return (function() {
                t = this._apply("part");
                s = this._apply("iact");
                return [[t]].concat([
                    ["mod"].concat(s)])
            }).call(this)
        }))
    },
    "frbd": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            f, g, r;
        return (function() {
            f = this._or((function() {
                return (function() {
                    this._opt((function() {
                        return (function() {
                            this._applyWithArgs("exactly", "/");
                            return "/"
                        }).call(this)
                    }));
                    f = this._apply("frag");
                    return [f]
                }).call(this)
            }), (function() {
                return (function() {
                    this._opt((function() {
                        return (function() {
                            this._applyWithArgs("exactly", "/");
                            return "/"
                        }).call(this)
                    }));
                    this._applyWithArgs("exactly", "(");
                    "(";
                    r = this._many1((function() {
                        return (function() {
                            g = this._apply("frag");
                            this._opt((function() {
                                return (function() {
                                    this._applyWithArgs("exactly", ",");
                                    return ","
                                }).call(this)
                            }));
                            return g
                        }).call(this)
                    }));
                    this._applyWithArgs("exactly", ")");
                    ")";
                    return r
                }).call(this)
            }), (function() {
                return (function() {
                    this._opt((function() {
                        return (function() {
                            this._applyWithArgs("exactly", "/");
                            return "/"
                        }).call(this)
                    }));
                    return []
                }).call(this)
            }));
            this._lookahead((function() {
                return this._or((function() {
                    return this._apply("end")
                }), (function() {
                    return (function() {
                        switch (this._apply('anything')) {
                        case "/":
                            return "/";
                        case ")":
                            return ")";
                        case ",":
                            return ",";
                        default:
                            throw fail
                        }
                    }).call(this)
                }))
            }));
            return f
        }).call(this)
    },
    "frag": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            w, f;
        return this._or((function() {
            return (function() {
                w = this._apply("cole");
                f = this._apply("frbd");
                return ["col"].concat(w.concat(f))
            }).call(this)
        }), (function() {
            return (function() {
                w = this._apply("inst");
                f = this._apply("frbd");
                return ["ins"].concat(w.concat(f))
            }).call(this)
        }))
    },
    "expr": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            f;
        return this._or((function() {
            return (function() {
                switch (this._apply('anything')) {
                case "#":
                    return (function() {
                        this._applyWithArgs("exactly", "!");
                        this._applyWithArgs("exactly", "/");
                        "#!/";
                        f = (function() {
                            f = this._apply("frag");
                            this._apply("end");
                            return f
                        }).call(this);
                        return ["uri", f]
                    }).call(this);
                default:
                    throw fail
                }
            }).call(this)
        }), (function() {
            return (function() {
                "";
                return []
            }).call(this)
        }))
    }
})

define("mylibs/ometa-code/ClientURIParser", function(){});

ClientURIUnparser = objectThatDelegatesTo(OMeta, {
    "word": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            l;
        return (function() {
            this._form((function() {
                return l = this._many1((function() {
                    return this._or((function() {
                        return this._apply("letter")
                    }), (function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case "-":
                                return "-";
                            case "_":
                                return "_";
                            default:
                                throw fail
                            }
                        }).call(this)
                    }))
                }))
            }));
            return l.join("")
        }).call(this)
    },
    "nmbr": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._apply("number")
    },
    "trans": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            t, a;
        return (function() {
            this._form((function() {
                return (function() {
                    t = this._apply("anything");
                    return a = this._applyWithArgs("apply", t)
                }).call(this)
            }));
            return a
        }).call(this)
    },
    "uri": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            t;
        return (function() {
            t = this._apply("trans");
            return ("#!/" + t)
        }).call(this)
    },
    "name": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            w, n, o;
        return this._or((function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        w = this._apply("word");
                        return n = this._apply("nmbr")
                    }).call(this)
                }));
                return ((w + ".") + n)
            }).call(this)
        }), (function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        w = this._apply("word");
                        return o = this._apply("word")
                    }).call(this)
                }));
                return ((w + ".") + o)
            }).call(this)
        }), (function() {
            return (function() {
                this._form((function() {
                    return w = this._apply("word")
                }));
                return w
            }).call(this)
        }))
    },
    "col": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            n, m, t, r;
        return this._or((function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                r = this._many1((function() {
                    return this._apply("trans")
                }));
                (t = [t].concat(r));
                return ((((n + m) + "/(") + t.join(",")) + ")")
            }).call(this)
        }), (function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                return (((n + m) + "/") + t)
            }).call(this)
        }), (function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                return (n + m)
            }).call(this)
        }))
    },
    "ins": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            n, m, t, r;
        return this._or((function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                r = this._many1((function() {
                    return this._apply("trans")
                }));
                (t = [t].concat(r));
                return ((((n + m) + "/(") + t.join(",")) + ")")
            }).call(this)
        }), (function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                return (((n + m) + "/") + t)
            }).call(this)
        }), (function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                return (n + m)
            }).call(this)
        }))
    },
    "mod": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            a;
        return this._or((function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "mod");
                        return a = this._many1((function() {
                            return this._apply("actn")
                        }))
                    }).call(this)
                }));
                return a.join("")
            }).call(this)
        }), (function() {
            return (function() {
                this._form((function() {
                    return this._applyWithArgs("exactly", "mod")
                }));
                return ""
            }).call(this)
        }))
    },
    "actn": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._or((function() {
            return this._apply("add")
        }), (function() {
            return this._apply("filt")
        }), (function() {
            return this._apply("del")
        }), (function() {
            return this._apply("edit")
        }))
    },
    "add": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return (function() {
            this._form((function() {
                return this._applyWithArgs("exactly", "add")
            }));
            return "*add"
        }).call(this)
    },
    "del": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return (function() {
            this._form((function() {
                return this._applyWithArgs("exactly", "del")
            }));
            return "*del"
        }).call(this)
    },
    "edit": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return (function() {
            this._form((function() {
                return this._applyWithArgs("exactly", "edit")
            }));
            return "*edit"
        }).call(this)
    },
    "filt": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            o;
        return this._or((function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "filt");
                        return o = this._apply("eqi")
                    }).call(this)
                }));
                return ""
            }).call(this)
        }), (function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "filt");
                        return o = this._many((function() {
                            return this._apply("op")
                        }))
                    }).call(this)
                }));
                return ("*filt:" + o)
            }).call(this)
        }))
    },
    "op": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._or((function() {
            return this._apply("eq")
        }), (function() {
            return this._apply("ne")
        }), (function() {
            return this._apply("lk")
        }))
    },
    "eqi": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._or((function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "eq");
                        this._or((function() {
                            return this._form((function() {
                                return undefined
                            }))
                        }), (function() {
                            return this._apply("word")
                        }));
                        this._applyWithArgs("exactly", "id");
                        return this._apply("nmbr")
                    }).call(this)
                }));
                return ""
            }).call(this)
        }), (function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "eq");
                        this._or((function() {
                            return this._form((function() {
                                return undefined
                            }))
                        }), (function() {
                            return this._apply("word")
                        }));
                        this._applyWithArgs("exactly", "name");
                        return this._apply("word")
                    }).call(this)
                }));
                return ""
            }).call(this)
        }))
    },
    "eq": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._form((function() {
            return (function() {
                this._applyWithArgs("exactly", "eq");
                this._or((function() {
                    return this._form((function() {
                        return undefined
                    }))
                }), (function() {
                    return this._apply("word")
                }));
                this._apply("word");
                return this._or((function() {
                    return this._apply("word")
                }), (function() {
                    return this._apply("nmbr")
                }))
            }).call(this)
        }))
    },
    "ne": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._form((function() {
            return (function() {
                this._applyWithArgs("exactly", "ne");
                this._or((function() {
                    return this._form((function() {
                        return undefined
                    }))
                }), (function() {
                    return this._apply("word")
                }));
                this._apply("word");
                return this._or((function() {
                    return this._apply("word")
                }), (function() {
                    return this._apply("nmbr")
                }))
            }).call(this)
        }))
    },
    "lk": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._form((function() {
            return (function() {
                this._applyWithArgs("exactly", "lk");
                this._or((function() {
                    return this._form((function() {
                        return undefined
                    }))
                }), (function() {
                    return this._apply("word")
                }));
                this._apply("word");
                return this._or((function() {
                    return this._apply("word")
                }), (function() {
                    return this._apply("nmbr")
                }))
            }).call(this)
        }))
    }
})

define("mylibs/ometa-code/ClientURIUnparser", function(){});

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

/*
  This code is based in part on the work done in Ruby to support
  infection as part of Ruby on Rails in the ActiveSupport's Inflector
  and Inflections classes.  It was initally ported to Javascript by
  Ryan Schuft (ryan.schuft@gmail.com) in 2007.

  The code is available at http://code.google.com/p/inflection-js/

  The basic usage is:
    1. Include this script on your web page.
    2. Call functions on any String object in Javascript

  Currently implemented functions:

    String.pluralize(plural) == String
      renders a singular English language noun into its plural form
      normal results can be overridden by passing in an alternative

    String.singularize(singular) == String
      renders a plural English language noun into its singular form
      normal results can be overridden by passing in an alterative

    String.camelize(lowFirstLetter) == String
      renders a lower case underscored word into camel case
      the first letter of the result will be upper case unless you pass true
      also translates "/" into "::" (underscore does the opposite)

    String.underscore() == String
      renders a camel cased word into words seperated by underscores
      also translates "::" back into "/" (camelize does the opposite)

    String.humanize(lowFirstLetter) == String
      renders a lower case and underscored word into human readable form
      defaults to making the first letter capitalized unless you pass true

    String.capitalize() == String
      renders all characters to lower case and then makes the first upper

    String.dasherize() == String
      renders all underbars and spaces as dashes

    String.titleize() == String
      renders words into title casing (as for book titles)

    String.demodulize() == String
      renders class names that are prepended by modules into just the class

    String.tableize() == String
      renders camel cased singular words into their underscored plural form

    String.classify() == String
      renders an underscored plural word into its camel cased singular form

    String.foreign_key(dropIdUbar) == String
      renders a class name (camel cased singular noun) into a foreign key
      defaults to seperating the class from the id with an underbar unless
      you pass true

    String.ordinalize() == String
      renders all numbers found in the string into their sequence like "22nd"
*/

/*
  This sets up a container for some constants in its own namespace
  We use the window (if available) to enable dynamic loading of this script
  Window won't necessarily exist for non-browsers.
*/
if (window && !window.InflectionJS)
{
    window.InflectionJS = null;
}

/*
  This sets up some constants for later use
  This should use the window namespace variable if available
*/
InflectionJS =
{
    /*
      This is a list of nouns that use the same form for both singular and plural.
      This list should remain entirely in lower case to correctly match Strings.
    */
    uncountable_words: [
        'equipment', 'information', 'rice', 'money', 'species', 'series',
        'fish', 'sheep', 'moose', 'deer', 'news'
    ],

    /*
      These rules translate from the singular form of a noun to its plural form.
    */
    plural_rules: [
        [new RegExp('(m)an$', 'gi'),                 '$1en'],
        [new RegExp('(pe)rson$', 'gi'),              '$1ople'],
        [new RegExp('(child)$', 'gi'),               '$1ren'],
        [new RegExp('^(ox)$', 'gi'),                 '$1en'],
        [new RegExp('(ax|test)is$', 'gi'),           '$1es'],
        [new RegExp('(octop|vir)us$', 'gi'),         '$1i'],
        [new RegExp('(alias|status)$', 'gi'),        '$1es'],
        [new RegExp('(bu)s$', 'gi'),                 '$1ses'],
        [new RegExp('(buffal|tomat|potat)o$', 'gi'), '$1oes'],
        [new RegExp('([ti])um$', 'gi'),              '$1a'],
        [new RegExp('sis$', 'gi'),                   'ses'],
        [new RegExp('(?:([^f])fe|([lr])f)$', 'gi'),  '$1$2ves'],
        [new RegExp('(hive)$', 'gi'),                '$1s'],
        [new RegExp('([^aeiouy]|qu)y$', 'gi'),       '$1ies'],
        [new RegExp('(x|ch|ss|sh)$', 'gi'),          '$1es'],
        [new RegExp('(matr|vert|ind)ix|ex$', 'gi'),  '$1ices'],
        [new RegExp('([m|l])ouse$', 'gi'),           '$1ice'],
        [new RegExp('(quiz)$', 'gi'),                '$1zes'],
        [new RegExp('s$', 'gi'),                     's'],
        [new RegExp('$', 'gi'),                      's']
    ],

    /*
      These rules translate from the plural form of a noun to its singular form.
    */
    singular_rules: [
        [new RegExp('(m)en$', 'gi'),                                                       '$1an'],
        [new RegExp('(pe)ople$', 'gi'),                                                    '$1rson'],
        [new RegExp('(child)ren$', 'gi'),                                                  '$1'],
        [new RegExp('([ti])a$', 'gi'),                                                     '$1um'],
        [new RegExp('((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$','gi'), '$1$2sis'],
        [new RegExp('(hive)s$', 'gi'),                                                     '$1'],
        [new RegExp('(tive)s$', 'gi'),                                                     '$1'],
        [new RegExp('(curve)s$', 'gi'),                                                    '$1'],
        [new RegExp('([lr])ves$', 'gi'),                                                   '$1f'],
        [new RegExp('([^fo])ves$', 'gi'),                                                  '$1fe'],
        [new RegExp('([^aeiouy]|qu)ies$', 'gi'),                                           '$1y'],
        [new RegExp('(s)eries$', 'gi'),                                                    '$1eries'],
        [new RegExp('(m)ovies$', 'gi'),                                                    '$1ovie'],
        [new RegExp('(x|ch|ss|sh)es$', 'gi'),                                              '$1'],
        [new RegExp('([m|l])ice$', 'gi'),                                                  '$1ouse'],
        [new RegExp('(bus)es$', 'gi'),                                                     '$1'],
        [new RegExp('(o)es$', 'gi'),                                                       '$1'],
        [new RegExp('(shoe)s$', 'gi'),                                                     '$1'],
        [new RegExp('(cris|ax|test)es$', 'gi'),                                            '$1is'],
        [new RegExp('(octop|vir)i$', 'gi'),                                                '$1us'],
        [new RegExp('(alias|status)es$', 'gi'),                                            '$1'],
        [new RegExp('^(ox)en', 'gi'),                                                      '$1'],
        [new RegExp('(vert|ind)ices$', 'gi'),                                              '$1ex'],
        [new RegExp('(matr)ices$', 'gi'),                                                  '$1ix'],
        [new RegExp('(quiz)zes$', 'gi'),                                                   '$1'],
        [new RegExp('s$', 'gi'),                                                           '']
    ],

    /*
      This is a list of words that should not be capitalized for title case
    */
    non_titlecased_words: [
        'and', 'or', 'nor', 'a', 'an', 'the', 'so', 'but', 'to', 'of', 'at',
        'by', 'from', 'into', 'on', 'onto', 'off', 'out', 'in', 'over',
        'with', 'for'
    ],

    /*
      These are regular expressions used for converting between String formats
    */
    id_suffix: new RegExp('(_ids|_id)$', 'g'),
    underbar: new RegExp('_', 'g'),
    space_or_underbar: new RegExp('[\ _]', 'g'),
    uppercase: new RegExp('([A-Z])', 'g'),
    underbar_prefix: new RegExp('^_'),
    
    /*
      This is a helper method that applies rules based replacement to a String
      Signature:
        InflectionJS.apply_rules(str, rules, skip, override) == String
      Arguments:
        str - String - String to modify and return based on the passed rules
        rules - Array: [RegExp, String] - Regexp to match paired with String to use for replacement
        skip - Array: [String] - Strings to skip if they match
        override - String (optional) - String to return as though this method succeeded (used to conform to APIs)
      Returns:
        String - passed String modified by passed rules
      Examples:
        InflectionJS.apply_rules("cows", InflectionJs.singular_rules) === 'cow'
    */
    apply_rules: function(str, rules, skip, override)
    {
        if (override)
        {
            str = override;
        }
        else
        {
            var ignore = (skip.indexOf(str.toLowerCase()) > -1);
            if (!ignore)
            {
                for (var x = 0; x < rules.length; x++)
                {
                    if (str.match(rules[x][0]))
                    {
                        str = str.replace(rules[x][0], rules[x][1]);
                        break;
                    }
                }
            }
        }
        return str;
    }
};

/*
  This lets us detect if an Array contains a given element
  Signature:
    Array.indexOf(item, fromIndex, compareFunc) == Integer
  Arguments:
    item - Object - object to locate in the Array
    fromIndex - Integer (optional) - starts checking from this position in the Array
    compareFunc - Function (optional) - function used to compare Array item vs passed item
  Returns:
    Integer - index position in the Array of the passed item
  Examples:
    ['hi','there'].indexOf("guys") === -1
    ['hi','there'].indexOf("hi") === 0
*/
if (!Array.prototype.indexOf)
{
    Array.prototype.indexOf = function(item, fromIndex, compareFunc)
    {
        if (!fromIndex)
        {
            fromIndex = -1;
        }
        var index = -1;
        for (var i = fromIndex; i < this.length; i++)
        {
            if (this[i] === item || compareFunc && compareFunc(this[i], item))
            {
                index = i;
                break;
            }
        }
        return index;
    };
}

/*
  You can override this list for all Strings or just one depending on if you
  set the new values on prototype or on a given String instance.
*/
if (!String.prototype._uncountable_words)
{
    String.prototype._uncountable_words = InflectionJS.uncountable_words;
}

/*
  You can override this list for all Strings or just one depending on if you
  set the new values on prototype or on a given String instance.
*/
if (!String.prototype._plural_rules)
{
    String.prototype._plural_rules = InflectionJS.plural_rules;
}

/*
  You can override this list for all Strings or just one depending on if you
  set the new values on prototype or on a given String instance.
*/
if (!String.prototype._singular_rules)
{
    String.prototype._singular_rules = InflectionJS.singular_rules;
}

/*
  You can override this list for all Strings or just one depending on if you
  set the new values on prototype or on a given String instance.
*/
if (!String.prototype._non_titlecased_words)
{
    String.prototype._non_titlecased_words = InflectionJS.non_titlecased_words;
}

/*
  This function adds plurilization support to every String object
    Signature:
      String.pluralize(plural) == String
    Arguments:
      plural - String (optional) - overrides normal output with said String
    Returns:
      String - singular English language nouns are returned in plural form
    Examples:
      "person".pluralize() == "people"
      "octopus".pluralize() == "octopi"
      "Hat".pluralize() == "Hats"
      "person".pluralize("guys") == "guys"
*/
if (!String.prototype.pluralize)
{
    String.prototype.pluralize = function(plural)
    {
        return InflectionJS.apply_rules(
            this.toString(),
            this._plural_rules,
            this._uncountable_words,
            plural
        );
    };
}

/*
  This function adds singularization support to every String object
    Signature:
      String.singularize(singular) == String
    Arguments:
      singular - String (optional) - overrides normal output with said String
    Returns:
      String - plural English language nouns are returned in singular form
    Examples:
      "people".singularize() == "person"
      "octopi".singularize() == "octopus"
      "Hats".singularize() == "Hat"
      "guys".singularize("person") == "person"
*/
if (!String.prototype.singularize)
{
    String.prototype.singularize = function(singular)
    {
        return InflectionJS.apply_rules(
            this.toString(),
            this._singular_rules,
            this._uncountable_words,
            singular
        );
    };
}

/*
  This function adds camelization support to every String object
    Signature:
      String.camelize(lowFirstLetter) == String
    Arguments:
      lowFirstLetter - boolean (optional) - default is to capitalize the first
        letter of the results... passing true will lowercase it
    Returns:
      String - lower case underscored words will be returned in camel case
        additionally '/' is translated to '::'
    Examples:
      "message_properties".camelize() == "MessageProperties"
      "message_properties".camelize(true) == "messageProperties"
*/
if (!String.prototype.camelize)
{
     String.prototype.camelize = function(lowFirstLetter)
     {
        var str = this.toLowerCase();
        var str_path = str.split('/');
        for (var i = 0; i < str_path.length; i++)
        {
            var str_arr = str_path[i].split('_');
            var initX = ((lowFirstLetter && i + 1 === str_path.length) ? (1) : (0));
            for (var x = initX; x < str_arr.length; x++)
            {
                str_arr[x] = str_arr[x].charAt(0).toUpperCase() + str_arr[x].substring(1);
            }
            str_path[i] = str_arr.join('');
        }
        str = str_path.join('::');
        return str;
    };
}

/*
  This function adds underscore support to every String object
    Signature:
      String.underscore() == String
    Arguments:
      N/A
    Returns:
      String - camel cased words are returned as lower cased and underscored
        additionally '::' is translated to '/'
    Examples:
      "MessageProperties".camelize() == "message_properties"
      "messageProperties".underscore() == "message_properties"
*/
if (!String.prototype.underscore)
{
     String.prototype.underscore = function()
     {
        var str = this;
        var str_path = str.split('::');
        for (var i = 0; i < str_path.length; i++)
        {
            str_path[i] = str_path[i].replace(InflectionJS.uppercase, '_$1');
            str_path[i] = str_path[i].replace(InflectionJS.underbar_prefix, '');
        }
        str = str_path.join('/').toLowerCase();
        return str;
    };
}

/*
  This function adds humanize support to every String object
    Signature:
      String.humanize(lowFirstLetter) == String
    Arguments:
      lowFirstLetter - boolean (optional) - default is to capitalize the first
        letter of the results... passing true will lowercase it
    Returns:
      String - lower case underscored words will be returned in humanized form
    Examples:
      "message_properties".humanize() == "Message properties"
      "message_properties".humanize(true) == "message properties"
*/
if (!String.prototype.humanize)
{
    String.prototype.humanize = function(lowFirstLetter)
    {
        var str = this.toLowerCase();
        str = str.replace(InflectionJS.id_suffix, '');
        str = str.replace(InflectionJS.underbar, ' ');
        if (!lowFirstLetter)
        {
            str = str.capitalize();
        }
        return str;
    };
}

/*
  This function adds capitalization support to every String object
    Signature:
      String.capitalize() == String
    Arguments:
      N/A
    Returns:
      String - all characters will be lower case and the first will be upper
    Examples:
      "message_properties".capitalize() == "Message_properties"
      "message properties".capitalize() == "Message properties"
*/
if (!String.prototype.capitalize)
{
    String.prototype.capitalize = function()
    {
        var str = this.toLowerCase();
        str = str.substring(0, 1).toUpperCase() + str.substring(1);
        return str;
    };
}

/*
  This function adds dasherization support to every String object
    Signature:
      String.dasherize() == String
    Arguments:
      N/A
    Returns:
      String - replaces all spaces or underbars with dashes
    Examples:
      "message_properties".capitalize() == "message-properties"
      "Message Properties".capitalize() == "Message-Properties"
*/
if (!String.prototype.dasherize)
{
    String.prototype.dasherize = function()
    {
        var str = this;
        str = str.replace(InflectionJS.space_or_underbar, '-');
        return str;
    };
}

/*
  This function adds titleize support to every String object
    Signature:
      String.titleize() == String
    Arguments:
      N/A
    Returns:
      String - capitalizes words as you would for a book title
    Examples:
      "message_properties".titleize() == "Message Properties"
      "message properties to keep".titleize() == "Message Properties to Keep"
*/
if (!String.prototype.titleize)
{
    String.prototype.titleize = function()
    {
        var str = this.toLowerCase();
        str = str.replace(InflectionJS.underbar, ' ');
        var str_arr = str.split(' ');
        for (var x = 0; x < str_arr.length; x++)
        {
            var d = str_arr[x].split('-');
            for (var i = 0; i < d.length; i++)
            {
                if (this._non_titlecased_words.indexOf(d[i].toLowerCase()) < 0)
                {
                    d[i] = d[i].capitalize();
                }
            }
            str_arr[x] = d.join('-');
        }
        str = str_arr.join(' ');
        str = str.substring(0, 1).toUpperCase() + str.substring(1);
        return str;
    };
}

/*
  This function adds demodulize support to every String object
    Signature:
      String.demodulize() == String
    Arguments:
      N/A
    Returns:
      String - removes module names leaving only class names (Ruby style)
    Examples:
      "Message::Bus::Properties".demodulize() == "Properties"
*/
if (!String.prototype.demodulize)
{
    String.prototype.demodulize = function()
    {
        var str = this;
        var str_arr = str.split('::');
        str = str_arr[str_arr.length - 1];
        return str;
    };
}

/*
  This function adds tableize support to every String object
    Signature:
      String.tableize() == String
    Arguments:
      N/A
    Returns:
      String - renders camel cased words into their underscored plural form
    Examples:
      "MessageBusProperty".tableize() == "message_bus_properties"
*/
if (!String.prototype.tableize)
{
    String.prototype.tableize = function()
    {
        var str = this;
        str = str.underscore().pluralize();
        return str;
    };
}

/*
  This function adds classification support to every String object
    Signature:
      String.classify() == String
    Arguments:
      N/A
    Returns:
      String - underscored plural nouns become the camel cased singular form
    Examples:
      "message_bus_properties".classify() == "MessageBusProperty"
*/
if (!String.prototype.classify)
{
    String.prototype.classify = function()
    {
        var str = this;
        str = str.camelize().singularize();
        return str;
    };
}

/*
  This function adds foreign key support to every String object
    Signature:
      String.foreign_key(dropIdUbar) == String
    Arguments:
      dropIdUbar - boolean (optional) - default is to seperate id with an
        underbar at the end of the class name, you can pass true to skip it
    Returns:
      String - camel cased singular class names become underscored with id
    Examples:
      "MessageBusProperty".foreign_key() == "message_bus_property_id"
      "MessageBusProperty".foreign_key(true) == "message_bus_propertyid"
*/
if (!String.prototype.foreign_key)
{
    String.prototype.foreign_key = function(dropIdUbar)
    {
        var str = this;
        str = str.demodulize().underscore() + ((dropIdUbar) ? ('') : ('_')) + 'id';
        return str;
    };
}

/*
  This function adds ordinalize support to every String object
    Signature:
      String.ordinalize() == String
    Arguments:
      N/A
    Returns:
      String - renders all found numbers their sequence like "22nd"
    Examples:
      "the 1 pitch".ordinalize() == "the 1st pitch"
*/
if (!String.prototype.ordinalize)
{
    String.prototype.ordinalize = function()
    {
        var str = this;
        var str_arr = str.split(' ');
        for (var x = 0; x < str_arr.length; x++)
        {
            var i = parseInt(str_arr[x]);
            if (i === NaN)
            {
                var ltd = str_arr[x].substring(str_arr[x].length - 2);
                var ld = str_arr[x].substring(str_arr[x].length - 1);
                var suf = "th";
                if (ltd != "11" && ltd != "12" && ltd != "13")
                {
                    if (ld === "1")
                    {
                        suf = "st";
                    }
                    else if (ld === "2")
                    {
                        suf = "nd";
                    }
                    else if (ld === "3")
                    {
                        suf = "rd";
                    }
                }
                str_arr[x] += suf;
            }
        }
        str = str_arr.join(' ');
        return str;
    };
}

define("mylibs/inflection", function(){});

{
    SBVRParser = objectThatDelegatesTo(OMeta, {
        "isTerm": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._pred(this._isTerm(x))
        },
        "isVerb": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._pred(this._isVerb(x))
        },
        "isFctp": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._pred(this._isFctp(x))
        },
        "findVar": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this["ruleVars"][x[(1)]]
        },
        "bind": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                y;
            return (function() {
                y = this._applyWithArgs("findVar", x);
                return ["bind", x, y]
            }).call(this)
        },
        "letters": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            return (function() {
                l = this._many1((function() {
                    return this._apply("letter")
                }));
                return l.join("")
            }).call(this)
        },
        "num": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            return this._or((function() {
                return (function() {
                    this._apply("spaces");
                    n = this._many1((function() {
                        return this._apply("digit")
                    }));
                    return ["num", parseInt(n.join(""))]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("token", "one");
                    return ["num", (1)]
                }).call(this)
            }))
        },
        "toEOL": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                w;
            return (function() {
                this._apply("spaces");
                w = this._many((function() {
                    return (function() {
                        this._not((function() {
                            return (function() {
                                this._apply("spaces");
                                return this._apply("lineStart")
                            }).call(this)
                        }));
                        return this._apply("anything")
                    }).call(this)
                }));
                return w.join("")
            }).call(this)
        },
        "token": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                s;
            return (function() {
                this._apply("spaces");
                s = this._applyWithArgs("seq", x);
                this._lookahead((function() {
                    return this._many1((function() {
                        return this._apply("space")
                    }))
                }));
                return s
            }).call(this)
        },
        "addTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            return (function() {
                t = this._lookahead((function() {
                    return this._many1((function() {
                        return this._apply("termPart")
                    }))
                }));
                (this["possMap"]["term"][t.join(" ")] = true);
                return this._apply("term")
            }).call(this)
        },
        "term": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            return (function() {
                t = this._apply("termPart");
                (x = ((x == undefined) ? t : [x, t].join(" ")));
                return this._or((function() {
                    return this._applyWithArgs("term", x)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("isTerm", x);
                        return ["term", this._termForm(x)]
                    }).call(this)
                }))
            }).call(this)
        },
        "termPart": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                this._apply("spaces");
                this._not((function() {
                    return this._apply("lineStart")
                }));
                return this._apply("letters")
            }).call(this)
        },
        "addVerb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v;
            return (function() {
                v = this._lookahead((function() {
                    return this._many1((function() {
                        return this._apply("verbPart")
                    }))
                }));
                (this["possMap"]["verb"][v.join(" ")] = true);
                return this._apply("verb")
            }).call(this)
        },
        "verb": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                v;
            return (function() {
                v = this._apply("verbPart");
                (x = ((x == undefined) ? v : [x, v].join(" ")));
                return this._or((function() {
                    return this._applyWithArgs("verb", x)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("isVerb", x);
                        return ["verb", this._verbForm(x)]
                    }).call(this)
                }))
            }).call(this)
        },
        "verbPart": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                this._apply("spaces");
                this._not((function() {
                    return this._apply("lineStart")
                }));
                this._not((function() {
                    return this._apply("term")
                }));
                return this._apply("letters")
            }).call(this)
        },
        "joinQuant": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("matchForAll", "keyword", ["and", "at", "most"])
        },
        "quant": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n, m;
            return this._or((function() {
                return (function() {
                    this._applyWithArgs("keyword", "each");
                    return ["univQ"]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("matchForAny", "keyword", ["a", "an", "some"]);
                    return ["existQ"]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("matchForAll", "keyword", ["at", "most"]);
                    n = this._apply("num");
                    return ["atMostQ", ["maxCard", n]]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("matchForAll", "keyword", ["at", "least"]);
                    n = this._apply("num");
                    return this._or((function() {
                        return (function() {
                            this._apply("joinQuant");
                            m = this._apply("num");
                            return ["numRngQ", ["minCard", n], ["maxCard", m]]
                        }).call(this)
                    }), (function() {
                        return (function() {
                            this._apply("empty");
                            return ["atLeastQ", ["minCard", n]]
                        }).call(this)
                    }))
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("matchForAll", "keyword", ["more", "than"]);
                    n = this._apply("num");
                    ++n[(1)];
                    return ["atLeastQ", ["minCard", n]]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("keyword", "exactly");
                    n = this._apply("num");
                    return ["exactQ", ["card", n]]
                }).call(this)
            }))
        },
        "keyword": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("token", x)
        },
        "adVar": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                v, q;
            return (function() {
                (this["ruleVars"][x[(1)]] = this["ruleVarsCount"]++);
                v = ["var", ["num", this["ruleVars"][x[(1)]]], x];
                this._opt((function() {
                    return (function() {
                        this._applyWithArgs("keyword", "that");
                        q = this._or((function() {
                            return (function() {
                                this._applyWithArgs("keyword", "the");
                                return this._applyWithArgs("terbRi", [
                                    []
                                ], x)
                            }).call(this)
                        }), (function() {
                            return this._applyWithArgs("qTerbRi", [
                                []
                            ], x)
                        }));
                        return v.push(q)
                    }).call(this)
                }));
                return v
            }).call(this)
        },
        "atfo": function(c) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                this._applyWithArgs("isFctp", c[(0)]);
                (c[(0)] = ["fcTp"].concat(c[(0)]));
                return ["aFrm"].concat(c)
            }).call(this)
        },
        "terbRi": function(c, i) {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, v, b;
            return (function() {
                t = this._apply("term");
                v = this._apply("verb");
                b = this._applyWithArgs("bind", t);
                (function() {
                    c[(0)].push(t, v);
                    return c.push(b)
                }).call(this);
                return this._applyWithArgs("qTerbRi", c, i)
            }).call(this)
        },
        "qTerbRi": function(c, i) {
            var $elf = this,
                _fromIdx = this.input.idx,
                q, t, a, v, b, r;
            return this._or((function() {
                return (function() {
                    q = this._apply("quant");
                    t = this._apply("term");
                    a = this._applyWithArgs("adVar", t);
                    v = this._apply("verb");
                    b = this._applyWithArgs("bind", t);
                    (function() {
                        q.push(a);
                        c[(0)].push(t, v);
                        return c.push(b)
                    }).call(this);
                    r = this._applyWithArgs("qTerbRi", c, i);
                    return q.concat([r])
                }).call(this)
            }), (function() {
                return (function() {
                    v = this._apply("verb");
                    b = this._applyWithArgs("bind", i);
                    (function() {
                        c[(0)].push(i, v);
                        return c.push(b)
                    }).call(this);
                    return this._or((function() {
                        return this._applyWithArgs("atfo", c)
                    }), (function() {
                        return this._applyWithArgs("qTerbR", c)
                    }), (function() {
                        return this._applyWithArgs("qTerm", c)
                    }))
                }).call(this)
            }), (function() {
                return (function() {
                    b = this._applyWithArgs("bind", i);
                    (function() {
                        c[(0)].push(i);
                        return c.push(b)
                    }).call(this);
                    return this._applyWithArgs("atfo", c)
                }).call(this)
            }))
        },
        "qTerm": function(c) {
            var $elf = this,
                _fromIdx = this.input.idx,
                q, t, a, b, r;
            return (function() {
                q = this._apply("quant");
                t = this._apply("term");
                a = this._applyWithArgs("adVar", t);
                b = this._applyWithArgs("bind", t);
                (function() {
                    q.push(a);
                    c[(0)].push(t);
                    return c.push(b)
                }).call(this);
                r = this._applyWithArgs("atfo", c);
                return q.concat([r])
            }).call(this)
        },
        "qTerbR": function(c) {
            var $elf = this,
                _fromIdx = this.input.idx,
                q, t, a, v, b, r;
            return (function() {
                q = this._apply("quant");
                t = this._apply("term");
                a = this._applyWithArgs("adVar", t);
                v = this._apply("verb");
                b = this._applyWithArgs("bind", t);
                (function() {
                    q.push(a);
                    c[(0)].push(t, v);
                    return c.push(b)
                }).call(this);
                r = this._or((function() {
                    return this._applyWithArgs("atfo", c)
                }), (function() {
                    return this._applyWithArgs("qTerbR", c)
                }), (function() {
                    return this._applyWithArgs("qTerm", c)
                }));
                return q.concat([r])
            }).call(this)
        },
        "modRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                r;
            return (function() {
                this._applyWithArgs("token", "It");
                this._applyWithArgs("token", "is");
                r = this._or((function() {
                    return (function() {
                        this._applyWithArgs("token", "obligatory");
                        return ["obl"]
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("token", "necessary");
                        return ["nec"]
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("token", "prohibited");
                        return ["obl", ["neg"]]
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("token", "impossible");
                        return ["nec", ["neg"]]
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("token", "not");
                        this._applyWithArgs("token", "possible");
                        return ["nec", ["neg"]]
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("token", "possible");
                        return ["pos"]
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("token", "permissible");
                        return ["prm"]
                    }).call(this)
                }));
                this._applyWithArgs("token", "that");
                return r
            }).call(this)
        },
        "startRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("token", "R:")
        },
        "newRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                ruleText, r, q;
            return (function() {
                this._apply("startRule");
                this._apply("spaces");
                ruleText = this._lookahead((function() {
                    return this._many((function() {
                        return (function() {
                            this._not((function() {
                                return (function() {
                                    this._apply("spaces");
                                    return this._apply("lineStart")
                                }).call(this)
                            }));
                            return this._apply("char")
                        }).call(this)
                    }))
                }));
                (this["ruleVarsCount"] = (1));
                r = this._apply("modRule");
                q = this._applyWithArgs("qTerbR", [
                    []
                ]);
                ((r["length"] == (2)) ? (r[(1)][(1)] = q) : (r[(1)] = q));
                return ["rule", r, ["text", ruleText.join("")]]
            }).call(this)
        },
        "terb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, v;
            return (function() {
                t = this._apply("term");
                v = this._apply("addVerb");
                return [t, v]
            }).call(this)
        },
        "startFactType": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("token", "F:")
        },
        "newFactType": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, b, e;
            return (function() {
                this._apply("startFactType");
                t = [];
                this._many1((function() {
                    return (function() {
                        b = this._apply("terb");
                        return t = t.concat(b)
                    }).call(this)
                }));
                this._opt((function() {
                    return (function() {
                        e = this._apply("term");
                        return t.push(e)
                    }).call(this)
                }));
                (this["fctps"][t] = true);
                return ["fcTp"].concat(t)
            }).call(this)
        },
        "startTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("token", "T:")
        },
        "newTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            return (function() {
                this._apply("startTerm");
                t = this._apply("addTerm");
                t.push([]);
                return t
            }).call(this)
        },
        "attribute": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                attrName, attrVal;
            return (function() {
                this._pred((this["lines"][(this["lines"]["length"] - (1))][(0)] == "term"));
                attrName = this._apply("allowedAttrs");
                this._applyWithArgs("exactly", ":");
                attrVal = this._apply("toEOL");
                return (function() {
                    var lastLine = this["lines"].pop();
                    lastLine[(2)].push([attrName.replace(new RegExp(" ", "g"), ""), attrVal]);
                    return lastLine
                }).call(this)
            }).call(this)
        },
        "allowedAttrs": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("matchForAny", "seq", this["possMap"]["allowedAttrs"])
        },
        "lineStart": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._apply("startTerm")
            }), (function() {
                return this._apply("startFactType")
            }), (function() {
                return this._apply("startRule")
            }), (function() {
                return (function() {
                    this._apply("allowedAttrs");
                    return this._applyWithArgs("exactly", ":")
                }).call(this)
            }))
        },
        "line": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            return (function() {
                this._apply("spaces");
                l = this._or((function() {
                    return this._apply("newTerm")
                }), (function() {
                    return this._apply("newFactType")
                }), (function() {
                    return this._apply("newRule")
                }), (function() {
                    return this._apply("attribute")
                }));
                this._apply("spaces");
                this["lines"].push(l);
                return l
            }).call(this)
        },
        "expr": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                this._many((function() {
                    return this._apply("line")
                }));
                return this["lines"]
            }).call(this)
        }
    });
    (SBVRParser["keyTokens"] = ["startTerm", "startFactType", "startRule", "term", "modRule", "verb", "keyword", "allowedAttrs", "num"]);
    (SBVRParser["initialize"] = (function() {
        this.reset()
    }));
    (SBVRParser["_isTerm"] = (function(k) {
        return (this["possMap"]["term"].hasOwnProperty(k) || this["possMap"]["term"].hasOwnProperty(k.singularize()))
    }));
    (SBVRParser["_termForm"] = (function(k) {
        return (this["possMap"]["term"].hasOwnProperty(k.singularize()) ? k.singularize() : k)
    }));
    (SBVRParser["_isVerb"] = (function(k) {
        if (this["possMap"]["verb"].hasOwnProperty(k)) {
            return true
        } else {
            if (((k.slice((0), (3)) == "are") && this["possMap"]["verb"].hasOwnProperty(("is" + k.slice((3)))))) {
                return true
            } else {
                if (((k == "have") && this["possMap"]["verb"].hasOwnProperty("has"))) {
                    return true
                } else {
                    return false
                }
            }
        }
    }));
    (SBVRParser["_verbForm"] = (function(k) {
        if (((k.slice((0), (3)) == "are") && this["possMap"]["verb"].hasOwnProperty(("is" + k.slice((3)))))) {
            return ("is" + k.slice((3)))
        } else {
            if (((k == "have") && this["possMap"]["verb"].hasOwnProperty("has"))) {
                return "has"
            } else {
                return k
            }
        }
    }));
    (SBVRParser["_isFctp"] = (function(k) {
        return this["fctps"].hasOwnProperty(k)
    }));
    (SBVRParser["reset"] = (function() {
        (this["possMap"] = ({
            "startTerm": ["T:"],
            "startFactType": ["F:"],
            "startRule": ["R:"],
            "term": ({}),
            "verb": ({}),
            "allowedAttrs": ["Concept Type", "Database ID Field", "Database Name Field", "Database Table Name", "Definition", "Dictionary Basis", "Example", "General Concept", "Namespace URI", "Necessity", "Note", "Possibility", "Reference Scheme", "See", "Source", "Subject Field", "Synonymous Form", "Synonym"],
            "modRule": ["It is obligatory that", "It is necessary that", "It is prohibited that", "It is impossible that", "It is not possible that", "It is possible that", "It is permissible that"],
            "quant": ["each", "a", "an", "some", "at most", "at least", "more than", "exactly"],
            "joinQuant": ["and at most"],
            "num": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "one"]
        }));
        (this["fctps"] = ({}));
        (this["ruleVars"] = ({}));
        (this["ruleVarsCount"] = (0));
        (this["lines"] = ["model"])
    }));
    (SBVRParser["equals"] = (function(compareTo) {
        if ((this["possMap"]["verb"]["length"] != compareTo["possMap"]["verb"]["length"])) {
            return false
        } else {
            undefined
        };
        for (var i = (this["possMap"]["verb"]["length"] - (1));
        (i >= (0)); i--) {
            if ((this["possMap"]["verb"][i] != compareTo["possMap"]["verb"]["length"])) {
                return false
            } else {
                undefined
            }
        };
        for (var x = undefined in this["possMap"]["term"]) {
            if ((!compareTo["possMap"]["term"].hasOwnProperty(x))) {
                return false
            } else {
                undefined
            }
        };
        for (var x = undefined in compareTo["possMap"]["term"]) {
            if ((!this["possMap"]["term"].hasOwnProperty(x))) {
                return false
            } else {
                undefined
            }
        };
        return true
    }));
    (SBVRParser["matchForAny"] = (function(rule, arr) {
        var origInput = this["input"];
        for (var idx = (0);
        (idx < arr["length"]); idx++) {
            try {
                (this["input"] = origInput);
                return this["_applyWithArgs"].call(this, rule, arr[idx])
            } catch (f) {
                if ((f != fail)) {
                    console.log(f["stack"]);
                    throw f
                } else {
                    undefined
                }
            } finally {
                undefined
            }
        };
        throw fail
    }));
    (SBVRParser["matchForAll"] = (function(rule, arr) {
        var ret = undefined;
        for (var idx = (0);
        (idx < arr["length"]); idx++) {
            (ret = this["_applyWithArgs"].call(this, rule, arr[idx]))
        };
        return ret
    }))
}

define("mylibs/ometa-code/SBVRParser", function(){});

{
    Prettify = objectThatDelegatesTo(OMeta, {
        "elem": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                e;
            return (function() {
                this._form((function() {
                    return (function() {
                        this["d"]++;
                        e = this._many((function() {
                            return this._or((function() {
                                return this._apply("string")
                            }), (function() {
                                return this._apply("elem")
                            }), (function() {
                                return this._apply("number")
                            }))
                        }));
                        return (s = this.s(this["d"]--))
                    }).call(this)
                }));
                return (("[" + e.join((",\n" + s))) + "]")
            }).call(this)
        }
    });
    (Prettify["d"] = (1));
    (Prettify["s"] = (function(d) {
        (a = " ");
        for (var i = (0);
        (i < d); i++) {
            (a += "  ")
        };
        undefined;
        return a
    }))
}

define("mylibs/ometa-code/Prettify", function(){});

// All functions that need access to the editor's state live inside
// the CodeMirror function. Below that, at the bottom of the file,
// some utilities are defined.

// CodeMirror is the only global var we claim
var CodeMirror = (function() {
  // This is the function that produces an editor instance. It's
  // closure is used to store the editor state.
  function CodeMirror(place, givenOptions) {
    // Determine effective options based on given values and defaults.
    var options = {}, defaults = CodeMirror.defaults;
    for (var opt in defaults)
      if (defaults.hasOwnProperty(opt))
        options[opt] = (givenOptions && givenOptions.hasOwnProperty(opt) ? givenOptions : defaults)[opt];

    var targetDocument = options["document"];
    // The element in which the editor lives.
    var wrapper = targetDocument.createElement("div");
    wrapper.className = "CodeMirror";
    // This mess creates the base DOM structure for the editor.
    wrapper.innerHTML =
      '<div style="overflow: hidden; position: relative; width: 1px; height: 0px;">' + // Wraps and hides input textarea
        '<textarea style="position: absolute; width: 2px;" wrap="off"></textarea></div>' +
      '<div class="CodeMirror-scroll cm-s-' + options.theme + '">' +
        '<div style="position: relative">' + // Set to the height of the text, causes scrolling
          '<div style="position: absolute; height: 0; width: 0; overflow: hidden;"></div>' +
          '<div style="position: relative">' + // Moved around its parent to cover visible view
            '<div class="CodeMirror-gutter"><div class="CodeMirror-gutter-text"></div></div>' +
            // Provides positioning relative to (visible) text origin
            '<div class="CodeMirror-lines"><div style="position: relative">' +
              '<pre class="CodeMirror-cursor">&#160;</pre>' + // Absolutely positioned blinky cursor
              '<div></div>' + // This DIV contains the actual code
            '</div></div></div></div></div>';
    if (place.appendChild) place.appendChild(wrapper); else place(wrapper);
    // I've never seen more elegant code in my life.
    var inputDiv = wrapper.firstChild, input = inputDiv.firstChild,
        scroller = wrapper.lastChild, code = scroller.firstChild,
        measure = code.firstChild, mover = measure.nextSibling,
        gutter = mover.firstChild, gutterText = gutter.firstChild,
        lineSpace = gutter.nextSibling.firstChild,
        cursor = lineSpace.firstChild, lineDiv = cursor.nextSibling;
    if (options.tabindex != null) input.tabindex = options.tabindex;
    if (!options.gutter && !options.lineNumbers) gutter.style.display = "none";

    // Delayed object wrap timeouts, making sure only one is active. blinker holds an interval.
    var poll = new Delayed(), highlight = new Delayed(), blinker;

    // mode holds a mode API object. lines an array of Line objects
    // (see Line constructor), work an array of lines that should be
    // parsed, and history the undo history (instance of History
    // constructor).
    var mode, lines = [new Line("")], work, history = new History(), focused;
    loadMode();
    // The selection. These are always maintained to point at valid
    // positions. Inverted is used to remember that the user is
    // selecting bottom-to-top.
    var sel = {from: {line: 0, ch: 0}, to: {line: 0, ch: 0}, inverted: false};
    // Selection-related flags. shiftSelecting obviously tracks
    // whether the user is holding shift. reducedSelection is a hack
    // to get around the fact that we can't create inverted
    // selections. See below.
    var shiftSelecting, reducedSelection, lastDoubleClick;
    // Variables used by startOperation/endOperation to track what
    // happened during the operation.
    var updateInput, changes, textChanged, selectionChanged, leaveInputAlone;
    // Current visible range (may be bigger than the view window).
    var showingFrom = 0, showingTo = 0, lastHeight = 0, curKeyId = null;
    // editing will hold an object describing the things we put in the
    // textarea, to help figure out whether something changed.
    // bracketHighlighted is used to remember that a backet has been
    // marked.
    var editing, bracketHighlighted;
    // Tracks the maximum line length so that the horizontal scrollbar
    // can be kept static when scrolling.
    var maxLine = "", maxWidth;

    // Initialize the content.
    operation(function(){setValue(options.value || ""); updateInput = false;})();

    // Register our event handlers.
    connect(scroller, "mousedown", operation(onMouseDown));
    // Gecko browsers fire contextmenu *after* opening the menu, at
    // which point we can't mess with it anymore. Context menu is
    // handled in onMouseDown for Gecko.
    if (!gecko) connect(scroller, "contextmenu", onContextMenu);
    connect(code, "dblclick", operation(onDblClick));
    connect(scroller, "scroll", function() {updateDisplay([]); if (options.onScroll) options.onScroll(instance);});
    connect(window, "resize", function() {updateDisplay(true);});
    connect(input, "keyup", operation(onKeyUp));
    connect(input, "keydown", operation(onKeyDown));
    connect(input, "keypress", operation(onKeyPress));
    connect(input, "focus", onFocus);
    connect(input, "blur", onBlur);

    connect(scroller, "dragenter", e_stop);
    connect(scroller, "dragover", e_stop);
    connect(scroller, "drop", operation(onDrop));
    connect(scroller, "paste", function(){focusInput(); fastPoll();});
    connect(input, "paste", function(){fastPoll();});
    connect(input, "cut", function(){fastPoll();});
    
    // IE throws unspecified error in certain cases, when 
    // trying to access activeElement before onload
    var hasFocus; try { hasFocus = (targetDocument.activeElement == input); } catch(e) { }
    if (hasFocus) setTimeout(onFocus, 20);
    else onBlur();

    function isLine(l) {return l >= 0 && l < lines.length;}
    // The instance object that we'll return. Mostly calls out to
    // local functions in the CodeMirror function. Some do some extra
    // range checking and/or clipping. operation is used to wrap the
    // call so that changes it makes are tracked, and the display is
    // updated afterwards.
    var instance = {
      getValue: getValue,
      setValue: operation(setValue),
      getSelection: getSelection,
      replaceSelection: operation(replaceSelection),
      focus: function(){focusInput(); onFocus(); fastPoll();},
      setOption: function(option, value) {
        options[option] = value;
        if (option == "lineNumbers" || option == "gutter") gutterChanged();
        else if (option == "mode" || option == "indentUnit") loadMode();
        else if (option == "readOnly" && value == "nocursor") input.blur();
        else if (option == "theme") scroller.className = scroller.className.replace(/cm-s-\w+/, "cm-s-" + value);
      },
      getOption: function(option) {return options[option];},
      undo: operation(undo),
      redo: operation(redo),
      indentLine: operation(function(n, dir) {
        if (isLine(n)) indentLine(n, dir == null ? "smart" : dir ? "add" : "subtract");
      }),
      historySize: function() {return {undo: history.done.length, redo: history.undone.length};},
      matchBrackets: operation(function(){matchBrackets(true);}),
      getTokenAt: function(pos) {
        pos = clipPos(pos);
        return lines[pos.line].getTokenAt(mode, getStateBefore(pos.line), pos.ch);
      },
      getStateAfter: function(line) {
        line = clipLine(line == null ? lines.length - 1: line);
        return getStateBefore(line + 1);
      },
      cursorCoords: function(start){
        if (start == null) start = sel.inverted;
        return pageCoords(start ? sel.from : sel.to);
      },
      charCoords: function(pos){return pageCoords(clipPos(pos));},
      coordsChar: function(coords) {
        var off = eltOffset(lineSpace);
        var line = clipLine(Math.min(lines.length - 1, showingFrom + Math.floor((coords.y - off.top) / lineHeight())));
        return clipPos({line: line, ch: charFromX(clipLine(line), coords.x - off.left)});
      },
      getSearchCursor: function(query, pos, caseFold) {return new SearchCursor(query, pos, caseFold);},
      markText: operation(function(a, b, c){return operation(markText(a, b, c));}),
      setMarker: addGutterMarker,
      clearMarker: removeGutterMarker,
      setLineClass: operation(setLineClass),
      lineInfo: lineInfo,
      addWidget: function(pos, node, scroll, where) {
        pos = localCoords(clipPos(pos));
        var top = pos.yBot, left = pos.x;
        node.style.position = "absolute";
        code.appendChild(node);
        node.style.left = left + "px";
        if (where == "over") top = pos.y;
        else if (where == "near") {
          var vspace = Math.max(scroller.offsetHeight, lines.length * lineHeight()),
              hspace = Math.max(code.clientWidth, lineSpace.clientWidth) - paddingLeft();
          if (pos.yBot + node.offsetHeight > vspace && pos.y > node.offsetHeight)
            top = pos.y - node.offsetHeight;
          if (left + node.offsetWidth > hspace)
            left = hspace - node.offsetWidth;
        }
        node.style.top = (top + paddingTop()) + "px";
        node.style.left = (left + paddingLeft()) + "px";
        if (scroll)
          scrollIntoView(left, top, left + node.offsetWidth, top + node.offsetHeight);
      },

      lineCount: function() {return lines.length;},
      getCursor: function(start) {
        if (start == null) start = sel.inverted;
        return copyPos(start ? sel.from : sel.to);
      },
      somethingSelected: function() {return !posEq(sel.from, sel.to);},
      setCursor: operation(function(line, ch) {
        if (ch == null && typeof line.line == "number") setCursor(line.line, line.ch);
        else setCursor(line, ch);
      }),
      setSelection: operation(function(from, to) {setSelection(clipPos(from), clipPos(to || from));}),
      getLine: function(line) {if (isLine(line)) return lines[line].text;},
      setLine: operation(function(line, text) {
        if (isLine(line)) replaceRange(text, {line: line, ch: 0}, {line: line, ch: lines[line].text.length});
      }),
      removeLine: operation(function(line) {
        if (isLine(line)) replaceRange("", {line: line, ch: 0}, clipPos({line: line+1, ch: 0}));
      }),
      replaceRange: operation(replaceRange),
      getRange: function(from, to) {return getRange(clipPos(from), clipPos(to));},

      operation: function(f){return operation(f)();},
      refresh: function(){updateDisplay(true);},
      getInputField: function(){return input;},
      getWrapperElement: function(){return wrapper;},
      getScrollerElement: function(){return scroller;},
      getGutterElement: function(){return gutter;}
    };

    function setValue(code) {
      history = null;
      var top = {line: 0, ch: 0};
      updateLines(top, {line: lines.length - 1, ch: lines[lines.length-1].text.length},
                  splitLines(code), top, top);
      history = new History();
    }
    function getValue(code) {
      var text = [];
      for (var i = 0, l = lines.length; i < l; ++i)
        text.push(lines[i].text);
      return text.join("\n");
    }

    function onMouseDown(e) {
      // Check whether this is a click in a widget
      for (var n = e_target(e); n != wrapper; n = n.parentNode)
        if (n.parentNode == code && n != mover) return;
      var ld = lastDoubleClick; lastDoubleClick = null;
      // First, see if this is a click in the gutter
      for (var n = e_target(e); n != wrapper; n = n.parentNode)
        if (n.parentNode == gutterText) {
          if (options.onGutterClick)
            options.onGutterClick(instance, indexOf(gutterText.childNodes, n) + showingFrom);
          return e_preventDefault(e);
        }

      var start = posFromMouse(e);
      
      switch (e_button(e)) {
      case 3:
        if (gecko && !mac) onContextMenu(e);
        return;
      case 2:
        if (start) setCursor(start.line, start.ch, true);
        return;
      }
      // For button 1, if it was clicked inside the editor
      // (posFromMouse returning non-null), we have to adjust the
      // selection.
      if (!start) {if (e_target(e) == scroller) e_preventDefault(e); return;}

      if (!focused) onFocus();
      e_preventDefault(e);
      if (ld && +new Date - ld < 400) return selectLine(start.line);

      setCursor(start.line, start.ch, true);
      var last = start, going;
      // And then we have to see if it's a drag event, in which case
      // the dragged-over text must be selected.
      function end() {
        focusInput();
        updateInput = true;
        move(); up();
      }
      function extend(e) {
        var cur = posFromMouse(e, true);
        if (cur && !posEq(cur, last)) {
          if (!focused) onFocus();
          last = cur;
          setSelectionUser(start, cur);
          updateInput = false;
          var visible = visibleLines();
          if (cur.line >= visible.to || cur.line < visible.from)
            going = setTimeout(operation(function(){extend(e);}), 150);
        }
      }

      var move = connect(targetDocument, "mousemove", operation(function(e) {
        clearTimeout(going);
        e_preventDefault(e);
        extend(e);
      }), true);
      var up = connect(targetDocument, "mouseup", operation(function(e) {
        clearTimeout(going);
        var cur = posFromMouse(e);
        if (cur) setSelectionUser(start, cur);
        e_preventDefault(e);
        end();
      }), true);
    }
    function onDblClick(e) {
      var pos = posFromMouse(e);
      if (!pos) return;
      selectWordAt(pos);
      e_preventDefault(e);
      lastDoubleClick = +new Date;
    }
    function onDrop(e) {
      e.preventDefault();
      var pos = posFromMouse(e, true), files = e.dataTransfer.files;
      if (!pos || options.readOnly) return;
      if (files && files.length && window.FileReader && window.File) {
        function loadFile(file, i) {
          var reader = new FileReader;
          reader.onload = function() {
            text[i] = reader.result;
            if (++read == n) replaceRange(text.join(""), clipPos(pos), clipPos(pos));
          };
          reader.readAsText(file);
        }
        var n = files.length, text = Array(n), read = 0;
        for (var i = 0; i < n; ++i) loadFile(files[i], i);
      }
      else {
        try {
          var text = e.dataTransfer.getData("Text");
          if (text) replaceRange(text, pos, pos);
        }
        catch(e){}
      }
    }
    function onKeyDown(e) {
      if (!focused) onFocus();

      var code = e.keyCode;
      // IE does strange things with escape.
      if (ie && code == 27) { e.returnValue = false; }
      // Tries to detect ctrl on non-mac, cmd on mac.
      var mod = (mac ? e.metaKey : e.ctrlKey) && !e.altKey, anyMod = e.ctrlKey || e.altKey || e.metaKey;
      if (code == 16 || e.shiftKey) shiftSelecting = shiftSelecting || (sel.inverted ? sel.to : sel.from);
      else shiftSelecting = null;
      // First give onKeyEvent option a chance to handle this.
      if (options.onKeyEvent && options.onKeyEvent(instance, addStop(e))) return;

      if (code == 33 || code == 34) {scrollPage(code == 34); return e_preventDefault(e);} // page up/down
      if (mod && ((code == 36 || code == 35) || // ctrl-home/end
                  mac && (code == 38 || code == 40))) { // cmd-up/down
        scrollEnd(code == 36 || code == 38); return e_preventDefault(e);
      }
      if (mod && code == 65) {selectAll(); return e_preventDefault(e);} // ctrl-a
      if (!options.readOnly) {
        if (!anyMod && code == 13) {return;} // enter
        if (!anyMod && code == 9 && handleTab(e.shiftKey)) return e_preventDefault(e); // tab
        if (mod && code == 90) {undo(); return e_preventDefault(e);} // ctrl-z
        if (mod && ((e.shiftKey && code == 90) || code == 89)) {redo(); return e_preventDefault(e);} // ctrl-shift-z, ctrl-y
      }

      // Key id to use in the movementKeys map. We also pass it to
      // fastPoll in order to 'self learn'. We need this because
      // reducedSelection, the hack where we collapse the selection to
      // its start when it is inverted and a movement key is pressed
      // (and later restore it again), shouldn't be used for
      // non-movement keys.
      curKeyId = (mod ? "c" : "") + (e.altKey ? "a" : "") + code;
      if (sel.inverted && movementKeys[curKeyId] === true) {
        var range = selRange(input);
        if (range) {
          reducedSelection = {anchor: range.start};
          setSelRange(input, range.start, range.start);
        }
      }
      // Don't save the key as a movementkey unless it had a modifier
      if (!mod && !e.altKey) curKeyId = null;
      fastPoll(curKeyId);
    }
    function onKeyUp(e) {
      if (options.onKeyEvent && options.onKeyEvent(instance, addStop(e))) return;
      if (reducedSelection) {
        reducedSelection = null;
        updateInput = true;
      }
      if (e.keyCode == 16) shiftSelecting = null;
    }
    function onKeyPress(e) {
      if (options.onKeyEvent && options.onKeyEvent(instance, addStop(e))) return;
      if (options.electricChars && mode.electricChars) {
        var ch = String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode);
        if (mode.electricChars.indexOf(ch) > -1)
          setTimeout(operation(function() {indentLine(sel.to.line, "smart");}), 50);
      }
      var code = e.keyCode;
      // Re-stop tab and enter. Necessary on some browsers.
      if (code == 13) {if (!options.readOnly) handleEnter(); e_preventDefault(e);}
      else if (!e.ctrlKey && !e.altKey && !e.metaKey && code == 9 && options.tabMode != "default") e_preventDefault(e);
      else fastPoll(curKeyId);
    }

    function onFocus() {
      if (options.readOnly == "nocursor") return;
      if (!focused) {
        if (options.onFocus) options.onFocus(instance);
        focused = true;
        if (wrapper.className.search(/\bCodeMirror-focused\b/) == -1)
          wrapper.className += " CodeMirror-focused";
        if (!leaveInputAlone) prepareInput();
      }
      slowPoll();
      restartBlink();
    }
    function onBlur() {
      if (focused) {
        if (options.onBlur) options.onBlur(instance);
        focused = false;
        wrapper.className = wrapper.className.replace(" CodeMirror-focused", "");
      }
      clearInterval(blinker);
      setTimeout(function() {if (!focused) shiftSelecting = null;}, 150);
    }

    // Replace the range from from to to by the strings in newText.
    // Afterwards, set the selection to selFrom, selTo.
    function updateLines(from, to, newText, selFrom, selTo) {
      if (history) {
        var old = [];
        for (var i = from.line, e = to.line + 1; i < e; ++i) old.push(lines[i].text);
        history.addChange(from.line, newText.length, old);
        while (history.done.length > options.undoDepth) history.done.shift();
      }
      updateLinesNoUndo(from, to, newText, selFrom, selTo);
    }
    function unredoHelper(from, to) {
      var change = from.pop();
      if (change) {
        var replaced = [], end = change.start + change.added;
        for (var i = change.start; i < end; ++i) replaced.push(lines[i].text);
        to.push({start: change.start, added: change.old.length, old: replaced});
        var pos = clipPos({line: change.start + change.old.length - 1,
                           ch: editEnd(replaced[replaced.length-1], change.old[change.old.length-1])});
        updateLinesNoUndo({line: change.start, ch: 0}, {line: end - 1, ch: lines[end-1].text.length}, change.old, pos, pos);
        updateInput = true;
      }
    }
    function undo() {unredoHelper(history.done, history.undone);}
    function redo() {unredoHelper(history.undone, history.done);}

    function updateLinesNoUndo(from, to, newText, selFrom, selTo) {
      var recomputeMaxLength = false, maxLineLength = maxLine.length;
      for (var i = from.line; i <= to.line; ++i) {
        if (lines[i].text.length == maxLineLength) {recomputeMaxLength = true; break;}
      }

      var nlines = to.line - from.line, firstLine = lines[from.line], lastLine = lines[to.line];
      // First adjust the line structure, taking some care to leave highlighting intact.
      if (firstLine == lastLine) {
        if (newText.length == 1)
          firstLine.replace(from.ch, to.ch, newText[0]);
        else {
          lastLine = firstLine.split(to.ch, newText[newText.length-1]);
          var spliceargs = [from.line + 1, nlines];
          firstLine.replace(from.ch, firstLine.text.length, newText[0]);
          for (var i = 1, e = newText.length - 1; i < e; ++i) spliceargs.push(new Line(newText[i]));
          spliceargs.push(lastLine);
          lines.splice.apply(lines, spliceargs);
        }
      }
      else if (newText.length == 1) {
        firstLine.replace(from.ch, firstLine.text.length, newText[0] + lastLine.text.slice(to.ch));
        lines.splice(from.line + 1, nlines);
      }
      else {
        var spliceargs = [from.line + 1, nlines - 1];
        firstLine.replace(from.ch, firstLine.text.length, newText[0]);
        lastLine.replace(0, to.ch, newText[newText.length-1]);
        for (var i = 1, e = newText.length - 1; i < e; ++i) spliceargs.push(new Line(newText[i]));
        lines.splice.apply(lines, spliceargs);
      }


      for (var i = from.line, e = i + newText.length; i < e; ++i) {
        var l = lines[i].text;
        if (l.length > maxLineLength) {
          maxLine = l; maxLineLength = l.length; maxWidth = null;
          recomputeMaxLength = false;
        }
      }
      if (recomputeMaxLength) {
        maxLineLength = 0; maxLine = ""; maxWidth = null;
        for (var i = 0, e = lines.length; i < e; ++i) {
          var l = lines[i].text;
          if (l.length > maxLineLength) {
            maxLineLength = l.length; maxLine = l;
          }
        }
      }

      // Add these lines to the work array, so that they will be
      // highlighted. Adjust work lines if lines were added/removed.
      var newWork = [], lendiff = newText.length - nlines - 1;
      for (var i = 0, l = work.length; i < l; ++i) {
        var task = work[i];
        if (task < from.line) newWork.push(task);
        else if (task > to.line) newWork.push(task + lendiff);
      }
      if (newText.length < 5) {
        highlightLines(from.line, from.line + newText.length);
        newWork.push(from.line + newText.length);
      } else {
        newWork.push(from.line);
      }
      work = newWork;
      startWorker(100);
      // Remember that these lines changed, for updating the display
      changes.push({from: from.line, to: to.line + 1, diff: lendiff});
      textChanged = {from: from, to: to, text: newText};

      // Update the selection
      function updateLine(n) {return n <= Math.min(to.line, to.line + lendiff) ? n : n + lendiff;}
      setSelection(selFrom, selTo, updateLine(sel.from.line), updateLine(sel.to.line));

      // Make sure the scroll-size div has the correct height.
      code.style.height = (lines.length * lineHeight() + 2 * paddingTop()) + "px";
    }

    function replaceRange(code, from, to) {
      from = clipPos(from);
      if (!to) to = from; else to = clipPos(to);
      code = splitLines(code);
      function adjustPos(pos) {
        if (posLess(pos, from)) return pos;
        if (!posLess(to, pos)) return end;
        var line = pos.line + code.length - (to.line - from.line) - 1;
        var ch = pos.ch;
        if (pos.line == to.line)
          ch += code[code.length-1].length - (to.ch - (to.line == from.line ? from.ch : 0));
        return {line: line, ch: ch};
      }
      var end;
      replaceRange1(code, from, to, function(end1) {
        end = end1;
        return {from: adjustPos(sel.from), to: adjustPos(sel.to)};
      });
      return end;
    }
    function replaceSelection(code, collapse) {
      replaceRange1(splitLines(code), sel.from, sel.to, function(end) {
        if (collapse == "end") return {from: end, to: end};
        else if (collapse == "start") return {from: sel.from, to: sel.from};
        else return {from: sel.from, to: end};
      });
    }
    function replaceRange1(code, from, to, computeSel) {
      var endch = code.length == 1 ? code[0].length + from.ch : code[code.length-1].length;
      var newSel = computeSel({line: from.line + code.length - 1, ch: endch});
      updateLines(from, to, code, newSel.from, newSel.to);
    }

    function getRange(from, to) {
      var l1 = from.line, l2 = to.line;
      if (l1 == l2) return lines[l1].text.slice(from.ch, to.ch);
      var code = [lines[l1].text.slice(from.ch)];
      for (var i = l1 + 1; i < l2; ++i) code.push(lines[i].text);
      code.push(lines[l2].text.slice(0, to.ch));
      return code.join("\n");
    }
    function getSelection() {
      return getRange(sel.from, sel.to);
    }

    var pollingFast = false; // Ensures slowPoll doesn't cancel fastPoll
    function slowPoll() {
      if (pollingFast) return;
      poll.set(2000, function() {
        startOperation();
        readInput();
        if (focused) slowPoll();
        endOperation();
      });
    }
    function fastPoll(keyId) {
      var missed = false;
      pollingFast = true;
      function p() {
        startOperation();
        var changed = readInput();
        if (changed && keyId) {
          if (changed == "moved" && movementKeys[keyId] == null) movementKeys[keyId] = true;
          if (changed == "changed") movementKeys[keyId] = false;
        }
        if (!changed && !missed) {missed = true; poll.set(80, p);}
        else {pollingFast = false; slowPoll();}
        endOperation();
      }
      poll.set(20, p);
    }

    // Inspects the textarea, compares its state (content, selection)
    // to the data in the editing variable, and updates the editor
    // content or cursor if something changed.
    function readInput() {
      if (leaveInputAlone || !focused) return;
      var changed = false, text = input.value, sr = selRange(input);
      if (!sr) return false;
      var changed = editing.text != text, rs = reducedSelection;
      var moved = changed || sr.start != editing.start || sr.end != (rs ? editing.start : editing.end);
      if (!moved && !rs) return false;
      if (changed) {
        shiftSelecting = reducedSelection = null;
        if (options.readOnly) {updateInput = true; return "changed";}
      }

      // Compute selection start and end based on start/end offsets in textarea
      function computeOffset(n, startLine) {
        var pos = 0;
        for (;;) {
          var found = text.indexOf("\n", pos);
          if (found == -1 || (text.charAt(found-1) == "\r" ? found - 1 : found) >= n)
            return {line: startLine, ch: n - pos};
          ++startLine;
          pos = found + 1;
        }
      }
      var from = computeOffset(sr.start, editing.from),
          to = computeOffset(sr.end, editing.from);
      // Here we have to take the reducedSelection hack into account,
      // so that you can, for example, press shift-up at the start of
      // your selection and have the right thing happen.
      if (rs) {
        var head = sr.start == rs.anchor ? to : from;
        var tail = shiftSelecting ? sel.to : sr.start == rs.anchor ? from : to;
        if (sel.inverted = posLess(head, tail)) { from = head; to = tail; }
        else { reducedSelection = null; from = tail; to = head; }
      }

      // In some cases (cursor on same line as before), we don't have
      // to update the textarea content at all.
      if (from.line == to.line && from.line == sel.from.line && from.line == sel.to.line && !shiftSelecting)
        updateInput = false;

      // Magic mess to extract precise edited range from the changed
      // string.
      if (changed) {
        var start = 0, end = text.length, len = Math.min(end, editing.text.length);
        var c, line = editing.from, nl = -1;
        while (start < len && (c = text.charAt(start)) == editing.text.charAt(start)) {
          ++start;
          if (c == "\n") {line++; nl = start;}
        }
        var ch = nl > -1 ? start - nl : start, endline = editing.to - 1, edend = editing.text.length;
        for (;;) {
          c = editing.text.charAt(edend);
          if (text.charAt(end) != c) {++end; ++edend; break;}
          if (c == "\n") endline--;
          if (edend <= start || end <= start) break;
          --end; --edend;
        }
        var nl = editing.text.lastIndexOf("\n", edend - 1), endch = nl == -1 ? edend : edend - nl - 1;
        updateLines({line: line, ch: ch}, {line: endline, ch: endch}, splitLines(text.slice(start, end)), from, to);
        if (line != endline || from.line != line) updateInput = true;
      }
      else setSelection(from, to);

      editing.text = text; editing.start = sr.start; editing.end = sr.end;
      return changed ? "changed" : moved ? "moved" : false;
    }

    // Set the textarea content and selection range to match the
    // editor state.
    function prepareInput() {
      var text = [];
      var from = Math.max(0, sel.from.line - 1), to = Math.min(lines.length, sel.to.line + 2);
      for (var i = from; i < to; ++i) text.push(lines[i].text);
      text = input.value = text.join(lineSep);
      var startch = sel.from.ch, endch = sel.to.ch;
      for (var i = from; i < sel.from.line; ++i)
        startch += lineSep.length + lines[i].text.length;
      for (var i = from; i < sel.to.line; ++i)
        endch += lineSep.length + lines[i].text.length;
      editing = {text: text, from: from, to: to, start: startch, end: endch};
      setSelRange(input, startch, reducedSelection ? startch : endch);
    }
    function focusInput() {
      if (options.readOnly != "nocursor") input.focus();
    }

    function scrollCursorIntoView() {
      var cursor = localCoords(sel.inverted ? sel.from : sel.to);
      return scrollIntoView(cursor.x, cursor.y, cursor.x, cursor.yBot);
    }
    function scrollIntoView(x1, y1, x2, y2) {
      var pl = paddingLeft(), pt = paddingTop(), lh = lineHeight();
      y1 += pt; y2 += pt; x1 += pl; x2 += pl;
      var screen = scroller.clientHeight, screentop = scroller.scrollTop, scrolled = false, result = true;
      if (y1 < screentop) {scroller.scrollTop = Math.max(0, y1 - 2*lh); scrolled = true;}
      else if (y2 > screentop + screen) {scroller.scrollTop = y2 + lh - screen; scrolled = true;}

      var screenw = scroller.clientWidth, screenleft = scroller.scrollLeft;
      if (x1 < screenleft) {
        if (x1 < 50) x1 = 0;
        scroller.scrollLeft = Math.max(0, x1 - 10);
        scrolled = true;
      }
      else if (x2 > screenw + screenleft) {
        scroller.scrollLeft = x2 + 10 - screenw;
        scrolled = true;
        if (x2 > code.clientWidth) result = false;
      }
      if (scrolled && options.onScroll) options.onScroll(instance);
      return result;
    }

    function visibleLines() {
      var lh = lineHeight(), top = scroller.scrollTop - paddingTop();
      return {from: Math.min(lines.length, Math.max(0, Math.floor(top / lh))),
              to: Math.min(lines.length, Math.ceil((top + scroller.clientHeight) / lh))};
    }
    // Uses a set of changes plus the current scroll position to
    // determine which DOM updates have to be made, and makes the
    // updates.
    function updateDisplay(changes) {
      if (!scroller.clientWidth) {
        showingFrom = showingTo = 0;
        return;
      }
      // First create a range of theoretically intact lines, and punch
      // holes in that using the change info.
      var intact = changes === true ? [] : [{from: showingFrom, to: showingTo, domStart: 0}];
      for (var i = 0, l = changes.length || 0; i < l; ++i) {
        var change = changes[i], intact2 = [], diff = change.diff || 0;
        for (var j = 0, l2 = intact.length; j < l2; ++j) {
          var range = intact[j];
          if (change.to <= range.from)
            intact2.push({from: range.from + diff, to: range.to + diff, domStart: range.domStart});
          else if (range.to <= change.from)
            intact2.push(range);
          else {
            if (change.from > range.from)
              intact2.push({from: range.from, to: change.from, domStart: range.domStart})
            if (change.to < range.to)
              intact2.push({from: change.to + diff, to: range.to + diff,
                            domStart: range.domStart + (change.to - range.from)});
          }
        }
        intact = intact2;
      }

      // Then, determine which lines we'd want to see, and which
      // updates have to be made to get there.
      var visible = visibleLines();
      var from = Math.min(showingFrom, Math.max(visible.from - 3, 0)),
          to = Math.min(lines.length, Math.max(showingTo, visible.to + 3)),
          updates = [], domPos = 0, domEnd = showingTo - showingFrom, pos = from, changedLines = 0;

      for (var i = 0, l = intact.length; i < l; ++i) {
        var range = intact[i];
        if (range.to <= from) continue;
        if (range.from >= to) break;
        if (range.domStart > domPos || range.from > pos) {
          updates.push({from: pos, to: range.from, domSize: range.domStart - domPos, domStart: domPos});
          changedLines += range.from - pos;
        }
        pos = range.to;
        domPos = range.domStart + (range.to - range.from);
      }
      if (domPos != domEnd || pos != to) {
        changedLines += Math.abs(to - pos);
        updates.push({from: pos, to: to, domSize: domEnd - domPos, domStart: domPos});
      }

      if (!updates.length) return;
      lineDiv.style.display = "none";
      // If more than 30% of the screen needs update, just do a full
      // redraw (which is quicker than patching)
      if (changedLines > (visible.to - visible.from) * .3)
        refreshDisplay(from = Math.max(visible.from - 10, 0), to = Math.min(visible.to + 7, lines.length));
      // Otherwise, only update the stuff that needs updating.
      else
        patchDisplay(updates);
      lineDiv.style.display = "";

      // Position the mover div to align with the lines it's supposed
      // to be showing (which will cover the visible display)
      var different = from != showingFrom || to != showingTo || lastHeight != scroller.clientHeight;
      showingFrom = from; showingTo = to;
      mover.style.top = (from * lineHeight()) + "px";
      if (different) {
        lastHeight = scroller.clientHeight;
        code.style.height = (lines.length * lineHeight() + 2 * paddingTop()) + "px";
        updateGutter();
      }

      if (maxWidth == null) maxWidth = stringWidth(maxLine);
      if (maxWidth > scroller.clientWidth) {
        lineSpace.style.width = maxWidth + "px";
        // Needed to prevent odd wrapping/hiding of widgets placed in here.
        code.style.width = "";
        code.style.width = scroller.scrollWidth + "px";
      } else {
        lineSpace.style.width = code.style.width = "";
      }

      // Since this is all rather error prone, it is honoured with the
      // only assertion in the whole file.
      if (lineDiv.childNodes.length != showingTo - showingFrom)
        throw new Error("BAD PATCH! " + JSON.stringify(updates) + " size=" + (showingTo - showingFrom) +
                        " nodes=" + lineDiv.childNodes.length);
      updateCursor();
    }

    function refreshDisplay(from, to) {
      var html = [], start = {line: from, ch: 0}, inSel = posLess(sel.from, start) && !posLess(sel.to, start);
      for (var i = from; i < to; ++i) {
        var ch1 = null, ch2 = null;
        if (inSel) {
          ch1 = 0;
          if (sel.to.line == i) {inSel = false; ch2 = sel.to.ch;}
        }
        else if (sel.from.line == i) {
          if (sel.to.line == i) {ch1 = sel.from.ch; ch2 = sel.to.ch;}
          else {inSel = true; ch1 = sel.from.ch;}
        }
        html.push(lines[i].getHTML(ch1, ch2, true));
      }
      lineDiv.innerHTML = html.join("");
    }
    function patchDisplay(updates) {
      // Slightly different algorithm for IE (badInnerHTML), since
      // there .innerHTML on PRE nodes is dumb, and discards
      // whitespace.
      var sfrom = sel.from.line, sto = sel.to.line, off = 0,
          scratch = badInnerHTML && targetDocument.createElement("div");
      for (var i = 0, e = updates.length; i < e; ++i) {
        var rec = updates[i];
        var extra = (rec.to - rec.from) - rec.domSize;
        var nodeAfter = lineDiv.childNodes[rec.domStart + rec.domSize + off] || null;
        if (badInnerHTML)
          for (var j = Math.max(-extra, rec.domSize); j > 0; --j)
            lineDiv.removeChild(nodeAfter ? nodeAfter.previousSibling : lineDiv.lastChild);
        else if (extra) {
          for (var j = Math.max(0, extra); j > 0; --j)
            lineDiv.insertBefore(targetDocument.createElement("pre"), nodeAfter);
          for (var j = Math.max(0, -extra); j > 0; --j)
            lineDiv.removeChild(nodeAfter ? nodeAfter.previousSibling : lineDiv.lastChild);
        }
        var node = lineDiv.childNodes[rec.domStart + off], inSel = sfrom < rec.from && sto >= rec.from;
        for (var j = rec.from; j < rec.to; ++j) {
          var ch1 = null, ch2 = null;
          if (inSel) {
            ch1 = 0;
            if (sto == j) {inSel = false; ch2 = sel.to.ch;}
          }
          else if (sfrom == j) {
            if (sto == j) {ch1 = sel.from.ch; ch2 = sel.to.ch;}
            else {inSel = true; ch1 = sel.from.ch;}
          }
          if (badInnerHTML) {
            scratch.innerHTML = lines[j].getHTML(ch1, ch2, true);
            lineDiv.insertBefore(scratch.firstChild, nodeAfter);
          }
          else {
            node.innerHTML = lines[j].getHTML(ch1, ch2, false);
            node.className = lines[j].className || "";
            node = node.nextSibling;
          }
        }
        off += extra;
      }
    }

    function updateGutter() {
      if (!options.gutter && !options.lineNumbers) return;
      var hText = mover.offsetHeight, hEditor = scroller.clientHeight;
      gutter.style.height = (hText - hEditor < 2 ? hEditor : hText) + "px";
      var html = [];
      for (var i = showingFrom; i < Math.max(showingTo, showingFrom + 1); ++i) {
        var marker = lines[i].gutterMarker;
        var text = options.lineNumbers ? i + options.firstLineNumber : null;
        if (marker && marker.text)
          text = marker.text.replace("%N%", text != null ? text : "");
        else if (text == null)
          text = "\u00a0";
        html.push((marker && marker.style ? '<pre class="' + marker.style + '">' : "<pre>"), text, "</pre>");
      }
      gutter.style.display = "none";
      gutterText.innerHTML = html.join("");
      var minwidth = String(lines.length).length, firstNode = gutterText.firstChild, val = eltText(firstNode), pad = "";
      while (val.length + pad.length < minwidth) pad += "\u00a0";
      if (pad) firstNode.insertBefore(targetDocument.createTextNode(pad), firstNode.firstChild);
      gutter.style.display = "";
      lineSpace.style.marginLeft = gutter.offsetWidth + "px";
    }
    function updateCursor() {
      var head = sel.inverted ? sel.from : sel.to, lh = lineHeight();
      var x = charX(head.line, head.ch) + "px", y = (head.line - showingFrom) * lh + "px";
      inputDiv.style.top = (head.line * lh - scroller.scrollTop) + "px";
      if (posEq(sel.from, sel.to)) {
        cursor.style.top = y; cursor.style.left = x;
        cursor.style.display = "";
      }
      else cursor.style.display = "none";
    }

    function setSelectionUser(from, to) {
      var sh = shiftSelecting && clipPos(shiftSelecting);
      if (sh) {
        if (posLess(sh, from)) from = sh;
        else if (posLess(to, sh)) to = sh;
      }
      setSelection(from, to);
    }
    // Update the selection. Last two args are only used by
    // updateLines, since they have to be expressed in the line
    // numbers before the update.
    function setSelection(from, to, oldFrom, oldTo) {
      if (posEq(sel.from, from) && posEq(sel.to, to)) return;
      if (posLess(to, from)) {var tmp = to; to = from; from = tmp;}

      if (posEq(from, to)) sel.inverted = false;
      else if (posEq(from, sel.to)) sel.inverted = false;
      else if (posEq(to, sel.from)) sel.inverted = true;

      // Some ugly logic used to only mark the lines that actually did
      // see a change in selection as changed, rather than the whole
      // selected range.
      if (oldFrom == null) {oldFrom = sel.from.line; oldTo = sel.to.line;}
      if (posEq(from, to)) {
        if (!posEq(sel.from, sel.to))
          changes.push({from: oldFrom, to: oldTo + 1});
      }
      else if (posEq(sel.from, sel.to)) {
        changes.push({from: from.line, to: to.line + 1});
      }
      else {
        if (!posEq(from, sel.from)) {
          if (from.line < oldFrom)
            changes.push({from: from.line, to: Math.min(to.line, oldFrom) + 1});
          else
            changes.push({from: oldFrom, to: Math.min(oldTo, from.line) + 1});
        }
        if (!posEq(to, sel.to)) {
          if (to.line < oldTo)
            changes.push({from: Math.max(oldFrom, from.line), to: oldTo + 1});
          else
            changes.push({from: Math.max(from.line, oldTo), to: to.line + 1});
        }
      }
      sel.from = from; sel.to = to;
      selectionChanged = true;
    }
    function setCursor(line, ch, user) {
      var pos = clipPos({line: line, ch: ch || 0});
      (user ? setSelectionUser : setSelection)(pos, pos);
    }

    function clipLine(n) {return Math.max(0, Math.min(n, lines.length-1));}
    function clipPos(pos) {
      if (pos.line < 0) return {line: 0, ch: 0};
      if (pos.line >= lines.length) return {line: lines.length-1, ch: lines[lines.length-1].text.length};
      var ch = pos.ch, linelen = lines[pos.line].text.length;
      if (ch == null || ch > linelen) return {line: pos.line, ch: linelen};
      else if (ch < 0) return {line: pos.line, ch: 0};
      else return pos;
    }

    function scrollPage(down) {
      var linesPerPage = Math.floor(scroller.clientHeight / lineHeight()), head = sel.inverted ? sel.from : sel.to;
      setCursor(head.line + (Math.max(linesPerPage - 1, 1) * (down ? 1 : -1)), head.ch, true);
    }
    function scrollEnd(top) {
      var pos = top ? {line: 0, ch: 0} : {line: lines.length - 1, ch: lines[lines.length-1].text.length};
      setSelectionUser(pos, pos);
    }
    function selectAll() {
      var endLine = lines.length - 1;
      setSelection({line: 0, ch: 0}, {line: endLine, ch: lines[endLine].text.length});
    }
    function selectWordAt(pos) {
      var line = lines[pos.line].text;
      var start = pos.ch, end = pos.ch;
      while (start > 0 && /\w/.test(line.charAt(start - 1))) --start;
      while (end < line.length && /\w/.test(line.charAt(end))) ++end;
      setSelectionUser({line: pos.line, ch: start}, {line: pos.line, ch: end});
    }
    function selectLine(line) {
      setSelectionUser({line: line, ch: 0}, {line: line, ch: lines[line].text.length});
    }
    function handleEnter() {
      replaceSelection("\n", "end");
      if (options.enterMode != "flat")
        indentLine(sel.from.line, options.enterMode == "keep" ? "prev" : "smart");
    }
    function handleTab(shift) {
      function indentSelected(mode) {
        if (posEq(sel.from, sel.to)) return indentLine(sel.from.line, mode);
        var e = sel.to.line - (sel.to.ch ? 0 : 1);
        for (var i = sel.from.line; i <= e; ++i) indentLine(i, mode);
      }
      shiftSelecting = null;
      switch (options.tabMode) {
      case "default":
        return false;
      case "indent":
        indentSelected("smart");
        break;
      case "classic":
        if (posEq(sel.from, sel.to)) {
          if (shift) indentLine(sel.from.line, "smart");
          else replaceSelection("\t", "end");
          break;
        }
      case "shift":
        indentSelected(shift ? "subtract" : "add");
        break;
      }
      return true;
    }

    function indentLine(n, how) {
      if (how == "smart") {
        if (!mode.indent) how = "prev";
        else var state = getStateBefore(n);
      }

      var line = lines[n], curSpace = line.indentation(), curSpaceString = line.text.match(/^\s*/)[0], indentation;
      if (how == "prev") {
        if (n) indentation = lines[n-1].indentation();
        else indentation = 0;
      }
      else if (how == "smart") indentation = mode.indent(state, line.text.slice(curSpaceString.length));
      else if (how == "add") indentation = curSpace + options.indentUnit;
      else if (how == "subtract") indentation = curSpace - options.indentUnit;
      indentation = Math.max(0, indentation);
      var diff = indentation - curSpace;

      if (!diff) {
        if (sel.from.line != n && sel.to.line != n) return;
        var indentString = curSpaceString;
      }
      else {
        var indentString = "", pos = 0;
        if (options.indentWithTabs)
          for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t";}
        while (pos < indentation) {++pos; indentString += " ";}
      }

      replaceRange(indentString, {line: n, ch: 0}, {line: n, ch: curSpaceString.length});
    }

    function loadMode() {
      mode = CodeMirror.getMode(options, options.mode);
      for (var i = 0, l = lines.length; i < l; ++i)
        lines[i].stateAfter = null;
      work = [0];
      startWorker();
    }
    function gutterChanged() {
      var visible = options.gutter || options.lineNumbers;
      gutter.style.display = visible ? "" : "none";
      if (visible) updateGutter();
      else lineDiv.parentNode.style.marginLeft = 0;
    }

    function markText(from, to, className) {
      from = clipPos(from); to = clipPos(to);
      var accum = [];
      function add(line, from, to, className) {
        var line = lines[line], mark = line.addMark(from, to, className);
        mark.line = line;
        accum.push(mark);
      }
      if (from.line == to.line) add(from.line, from.ch, to.ch, className);
      else {
        add(from.line, from.ch, null, className);
        for (var i = from.line + 1, e = to.line; i < e; ++i)
          add(i, 0, null, className);
        add(to.line, 0, to.ch, className);
      }
      changes.push({from: from.line, to: to.line + 1});
      return function() {
        var start, end;
        for (var i = 0; i < accum.length; ++i) {
          var mark = accum[i], found = indexOf(lines, mark.line);
          mark.line.removeMark(mark);
          if (found > -1) {
            if (start == null) start = found;
            end = found;
          }
        }
        if (start != null) changes.push({from: start, to: end + 1});
      };
    }

    function addGutterMarker(line, text, className) {
      if (typeof line == "number") line = lines[clipLine(line)];
      line.gutterMarker = {text: text, style: className};
      updateGutter();
      return line;
    }
    function removeGutterMarker(line) {
      if (typeof line == "number") line = lines[clipLine(line)];
      line.gutterMarker = null;
      updateGutter();
    }
    function setLineClass(line, className) {
      if (typeof line == "number") {
        var no = line;
        line = lines[clipLine(line)];
      }
      else {
        var no = indexOf(lines, line);
        if (no == -1) return null;
      }
      if (line.className != className) {
        line.className = className;
        changes.push({from: no, to: no + 1});
      }
      return line;
    }

    function lineInfo(line) {
      if (typeof line == "number") {
        var n = line;
        line = lines[line];
        if (!line) return null;
      }
      else {
        var n = indexOf(lines, line);
        if (n == -1) return null;
      }
      var marker = line.gutterMarker;
      return {line: n, text: line.text, markerText: marker && marker.text, markerClass: marker && marker.style};
    }

    function stringWidth(str) {
      measure.innerHTML = "<pre><span>x</span></pre>";
      measure.firstChild.firstChild.firstChild.nodeValue = str;
      return measure.firstChild.firstChild.offsetWidth || 10;
    }
    // These are used to go from pixel positions to character
    // positions, taking varying character widths into account.
    function charX(line, pos) {
      if (pos == 0) return 0;
      measure.innerHTML = "<pre><span>" + lines[line].getHTML(null, null, false, pos) + "</span></pre>";
      return measure.firstChild.firstChild.offsetWidth;
    }
    function charFromX(line, x) {
      if (x <= 0) return 0;
      var lineObj = lines[line], text = lineObj.text;
      function getX(len) {
        measure.innerHTML = "<pre><span>" + lineObj.getHTML(null, null, false, len) + "</span></pre>";
        return measure.firstChild.firstChild.offsetWidth;
      }
      var from = 0, fromX = 0, to = text.length, toX;
      // Guess a suitable upper bound for our search.
      var estimated = Math.min(to, Math.ceil(x / stringWidth("x")));
      for (;;) {
        var estX = getX(estimated);
        if (estX <= x && estimated < to) estimated = Math.min(to, Math.ceil(estimated * 1.2));
        else {toX = estX; to = estimated; break;}
      }
      if (x > toX) return to;
      // Try to guess a suitable lower bound as well.
      estimated = Math.floor(to * 0.8); estX = getX(estimated);
      if (estX < x) {from = estimated; fromX = estX;}
      // Do a binary search between these bounds.
      for (;;) {
        if (to - from <= 1) return (toX - x > x - fromX) ? from : to;
        var middle = Math.ceil((from + to) / 2), middleX = getX(middle);
        if (middleX > x) {to = middle; toX = middleX;}
        else {from = middle; fromX = middleX;}
      }
    }

    function localCoords(pos, inLineWrap) {
      var lh = lineHeight(), line = pos.line - (inLineWrap ? showingFrom : 0);
      return {x: charX(pos.line, pos.ch), y: line * lh, yBot: (line + 1) * lh};
    }
    function pageCoords(pos) {
      var local = localCoords(pos, true), off = eltOffset(lineSpace);
      return {x: off.left + local.x, y: off.top + local.y, yBot: off.top + local.yBot};
    }

    function lineHeight() {
      var nlines = lineDiv.childNodes.length;
      if (nlines) return (lineDiv.offsetHeight / nlines) || 1;
      measure.innerHTML = "<pre>x</pre>";
      return measure.firstChild.offsetHeight || 1;
    }
    function paddingTop() {return lineSpace.offsetTop;}
    function paddingLeft() {return lineSpace.offsetLeft;}

    function posFromMouse(e, liberal) {
      var offW = eltOffset(scroller, true), x, y;
      // Fails unpredictably on IE[67] when mouse is dragged around quickly.
      try { x = e.clientX; y = e.clientY; } catch (e) { return null; }
      // This is a mess of a heuristic to try and determine whether a
      // scroll-bar was clicked or not, and to return null if one was
      // (and !liberal).
      if (!liberal && (x - offW.left > scroller.clientWidth || y - offW.top > scroller.clientHeight))
        return null;
      var offL = eltOffset(lineSpace, true);
      var line = showingFrom + Math.floor((y - offL.top) / lineHeight());
      return clipPos({line: line, ch: charFromX(clipLine(line), x - offL.left)});
    }
    function onContextMenu(e) {
      var pos = posFromMouse(e);
      if (!pos || window.opera) return; // Opera is difficult.
      if (posEq(sel.from, sel.to) || posLess(pos, sel.from) || !posLess(pos, sel.to))
        operation(setCursor)(pos.line, pos.ch);

      var oldCSS = input.style.cssText;
      inputDiv.style.position = "absolute";
      input.style.cssText = "position: fixed; width: 30px; height: 30px; top: " + (e_pageY(e) - 1) +
        "px; left: " + (e_pageX(e) - 1) + "px; z-index: 1000; background: white; " +
        "border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
      leaveInputAlone = true;
      var val = input.value = getSelection();
      focusInput();
      setSelRange(input, 0, input.value.length);
      function rehide() {
        var newVal = splitLines(input.value).join("\n");
        if (newVal != val) operation(replaceSelection)(newVal, "end");
        inputDiv.style.position = "relative";
        input.style.cssText = oldCSS;
        leaveInputAlone = false;
        prepareInput();
        slowPoll();
      }
      
      if (gecko) {
        e_stop(e);
        var mouseup = connect(window, "mouseup", function() {
          mouseup();
          setTimeout(rehide, 20);
        }, true);
      }
      else {
        setTimeout(rehide, 50);
      }
    }

    // Cursor-blinking
    function restartBlink() {
      clearInterval(blinker);
      var on = true;
      cursor.style.visibility = "";
      blinker = setInterval(function() {
        cursor.style.visibility = (on = !on) ? "" : "hidden";
      }, 650);
    }

    var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<"};
    function matchBrackets(autoclear) {
      var head = sel.inverted ? sel.from : sel.to, line = lines[head.line], pos = head.ch - 1;
      var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
      if (!match) return;
      var ch = match.charAt(0), forward = match.charAt(1) == ">", d = forward ? 1 : -1, st = line.styles;
      for (var off = pos + 1, i = 0, e = st.length; i < e; i+=2)
        if ((off -= st[i].length) <= 0) {var style = st[i+1]; break;}

      var stack = [line.text.charAt(pos)], re = /[(){}[\]]/;
      function scan(line, from, to) {
        if (!line.text) return;
        var st = line.styles, pos = forward ? 0 : line.text.length - 1, cur;
        for (var i = forward ? 0 : st.length - 2, e = forward ? st.length : -2; i != e; i += 2*d) {
          var text = st[i];
          if (st[i+1] != null && st[i+1] != style) {pos += d * text.length; continue;}
          for (var j = forward ? 0 : text.length - 1, te = forward ? text.length : -1; j != te; j += d, pos+=d) {
            if (pos >= from && pos < to && re.test(cur = text.charAt(j))) {
              var match = matching[cur];
              if (match.charAt(1) == ">" == forward) stack.push(cur);
              else if (stack.pop() != match.charAt(0)) return {pos: pos, match: false};
              else if (!stack.length) return {pos: pos, match: true};
            }
          }
        }
      }
      for (var i = head.line, e = forward ? Math.min(i + 100, lines.length) : Math.max(-1, i - 100); i != e; i+=d) {
        var line = lines[i], first = i == head.line;
        var found = scan(line, first && forward ? pos + 1 : 0, first && !forward ? pos : line.text.length);
        if (found) break;
      }
      if (!found) found = {pos: null, match: false};
      var style = found.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
      var one = markText({line: head.line, ch: pos}, {line: head.line, ch: pos+1}, style),
          two = found.pos != null
            ? markText({line: i, ch: found.pos}, {line: i, ch: found.pos + 1}, style)
            : function() {};
      var clear = operation(function(){one(); two();});
      if (autoclear) setTimeout(clear, 800);
      else bracketHighlighted = clear;
    }

    // Finds the line to start with when starting a parse. Tries to
    // find a line with a stateAfter, so that it can start with a
    // valid state. If that fails, it returns the line with the
    // smallest indentation, which tends to need the least context to
    // parse correctly.
    function findStartLine(n) {
      var minindent, minline;
      for (var search = n, lim = n - 40; search > lim; --search) {
        if (search == 0) return 0;
        var line = lines[search-1];
        if (line.stateAfter) return search;
        var indented = line.indentation();
        if (minline == null || minindent > indented) {
          minline = search;
          minindent = indented;
        }
      }
      return minline;
    }
    function getStateBefore(n) {
      var start = findStartLine(n), state = start && lines[start-1].stateAfter;
      if (!state) state = startState(mode);
      else state = copyState(mode, state);
      for (var i = start; i < n; ++i) {
        var line = lines[i];
        line.highlight(mode, state);
        line.stateAfter = copyState(mode, state);
      }
      if (n < lines.length && !lines[n].stateAfter) work.push(n);
      return state;
    }
    function highlightLines(start, end) {
      var state = getStateBefore(start);
      for (var i = start; i < end; ++i) {
        var line = lines[i];
        line.highlight(mode, state);
        line.stateAfter = copyState(mode, state);
      }
    }
    function highlightWorker() {
      var end = +new Date + options.workTime;
      var foundWork = work.length;
      while (work.length) {
        if (!lines[showingFrom].stateAfter) var task = showingFrom;
        else var task = work.pop();
        if (task >= lines.length) continue;
        var start = findStartLine(task), state = start && lines[start-1].stateAfter;
        if (state) state = copyState(mode, state);
        else state = startState(mode);

        var unchanged = 0, compare = mode.compareStates;
        for (var i = start, l = lines.length; i < l; ++i) {
          var line = lines[i], hadState = line.stateAfter;
          if (+new Date > end) {
            work.push(i);
            startWorker(options.workDelay);
            changes.push({from: task, to: i + 1});
            return;
          }
          var changed = line.highlight(mode, state);
          line.stateAfter = copyState(mode, state);
          if (compare) {
            if (hadState && compare(hadState, state)) break;
          } else {
            if (changed || !hadState) unchanged = 0;
            else if (++unchanged > 3) break;
          }
        }
        changes.push({from: task, to: i + 1});
      }
      if (foundWork && options.onHighlightComplete)
        options.onHighlightComplete(instance);
    }
    function startWorker(time) {
      if (!work.length) return;
      highlight.set(time, operation(highlightWorker));
    }

    // Operations are used to wrap changes in such a way that each
    // change won't have to update the cursor and display (which would
    // be awkward, slow, and error-prone), but instead updates are
    // batched and then all combined and executed at once.
    function startOperation() {
      updateInput = null; changes = []; textChanged = selectionChanged = false;
    }
    function endOperation() {
      var reScroll = false;
      if (selectionChanged) reScroll = !scrollCursorIntoView();
      if (changes.length) updateDisplay(changes);
      else if (selectionChanged) updateCursor();
      if (reScroll) scrollCursorIntoView();
      if (selectionChanged) restartBlink();

      // updateInput can be set to a boolean value to force/prevent an
      // update.
      if (focused && !leaveInputAlone &&
          (updateInput === true || (updateInput !== false && selectionChanged)))
        prepareInput();

      if (selectionChanged && options.matchBrackets)
        setTimeout(operation(function() {
          if (bracketHighlighted) {bracketHighlighted(); bracketHighlighted = null;}
          matchBrackets(false);
        }), 20);
      var tc = textChanged; // textChanged can be reset by cursoractivity callback
      if (selectionChanged && options.onCursorActivity)
        options.onCursorActivity(instance);
      if (tc && options.onChange && instance)
        options.onChange(instance, tc);
    }
    var nestedOperation = 0;
    function operation(f) {
      return function() {
        if (!nestedOperation++) startOperation();
        try {var result = f.apply(this, arguments);}
        finally {if (!--nestedOperation) endOperation();}
        return result;
      };
    }

    function SearchCursor(query, pos, caseFold) {
      this.atOccurrence = false;
      if (caseFold == null) caseFold = typeof query == "string" && query == query.toLowerCase();

      if (pos && typeof pos == "object") pos = clipPos(pos);
      else pos = {line: 0, ch: 0};
      this.pos = {from: pos, to: pos};

      // The matches method is filled in based on the type of query.
      // It takes a position and a direction, and returns an object
      // describing the next occurrence of the query, or null if no
      // more matches were found.
      if (typeof query != "string") // Regexp match
        this.matches = function(reverse, pos) {
          if (reverse) {
            var line = lines[pos.line].text.slice(0, pos.ch), match = line.match(query), start = 0;
            while (match) {
              var ind = line.indexOf(match[0]);
              start += ind;
              line = line.slice(ind + 1);
              var newmatch = line.match(query);
              if (newmatch) match = newmatch;
              else break;
              start++;
            }
          }
          else {
            var line = lines[pos.line].text.slice(pos.ch), match = line.match(query),
                start = match && pos.ch + line.indexOf(match[0]);
          }
          if (match)
            return {from: {line: pos.line, ch: start},
                    to: {line: pos.line, ch: start + match[0].length},
                    match: match};
        };
      else { // String query
        if (caseFold) query = query.toLowerCase();
        var fold = caseFold ? function(str){return str.toLowerCase();} : function(str){return str;};
        var target = query.split("\n");
        // Different methods for single-line and multi-line queries
        if (target.length == 1)
          this.matches = function(reverse, pos) {
            var line = fold(lines[pos.line].text), len = query.length, match;
            if (reverse ? (pos.ch >= len && (match = line.lastIndexOf(query, pos.ch - len)) != -1)
                        : (match = line.indexOf(query, pos.ch)) != -1)
              return {from: {line: pos.line, ch: match},
                      to: {line: pos.line, ch: match + len}};
          };
        else
          this.matches = function(reverse, pos) {
            var ln = pos.line, idx = (reverse ? target.length - 1 : 0), match = target[idx], line = fold(lines[ln].text);
            var offsetA = (reverse ? line.indexOf(match) + match.length : line.lastIndexOf(match));
            if (reverse ? offsetA >= pos.ch || offsetA != match.length
                        : offsetA <= pos.ch || offsetA != line.length - match.length)
              return;
            for (;;) {
              if (reverse ? !ln : ln == lines.length - 1) return;
              line = fold(lines[ln += reverse ? -1 : 1].text);
              match = target[reverse ? --idx : ++idx];
              if (idx > 0 && idx < target.length - 1) {
                if (line != match) return;
                else continue;
              }
              var offsetB = (reverse ? line.lastIndexOf(match) : line.indexOf(match) + match.length);
              if (reverse ? offsetB != line.length - match.length : offsetB != match.length)
                return;
              var start = {line: pos.line, ch: offsetA}, end = {line: ln, ch: offsetB};
              return {from: reverse ? end : start, to: reverse ? start : end};
            }
          };
      }
    }

    SearchCursor.prototype = {
      findNext: function() {return this.find(false);},
      findPrevious: function() {return this.find(true);},

      find: function(reverse) {
        var self = this, pos = clipPos(reverse ? this.pos.from : this.pos.to);
        function savePosAndFail(line) {
          var pos = {line: line, ch: 0};
          self.pos = {from: pos, to: pos};
          self.atOccurrence = false;
          return false;
        }

        for (;;) {
          if (this.pos = this.matches(reverse, pos)) {
            this.atOccurrence = true;
            return this.pos.match || true;
          }
          if (reverse) {
            if (!pos.line) return savePosAndFail(0);
            pos = {line: pos.line-1, ch: lines[pos.line-1].text.length};
          }
          else {
            if (pos.line == lines.length - 1) return savePosAndFail(lines.length);
            pos = {line: pos.line+1, ch: 0};
          }
        }
      },

      from: function() {if (this.atOccurrence) return copyPos(this.pos.from);},
      to: function() {if (this.atOccurrence) return copyPos(this.pos.to);},

      replace: function(newText) {
        var self = this;
        if (this.atOccurrence)
          operation(function() {
            self.pos.to = replaceRange(newText, self.pos.from, self.pos.to);
          })();
      }
    };

    for (var ext in extensions)
      if (extensions.propertyIsEnumerable(ext) &&
          !instance.propertyIsEnumerable(ext))
        instance[ext] = extensions[ext];
    return instance;
  } // (end of function CodeMirror)

  // The default configuration options.
  CodeMirror.defaults = {
    value: "",
    mode: null,
    theme: "default",
    indentUnit: 2,
    indentWithTabs: false,
    tabMode: "classic",
    enterMode: "indent",
    electricChars: true,
    onKeyEvent: null,
    lineNumbers: false,
    gutter: false,
    firstLineNumber: 1,
    readOnly: false,
    onChange: null,
    onCursorActivity: null,
    onGutterClick: null,
    onHighlightComplete: null,
    onFocus: null, onBlur: null, onScroll: null,
    matchBrackets: false,
    workTime: 100,
    workDelay: 200,
    undoDepth: 40,
    tabindex: null,
    document: window.document
  };

  // Known modes, by name and by MIME
  var modes = {}, mimeModes = {};
  CodeMirror.defineMode = function(name, mode) {
    if (!CodeMirror.defaults.mode && name != "null") CodeMirror.defaults.mode = name;
    modes[name] = mode;
  };
  CodeMirror.defineMIME = function(mime, spec) {
    mimeModes[mime] = spec;
  };
  CodeMirror.getMode = function(options, spec) {
    if (typeof spec == "string" && mimeModes.hasOwnProperty(spec))
      spec = mimeModes[spec];
    if (typeof spec == "string")
      var mname = spec, config = {};
    else if (spec != null)
      var mname = spec.name, config = spec;
    var mfactory = modes[mname];
    if (!mfactory) {
      if (window.console) console.warn("No mode " + mname + " found, falling back to plain text.");
      return CodeMirror.getMode(options, "text/plain");
    }
    return mfactory(options, config || {});
  };
  CodeMirror.listModes = function() {
    var list = [];
    for (var m in modes)
      if (modes.propertyIsEnumerable(m)) list.push(m);
    return list;
  };
  CodeMirror.listMIMEs = function() {
    var list = [];
    for (var m in mimeModes)
      if (mimeModes.propertyIsEnumerable(m)) list.push(m);
    return list;
  };

  var extensions = {};
  CodeMirror.defineExtension = function(name, func) {
    extensions[name] = func;
  };

  CodeMirror.fromTextArea = function(textarea, options) {
    if (!options) options = {};
    options.value = textarea.value;
    if (!options.tabindex && textarea.tabindex)
      options.tabindex = textarea.tabindex;

    function save() {textarea.value = instance.getValue();}
    if (textarea.form) {
      // Deplorable hack to make the submit method do the right thing.
      var rmSubmit = connect(textarea.form, "submit", save, true);
      if (typeof textarea.form.submit == "function") {
        var realSubmit = textarea.form.submit;
        function wrappedSubmit() {
          save();
          textarea.form.submit = realSubmit;
          textarea.form.submit();
          textarea.form.submit = wrappedSubmit;
        }
        textarea.form.submit = wrappedSubmit;
      }
    }

    textarea.style.display = "none";
    var instance = CodeMirror(function(node) {
      textarea.parentNode.insertBefore(node, textarea.nextSibling);
    }, options);
    instance.save = save;
    instance.toTextArea = function() {
      save();
      textarea.parentNode.removeChild(instance.getWrapperElement());
      textarea.style.display = "";
      if (textarea.form) {
        rmSubmit();
        if (typeof textarea.form.submit == "function")
          textarea.form.submit = realSubmit;
      }
    };
    return instance;
  };

  // Utility functions for working with state. Exported because modes
  // sometimes need to do this.
  function copyState(mode, state) {
    if (state === true) return state;
    if (mode.copyState) return mode.copyState(state);
    var nstate = {};
    for (var n in state) {
      var val = state[n];
      if (val instanceof Array) val = val.concat([]);
      nstate[n] = val;
    }
    return nstate;
  }
  CodeMirror.startState = startState;
  function startState(mode, a1, a2) {
    return mode.startState ? mode.startState(a1, a2) : true;
  }
  CodeMirror.copyState = copyState;

  // The character stream used by a mode's parser.
  function StringStream(string) {
    this.pos = this.start = 0;
    this.string = string;
  }
  StringStream.prototype = {
    eol: function() {return this.pos >= this.string.length;},
    sol: function() {return this.pos == 0;},
    peek: function() {return this.string.charAt(this.pos);},
    next: function() {
      if (this.pos < this.string.length)
        return this.string.charAt(this.pos++);
    },
    eat: function(match) {
      var ch = this.string.charAt(this.pos);
      if (typeof match == "string") var ok = ch == match;
      else var ok = ch && (match.test ? match.test(ch) : match(ch));
      if (ok) {++this.pos; return ch;}
    },
    eatWhile: function(match) {
      var start = this.start;
      while (this.eat(match)){}
      return this.pos > start;
    },
    eatSpace: function() {
      var start = this.pos;
      while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
      return this.pos > start;
    },
    skipToEnd: function() {this.pos = this.string.length;},
    skipTo: function(ch) {
      var found = this.string.indexOf(ch, this.pos);
      if (found > -1) {this.pos = found; return true;}
    },
    backUp: function(n) {this.pos -= n;},
    column: function() {return countColumn(this.string, this.start);},
    indentation: function() {return countColumn(this.string);},
    match: function(pattern, consume, caseInsensitive) {
      if (typeof pattern == "string") {
        function cased(str) {return caseInsensitive ? str.toLowerCase() : str;}
        if (cased(this.string).indexOf(cased(pattern), this.pos) == this.pos) {
          if (consume !== false) this.pos += pattern.length;
          return true;
        }
      }
      else {
        var match = this.string.slice(this.pos).match(pattern);
        if (match && consume !== false) this.pos += match[0].length;
        return match;
      }
    },
    current: function(){return this.string.slice(this.start, this.pos);}
  };
  CodeMirror.StringStream = StringStream;

  // Line objects. These hold state related to a line, including
  // highlighting info (the styles array).
  function Line(text, styles) {
    this.styles = styles || [text, null];
    this.stateAfter = null;
    this.text = text;
    this.marked = this.gutterMarker = this.className = null;
  }
  Line.prototype = {
    // Replace a piece of a line, keeping the styles around it intact.
    replace: function(from, to, text) {
      var st = [], mk = this.marked;
      copyStyles(0, from, this.styles, st);
      if (text) st.push(text, null);
      copyStyles(to, this.text.length, this.styles, st);
      this.styles = st;
      this.text = this.text.slice(0, from) + text + this.text.slice(to);
      this.stateAfter = null;
      if (mk) {
        var diff = text.length - (to - from), end = this.text.length;
        function fix(n) {return n <= Math.min(to, to + diff) ? n : n + diff;}
        for (var i = 0; i < mk.length; ++i) {
          var mark = mk[i], del = false;
          if (mark.from >= end) del = true;
          else {mark.from = fix(mark.from); if (mark.to != null) mark.to = fix(mark.to);}
          if (del || mark.from >= mark.to) {mk.splice(i, 1); i--;}
        }
      }
    },
    // Split a line in two, again keeping styles intact.
    split: function(pos, textBefore) {
      var st = [textBefore, null];
      copyStyles(pos, this.text.length, this.styles, st);
      return new Line(textBefore + this.text.slice(pos), st);
    },
    addMark: function(from, to, style) {
      var mk = this.marked, mark = {from: from, to: to, style: style};
      if (this.marked == null) this.marked = [];
      this.marked.push(mark);
      this.marked.sort(function(a, b){return a.from - b.from;});
      return mark;
    },
    removeMark: function(mark) {
      var mk = this.marked;
      if (!mk) return;
      for (var i = 0; i < mk.length; ++i)
        if (mk[i] == mark) {mk.splice(i, 1); break;}
    },
    // Run the given mode's parser over a line, update the styles
    // array, which contains alternating fragments of text and CSS
    // classes.
    highlight: function(mode, state) {
      var stream = new StringStream(this.text), st = this.styles, pos = 0;
      var changed = false, curWord = st[0], prevWord;
      if (this.text == "" && mode.blankLine) mode.blankLine(state);
      while (!stream.eol()) {
        var style = mode.token(stream, state);
        var substr = this.text.slice(stream.start, stream.pos);
        stream.start = stream.pos;
        if (pos && st[pos-1] == style)
          st[pos-2] += substr;
        else if (substr) {
          if (!changed && (st[pos+1] != style || (pos && st[pos-2] != prevWord))) changed = true;
          st[pos++] = substr; st[pos++] = style;
          prevWord = curWord; curWord = st[pos];
        }
        // Give up when line is ridiculously long
        if (stream.pos > 5000) {
          st[pos++] = this.text.slice(stream.pos); st[pos++] = null;
          break;
        }
      }
      if (st.length != pos) {st.length = pos; changed = true;}
      if (pos && st[pos-2] != prevWord) changed = true;
      // Short lines with simple highlights always count as changed,
      // because they are likely to highlight the same way in various
      // contexts.
      return changed || (st.length < 5 && this.text.length < 10);
    },
    // Fetch the parser token for a given character. Useful for hacks
    // that want to inspect the mode state (say, for completion).
    getTokenAt: function(mode, state, ch) {
      var txt = this.text, stream = new StringStream(txt);
      while (stream.pos < ch && !stream.eol()) {
        stream.start = stream.pos;
        var style = mode.token(stream, state);
      }
      return {start: stream.start,
              end: stream.pos,
              string: stream.current(),
              className: style || null,
              state: state};
    },
    indentation: function() {return countColumn(this.text);},
    // Produces an HTML fragment for the line, taking selection,
    // marking, and highlighting into account.
    getHTML: function(sfrom, sto, includePre, endAt) {
      var html = [];
      if (includePre)
        html.push(this.className ? '<pre class="' + this.className + '">': "<pre>");
      function span(text, style) {
        if (!text) return;
        if (style) html.push('<span class="', style, '">', htmlEscape(text), "</span>");
        else html.push(htmlEscape(text));
      }
      var st = this.styles, allText = this.text, marked = this.marked;
      if (sfrom == sto) sfrom = null;
      var len = allText.length;
      if (endAt != null) len = Math.min(endAt, len);

      if (!allText && endAt == null)
        span(" ", sfrom != null && sto == null ? "CodeMirror-selected" : null);
      else if (!marked && sfrom == null)
        for (var i = 0, ch = 0; ch < len; i+=2) {
          var str = st[i], l = str.length;
          if (ch + l > len) str = str.slice(0, len - ch);
          ch += l;
          span(str, "cm-" + st[i+1]);
        }
      else {
        var pos = 0, i = 0, text = "", style, sg = 0;
        var markpos = -1, mark = null;
        function nextMark() {
          if (marked) {
            markpos += 1;
            mark = (markpos < marked.length) ? marked[markpos] : null;
          }
        }
        nextMark();
        while (pos < len) {
          var upto = len;
          var extraStyle = "";
          if (sfrom != null) {
            if (sfrom > pos) upto = sfrom;
            else if (sto == null || sto > pos) {
              extraStyle = " CodeMirror-selected";
              if (sto != null) upto = Math.min(upto, sto);
            }
          }
          while (mark && mark.to != null && mark.to <= pos) nextMark();
          if (mark) {
            if (mark.from > pos) upto = Math.min(upto, mark.from);
            else {
              extraStyle += " " + mark.style;
              if (mark.to != null) upto = Math.min(upto, mark.to);
            }
          }
          for (;;) {
            var end = pos + text.length;
            var appliedStyle = style;
            if (extraStyle) appliedStyle = style ? style + extraStyle : extraStyle;
            span(end > upto ? text.slice(0, upto - pos) : text, appliedStyle);
            if (end >= upto) {text = text.slice(upto - pos); pos = upto; break;}
            pos = end;
            text = st[i++]; style = "cm-" + st[i++];
          }
        }
        if (sfrom != null && sto == null) span(" ", "CodeMirror-selected");
      }
      if (includePre) html.push("</pre>");
      return html.join("");
    }
  };
  // Utility used by replace and split above
  function copyStyles(from, to, source, dest) {
    for (var i = 0, pos = 0, state = 0; pos < to; i+=2) {
      var part = source[i], end = pos + part.length;
      if (state == 0) {
        if (end > from) dest.push(part.slice(from - pos, Math.min(part.length, to - pos)), source[i+1]);
        if (end >= from) state = 1;
      }
      else if (state == 1) {
        if (end > to) dest.push(part.slice(0, to - pos), source[i+1]);
        else dest.push(part, source[i+1]);
      }
      pos = end;
    }
  }

  // The history object 'chunks' changes that are made close together
  // and at almost the same time into bigger undoable units.
  function History() {
    this.time = 0;
    this.done = []; this.undone = [];
  }
  History.prototype = {
    addChange: function(start, added, old) {
      this.undone.length = 0;
      var time = +new Date, last = this.done[this.done.length - 1];
      if (time - this.time > 400 || !last ||
          last.start > start + added || last.start + last.added < start - last.added + last.old.length)
        this.done.push({start: start, added: added, old: old});
      else {
        var oldoff = 0;
        if (start < last.start) {
          for (var i = last.start - start - 1; i >= 0; --i)
            last.old.unshift(old[i]);
          last.added += last.start - start;
          last.start = start;
        }
        else if (last.start < start) {
          oldoff = start - last.start;
          added += oldoff;
        }
        for (var i = last.added - oldoff, e = old.length; i < e; ++i)
          last.old.push(old[i]);
        if (last.added < added) last.added = added;
      }
      this.time = time;
    }
  };

  function stopMethod() {e_stop(this);}
  // Ensure an event has a stop method.
  function addStop(event) {
    if (!event.stop) event.stop = stopMethod;
    return event;
  }

  function e_preventDefault(e) {
    if (e.preventDefault) e.preventDefault();
    else e.returnValue = false;
  }
  function e_stopPropagation(e) {
    if (e.stopPropagation) e.stopPropagation();
    else e.cancelBubble = true;
  }
  function e_stop(e) {e_preventDefault(e); e_stopPropagation(e);}
  function e_target(e) {return e.target || e.srcElement;}
  function e_button(e) {
    if (e.which) return e.which;
    else if (e.button & 1) return 1;
    else if (e.button & 2) return 3;
    else if (e.button & 4) return 2;
  }
  function e_pageX(e) {
    if (e.pageX != null) return e.pageX;
    var doc = e_target(e).ownerDocument;
    return e.clientX + doc.body.scrollLeft + doc.documentElement.scrollLeft;
  }
  function e_pageY(e) {
    if (e.pageY != null) return e.pageY;
    var doc = e_target(e).ownerDocument;
    return e.clientY + doc.body.scrollTop + doc.documentElement.scrollTop;
  }

  // Event handler registration. If disconnect is true, it'll return a
  // function that unregisters the handler.
  function connect(node, type, handler, disconnect) {
    function wrapHandler(event) {handler(event || window.event);}
    if (typeof node.addEventListener == "function") {
      node.addEventListener(type, wrapHandler, false);
      if (disconnect) return function() {node.removeEventListener(type, wrapHandler, false);};
    }
    else {
      node.attachEvent("on" + type, wrapHandler);
      if (disconnect) return function() {node.detachEvent("on" + type, wrapHandler);};
    }
  }

  function Delayed() {this.id = null;}
  Delayed.prototype = {set: function(ms, f) {clearTimeout(this.id); this.id = setTimeout(f, ms);}};

  // Some IE versions don't preserve whitespace when setting the
  // innerHTML of a PRE tag.
  var badInnerHTML = (function() {
    var pre = document.createElement("pre");
    pre.innerHTML = " "; return !pre.innerHTML;
  })();

  var gecko = /gecko\/\d{7}/i.test(navigator.userAgent);
  var ie = /MSIE \d/.test(navigator.userAgent);
  var safari = /Apple Computer/.test(navigator.vendor);

  var lineSep = "\n";
  // Feature-detect whether newlines in textareas are converted to \r\n
  (function () {
    var te = document.createElement("textarea");
    te.value = "foo\nbar";
    if (te.value.indexOf("\r") > -1) lineSep = "\r\n";
  }());

  var tabSize = 8;
  var mac = /Mac/.test(navigator.platform);
  var movementKeys = {};
  for (var i = 35; i <= 40; ++i)
    movementKeys[i] = movementKeys["c" + i] = true;

  // Counts the column offset in a string, taking tabs into account.
  // Used mostly to find indentation.
  function countColumn(string, end) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/);
      if (end == -1) end = string.length;
    }
    for (var i = 0, n = 0; i < end; ++i) {
      if (string.charAt(i) == "\t") n += tabSize - (n % tabSize);
      else ++n;
    }
    return n;
  }

  function computedStyle(elt) {
    if (elt.currentStyle) return elt.currentStyle;
    return window.getComputedStyle(elt, null);
  }
  // Find the position of an element by following the offsetParent chain.
  // If screen==true, it returns screen (rather than page) coordinates.
  function eltOffset(node, screen) {
    var doc = node.ownerDocument.body;
    var x = 0, y = 0, skipDoc = false;
    for (var n = node; n; n = n.offsetParent) {
      x += n.offsetLeft; y += n.offsetTop;
      if (screen && computedStyle(n).position == "fixed")
        skipDoc = true;
    }
    var e = screen && !skipDoc ? null : doc;
    for (var n = node.parentNode; n != e; n = n.parentNode)
      if (n.scrollLeft != null) { x -= n.scrollLeft; y -= n.scrollTop;}
    return {left: x, top: y};
  }
  // Get a node's text content.
  function eltText(node) {
    return node.textContent || node.innerText || node.nodeValue || "";
  }

  // Operations on {line, ch} objects.
  function posEq(a, b) {return a.line == b.line && a.ch == b.ch;}
  function posLess(a, b) {return a.line < b.line || (a.line == b.line && a.ch < b.ch);}
  function copyPos(x) {return {line: x.line, ch: x.ch};}

  var escapeElement = document.createElement("div");
  function htmlEscape(str) {
    escapeElement.innerText = escapeElement.textContent = str;
    return escapeElement.innerHTML;
  }
  CodeMirror.htmlEscape = htmlEscape;

  // Used to position the cursor after an undo/redo by finding the
  // last edited character.
  function editEnd(from, to) {
    if (!to) return from ? from.length : 0;
    if (!from) return to.length;
    for (var i = from.length, j = to.length; i >= 0 && j >= 0; --i, --j)
      if (from.charAt(i) != to.charAt(j)) break;
    return j + 1;
  }

  function indexOf(collection, elt) {
    if (collection.indexOf) return collection.indexOf(elt);
    for (var i = 0, e = collection.length; i < e; ++i)
      if (collection[i] == elt) return i;
    return -1;
  }

  // See if "".split is the broken IE version, if so, provide an
  // alternative way to split lines.
  var splitLines, selRange, setSelRange;
  if ("\n\nb".split(/\n/).length != 3)
    splitLines = function(string) {
      var pos = 0, nl, result = [];
      while ((nl = string.indexOf("\n", pos)) > -1) {
        result.push(string.slice(pos, string.charAt(nl-1) == "\r" ? nl - 1 : nl));
        pos = nl + 1;
      }
      result.push(string.slice(pos));
      return result;
    };
  else
    splitLines = function(string){return string.split(/\r?\n/);};
  CodeMirror.splitLines = splitLines;

  // Sane model of finding and setting the selection in a textarea
  if (window.getSelection) {
    selRange = function(te) {
      try {return {start: te.selectionStart, end: te.selectionEnd};}
      catch(e) {return null;}
    };
    if (safari)
      // On Safari, selection set with setSelectionRange are in a sort
      // of limbo wrt their anchor. If you press shift-left in them,
      // the anchor is put at the end, and the selection expanded to
      // the left. If you press shift-right, the anchor ends up at the
      // front. This is not what CodeMirror wants, so it does a
      // spurious modify() call to get out of limbo.
      setSelRange = function(te, start, end) {
        if (start == end)
          te.setSelectionRange(start, end);
        else {
          te.setSelectionRange(start, end - 1);
          window.getSelection().modify("extend", "forward", "character");
        }
      };
    else
      setSelRange = function(te, start, end) {
        try {te.setSelectionRange(start, end);}
        catch(e) {} // Fails on Firefox when textarea isn't part of the document
      };
  }
  // IE model. Don't ask.
  else {
    selRange = function(te) {
      try {var range = te.ownerDocument.selection.createRange();}
      catch(e) {return null;}
      if (!range || range.parentElement() != te) return null;
      var val = te.value, len = val.length, localRange = te.createTextRange();
      localRange.moveToBookmark(range.getBookmark());
      var endRange = te.createTextRange();
      endRange.collapse(false);

      if (localRange.compareEndPoints("StartToEnd", endRange) > -1)
        return {start: len, end: len};

      var start = -localRange.moveStart("character", -len);
      for (var i = val.indexOf("\r"); i > -1 && i < start; i = val.indexOf("\r", i+1), start++) {}

      if (localRange.compareEndPoints("EndToEnd", endRange) > -1)
        return {start: start, end: len};

      var end = -localRange.moveEnd("character", -len);
      for (var i = val.indexOf("\r"); i > -1 && i < end; i = val.indexOf("\r", i+1), end++) {}
      return {start: start, end: end};
    };
    setSelRange = function(te, start, end) {
      var range = te.createTextRange();
      range.collapse(true);
      var endrange = range.duplicate();
      var newlines = 0, txt = te.value;
      for (var pos = txt.indexOf("\n"); pos > -1 && pos < start; pos = txt.indexOf("\n", pos + 1))
        ++newlines;
      range.move("character", start - newlines);
      for (; pos > -1 && pos < end; pos = txt.indexOf("\n", pos + 1))
        ++newlines;
      endrange.move("character", end - newlines);
      range.setEndPoint("EndToEnd", endrange);
      range.select();
    };
  }

  CodeMirror.defineMode("null", function() {
    return {token: function(stream) {stream.skipToEnd();}};
  });
  CodeMirror.defineMIME("text/plain", "null");

  return CodeMirror;
})()
;

define("../CodeMirror2/lib/codemirror", function(){});

CodeMirror.defineMode("sbvr", function(config) {

	return {
		copyState: function(state) {
			return $.extend(true,{},state);
		},
	
		startState: function(base) {
			return SBVRParser.createInstance();
		},
		
		compareStates: function(origState, newState) {
			return origState.equals(newState);
		},
		
		blankLine: function(state) {
			state._tokens = [];
			state.__possibilities = [];
		},

		token: function(stream, state) {
			if(stream.sol()) { //Reset most of the state because it's a new line.
				try {
					this.blankLine(state);
					state.matchAll(stream.string,'line');
				}
				catch(e) {}
			}
			if(state.nextToken != undefined && state.nextToken != null) {
				var nextToken = state.nextToken;
				state.nextToken = null;
				stream.pos = nextToken[0];
				return "sbvr-"+nextToken[1];
			}
			if(state._tokens[stream.pos]) {
				var currTokens = state._tokens[stream.pos];
				delete state._tokens[stream.pos];
				for (var i in currTokens) {
					if(state.keyTokens.indexOf(currTokens[i][1])!=-1) {
						if(stream.eatSpace()) {
							state.nextToken = currTokens[i];
							return null;
						}
						stream.pos = currTokens[i][0];
						return "sbvr-"+currTokens[i][1];
					}
				}
			}
			for(var i in state._tokens) {
				if(isNaN(parseInt(i))) {
					stream.skipToEnd();
					return null;
				}
				if(i>stream.pos) {
					stream.pos = i;
					return null;
				}
			}
		},

		indent: function(state, textAfter) {
			return 0; //We don't indent SBVR
		}
		
	};
});

CodeMirror.defineMIME("text/sbvr", "sbvr");

define("mylibs/cm/sbvr", function(){});

var sbvrAutoComplete = (function () {
	return function(instance, e) {
		// Hook into ctrl-space
		if (e.keyCode == 32 && (e.ctrlKey || e.metaKey) && !e.altKey) {
			e.stop();
			return startComplete(instance);
		}
	}
	
	/** Start code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/
	// Minimal event-handling wrapper.
	function stopEvent() {
		if (this.preventDefault) {this.preventDefault(); this.stopPropagation();}
		else {this.returnValue = false; this.cancelBubble = true;}
	}
	function addStop(event) {
		if (!event.stop) event.stop = stopEvent;
		return event;
	}
	function connect(node, type, handler) {
		function wrapHandler(event) {handler(addStop(event || window.event));}
		if (typeof node.addEventListener == "function")
			node.addEventListener(type, wrapHandler, false);
		else
			node.attachEvent("on" + type, wrapHandler);
	}

	function forEach(o, f) {
		if($.isArray(o))
			for (var i = 0, e = o.length; i < e; ++i) f(o[i]);
		else
			for (var i in o) f(i);
	}
	/** End code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/

	function startComplete(editor) {
		// We want a single cursor position.
		if (editor.somethingSelected()) return;
		// Find the token at the cursor
		var cur = editor.getCursor(false), token = editor.getTokenAt(cur);
		var completions = getCompletions(editor);
		
		if (!completions.length) return;
		function insert(str) {
			editor.replaceRange(str+" ", {line: cur.line, ch: token.start}, cur);
		}
		// When there is only one completion, use it directly.
		if (completions.length == 1) {insert(completions[0]); return true;}

		// Build the select widget
		var complete = document.createElement("div");
		complete.className = "completions";
		var sel = complete.appendChild(document.createElement("select"));
		sel.multiple = true;
		for (var i = 0; i < completions.length; ++i) {
			var opt = sel.appendChild(document.createElement("option"));
			opt.appendChild(document.createTextNode(completions[i]));
		}
		sel.firstChild.selected = true;
		sel.size = Math.min(10, completions.length);
		var pos = editor.cursorCoords();
		complete.style.left = pos.x + "px";
		complete.style.top = pos.yBot + "px";
		complete.style.position = "absolute";
		document.body.appendChild(complete);
		// Hack to hide the scrollbar.
		if (completions.length <= 10)
			complete.style.width = (sel.clientWidth - 1) + "px";

		var done = false;
		function close() {
			if (done) return;
			done = true;
			complete.parentNode.removeChild(complete);
		}
		function pick() {
			insert(completions[sel.selectedIndex]); //Changed this line to insert the actual completion rather than the text in the select element, the select element removes leading and trailing whitespace.
			close();
			setTimeout(function(){editor.focus();}, 50);
		}
		connect(sel, "blur", close);
		connect(sel, "keydown", function(event) {
			var code = event.keyCode;
			// Enter
			if (code == 13) {event.stop(); pick();} //Changed to only respond on enter as there are multi word completions.
			// Escape
			else if (code == 27) {event.stop(); close(); editor.focus();}
			//Backspace
			else if (code == 8 && token.string.length == 0) {event.stop(); close(); editor.focus();}
			else if (code != 38 && code != 40) {close(); editor.focus(); setTimeout(function(){startComplete(editor)}, 50);}
		});
		connect(sel, "dblclick", pick);

		sel.focus();
		// Opera sometimes ignores focusing a freshly created node
		if (window.opera) setTimeout(function(){if (!done) sel.focus();}, 100);
		return true;
	}
	
	function getCompletions(editor) {
		var cur = editor.getCursor(false),
			token = editor.getTokenAt(cur),
			tokenString = token.string.substr(0,cur.ch-token.start),
			state = $.extend(true,{},editor.getTokenAt({line: cur.line, ch: 0}).state);
		
		
		var found = [], start = tokenString.toLowerCase(), whitespace = "";
		if(/^[\W]*$/.test(tokenString)) {
			start = "";
			whitespace = tokenString;
		}
		
		try {
			state._tokens = [];
			state.__possibilities = [];
			state.matchAll(editor.getLine(cur.line).substring(0,cur.ch),'line');
		}
		catch(e) {}
		
		
		/** Start code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/
		function maybeAdd(str) {
			if (str.toLowerCase().indexOf(start) == 0) found.push(whitespace+str);
		}
		/** End code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/

		var poss = state.__possibilities;
		var possMap = state.possMap;
		
		for(var i=cur.ch;i>=0;i--) {
			if(poss[i] != undefined) {
				for(var j=0,jl=poss[i].length;j<jl;j++) {
					console.log(possMap[poss[i][j]]);
					try {
						forEach(possMap[poss[i][j]], maybeAdd);
					} catch (e) {
						console.log(e);
					}
				}
				break;
			}
		}
		return found;
	}
})()

define("mylibs/cm/sbvrac", function(){});

/* Author: 

*/


var sqlEditor, sbvrEditor, lfEditor, importExportEditor;
var cmod;

function defaultFailureCallback(error) {
	console.log(error);
	var exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
	var msg = error['status-line']?error['status-line']:error.join('<br/>');
	$( "#dialog-message" ).html( exc + msg );
	$( "#dialog-message" ).dialog( "open" );
	//console.log("fail!", error);
}

function defaultSuccessCallback(header, result) {
}

//should probably JSON.parse result when appropriate. Now the callbacks do it.
function serverRequest(method, uri, headers, body, successCallback, failureCallback, caller){
	$("#httpTable").append(
		'<tr class="server_row"><td><strong>' + method +
		"</strong></td><td>" + uri + "</td><td>" + (headers.length==0?'':headers) +
		"</td><td>" + body + "</td></tr>"
	);
	if(typeof remoteServerRequest=='function')
		remoteServerRequest(method, uri, headers, body,
			typeof successCallback != 'function' ? defaultSuccessCallback : successCallback,
			typeof failureCallback != 'function' ? defaultFailureCallback : failureCallback,
			caller);
}

//txtmod = '';
function loadState() {
	serverRequest("GET", "/onAir/", [], '', function(headers, result){
		if(result!=undefined){
			localStorage._client_onAir = JSON.parse(result);
		}
	});
}

function transformClient(model) {
	$("#modelArea").attr('disabled',true);
	//TODO: Add success/failure callbacks.
	serverRequest("PUT",
		"/ui/textarea-is_disabled*filt:textarea.name=model_area/",
		{"Content-Type":"application/json"},
		JSON.stringify({"value":true}),
		function() {
		
			serverRequest("PUT",
				"/ui/textarea*filt:name=model_area/",
				{"Content-Type":"application/json"},
				JSON.stringify({"value":model}),
				function() {

					serverRequest("POST",
						"/execute/",
						{"Content-Type":"application/json"},
						'',
						function() {
				
							//serverRequest("GET", "/model/", [], '', function(headers, result){
							//	txtmod = result;
							//});
						
							serverRequest("GET",
								"/lfmodel/",
								{},
								'',
								function(headers, result) {
									lfEditor.setValue(Prettify.match(JSON.parse(result),'elem'));

									serverRequest("GET",
										"/prepmodel/",
										{},
										'',
										function(headers, result) {
											$("#prepArea").val(Prettify.match(JSON.parse(result),'elem'));
											
											serverRequest("GET",
												"/sqlmodel/",
												{},
												'',
												function(headers, result) {
													sqlEditor.setValue(Prettify.match(JSON.parse(result),'elem'));
	
													localStorage._client_onAir='true'
													
													$('#bum').removeAttr('disabled');
													$('#br').removeAttr('disabled');
													$('#bem').attr('disabled','disabled');
												}
											);
										}
									);
								}
							);
						}
					);
				}
			);
		}
	);
}

function updateModel(){
	return true;
}

function resetClient(){
	//**actions should go in the callback to be executed after the DELETE.
	serverRequest("DELETE",	"/", [], '', function(){
		$("#modelArea").attr('disabled', false);
		sbvrEditor.setValue("");
		lfEditor.setValue("");
		$("#prepArea").val("");
		sqlEditor.setValue("");
		$('#bem').removeAttr('disabled');
		$('#bum').attr('disabled','disabled');
		$('#br').attr('disabled','disabled');
		localStorage._client_onAir=false;
	});
}

function loadmod(model){
	sbvrEditor.setValue(model);
}

function processHash(){
	theHash = location.hash
	if(theHash == ''){
		theHash = '#!/model'
	}
	
	if(theHash.slice(1,9) == '!/server'){
		URItree = [[],[[],['server']]];
	}else{
		URItree = ClientURIParser.matchAll(theHash, 'expr'); //does not handle empty tree
	}
	
	try {
		switchVal = URItree[1][1][0];
	}
	catch($e) {
		switchVal = '';
	}
	
	switch(switchVal) {
		case "server":
			//console.log(location.hash.slice(9));
			uri = location.hash.slice(9);
			serverRequest("GET", uri, "", {}, function(headers, result){
				alert(result);
			});
			break;
		case "sql":
			$('#tabs').tabs("select",3);
			sqlEditor.refresh(); //Force a refresh on switching to the tab, otherwise it wasn't appearing.
			break;
		case "data":
			if(localStorage._client_onAir=='true'){
				$('#tabs').tabs("select",4);
				drawData(URItree[1]);
			} else {
				var exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
				var msg = 'The data tab is only accessible after a model is executed<br/>';
				$( "#dialog-message" ).html( exc + msg );
				$( "#dialog-message" ).dialog( "open" );
			}
			break;
		case "http":
			$('#tabs').tabs("select",5);
			break;
		case "export":
			$('#tabs').tabs("select",6);
			break;
//					case "model": //Model is the default view.
		case "lf":
			break;
		case "preplf":
			break;
		default:
			sbvrEditor.refresh();
			$('#tabs').tabs("select",0);
			break;
	}
}

//break loadUI apart to loadState and SetUI (with a view to converting LoadState to a single request)?
function loadUI(){
	//request schema from server and store locally.
	if(localStorage._client_onAir=='true'){
		serverRequest("GET", "/model/", [], '', function(headers, result) {
			var ctree = SBVRParser.matchAll(result, 'expr');
			ctree = SBVR_PreProc.match(ctree, "optimizeTree");
			cmod = SBVR2SQL.match(ctree,'trans');
		});
	}
	
	sbvrEditor = CodeMirror.fromTextArea(document.getElementById("modelArea"), {
		mode: "sbvr",
		onKeyEvent: sbvrAutoComplete
	});
	
	lfEditor = CodeMirror.fromTextArea(document.getElementById("lfArea"));
	
	if(CodeMirror.listModes().indexOf('plsql') > -1) {
		sqlEditor = CodeMirror.fromTextArea(document.getElementById("sqlArea"), {mode: "text/x-plsql"});
		importExportEditor = CodeMirror.fromTextArea(document.getElementById("importExportArea"), {mode: "text/x-plsql"});
	}
	
	window.onhashchange = processHash;
	serverRequest("GET", "/ui/textarea*filt:name=model_area/", [], '',
		function(headers, result){
			sbvrEditor.setValue(JSON.parse(result).value);
		}
	)
	
	//TODO: This should be restructured to use jQuery's ajax() interface, so it can be switched
	//between local and remote as needed (preferably with some variable setting)
	//http://api.jquery.com/jQuery.ajax/
	serverRequest("GET", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", [], '',
		function(headers, result){
			$("#modelArea").attr('disabled', JSON.parse(result).value)
		}
	)
	
	//how do we fix this? - ignore. It gets updated on execute anyway. 
	$("#modelArea").change(function(){
		serverRequest("PUT",
			"/ui/textarea*filt:name=model_area/",
			{"Content-Type":"application/json"},
			JSON.stringify({"value":sbvrEditor.getValue()})
		);
	});
	
	if(localStorage._client_onAir=='true'){
		serverRequest("GET", "/lfmodel/", [], '', function(headers, result){
			lfEditor.setValue(Prettify.match(JSON.parse(result),'elem'));
		});
	
		serverRequest("GET", "/prepmodel/", [], '', function(headers, result){
			$("#prepArea").val(Prettify.match(JSON.parse(result),'elem'));
		});
	
		serverRequest("GET", "/sqlmodel/", [], '', function(headers, result){
			sqlEditor.setValue(Prettify.match(JSON.parse(result),'elem'));
		});	
	}
	
	//Prepare dialog
	//$(function() {
		$( "#dialog-message" ).dialog({
			modal: true,
			resizable: false,
			autoOpen: false,
			buttons: {
				"Revise Request": function() {
					$( this ).dialog( "close" );
				},
				"Revise Model": function() {
					$( this ).dialog( "close" );
				}
			}
		});
	//});
	
	//Enable/disable model editor buttons
	if(localStorage._client_onAir=='true'){
		$('#bem').attr('disabled','disabled');
		//$('#bum').removeAttr('disabled');
		//$('#br').removeAttr('disabled');
	}else{
		$('#bum').attr('disabled','disabled');
		$('#br').attr('disabled','disabled');
		//$('#bem').removeAttr('disabled');
	}
}

//Initialise controls and shoot off the loadUI & processHash functions
$(function() {
	$("#tabs").tabs({
		select: function(event, ui) {
			//alert(ui.index != 0 && localStorage._client_onAir!='true')
			if((ui.index > 1) && (localStorage._client_onAir!='true')){
				var exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
				var msg = 'This tab is only accessible after a model is executed<br/>';
				$( "#dialog-message" ).html( exc + msg );
				$( "#dialog-message" ).dialog( "open" );
				return false;
			}else{
				switch(ui.panel.id){
					case "lfTab":
						location.hash='!/lf/'
						break;
					case "prepTab":
						location.hash='!/preplf/'
						break;
					case "sqlTab":
						location.hash='!/sql/'
						break;
					case "dataTab":
						location.hash='!/data/'
						break;
					case "httpTab":
						location.hash='!/http/'
						break;
					case "importExportTab":
						location.hash='!/export/'
						break;
					default:
						location.hash='!/model/'
						break;
				}
				return true;
			}
		}
	});
	
	loadState();
	loadUI();
	
	processHash();

	$('#bldb').file().choose(function(e, input) {
		handleFiles(input[0].files);
	});
});

function downloadFile(filename, text) {
	const MIME_TYPE = 'text/plain';
	var output = document.querySelector('output');
	window.URL = window.webkitURL || window.URL;
	window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
						window.MozBlobBuilder;

	var prevLink = output.querySelector('a');
	if (prevLink) {
		window.URL.revokeObjectURL(prevLink.href);
		output.innerHTML = '';
	}

	var bb = new BlobBuilder();
	bb.append(text);

	var a = document.createElement('a');
	a.download = filename;
	a.href = window.URL.createObjectURL(bb.getBlob(MIME_TYPE));
	a.textContent = 'Download ready';

	a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(':');
	a.draggable = true; // Don't really need, but good practice.
	a.classList.add('dragout');

	output.appendChild(a);

	a.onclick = function(e) {
		if ('disabled' in this.dataset) {
			return false;
		}

		cleanUp(this);
	};
};
function cleanUp(a) {
	a.textContent = 'Downloaded';
	a.dataset.disabled = true;

	// Need a small delay for the revokeObjectURL to work properly.
	setTimeout(function() {
		window.URL.revokeObjectURL(a.href);
	}, 1500);
};

define("script", function(){});

{
    (model1 = "T: pilot\nT: plane\nF: pilot can fly plane\nF: pilot is experienced\nR: It is obligatory that each pilot can fly at least 1 plane\nR: It is obligatory that each pilot that is experienced can fly at least 3 planes");
    (model2 = "T: student\nF: student is school president\nR: It is obligatory that a student is school president\nT: module\nF: student is registered for module\nR: It is obligatory that each student is registered for at most 5 modules\nT: study programme\nF: student is enrolled in study programme\nF: module is available for study programme\nR: It is obligatory that each student that is registered for a module is enrolled in a study programme that the module is available for\nT: lecturer\nF: student is under probation\nR: It is obligatory that each student is registered for at most 5 modules\nR: It is obligatory that each student that is under probation is registered for at most 3 modules\nR: It is obligatory that at most 10 students are under probation\nF: lecturer grades student for study programme with grade\nR: It is prohibited that a student that is under probation is enrolled in more than 2 study programmes\nR: It is obligatory that each student is registered for each module");
    (model3 = "T: student\nT: module\nT: study programme\nF: student is registered for module\nF: student is enrolled in study programme\nF: module is available for study programme\nR: It is obligatory that each student is registered for at most 5 modules\nR: It is obligatory that each student that is registered for a module is enrolled in a study programme that the module is available for\nF: student is under probation\nR: It is obligatory that each student that is under probation is registered for at most 3 modules");
    (modelTest = ((((((((((((((((((((((("T: person\nT: student\n\tDefinition: A definition\n\tSource: A source\n\tDictionary Basis: A dictionary basis\n\tGeneral Concept: A general concept\n\tConcept Type: person\n\tNecessity: A necessity\n\tPossibility: A possibility\n\tReference Scheme: A reference scheme\n\tNote: A note\n\tExample: An example\n\tSynonym: A synonym\n\tSynonymous Form: A synonymous form\n\tSee: Something to see\n\tSubject Field: A subject field\n\tNamespace URI: A namespace URI\n\tDatabase Table Name: student_table\n\tDatabase ID Field: id_field\n\tDatabase Name Field: name_field\nT: lecturer\n\tConcept Type: person\nT: module " + "\nF: student is school president ") + "\nF: student is registered for module") + "\nF: student is registered for module to catchup") + "\nF: student is registered for module with lecturer") + "\nF: person is swimming") + "\nR: It is obligatory that\ta student is school president") + "\nR: It is necessary that\t\ta student is school president") + "\nR: It is possible that\t\ta student is school president") + "\nR: It is permissible that\ta student is school president") + "\n\nR: It is prohibited that\tsome students are school president") + "\nR: It is impossible that\tsome students are school president") + "\nR: It is not possible that\tsome students are school president") + "\nR: It is obligatory that each\tstudent\t\tis registered for at least one module") + "\nR: It is obligatory that a \t\tstudent\t\tis registered for at least one module") + "\nR: It is obligatory that an\t\tstudent\t\tis registered for at least one module") + "\nR: It is obligatory that some\tstudents\tare registered for at least one module") + "\nR: It is obligatory that at most 50\t\tstudents are registered for at least one module") + "\nR: It is obligatory that at least one\tstudent is registered for at least one module") + "\nR: It is obligatory that more than 0\tstudents are registered for at least one module") + "\nR: It is obligatory that exactly one\tstudent is school president") + "\nR: It is obligatory that at least one and at most 50\tstudents are registered for at least one module") + "\nR: It is obligatory that a student is registered for a module with a lecturer") + "\nR: It is obligatory that exactly 0 people are swimming"));
    (modelT = "T: resource\nT: transaction\nT: lock\nT: conditional representation\nF: lock is exclusive\nF: lock is shared\nF: resource is under lock\nF: lock belongs to transaction\nR: It is obligatory that each resource is under at most 1 lock that is exclusive")
}

define("mylibs/ometa-code/SBVRModels", function(){});

require(["../ometa-js/lib",
		"../ometa-js/ometa-base"], function() {
	require(["mylibs/json2",
			"mylibs/drawDataUI",
			"mylibs/ometa-code/ClientURIParser",
			"mylibs/ometa-code/ClientURIUnparser"]);
	require(["mylibs/inflection",
			"mylibs/ometa-code/SBVRParser",
			"mylibs/ometa-code/Prettify"], function() {
		require(["../CodeMirror2/lib/codemirror"], function() {
			require(["mylibs/cm/sbvr","mylibs/cm/sbvrac"]);
			
				require(["script"]);
			
		});
		require(["mylibs/ometa-code/SBVRModels"])
	});
	
	
});

define("main", function(){});
