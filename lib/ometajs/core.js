OMeta = (function() {
  "use strict";
  /*
    new syntax:
      #foo and `foo  match the string object 'foo' (it's also accepted in my JS)
      'abc'    match the string object 'abc'
      'c'      match the string object 'c'
      ``abc''    match the sequence of string objects 'a', 'b', 'c'
      "abc"    token('abc')
      [1 2 3]    match the array object [1, 2, 3]
      foo(bar)    apply rule foo with argument bar
      -> ...    semantic actions written in JS (see OMetaParser's atomicHostExpr rule)
  */

  /*
  ometa M {
    number = number:n digit:d -> { n * 10 + parseInt(d, 10) }
           | digit:d          -> { parseInt(d, 10) }
  }

  translates to...

  M = objectThatDelegatesTo(OMeta, {
    number: function() {
              return this._or(function() {
                                var n = this._apply("number"),
                                    d = this._apply("digit")
                                return n * 10 + parseInt(d, 10)
                              },
                              function() {
                                var d = this._apply("digit")
                                return parseInt(d, 10)
                              }
                             )
            }
  })
  M.matchAll("123456789", "number")
  */

  //
  // failure exception
  //
  var fail = function fail() {
    return fail.error;
  };
  fail.error = new SyntaxError('match failed');
  fail.error._extend = function(child) {
    return objectThatDelegatesTo(this, child);
  };

  //
  // ### function objectThatDelegatesTo(obj, props)
  // #### @obj {Object} parent object
  // #### @props {Object} object to merge result with
  // Returns object with merged properties of `obj` and `props`
  //
  function objectThatDelegatesTo(obj, props) {
    var clone = Object.create(obj || {});

    for (var key in props) {
      if (props.hasOwnProperty(key)) {
        clone[key] = props[key];
      }
    }

    return clone;
  }

  //
  // ### function isSequenceable(o)
  // #### @o {any} object to perform check against
  // Returns true if object is sequenceable
  //
  function isSequenceable(o) {
    return typeof o === 'string' || Array.isArray(o);
  }

  //
  // ### function getTag(o)
  // #### @o {Object} input
  // unique tags for objects (useful for making "hash tables")
  //
  function getTag(o) {
    if (o == null) {
      return 'null';
    }

    switch (typeof o) {
      case "boolean":
        return o === true ? "Btrue" : "Bfalse";
      case "string":
        return "S" + o;
      case "number":
        return "N" + o;
      default:
        if (!o.hasOwnProperty("_id_")) {
          o._id_ = "R" + getTag.id++;
        }
        return o._id_;
    }
  }
  getTag.id = 0;

  //
  // ### function isImmutable(o)
  // #### @o {any} object to perform check against
  // Returns true if object is immutable
  //
  function isImmutable(o) {
     return o == null ||
            typeof o === 'boolean' || typeof o === 'number' ||
            typeof o === 'string';
  }

  //
  // ### function lookup (fn, success, fallback)
  // #### @fn {Function} function that may throw
  // #### @success {Function} call if function hasn't thrown
  // #### @fallback {Function} call if function thrown fail()
  //
  function lookup(fn, success, fallback) {
    var value;
    try {
      value = fn();
    } catch (e) {
      if (!(e instanceof SyntaxError)) {
        throw e;
      }
      return fallback && fallback(e);
    }

    return success && success(value);
  }

  //
  // ### function OMInputStream(hd, tl)
  // #### @hd {any} Head
  // #### @tl {Object} Tail
  // Streams and memoization
  //
  function OMInputStream(hd, tl) {
    this.memo = {};
    this.lst  = tl.lst;
    this.idx  = tl.idx;
    this.hd   = hd;
    this.tl   = tl;
  }

  //
  // ### function head ()
  // Returns stream's `hd` property
  //
  OMInputStream.prototype.head = function() { return this.hd; };

  //
  // ### function tail ()
  // Returns stream's `tl` property
  //
  OMInputStream.prototype.tail = function() { return this.tl; };

  //
  // ### function type ()
  // Returns stream's `lst` property constructor
  //
  OMInputStream.prototype.type = function() { return this.lst.constructor; };

  //
  // ### function upTo (that)
  // #### @that {Object} target object
  // Visit all tails and join all met heads and return string or array
  // (depending on `.lst` type)
  //
  OMInputStream.prototype.upTo = function(that) {
    var r = [], curr = this;
    while (curr !== that) {
      r.push(curr.head());
      curr = curr.tail();
    }
    return this.type() === String ? r.join('') : r;
  };

  //
  // ### function OMInputStreamEnd (lst, idx)
  // #### @lst {Array} list
  // #### @idx {Number} index
  // Internal class
  //
  function OMInputStreamEnd(lst, idx) {
    this.memo = {};
    this.lst = lst;
    this.idx = idx;
  }
  OMInputStreamEnd.prototype = objectThatDelegatesTo(OMInputStream.prototype);

  //
  // ### function head ()
  // Not implemented
  //
  OMInputStreamEnd.prototype.head = function() { throw fail(); };

  //
  // ### function tail ()
  // Not implemented
  //
  OMInputStreamEnd.prototype.tail = function() { throw fail(); };

  //
  // ### function ListOMInputStream (lst, idx)
  // #### @lst {Array} list
  // #### @idx {Number} index
  // Returns self-expanding stream
  //
  function ListOMInputStream(lst, idx) {
    this.memo = { };
    this.lst  = lst;
    this.idx  = idx;
    this.hd   = lst[idx];
  }
  ListOMInputStream.prototype = objectThatDelegatesTo(OMInputStream.prototype);

  //
  // ### function head ()
  // Returns stream's `hd` property's value
  //
  ListOMInputStream.prototype.head = function() { return this.hd; };

  //
  // ### function tail ()
  // Returns or creates stream's tail
  //
  ListOMInputStream.prototype.tail = function() {
    return this.tl || (this.tl = makeListOMInputStream(this.lst, this.idx + 1));
  };

  //
  // ### function makeListOMInputStream (lst, idx)
  // #### @lst {Array} List
  // #### @idx {Number} index
  // Returns either ListOMInputStream's or OMInputStreamEnd's instance
  //
  function makeListOMInputStream(lst, idx) {
    if (idx < lst.length) {
      return new ListOMInputStream(lst, idx);
    } else {
      return new OMInputStreamEnd(lst, idx);
    }
  }

  //
  // ### function makeOMInputStreamProxy (target)
  // #### @target {any} Delegate's constructor
  // Returns object with stream's properties
  // (has self-expanding tail)
  //
  function makeOMInputStreamProxy(target) {
    return {
      memo: {},
      target: target,
      idx: target.idx,
      tl: undefined,
      type: function() {
        return String;
      },
      upTo: OMInputStream.prototype.upTo,
      head: function() {
        return target.head();
      },
      tail: function() {
        return this.tl || (this.tl = makeOMInputStreamProxy(target.tail()));
      }
    };
  }

  //
  // ### function Failer()
  // (i.e., that which makes things fail)
  // Used to detect (direct) left recursion and memoize failures
  function Failer() {
    this.used = false;
  }

  //
  // ### OMeta
  // the OMeta "class" and basic functionality
  //
  return {
    _extend: function(child) {
      return objectThatDelegatesTo(this, child);
    },
    _fail: fail,
    _enableTokens: function(rulesToTrack) {
      if(rulesToTrack == null) {
        // No rules to track were supplied and it wasn't even a reference they could be added to.
        return;
      }
      var tokens = [];
      this._enableTokens = function() {
        throw 'Can only enable tokens once';
      };
      this._addToken = function(startIdx, endIdx, rule, ruleArgs) {
        if(rulesToTrack.indexOf(rule) !== -1 && startIdx !== endIdx) {
          if(tokens[startIdx] === undefined) {
            tokens[startIdx] = [];
          }
          tokens[startIdx].push([endIdx, rule, ruleArgs]);
        }
      };
      this._getTokens = function() {
        return tokens;
      };
    },
    _addToken: function() {},
    _getTokens: function() {},
    
    _enableBranchTracking: function(rulesToTrack) {
      var branches = [];
      this._enableBranchTracking = function() {
        throw 'Can only enable tokens once';
      };
      this._addBranch = function(rule, ruleArgs) {
        if(rulesToTrack.hasOwnProperty(rule)) {
          var idx = this.input.idx;
          if(branches[idx] === undefined) {
            branches[idx] = {};
          }
          branches[idx][rule] = ruleArgs;
        }
      };
      this._getBranches = function() {
        return branches;
      };
    },
    _addBranch: function() {},
    _getBranches: function() {},
    
    _apply: function(rule) {
      var self = this,
          memoRec = this.input.memo[rule],
          origInput = this.input;
      this._addBranch(rule, []);
      if (memoRec === undefined) {
        var failer = new Failer();

        if (this[rule] === undefined) {
          throw 'tried to apply undefined rule "' + rule + '"';
        }

        this.input.memo[rule] = failer;
        this.input.memo[rule] = memoRec = {
          ans: this[rule](),
          nextInput: this.input
        };

        if (failer.used) {
          var sentinel = this.input,
              returnTrue = function () {
                return true;
              },
              returnFalse = function () {
                return false;
              },
              lookupFunc = function() {
                self.input = origInput;
                var ans = self[rule]();

                if (self.input === sentinel) {
                  throw fail();
                }

                memoRec.ans       = ans;
                memoRec.nextInput = self.input;
              };
          while (true) {
            var result = lookup(lookupFunc, returnFalse, returnTrue);
            if (result) {
              break;
            }
          }
        }
      }
      else if (memoRec instanceof Failer) {
        memoRec.used = true;
        throw fail();
      }
      this.input = memoRec.nextInput;
      this._addToken(origInput.idx, this.input.idx, rule, []);
      return memoRec.ans;
    },

    // note: _applyWithArgs and _superApplyWithArgs are not memoized, so they can't be left-recursive
    _applyWithArgs: function(rule) {
      var origIdx = this.input.idx,
          ruleFn = this[rule],
          ruleFnArity = ruleFn.length,
          ruleArgs = Array.prototype.slice.call(arguments, 1, ruleFnArity + 1);
      for (var idx = arguments.length - 1; idx > ruleFnArity; idx--) { // prepend "extra" arguments in reverse order
        this._prependInput(arguments[idx]);
      }
      this._addBranch(rule, ruleArgs);
      var ans = ruleFnArity === 0 ?
               ruleFn.call(this) :
               ruleFn.apply(this, ruleArgs);
      this._addToken(origIdx, this.input.idx, rule, ruleArgs);
      return ans;
    },
    _superApplyWithArgs: function(recv, rule) {
      var origIdx = recv.input.idx,
          ruleFn = this[rule],
          ruleFnArity = ruleFn.length,
          ruleArgs = Array.prototype.slice.call(arguments, 2, ruleFnArity + 2);
      for (var idx = arguments.length - 1; idx > ruleFnArity + 1; idx--) { // prepend "extra" arguments in reverse order
        recv._prependInput(arguments[idx]);
      }
      this._addBranch(rule, ruleArgs);
      var ans = ruleFnArity === 0 ?
               ruleFn.call(recv) :
               ruleFn.apply(recv, ruleArgs);
      this._addToken(origIdx, recv.input.idx, rule, ruleArgs);
      return ans;
    },
    _prependInput: function(v) {
      this.input = new OMInputStream(v, this.input);
    },
    
    // Use this if you want to disable prepending to the input (increases performances but requires using `Rule :param1 :param2 =` style parameter binding at all times)
    _disablePrependingInput: function() {
      this._applyWithArgs = function(rule) {
        var origIdx = this.input.idx,
            ruleArgs = Array.prototype.slice.call(arguments, 1);
        this._addBranch(rule, ruleArgs);
        var ans = this[rule].apply(this, ruleArgs);
        this._addToken(origIdx, this.input.idx, rule, ruleArgs);
        return ans;
      };
      this._superApplyWithArgs = function(recv, rule) {
        var origIdx = recv.input.idx,
            ruleArgs = Array.prototype.slice.call(arguments, 2);
        this._addBranch(rule, ruleArgs);
        var ans = this[rule].apply(recv, ruleArgs);
        this._addToken(origIdx, recv.input.idx, rule, ruleArgs);
        return ans;
      }
    },

    // if you want your grammar (and its subgrammars) to memoize parameterized rules, invoke this method on it:
    memoizeParameterizedRules: function() {
      this._prependInput = function(v) {
        var newInput;
        if (isImmutable(v)) {
          newInput = this.input[getTag(v)];
          if (!newInput) {
            newInput = new OMInputStream(v, this.input);
            this.input[getTag(v)] = newInput;
          }
        }
        else {
          newInput = new OMInputStream(v, this.input);
        }
        this.input = newInput;
      };
      this._applyWithArgs = function(rule) {
        var origIdx = this.input.idx,
            ruleFn = this[rule],
            ruleFnArity = ruleFn.length,
            ruleArgs = Array.prototype.slice.call(arguments, 1, ruleFnArity + 1);
        for (var idx = arguments.length - 1; idx > ruleFnArity; idx--) { // prepend "extra" arguments in reverse order
          this._prependInput(arguments[idx]);
        }
        this._addBranch(rule, ruleArgs);
        var ans = ruleFnArity === 0 ?
                 ruleFn.call(this) :
                 ruleFn.apply(this, ruleArgs);
        this._addToken(origIdx, this.input.idx, rule, ruleArgs);
        return ans;
      };
    },

    _pred: function(b) {
      if (b) {
        return true;
      }

      throw fail();
    },
    _not: function(x) {
      var self = this,
          origInput = this.input,
          origAddBranch = this._addBranch,
          origAddToken = this._addToken;
      this._addBranch = this._addToken = function() {};
      try {
        return lookup(function() {
          x.call(self);
        }, function() {
          throw fail();
        }, function() {
          self.input = origInput;
          return true;
        });
      }
      finally {
        this._addBranch = origAddBranch;
        this._addToken = origAddToken;
      }
    },
    _lookahead: function(x) {
      var origInput = this.input,
          r         = x.call(this);
      this.input = origInput;
      return r;
    },
    _or: function() {
      var self = this,
          origInput = this.input,
          ref = {},
          result = ref,
          lookupFunc = function() {
            self.input = origInput;
            result = arg.call(self);
          };

      for (var idx = 0; idx < arguments.length; idx++) {
        var arg = arguments[idx];

        lookup(lookupFunc);

        if (result !== ref) {
          return result;
        }
      }

      throw fail();
    },
    _xor: function(ruleName) {
      var self = this,
          origInput = this.input,
          idx = 1,
          newInput,
          ans,
          arg,
          lookupFunc = function() {
            self.input = origInput;
            ans = arg.call(self);
            if (newInput) {
              throw 'more than one choice matched by "exclusive-OR" in ' + ruleName;
            }
            newInput = self.input;
          };

      while (idx < arguments.length) {
        arg = arguments[idx];

        lookup(lookupFunc);
        idx++;
      }

      if (newInput) {
        this.input = newInput;
        return ans;
      }
      else {
        throw fail();
      }
    },
    disableXORs: function() {
      this._xor = function() {
        var self = this,
            origInput = this.input,
            ref = {},
            result = ref,
            lookupFunc = function() {
              self.input = origInput;
              result = arg.call(self);
            };

        for (var idx = 1; idx < arguments.length; idx++) {
          var arg = arguments[idx];

          lookup(lookupFunc);

          if (result !== ref) {
            return result;
          }
        }
        throw fail();
      };
    },
    _opt: function(x) {
      var self = this,
          origInput = this.input,
          ans;

      lookup(function() {
        ans = x.call(self);
      }, function() {
      }, function() {
        self.input = origInput;
      });

      return ans;
    },
    _many: function(x) {
      var self = this,
          ans = arguments[1] !== undefined ? [arguments[1]] : [],
          returnTrue = function () {
            self.input = origInput;
            return true;
          },
          returnFalse = function () {
            return false;
          },
          lookupFunc = function() {
            ans.push(x.call(self));
          };

      while (true) {
        var origInput = this.input;

        var result = lookup(lookupFunc, returnFalse, returnTrue);

        if (result) {
          break;
        }
      }
      return ans;
    },
    _many1: function(x) {
      return this._many(x, x.call(this));
    },
    _form: function(x) {
      var r,
          v = this._apply("anything"),
          origInput = this.input;
      if (!isSequenceable(v)) {
        throw fail();
      }
      this.input =  makeListOMInputStream(v, 0);
      r = x.call(this);
      this._apply("end");
      this.input = origInput;
      return v;
    },
    _consumedBy: function(x) {
      var origInput = this.input;
      x.call(this);
      return origInput.upTo(this.input);
    },
    _idxConsumedBy: function(x) {
      var origInput = this.input;
      x.call(this);
      return {fromIdx: origInput.idx, toIdx: this.input.idx};
    },
    _interleave: function(/* mode1, part1, mode2, part2 ..., moden, partn */) {
      var currInput = this.input, ans = [], idx, args = Array.prototype.slice.call(arguments);
      for (idx = 0; idx < args.length; idx += 2) {
        ans[idx / 2] = (args[idx] === "*" || args[idx] === "+") ? [] : undefined;
      }
      while (true) {
        var allDone = true;
        idx = 0;
        while (idx < args.length) {
          if (args[idx] !== "0") {
            try {
              this.input = currInput;
              switch (args[idx]) {
                case "*":
                  ans[idx / 2].push(args[idx + 1].call(this));
                  break;
                case "+":
                  ans[idx / 2].push(args[idx + 1].call(this));
                  args[idx] = "*";
                break;
                case "?":
                  ans[idx / 2] = args[idx + 1].call(this);
                  args[idx] = "0";
                break;
                case "1":
                  ans[idx / 2] = args[idx + 1].call(this);
                  args[idx] = "0";
                break;
                default:
                  throw "invalid mode '" + args[idx] + "' in OMeta._interleave";
              }
              currInput = this.input;
              break;
            }
            catch (f) {
              if (!(f instanceof SyntaxError)) {
                throw f;
              }
              // if this (failed) part's mode is "1" or "+", we're not done yet
              allDone = allDone && (args[idx] === "*" || args[idx] === "?");
            }
          }
          idx += 2;
        }
        if (idx === args.length) {
          if (allDone) {
            return ans;
          }
          else {
            throw fail();
          }
        }
      }
    },
    _currIdx: function() {
      return this.input.idx;
    },

    // some basic rules
    anything: function() {
      var r = this.input.head();
      this.input = this.input.tail();
      return r;
    },
    end: function() {
      return this._not(function() {
        return this._apply("anything");
      });
    },
    pos: function() {
      return this.input.idx;
    },
    empty: function() {
      return true;
    },
    apply: function(r) {
      return this._apply(r);
    },
    foreign: function(grammar, ruleName) {
      var ans, grammarInstance = grammar._extend({input: makeOMInputStreamProxy(this.input)}),
          localTokens, foreignTokens, tokensEnabled = this._getTokens() != null, i = 0;
      if(tokensEnabled) { // Tokens are enabled
        grammarInstance._enableTokens();
      }
      ans = grammarInstance._apply(ruleName);
      if(tokensEnabled) { // Tokens are enabled
        foreignTokens = grammarInstance._getTokens();
        // Merge the tokens we just gained.
        if(foreignTokens) {
          localTokens = this._getTokens();
          for(;i < foreignTokens.length; i++) {
            if(foreignTokens[i]) {
              if(localTokens[i]) {
                localTokens[i] = localTokens[i].concat(foreignTokens[i]);
              }
              else {
                localTokens[i] = foreignTokens[i]
              }
            }
          }
        }
      }
      this.input = grammarInstance.input.target;
      return ans;
    },

    //  some useful "derived" rules
    exactly: function(wanted) {
      if (wanted === this._apply("anything")) {
        return wanted;
      }
      throw fail();
    },
    "true": function() {
      var r = this._apply("anything");
      this._pred(r === true);
      return r;
    },
    "false": function() {
      var r = this._apply("anything");
      this._pred(r === false);
      return r;
    },
    "undefined": function() {
      var r = this._apply("anything");
      this._pred(r === undefined);
      return r;
    },
    number: function() {
      var r = this._apply("anything");
      this._pred(typeof r === "number");
      return r;
    },
    string: function() {
      var r = this._apply("anything");
      this._pred(typeof r === "string");
      return r;
    },
    "char": function() {
      var r = this._apply("anything");
      this._pred(typeof r === "string" && r.length === 1);
      return r;
    },
    space: function() {
      var r = this._apply("char");
      this._pred(r.charCodeAt(0) <= 32);
      return r;
    },
    spaces: function() {
      return this._many(function() {
        return this._apply("space");
      });
    },
    digit: function() {
      var r = this._apply("char");
      this._pred(r >= "0" && r <= "9");
      return r;
    },
    lower: function() {
      var r = this._apply("char");
      this._pred(r >= "a" && r <= "z");
      return r;
    },
    upper: function() {
      var r = this._apply("char");
      this._pred(r >= "A" && r <= "Z");
      return r;
    },
    letter: function() {
      var r = this._apply("char");
      this._pred(r >= "a" && r <= "z" || r >= "A" && r <= "Z");
      return r;
      // Note: The following code will potentially make use of more memoisations,
      // however it will have more overhead and it is unlikely that letter/upper/lower calls will be mixed in a memoisable way.
      // return this._or(function() { return this._apply("lower"); },
                      // function() { return this._apply("upper"); });
    },
    letterOrDigit: function() {
      return this._or(function() { return this._apply("letter"); },
                      function() { return this._apply("digit"); });
    },
    firstAndRest: function(first, rest)  {
      return this._many(function() {
        return this._apply(rest);
      }, this._apply(first));
    },
    seq: function(xs) {
      for (var idx = 0; idx < xs.length; idx++) {
        this._applyWithArgs("exactly", xs[idx]);
      }
      return xs;
    },
    notLast: function(rule) {
      var r = this._apply(rule);
      this._lookahead(function() { return this._apply(rule); });
      return r;
    },
    listOf: function(rule, delim) {
      return this._or(function() {
                        var r = this._apply(rule);
                        return this._many(function() {
                                            this._applyWithArgs("token", delim);
                                            return this._apply(rule);
                                          },
                                          r);
                      },
                      function() { return []; });
    },
    token: function(cs) {
      this._apply("spaces");
      return this._applyWithArgs("seq", cs);
    },
    fromTo: function (x, y) {
      return this._consumedBy(function() {
                                this._applyWithArgs("seq", x);
                                this._many(function() {
                                  this._not(function() { this._applyWithArgs("seq", y); });
                                  this._apply("char");
                                });
                                this._applyWithArgs("seq", y);
                              });
    },
    hexDigit: function() {
      var v, c;
      c = this._apply("char");
      v = "0123456789abcdef".indexOf(c.toLowerCase());
      if(v === -1) {
        throw this._fail();
      }
      return v;
    },
    escapedChar: function() {
      var s, c;
      this._applyWithArgs("exactly", "\\");
      c = this._apply("anything");
      switch (c) {
        case "'":  return "'";
        case '"':  return '"';
        case '\\': return '\\';
        case 'b':  return '\b';
        case 'f':  return '\f';
        case 'n':  return '\n';
        case 'r':  return '\r';
        case 't':  return '\t';
        case 'v':  return '\v';
        case "u":
          s = this._consumedBy(function() {
            this._apply("hexDigit");
            this._apply("hexDigit");
            this._apply("hexDigit");
            this._apply("hexDigit");
          });
          return String.fromCharCode(parseInt(s, 16));
        case "x":
          s = this._consumedBy(function() {
            this._apply("hexDigit");
            this._apply("hexDigit");
          });
          return String.fromCharCode(parseInt(s, 16));
        default:
          return c;
      }
    },

    initialize: function() {},
    // match and matchAll are a grammar's "public interface"
    _genericMatch: function(input, rule, args, matchFailed) {
      if (args == null) {
        args = [];
      }
      var realArgs = [rule];
      for (var idx = 0; idx < args.length; idx++) {
        realArgs.push(args[idx]);
      }
      var m = objectThatDelegatesTo(this, {input: input});
      m.initialize();

      return lookup(function() {
        return realArgs.length === 1 ?
            m._apply.call(m, realArgs[0]) :
            m._applyWithArgs.apply(m, realArgs);
      }, function(value) {
        return value;
      }, function(err) {
        if (typeof matchFailed === 'function') {
          var input = m.input;
          if (input.idx !== undefined) {
            while (input.tl !== undefined && input.tl.idx !== undefined) {
              input = input.tl;
            }
            input.idx--;
          }
          return matchFailed(m, input.idx, fail(), err);
        }
        throw err;
      });
    },
    match: function(obj, rule, args, matchFailed) {
      return this._genericMatch(makeListOMInputStream([obj], 0), rule, args, matchFailed);
    },
    matchAll: function(listyObj, rule, args, matchFailed) {
      return this._genericMatch(makeListOMInputStream(listyObj, 0), rule, args, matchFailed);
    },
    createInstance: function() {
      var m = objectThatDelegatesTo(this);
      m.initialize();
      m.matchAll = function(listyObj, aRule) {
        this.input = makeListOMInputStream(listyObj, 0);
        return this._apply(aRule);
      };
      m.match = function(obj, aRule) {
        return this.matchAll([obj], aRule);
      };
      return m;
    }
  };
})();

if(typeof exports !== "undefined") {
  exports.OMeta = OMeta;
}