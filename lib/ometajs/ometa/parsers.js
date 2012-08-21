var OMeta;

if (typeof window !== "undefined") {
    OMeta = window.OMeta;
} else {
    OMeta = require("../core").OMeta;
}

if (typeof exports === "undefined") {
    exports = {};
}

{
    var BSJSParser = exports.BSJSParser = OMeta._extend({
        comment: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "/":
                        return function() {
                            this._applyWithArgs("exactly", "/");
                            "//";
                            this._many(function() {
                                this._not(function() {
                                    return this._or(function() {
                                        return this._apply("end");
                                    }, function() {
                                        return function() {
                                            switch (this._apply("anything")) {
                                              case "\n":
                                                return "\n";
                                              default:
                                                throw this._fail();
                                            }
                                        }.call(this);
                                    });
                                });
                                return this._apply("char");
                            });
                            return this._or(function() {
                                return this._apply("end");
                            }, function() {
                                return function() {
                                    switch (this._apply("anything")) {
                                      case "\n":
                                        return "\n";
                                      default:
                                        throw this._fail();
                                    }
                                }.call(this);
                            });
                        }.call(this);
                      default:
                        throw this._fail();
                    }
                }.call(this);
            }, function() {
                return this._applyWithArgs("fromTo", "/*", "*/");
            });
        },
        space: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return OMeta._superApplyWithArgs(this, "space");
            }, function() {
                return this._apply("comment");
            });
        },
        nameFirst: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return this._apply("letter");
            }, function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "$":
                        return "$";
                      case "_":
                        return "_";
                      default:
                        throw this._fail();
                    }
                }.call(this);
            });
        },
        nameRest: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return this._apply("nameFirst");
            }, function() {
                return this._apply("digit");
            });
        },
        iName: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._consumedBy(function() {
                this._apply("nameFirst");
                return this._many(function() {
                    return this._apply("nameRest");
                });
            });
        },
        isKeyword: function(x) {
            var _fromIdx = this.input.idx, $elf = this;
            return this._pred(BSJSParser._isKeyword(x));
        },
        isConstant: function(x) {
            var _fromIdx = this.input.idx, $elf = this;
            return this._pred(BSJSParser._isConstant(x));
        },
        constant: function() {
            var _fromIdx = this.input.idx, $elf = this, c;
            c = this._apply("iName");
            this._applyWithArgs("isConstant", c);
            return [ "name", c ];
        },
        name: function() {
            var _fromIdx = this.input.idx, $elf = this, n;
            n = this._apply("iName");
            this._not(function() {
                return this._or(function() {
                    return this._applyWithArgs("isKeyword", n);
                }, function() {
                    return this._applyWithArgs("isConstant", n);
                });
            });
            return [ "name", n == "self" ? "$elf" : n ];
        },
        keyword: function() {
            var _fromIdx = this.input.idx, $elf = this, k;
            k = this._apply("iName");
            this._applyWithArgs("isKeyword", k);
            return [ k, k ];
        },
        hexLit: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            this._applyWithArgs("exactly", "0");
            this._applyWithArgs("exactly", "x");
            "0x";
            x = this._consumedBy(function() {
                return this._many1(function() {
                    return this._apply("hexDigit");
                });
            });
            return parseInt(x, 16);
        },
        binLit: function() {
            var _fromIdx = this.input.idx, $elf = this, b;
            this._applyWithArgs("exactly", "0");
            this._applyWithArgs("exactly", "b");
            "0b";
            b = this._consumedBy(function() {
                return this._many1(function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case "0":
                            return "0";
                          case "1":
                            return "1";
                          default:
                            throw this._fail();
                        }
                    }.call(this);
                });
            });
            return parseInt(b, 2);
        },
        decLit: function() {
            var _fromIdx = this.input.idx, f, $elf = this;
            f = this._consumedBy(function() {
                this._opt(function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case "-":
                            return "-";
                          case "+":
                            return "+";
                          default:
                            throw this._fail();
                        }
                    }.call(this);
                });
                this._many1(function() {
                    return this._apply("digit");
                });
                this._opt(function() {
                    this._applyWithArgs("exactly", ".");
                    return this._many1(function() {
                        return this._apply("digit");
                    });
                });
                return this._opt(function() {
                    ((function() {
                        switch (this._apply("anything")) {
                          case "E":
                            return "E";
                          case "e":
                            return "e";
                          default:
                            throw this._fail();
                        }
                    })).call(this);
                    this._opt(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "-":
                                return "-";
                              case "+":
                                return "+";
                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    });
                    return this._many1(function() {
                        return this._apply("digit");
                    });
                });
            });
            return parseFloat(f);
        },
        number: function() {
            var _fromIdx = this.input.idx, $elf = this, n;
            n = this._or(function() {
                return this._apply("hexLit");
            }, function() {
                return this._apply("binLit");
            }, function() {
                return this._apply("decLit");
            });
            return [ "number", n ];
        },
        str: function() {
            var _fromIdx = this.input.idx, $elf = this, cs, n;
            return this._or(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case '"':
                        return this._or(function() {
                            return function() {
                                switch (this._apply("anything")) {
                                  case '"':
                                    return function() {
                                        this._applyWithArgs("exactly", '"');
                                        '"""';
                                        cs = this._many(function() {
                                            return this._or(function() {
                                                return this._apply("escapedChar");
                                            }, function() {
                                                this._not(function() {
                                                    this._applyWithArgs("exactly", '"');
                                                    this._applyWithArgs("exactly", '"');
                                                    this._applyWithArgs("exactly", '"');
                                                    return '"""';
                                                });
                                                return this._apply("char");
                                            });
                                        });
                                        this._applyWithArgs("exactly", '"');
                                        this._applyWithArgs("exactly", '"');
                                        this._applyWithArgs("exactly", '"');
                                        '"""';
                                        return [ "string", cs.join("") ];
                                    }.call(this);
                                  default:
                                    throw this._fail();
                                }
                            }.call(this);
                        }, function() {
                            cs = this._many(function() {
                                return this._or(function() {
                                    return this._apply("escapedChar");
                                }, function() {
                                    this._not(function() {
                                        return this._applyWithArgs("exactly", '"');
                                    });
                                    return this._apply("char");
                                });
                            });
                            this._applyWithArgs("exactly", '"');
                            return [ "string", cs.join("") ];
                        });
                      case "'":
                        return function() {
                            cs = this._many(function() {
                                return this._or(function() {
                                    return this._apply("escapedChar");
                                }, function() {
                                    this._not(function() {
                                        return this._applyWithArgs("exactly", "'");
                                    });
                                    return this._apply("char");
                                });
                            });
                            this._applyWithArgs("exactly", "'");
                            return [ "string", cs.join("") ];
                        }.call(this);
                      default:
                        throw this._fail();
                    }
                }.call(this);
            }, function() {
                ((function() {
                    switch (this._apply("anything")) {
                      case "`":
                        return "`";
                      case "#":
                        return "#";
                      default:
                        throw this._fail();
                    }
                })).call(this);
                n = this._apply("iName");
                return [ "string", n ];
            });
        },
        special: function() {
            var _fromIdx = this.input.idx, $elf = this, s;
            s = function() {
                switch (this._apply("anything")) {
                  case "{":
                    return "{";
                  case "/":
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "=":
                                return "/=";
                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        return "/";
                    });
                  case "[":
                    return "[";
                  case ".":
                    return ".";
                  case "=":
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "=":
                                return this._or(function() {
                                    return function() {
                                        switch (this._apply("anything")) {
                                          case "=":
                                            return "===";
                                          default:
                                            throw this._fail();
                                        }
                                    }.call(this);
                                }, function() {
                                    return "==";
                                });
                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        return "=";
                    });
                  case ")":
                    return ")";
                  case "+":
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "=":
                                return "+=";
                              case "+":
                                return "++";
                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        return "+";
                    });
                  case "<":
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "=":
                                return "<=";
                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        return "<";
                    });
                  case "!":
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "=":
                                return this._or(function() {
                                    return function() {
                                        switch (this._apply("anything")) {
                                          case "=":
                                            return "!==";
                                          default:
                                            throw this._fail();
                                        }
                                    }.call(this);
                                }, function() {
                                    return "!=";
                                });
                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        return "!";
                    });
                  case "&":
                    return function() {
                        switch (this._apply("anything")) {
                          case "&":
                            return this._or(function() {
                                return function() {
                                    switch (this._apply("anything")) {
                                      case "=":
                                        return "&&=";
                                      default:
                                        throw this._fail();
                                    }
                                }.call(this);
                            }, function() {
                                return "&&";
                            });
                          default:
                            throw this._fail();
                        }
                    }.call(this);
                  case ":":
                    return ":";
                  case ";":
                    return ";";
                  case "?":
                    return "?";
                  case "}":
                    return "}";
                  case "-":
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "-":
                                return "--";
                              case "=":
                                return "-=";
                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        return "-";
                    });
                  case ">":
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "=":
                                return ">=";
                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        return ">";
                    });
                  case ",":
                    return ",";
                  case "]":
                    return "]";
                  case "|":
                    return function() {
                        switch (this._apply("anything")) {
                          case "|":
                            return this._or(function() {
                                return function() {
                                    switch (this._apply("anything")) {
                                      case "=":
                                        return "||=";
                                      default:
                                        throw this._fail();
                                    }
                                }.call(this);
                            }, function() {
                                return "||";
                            });
                          default:
                            throw this._fail();
                        }
                    }.call(this);
                  case "%":
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "=":
                                return "%=";
                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        return "%";
                    });
                  case "(":
                    return "(";
                  case "*":
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "=":
                                return "*=";
                              default:
                                throw this._fail();
                            }
                        }.call(this);
                    }, function() {
                        return "*";
                    });
                  default:
                    throw this._fail();
                }
            }.call(this);
            return [ s, s ];
        },
        tok: function() {
            var _fromIdx = this.input.idx, $elf = this;
            this._apply("spaces");
            return this._or(function() {
                return this._apply("name");
            }, function() {
                return this._apply("constant");
            }, function() {
                return this._apply("keyword");
            }, function() {
                return this._apply("special");
            }, function() {
                return this._apply("number");
            }, function() {
                return this._apply("str");
            });
        },
        toks: function() {
            var _fromIdx = this.input.idx, $elf = this, ts;
            ts = this._many(function() {
                return this._apply("token");
            });
            this._apply("spaces");
            this._apply("end");
            return ts;
        },
        token: function(tt) {
            var _fromIdx = this.input.idx, $elf = this, t;
            t = this._apply("tok");
            this._pred(t[0] == tt);
            return t[1];
        },
        spacesNoNl: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._many(function() {
                this._not(function() {
                    return this._applyWithArgs("exactly", "\n");
                });
                return this._apply("space");
            });
        },
        expr: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._apply("commaExpr");
        },
        commaExpr: function() {
            var _fromIdx = this.input.idx, e2, e1, $elf = this;
            return this._or(function() {
                e1 = this._apply("commaExpr");
                this._applyWithArgs("token", ",");
                e2 = this._apply("asgnExpr");
                return [ "binop", ",", e1, e2 ];
            }, function() {
                return this._apply("asgnExpr");
            });
        },
        asgnExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, e, rhs;
            e = this._apply("condExpr");
            return this._or(function() {
                this._applyWithArgs("token", "=");
                rhs = this._apply("asgnExpr");
                return [ "set", e, rhs ];
            }, function() {
                this._applyWithArgs("token", "+=");
                rhs = this._apply("asgnExpr");
                return [ "mset", e, "+", rhs ];
            }, function() {
                this._applyWithArgs("token", "-=");
                rhs = this._apply("asgnExpr");
                return [ "mset", e, "-", rhs ];
            }, function() {
                this._applyWithArgs("token", "*=");
                rhs = this._apply("asgnExpr");
                return [ "mset", e, "*", rhs ];
            }, function() {
                this._applyWithArgs("token", "/=");
                rhs = this._apply("asgnExpr");
                return [ "mset", e, "/", rhs ];
            }, function() {
                this._applyWithArgs("token", "%=");
                rhs = this._apply("asgnExpr");
                return [ "mset", e, "%", rhs ];
            }, function() {
                this._applyWithArgs("token", "&&=");
                rhs = this._apply("asgnExpr");
                return [ "mset", e, "&&", rhs ];
            }, function() {
                this._applyWithArgs("token", "||=");
                rhs = this._apply("asgnExpr");
                return [ "mset", e, "||", rhs ];
            }, function() {
                this._apply("empty");
                return e;
            });
        },
        condExpr: function() {
            var _fromIdx = this.input.idx, f, $elf = this, e, t;
            e = this._apply("orExpr");
            return this._or(function() {
                this._applyWithArgs("token", "?");
                t = this._apply("condExpr");
                this._applyWithArgs("token", ":");
                f = this._apply("condExpr");
                return [ "condExpr", e, t, f ];
            }, function() {
                this._apply("empty");
                return e;
            });
        },
        orExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                x = this._apply("orExpr");
                this._applyWithArgs("token", "||");
                y = this._apply("andExpr");
                return [ "binop", "||", x, y ];
            }, function() {
                return this._apply("andExpr");
            });
        },
        andExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                x = this._apply("andExpr");
                this._applyWithArgs("token", "&&");
                y = this._apply("eqExpr");
                return [ "binop", "&&", x, y ];
            }, function() {
                return this._apply("eqExpr");
            });
        },
        eqExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                x = this._apply("eqExpr");
                return this._or(function() {
                    this._applyWithArgs("token", "==");
                    y = this._apply("relExpr");
                    return [ "binop", "==", x, y ];
                }, function() {
                    this._applyWithArgs("token", "!=");
                    y = this._apply("relExpr");
                    return [ "binop", "!=", x, y ];
                }, function() {
                    this._applyWithArgs("token", "===");
                    y = this._apply("relExpr");
                    return [ "binop", "===", x, y ];
                }, function() {
                    this._applyWithArgs("token", "!==");
                    y = this._apply("relExpr");
                    return [ "binop", "!==", x, y ];
                });
            }, function() {
                return this._apply("relExpr");
            });
        },
        relExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                x = this._apply("relExpr");
                return this._or(function() {
                    this._applyWithArgs("token", ">");
                    y = this._apply("addExpr");
                    return [ "binop", ">", x, y ];
                }, function() {
                    this._applyWithArgs("token", ">=");
                    y = this._apply("addExpr");
                    return [ "binop", ">=", x, y ];
                }, function() {
                    this._applyWithArgs("token", "<");
                    y = this._apply("addExpr");
                    return [ "binop", "<", x, y ];
                }, function() {
                    this._applyWithArgs("token", "<=");
                    y = this._apply("addExpr");
                    return [ "binop", "<=", x, y ];
                }, function() {
                    this._applyWithArgs("token", "instanceof");
                    y = this._apply("addExpr");
                    return [ "binop", "instanceof", x, y ];
                });
            }, function() {
                return this._apply("addExpr");
            });
        },
        addExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                x = this._apply("addExpr");
                this._applyWithArgs("token", "+");
                y = this._apply("mulExpr");
                return [ "binop", "+", x, y ];
            }, function() {
                x = this._apply("addExpr");
                this._applyWithArgs("token", "-");
                y = this._apply("mulExpr");
                return [ "binop", "-", x, y ];
            }, function() {
                return this._apply("mulExpr");
            });
        },
        mulExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                x = this._apply("mulExpr");
                this._applyWithArgs("token", "*");
                y = this._apply("unary");
                return [ "binop", "*", x, y ];
            }, function() {
                x = this._apply("mulExpr");
                this._applyWithArgs("token", "/");
                y = this._apply("unary");
                return [ "binop", "/", x, y ];
            }, function() {
                x = this._apply("mulExpr");
                this._applyWithArgs("token", "%");
                y = this._apply("unary");
                return [ "binop", "%", x, y ];
            }, function() {
                return this._apply("unary");
            });
        },
        unary: function() {
            var _fromIdx = this.input.idx, $elf = this, p;
            return this._or(function() {
                this._applyWithArgs("token", "-");
                p = this._apply("postfix");
                return [ "unop", "-", p ];
            }, function() {
                this._applyWithArgs("token", "+");
                p = this._apply("postfix");
                return [ "unop", "+", p ];
            }, function() {
                this._applyWithArgs("token", "++");
                p = this._apply("postfix");
                return [ "preop", "++", p ];
            }, function() {
                this._applyWithArgs("token", "--");
                p = this._apply("postfix");
                return [ "preop", "--", p ];
            }, function() {
                this._applyWithArgs("token", "!");
                p = this._apply("unary");
                return [ "unop", "!", p ];
            }, function() {
                this._applyWithArgs("token", "void");
                p = this._apply("unary");
                return [ "unop", "void", p ];
            }, function() {
                this._applyWithArgs("token", "delete");
                p = this._apply("unary");
                return [ "unop", "delete", p ];
            }, function() {
                this._applyWithArgs("token", "typeof");
                p = this._apply("unary");
                return [ "unop", "typeof", p ];
            }, function() {
                return this._apply("postfix");
            });
        },
        postfix: function() {
            var _fromIdx = this.input.idx, $elf = this, p;
            p = this._apply("primExpr");
            return this._or(function() {
                this._apply("spacesNoNl");
                this._applyWithArgs("token", "++");
                return [ "postop", "++", p ];
            }, function() {
                this._apply("spacesNoNl");
                this._applyWithArgs("token", "--");
                return [ "postop", "--", p ];
            }, function() {
                this._apply("empty");
                return p;
            });
        },
        primExpr: function() {
            var _fromIdx = this.input.idx, i, as, $elf = this, f, m, p;
            return this._or(function() {
                p = this._apply("primExpr");
                return this._or(function() {
                    this._applyWithArgs("token", "[");
                    i = this._apply("expr");
                    this._applyWithArgs("token", "]");
                    return [ "getp", i, p ];
                }, function() {
                    this._applyWithArgs("token", ".");
                    m = this._applyWithArgs("token", "name");
                    this._applyWithArgs("token", "(");
                    as = this._applyWithArgs("listOf", "asgnExpr", ",");
                    this._applyWithArgs("token", ")");
                    return [ "send", m, p ].concat(as);
                }, function() {
                    this._applyWithArgs("token", ".");
                    this._apply("spaces");
                    m = this._apply("iName");
                    this._applyWithArgs("token", "(");
                    as = this._applyWithArgs("listOf", "asgnExpr", ",");
                    this._applyWithArgs("token", ")");
                    this._applyWithArgs("isKeyword", m);
                    return [ "send", m, p ].concat(as);
                }, function() {
                    this._applyWithArgs("token", ".");
                    f = this._applyWithArgs("token", "name");
                    return [ "getp", [ "string", f ], p ];
                }, function() {
                    this._applyWithArgs("token", ".");
                    this._apply("spaces");
                    f = this._apply("iName");
                    this._applyWithArgs("isKeyword", f);
                    return [ "getp", [ "string", f ], p ];
                }, function() {
                    this._applyWithArgs("token", "(");
                    as = this._applyWithArgs("listOf", "asgnExpr", ",");
                    this._applyWithArgs("token", ")");
                    return [ "call", p ].concat(as);
                });
            }, function() {
                return this._apply("primExprHd");
            });
        },
        primExprHd: function() {
            var _fromIdx = this.input.idx, as, $elf = this, e, es, s, n;
            return this._or(function() {
                this._applyWithArgs("token", "(");
                e = this._apply("expr");
                this._applyWithArgs("token", ")");
                return e;
            }, function() {
                this._applyWithArgs("token", "this");
                return [ "this" ];
            }, function() {
                n = this._applyWithArgs("token", "name");
                return [ "get", n ];
            }, function() {
                n = this._applyWithArgs("token", "number");
                return [ "number", n ];
            }, function() {
                s = this._applyWithArgs("token", "string");
                return [ "string", s ];
            }, function() {
                this._applyWithArgs("token", "function");
                return this._apply("funcRest");
            }, function() {
                this._applyWithArgs("token", "new");
                n = this._applyWithArgs("token", "name");
                this._applyWithArgs("token", "(");
                as = this._applyWithArgs("listOf", "asgnExpr", ",");
                this._applyWithArgs("token", ")");
                return [ "new", n ].concat(as);
            }, function() {
                this._applyWithArgs("token", "[");
                es = this._applyWithArgs("listOf", "asgnExpr", ",");
                this._applyWithArgs("token", "]");
                return [ "arr" ].concat(es);
            }, function() {
                return this._apply("json");
            }, function() {
                return this._apply("regExp");
            });
        },
        json: function() {
            var _fromIdx = this.input.idx, $elf = this, bs;
            this._applyWithArgs("token", "{");
            bs = this._applyWithArgs("listOf", "jsonBinding", ",");
            this._applyWithArgs("token", "}");
            return [ "json" ].concat(bs);
        },
        jsonBinding: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            n = this._apply("jsonPropName");
            this._applyWithArgs("token", ":");
            v = this._apply("asgnExpr");
            return [ "binding", n, v ];
        },
        jsonPropName: function() {
            var _fromIdx = this.input.idx, $elf = this, n;
            return this._or(function() {
                return this._applyWithArgs("token", "name");
            }, function() {
                return this._applyWithArgs("token", "number");
            }, function() {
                return this._applyWithArgs("token", "string");
            }, function() {
                this._apply("spaces");
                n = this._apply("iName");
                this._applyWithArgs("isKeyword", n);
                return n;
            });
        },
        regExp: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            this._apply("spaces");
            x = this._consumedBy(function() {
                this._applyWithArgs("exactly", "/");
                this._apply("regExpBody");
                this._applyWithArgs("exactly", "/");
                return this._many(function() {
                    return this._apply("regExpFlag");
                });
            });
            return [ "regExp", x ];
        },
        regExpBody: function() {
            var _fromIdx = this.input.idx, $elf = this;
            this._not(function() {
                return this._applyWithArgs("exactly", "*");
            });
            return this._many1(function() {
                return this._apply("regExpChar");
            });
        },
        regExpChar: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return this._apply("regExpClass");
            }, function() {
                this._not(function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case "/":
                            return "/";
                          case "[":
                            return "[";
                          default:
                            throw this._fail();
                        }
                    }.call(this);
                });
                return this._apply("regExpNonTerm");
            });
        },
        regExpNonTerm: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return this._apply("escapedChar");
            }, function() {
                this._not(function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case "\n":
                            return "\n";
                          case "\r":
                            return "\r";
                          default:
                            throw this._fail();
                        }
                    }.call(this);
                });
                return this._apply("char");
            });
        },
        regExpClass: function() {
            var _fromIdx = this.input.idx, $elf = this;
            this._applyWithArgs("exactly", "[");
            this._many(function() {
                return this._apply("regExpClassChar");
            });
            return this._applyWithArgs("exactly", "]");
        },
        regExpClassChar: function() {
            var _fromIdx = this.input.idx, $elf = this;
            this._not(function() {
                return this._applyWithArgs("exactly", "]");
            });
            return this._apply("regExpNonTerm");
        },
        regExpFlag: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._apply("nameFirst");
        },
        formal: function() {
            var _fromIdx = this.input.idx, $elf = this;
            this._apply("spaces");
            return this._applyWithArgs("token", "name");
        },
        funcRest: function() {
            var _fromIdx = this.input.idx, $elf = this, fs, body;
            this._applyWithArgs("token", "(");
            fs = this._applyWithArgs("listOf", "formal", ",");
            this._applyWithArgs("token", ")");
            this._applyWithArgs("token", "{");
            body = this._apply("srcElems");
            this._applyWithArgs("token", "}");
            return [ "func", fs, body ];
        },
        sc: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                this._apply("spacesNoNl");
                return this._or(function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case "\n":
                            return "\n";
                          default:
                            throw this._fail();
                        }
                    }.call(this);
                }, function() {
                    return this._lookahead(function() {
                        return this._applyWithArgs("exactly", "}");
                    });
                }, function() {
                    return this._apply("end");
                });
            }, function() {
                return this._applyWithArgs("token", ";");
            });
        },
        binding: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            n = this._applyWithArgs("token", "name");
            this._not(function() {
                return this._applyWithArgs("isConstant", n);
            });
            return this._or(function() {
                this._applyWithArgs("token", "=");
                v = this._apply("asgnExpr");
                return [ n, v ];
            }, function() {
                return [ n ];
            });
        },
        block: function() {
            var _fromIdx = this.input.idx, $elf = this, ss;
            this._applyWithArgs("token", "{");
            ss = this._apply("srcElems");
            this._applyWithArgs("token", "}");
            return ss;
        },
        vars: function() {
            var _fromIdx = this.input.idx, $elf = this, bs;
            this._applyWithArgs("token", "var");
            bs = this._applyWithArgs("listOf", "binding", ",");
            return [ "var" ].concat(bs);
        },
        stmt: function() {
            var _fromIdx = this.input.idx, f, i, $elf = this, t, e, b, cs, v, u, x, bs, c, s;
            return this._or(function() {
                return this._apply("block");
            }, function() {
                bs = this._apply("vars");
                this._apply("sc");
                return bs;
            }, function() {
                this._applyWithArgs("token", "if");
                this._applyWithArgs("token", "(");
                c = this._apply("expr");
                this._applyWithArgs("token", ")");
                t = this._apply("stmt");
                f = this._or(function() {
                    this._applyWithArgs("token", "else");
                    return this._apply("stmt");
                }, function() {
                    this._apply("empty");
                    return [ "get", "undefined" ];
                });
                return [ "if", c, t, f ];
            }, function() {
                this._applyWithArgs("token", "while");
                this._applyWithArgs("token", "(");
                c = this._apply("expr");
                this._applyWithArgs("token", ")");
                s = this._apply("stmt");
                return [ "while", c, s ];
            }, function() {
                this._applyWithArgs("token", "do");
                s = this._apply("stmt");
                this._applyWithArgs("token", "while");
                this._applyWithArgs("token", "(");
                c = this._apply("expr");
                this._applyWithArgs("token", ")");
                this._apply("sc");
                return [ "doWhile", s, c ];
            }, function() {
                this._applyWithArgs("token", "for");
                this._applyWithArgs("token", "(");
                i = this._or(function() {
                    return this._apply("vars");
                }, function() {
                    return this._apply("expr");
                }, function() {
                    this._apply("empty");
                    return [ "get", "undefined" ];
                });
                this._applyWithArgs("token", ";");
                c = this._or(function() {
                    return this._apply("expr");
                }, function() {
                    this._apply("empty");
                    return [ "get", "true" ];
                });
                this._applyWithArgs("token", ";");
                u = this._or(function() {
                    return this._apply("expr");
                }, function() {
                    this._apply("empty");
                    return [ "get", "undefined" ];
                });
                this._applyWithArgs("token", ")");
                s = this._apply("stmt");
                return [ "for", i, c, u, s ];
            }, function() {
                this._applyWithArgs("token", "for");
                this._applyWithArgs("token", "(");
                v = this._or(function() {
                    this._applyWithArgs("token", "var");
                    b = this._apply("binding");
                    return [ "var", b ];
                }, function() {
                    return this._apply("expr");
                });
                this._applyWithArgs("token", "in");
                e = this._apply("asgnExpr");
                this._applyWithArgs("token", ")");
                s = this._apply("stmt");
                return [ "forIn", v, e, s ];
            }, function() {
                this._applyWithArgs("token", "switch");
                this._applyWithArgs("token", "(");
                e = this._apply("expr");
                this._applyWithArgs("token", ")");
                this._applyWithArgs("token", "{");
                cs = this._many(function() {
                    return this._or(function() {
                        this._applyWithArgs("token", "case");
                        c = this._apply("asgnExpr");
                        this._applyWithArgs("token", ":");
                        cs = this._apply("srcElems");
                        return [ "case", c, cs ];
                    }, function() {
                        this._applyWithArgs("token", "default");
                        this._applyWithArgs("token", ":");
                        cs = this._apply("srcElems");
                        return [ "default", cs ];
                    });
                });
                this._applyWithArgs("token", "}");
                return [ "switch", e ].concat(cs);
            }, function() {
                this._applyWithArgs("token", "break");
                this._apply("sc");
                return [ "break" ];
            }, function() {
                this._applyWithArgs("token", "continue");
                this._apply("sc");
                return [ "continue" ];
            }, function() {
                this._applyWithArgs("token", "throw");
                this._apply("spacesNoNl");
                e = this._apply("asgnExpr");
                this._apply("sc");
                return [ "throw", e ];
            }, function() {
                this._applyWithArgs("token", "try");
                t = this._apply("block");
                this._applyWithArgs("token", "catch");
                this._applyWithArgs("token", "(");
                e = this._applyWithArgs("token", "name");
                this._applyWithArgs("token", ")");
                c = this._apply("block");
                f = this._or(function() {
                    this._applyWithArgs("token", "finally");
                    return this._apply("block");
                }, function() {
                    this._apply("empty");
                    return [ "get", "undefined" ];
                });
                return [ "try", t, e, c, f ];
            }, function() {
                this._applyWithArgs("token", "return");
                e = this._or(function() {
                    return this._apply("expr");
                }, function() {
                    this._apply("empty");
                    return [ "get", "undefined" ];
                });
                this._apply("sc");
                return [ "return", e ];
            }, function() {
                this._applyWithArgs("token", "with");
                this._applyWithArgs("token", "(");
                x = this._apply("expr");
                this._applyWithArgs("token", ")");
                s = this._apply("stmt");
                return [ "with", x, s ];
            }, function() {
                e = this._apply("expr");
                this._apply("sc");
                return e;
            }, function() {
                this._applyWithArgs("token", ";");
                return [ "get", "undefined" ];
            });
        },
        srcElem: function() {
            var _fromIdx = this.input.idx, f, $elf = this, n;
            return this._or(function() {
                this._applyWithArgs("token", "function");
                n = this._applyWithArgs("token", "name");
                f = this._apply("funcRest");
                return [ "var", [ n, f ] ];
            }, function() {
                return this._apply("stmt");
            });
        },
        srcElems: function() {
            var _fromIdx = this.input.idx, $elf = this, ss;
            ss = this._many(function() {
                return this._apply("srcElem");
            });
            return [ "begin" ].concat(ss);
        },
        topLevel: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            r = this._apply("srcElems");
            this._apply("spaces");
            this._apply("end");
            return r;
        }
    });
    var keywords = [ "break", "case", "catch", "continue", "default", "delete", "do", "else", "finally", "for", "function", "if", "in", "instanceof", "new", "return", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with", "ometa" ];
    BSJSParser["_isKeyword"] = function(k) {
        return keywords.indexOf(k) !== -1;
    };
    var constants = [ "true", "false", "undefined" ];
    BSJSParser["_isConstant"] = function(c) {
        return constants.indexOf(c) !== -1;
    };
    var BSSemActionParser = exports.BSSemActionParser = BSJSParser._extend({
        curlySemAction: function() {
            var _fromIdx = this.input.idx, r, $elf = this, ss, s;
            return this._or(function() {
                this._applyWithArgs("token", "{");
                r = this._apply("asgnExpr");
                this._apply("sc");
                this._applyWithArgs("token", "}");
                this._apply("spaces");
                return r;
            }, function() {
                this._applyWithArgs("token", "{");
                ss = this._many(function() {
                    s = this._apply("srcElem");
                    this._lookahead(function() {
                        return this._apply("srcElem");
                    });
                    return s;
                });
                s = this._or(function() {
                    r = this._apply("asgnExpr");
                    this._apply("sc");
                    return [ "return", r ];
                }, function() {
                    return this._apply("srcElem");
                });
                ss.push(s);
                this._applyWithArgs("token", "}");
                this._apply("spaces");
                return [ "send", "call", [ "func", [], [ "begin" ].concat(ss) ], [ "this" ] ];
            });
        },
        semAction: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            return this._or(function() {
                return this._apply("curlySemAction");
            }, function() {
                r = this._apply("primExpr");
                this._apply("spaces");
                return r;
            });
        }
    });
    var BSJSIdentity = exports.BSJSIdentity = OMeta._extend({
        trans: function() {
            var _fromIdx = this.input.idx, $elf = this, t, ans;
            return this._or(function() {
                this._form(function() {
                    t = this._apply("anything");
                    return ans = this._applyWithArgs("apply", t);
                });
                return ans;
            }, function() {
                this._form(function() {
                    return t = this._apply("anything");
                });
                return t;
            });
        },
        curlyTrans: function() {
            var _fromIdx = this.input.idx, r, $elf = this, rs;
            return this._or(function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "begin");
                    return r = this._apply("curlyTrans");
                });
                return [ "begin", r ];
            }, function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "begin");
                    return rs = this._many(function() {
                        return this._apply("trans");
                    });
                });
                return [ "begin" ].concat(rs);
            }, function() {
                r = this._apply("trans");
                return r;
            });
        },
        "this": function() {
            var _fromIdx = this.input.idx, $elf = this;
            return [ "this" ];
        },
        "break": function() {
            var _fromIdx = this.input.idx, $elf = this;
            return [ "break" ];
        },
        "continue": function() {
            var _fromIdx = this.input.idx, $elf = this;
            return [ "continue" ];
        },
        number: function() {
            var _fromIdx = this.input.idx, $elf = this, n;
            n = this._apply("anything");
            return [ "number", n ];
        },
        string: function() {
            var _fromIdx = this.input.idx, $elf = this, s;
            s = this._apply("anything");
            return [ "string", s ];
        },
        regExp: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("anything");
            return [ "regExp", x ];
        },
        arr: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "arr" ].concat(xs);
        },
        unop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            op = this._apply("anything");
            x = this._apply("trans");
            return [ "unop", op, x ];
        },
        get: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("anything");
            return [ "get", x ];
        },
        getp: function() {
            var _fromIdx = this.input.idx, $elf = this, fd, x;
            fd = this._apply("trans");
            x = this._apply("trans");
            return [ "getp", fd, x ];
        },
        set: function() {
            var _fromIdx = this.input.idx, $elf = this, rhs, lhs;
            lhs = this._apply("trans");
            rhs = this._apply("trans");
            return [ "set", lhs, rhs ];
        },
        mset: function() {
            var _fromIdx = this.input.idx, $elf = this, op, rhs, lhs;
            lhs = this._apply("trans");
            op = this._apply("anything");
            rhs = this._apply("trans");
            return [ "mset", lhs, op, rhs ];
        },
        binop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x, y;
            op = this._apply("anything");
            x = this._apply("trans");
            y = this._apply("trans");
            return [ "binop", op, x, y ];
        },
        preop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            op = this._apply("anything");
            x = this._apply("trans");
            return [ "preop", op, x ];
        },
        postop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            op = this._apply("anything");
            x = this._apply("trans");
            return [ "postop", op, x ];
        },
        "return": function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return [ "return", x ];
        },
        "with": function() {
            var _fromIdx = this.input.idx, $elf = this, x, s;
            x = this._apply("trans");
            s = this._apply("curlyTrans");
            return [ "with", x, s ];
        },
        "if": function() {
            var _fromIdx = this.input.idx, $elf = this, t, e, cond;
            cond = this._apply("trans");
            t = this._apply("curlyTrans");
            e = this._apply("curlyTrans");
            return [ "if", cond, t, e ];
        },
        condExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, t, e, cond;
            cond = this._apply("trans");
            t = this._apply("trans");
            e = this._apply("trans");
            return [ "condExpr", cond, t, e ];
        },
        "while": function() {
            var _fromIdx = this.input.idx, $elf = this, body, cond;
            cond = this._apply("trans");
            body = this._apply("curlyTrans");
            return [ "while", cond, body ];
        },
        doWhile: function() {
            var _fromIdx = this.input.idx, $elf = this, body, cond;
            body = this._apply("curlyTrans");
            cond = this._apply("trans");
            return [ "doWhile", body, cond ];
        },
        "for": function() {
            var _fromIdx = this.input.idx, $elf = this, init, cond, body, upd;
            init = this._apply("trans");
            cond = this._apply("trans");
            upd = this._apply("trans");
            body = this._apply("curlyTrans");
            return [ "for", init, cond, upd, body ];
        },
        forIn: function() {
            var _fromIdx = this.input.idx, $elf = this, arr, x, body;
            x = this._apply("trans");
            arr = this._apply("trans");
            body = this._apply("curlyTrans");
            return [ "forIn", x, arr, body ];
        },
        begin: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                x = this._apply("trans");
                this._apply("end");
                return [ "begin", x ];
            }, function() {
                xs = this._many(function() {
                    return this._apply("trans");
                });
                return [ "begin" ].concat(xs);
            });
        },
        func: function() {
            var _fromIdx = this.input.idx, $elf = this, body, args;
            args = this._apply("anything");
            body = this._apply("curlyTrans");
            return [ "func", args, body ];
        },
        call: function() {
            var _fromIdx = this.input.idx, $elf = this, args, fn;
            fn = this._apply("trans");
            args = this._many(function() {
                return this._apply("trans");
            });
            return [ "call", fn ].concat(args);
        },
        send: function() {
            var msg, _fromIdx = this.input.idx, $elf = this, recv, args;
            msg = this._apply("anything");
            recv = this._apply("trans");
            args = this._many(function() {
                return this._apply("trans");
            });
            return [ "send", msg, recv ].concat(args);
        },
        "new": function() {
            var _fromIdx = this.input.idx, $elf = this, args, cls;
            cls = this._apply("anything");
            args = this._many(function() {
                return this._apply("trans");
            });
            return [ "new", cls ].concat(args);
        },
        "var": function() {
            var _fromIdx = this.input.idx, $elf = this, vs;
            vs = this._many1(function() {
                return this._apply("varItem");
            });
            return [ "var" ].concat(vs);
        },
        varItem: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            return this._or(function() {
                this._form(function() {
                    n = this._apply("anything");
                    return v = this._apply("trans");
                });
                return [ n, v ];
            }, function() {
                this._form(function() {
                    return n = this._apply("anything");
                });
                return [ n ];
            });
        },
        "throw": function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return [ "throw", x ];
        },
        "try": function() {
            var _fromIdx = this.input.idx, f, $elf = this, x, name, c;
            x = this._apply("curlyTrans");
            name = this._apply("anything");
            c = this._apply("curlyTrans");
            f = this._apply("curlyTrans");
            return [ "try", x, name, c, f ];
        },
        json: function() {
            var _fromIdx = this.input.idx, props, $elf = this;
            props = this._many(function() {
                return this._apply("trans");
            });
            return [ "json" ].concat(props);
        },
        binding: function() {
            var _fromIdx = this.input.idx, val, $elf = this, name;
            name = this._apply("anything");
            val = this._apply("trans");
            return [ "binding", name, val ];
        },
        "switch": function() {
            var _fromIdx = this.input.idx, $elf = this, cases, x;
            x = this._apply("trans");
            cases = this._many(function() {
                return this._apply("trans");
            });
            return [ "switch", x ].concat(cases);
        },
        "case": function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            x = this._apply("trans");
            y = this._apply("trans");
            return [ "case", x, y ];
        },
        "default": function() {
            var _fromIdx = this.input.idx, $elf = this, y;
            y = this._apply("trans");
            return [ "default", y ];
        }
    });
    var BSJSTranslator = exports.BSJSTranslator = OMeta._extend({
        trans: function() {
            var _fromIdx = this.input.idx, $elf = this, t, ans;
            this._form(function() {
                t = this._apply("anything");
                return ans = this._applyWithArgs("apply", t);
            });
            return ans;
        },
        curlyTrans: function() {
            var _fromIdx = this.input.idx, r, $elf = this, rs;
            return this._or(function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "begin");
                    return r = this._apply("curlyTrans");
                });
                return r;
            }, function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "begin");
                    return rs = this._many(function() {
                        return this._apply("trans");
                    });
                });
                return "{" + rs.join(";") + "}";
            }, function() {
                r = this._apply("trans");
                return "{" + r + "}";
            });
        },
        "this": function() {
            var _fromIdx = this.input.idx, $elf = this;
            return "this";
        },
        "break": function() {
            var _fromIdx = this.input.idx, $elf = this;
            return "break";
        },
        "continue": function() {
            var _fromIdx = this.input.idx, $elf = this;
            return "continue";
        },
        number: function() {
            var _fromIdx = this.input.idx, $elf = this, n;
            n = this._apply("anything");
            return "(" + n + ")";
        },
        string: function() {
            var _fromIdx = this.input.idx, $elf = this, s;
            s = this._apply("anything");
            return JSON.stringify(s);
        },
        regExp: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("anything");
            return x;
        },
        arr: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            xs = this._many(function() {
                return this._apply("trans");
            });
            return "[" + xs.join(",") + "]";
        },
        unop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            op = this._apply("anything");
            x = this._apply("trans");
            return "(" + op + " " + x + ")";
        },
        getp: function() {
            var _fromIdx = this.input.idx, $elf = this, fd, x;
            fd = this._apply("trans");
            x = this._apply("trans");
            return x + "[" + fd + "]";
        },
        get: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("anything");
            return x;
        },
        set: function() {
            var _fromIdx = this.input.idx, $elf = this, rhs, lhs;
            lhs = this._apply("trans");
            rhs = this._apply("trans");
            return "(" + lhs + "=" + rhs + ")";
        },
        mset: function() {
            var _fromIdx = this.input.idx, $elf = this, op, rhs, lhs;
            lhs = this._apply("trans");
            op = this._apply("anything");
            rhs = this._apply("trans");
            return "(" + lhs + op + "=" + rhs + ")";
        },
        binop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x, y;
            op = this._apply("anything");
            x = this._apply("trans");
            y = this._apply("trans");
            return "(" + x + " " + op + " " + y + ")";
        },
        preop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            op = this._apply("anything");
            x = this._apply("trans");
            return op + x;
        },
        postop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            op = this._apply("anything");
            x = this._apply("trans");
            return x + op;
        },
        "return": function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return "return " + x;
        },
        "with": function() {
            var _fromIdx = this.input.idx, $elf = this, x, s;
            x = this._apply("trans");
            s = this._apply("curlyTrans");
            return "with(" + x + ")" + s;
        },
        "if": function() {
            var _fromIdx = this.input.idx, $elf = this, t, e, cond;
            cond = this._apply("trans");
            t = this._apply("curlyTrans");
            e = this._apply("curlyTrans");
            return "if(" + cond + ")" + t + "else" + e;
        },
        condExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, t, e, cond;
            cond = this._apply("trans");
            t = this._apply("trans");
            e = this._apply("trans");
            return "(" + cond + "?" + t + ":" + e + ")";
        },
        "while": function() {
            var _fromIdx = this.input.idx, $elf = this, body, cond;
            cond = this._apply("trans");
            body = this._apply("curlyTrans");
            return "while(" + cond + ")" + body;
        },
        doWhile: function() {
            var _fromIdx = this.input.idx, $elf = this, body, cond;
            body = this._apply("curlyTrans");
            cond = this._apply("trans");
            return "do" + body + "while(" + cond + ")";
        },
        "for": function() {
            var _fromIdx = this.input.idx, $elf = this, init, cond, body, upd;
            init = this._apply("trans");
            cond = this._apply("trans");
            upd = this._apply("trans");
            body = this._apply("curlyTrans");
            return "for(" + init + ";" + cond + ";" + upd + ")" + body;
        },
        forIn: function() {
            var _fromIdx = this.input.idx, $elf = this, arr, x, body;
            x = this._apply("trans");
            arr = this._apply("trans");
            body = this._apply("curlyTrans");
            return "for(" + x + " in " + arr + ")" + body;
        },
        begin: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                x = this._apply("trans");
                this._apply("end");
                return x;
            }, function() {
                xs = this._many(function() {
                    x = this._apply("trans");
                    return this._or(function() {
                        this._or(function() {
                            return this._pred(x[x["length"] - 1] == "}");
                        }, function() {
                            return this._apply("end");
                        });
                        return x;
                    }, function() {
                        this._apply("empty");
                        return x + ";";
                    });
                });
                return "{" + xs.join("") + "}";
            });
        },
        func: function() {
            var _fromIdx = this.input.idx, $elf = this, body, args;
            args = this._apply("anything");
            body = this._apply("curlyTrans");
            return "(function (" + args.join(",") + ")" + body + ")";
        },
        call: function() {
            var _fromIdx = this.input.idx, $elf = this, args, fn;
            fn = this._apply("trans");
            args = this._many(function() {
                return this._apply("trans");
            });
            return fn + "(" + args.join(",") + ")";
        },
        send: function() {
            var msg, _fromIdx = this.input.idx, $elf = this, recv, args;
            msg = this._apply("anything");
            recv = this._apply("trans");
            args = this._many(function() {
                return this._apply("trans");
            });
            return recv + "." + msg + "(" + args.join(",") + ")";
        },
        "new": function() {
            var _fromIdx = this.input.idx, $elf = this, args, cls;
            cls = this._apply("anything");
            args = this._many(function() {
                return this._apply("trans");
            });
            return "new " + cls + "(" + args.join(",") + ")";
        },
        "var": function() {
            var _fromIdx = this.input.idx, $elf = this, vs;
            vs = this._many1(function() {
                return this._apply("varItem");
            });
            return "var " + vs.join(",");
        },
        varItem: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            return this._or(function() {
                this._form(function() {
                    n = this._apply("anything");
                    return v = this._apply("trans");
                });
                return n + " = " + v;
            }, function() {
                this._form(function() {
                    return n = this._apply("anything");
                });
                return n;
            });
        },
        "throw": function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return "throw " + x;
        },
        "try": function() {
            var _fromIdx = this.input.idx, f, $elf = this, x, name, c;
            x = this._apply("curlyTrans");
            name = this._apply("anything");
            c = this._apply("curlyTrans");
            f = this._apply("curlyTrans");
            return "try " + x + "catch(" + name + ")" + c + "finally" + f;
        },
        json: function() {
            var _fromIdx = this.input.idx, props, $elf = this;
            props = this._many(function() {
                return this._apply("trans");
            });
            return "({" + props.join(",") + "})";
        },
        binding: function() {
            var _fromIdx = this.input.idx, val, $elf = this, name;
            name = this._apply("anything");
            val = this._apply("trans");
            return JSON.stringify(name) + ": " + val;
        },
        "switch": function() {
            var _fromIdx = this.input.idx, $elf = this, cases, x;
            x = this._apply("trans");
            cases = this._many(function() {
                return this._apply("trans");
            });
            return "switch(" + x + "){" + cases.join(";") + "}";
        },
        "case": function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            x = this._apply("trans");
            y = this._apply("trans");
            return "case " + x + ": " + y;
        },
        "default": function() {
            var _fromIdx = this.input.idx, $elf = this, y;
            y = this._apply("trans");
            return "default: " + y;
        }
    });
    var BSOMetaParser = exports.BSOMetaParser = OMeta._extend({
        space: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return OMeta._superApplyWithArgs(this, "space");
            }, function() {
                return this._applyWithArgs("fromTo", "//", "\n");
            }, function() {
                return this._applyWithArgs("fromTo", "/*", "*/");
            });
        },
        nameFirst: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "$":
                        return "$";
                      case "_":
                        return "_";
                      default:
                        throw this._fail();
                    }
                }.call(this);
            }, function() {
                return this._apply("letter");
            });
        },
        nameRest: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return this._apply("nameFirst");
            }, function() {
                return this._apply("digit");
            });
        },
        tsName: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._consumedBy(function() {
                this._apply("nameFirst");
                return this._many(function() {
                    return this._apply("nameRest");
                });
            });
        },
        name: function() {
            var _fromIdx = this.input.idx, $elf = this;
            this._apply("spaces");
            return this._apply("tsName");
        },
        eChar: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return this._apply("escapedChar");
            }, function() {
                return this._apply("char");
            });
        },
        tsString: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            this._applyWithArgs("exactly", "'");
            xs = this._many(function() {
                this._not(function() {
                    return this._applyWithArgs("exactly", "'");
                });
                return this._apply("eChar");
            });
            this._applyWithArgs("exactly", "'");
            return xs.join("");
        },
        seqString: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            this._applyWithArgs("exactly", "`");
            this._applyWithArgs("exactly", "`");
            xs = this._many(function() {
                this._not(function() {
                    this._applyWithArgs("exactly", "'");
                    return this._applyWithArgs("exactly", "'");
                });
                return this._apply("eChar");
            });
            this._applyWithArgs("exactly", "'");
            this._applyWithArgs("exactly", "'");
            return [ "App", "seq", JSON.stringify(xs.join("")) ];
        },
        tokenString: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            this._applyWithArgs("exactly", '"');
            xs = this._many(function() {
                this._not(function() {
                    return this._applyWithArgs("exactly", '"');
                });
                return this._apply("eChar");
            });
            this._applyWithArgs("exactly", '"');
            return [ "App", "token", JSON.stringify(xs.join("")) ];
        },
        string: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            xs = this._or(function() {
                ((function() {
                    switch (this._apply("anything")) {
                      case "`":
                        return "`";
                      case "#":
                        return "#";
                      default:
                        throw this._fail();
                    }
                })).call(this);
                return this._apply("tsName");
            }, function() {
                return this._apply("tsString");
            });
            return [ "App", "exactly", JSON.stringify(xs) ];
        },
        number: function() {
            var _fromIdx = this.input.idx, $elf = this, n;
            n = this._consumedBy(function() {
                this._opt(function() {
                    return this._applyWithArgs("exactly", "-");
                });
                return this._many1(function() {
                    return this._apply("digit");
                });
            });
            return [ "App", "exactly", n ];
        },
        keyword: function(xs) {
            var _fromIdx = this.input.idx, $elf = this;
            this._applyWithArgs("token", xs);
            this._not(function() {
                return this._apply("letterOrDigit");
            });
            return xs;
        },
        args: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return this._or(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "(":
                        return function() {
                            xs = this._applyWithArgs("listOf", "hostExpr", ",");
                            this._applyWithArgs("token", ")");
                            return xs;
                        }.call(this);
                      default:
                        throw this._fail();
                    }
                }.call(this);
            }, function() {
                this._apply("empty");
                return [];
            });
        },
        application: function() {
            var _fromIdx = this.input.idx, rule, as, $elf = this, grm;
            return this._or(function() {
                this._applyWithArgs("token", "^");
                rule = this._apply("name");
                as = this._apply("args");
                return [ "App", "super", "'" + rule + "'" ].concat(as);
            }, function() {
                grm = this._apply("name");
                this._applyWithArgs("token", ".");
                rule = this._apply("name");
                as = this._apply("args");
                return [ "App", "foreign", grm, "'" + rule + "'" ].concat(as);
            }, function() {
                rule = this._apply("name");
                as = this._apply("args");
                return [ "App", rule ].concat(as);
            });
        },
        hostExpr: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            r = this._applyWithArgs("foreign", BSSemActionParser, "asgnExpr");
            return this._applyWithArgs("foreign", BSJSTranslator, "trans", r);
        },
        curlyHostExpr: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            r = this._applyWithArgs("foreign", BSSemActionParser, "curlySemAction");
            return this._applyWithArgs("foreign", BSJSTranslator, "trans", r);
        },
        primHostExpr: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            r = this._applyWithArgs("foreign", BSSemActionParser, "semAction");
            return this._applyWithArgs("foreign", BSJSTranslator, "trans", r);
        },
        atomicHostExpr: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return this._apply("curlyHostExpr");
            }, function() {
                return this._apply("primHostExpr");
            });
        },
        semAction: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return this._or(function() {
                x = this._apply("curlyHostExpr");
                return [ "Act", x ];
            }, function() {
                this._applyWithArgs("token", "!");
                x = this._apply("atomicHostExpr");
                return [ "Act", x ];
            });
        },
        arrSemAction: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            this._applyWithArgs("token", "->");
            x = this._apply("atomicHostExpr");
            return [ "Act", x ];
        },
        semPred: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            this._applyWithArgs("token", "?");
            x = this._apply("atomicHostExpr");
            return [ "Pred", x ];
        },
        expr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                x = this._applyWithArgs("expr5", true);
                xs = this._many1(function() {
                    this._applyWithArgs("token", "|");
                    return this._applyWithArgs("expr5", true);
                });
                return [ "Or", x ].concat(xs);
            }, function() {
                x = this._applyWithArgs("expr5", true);
                xs = this._many1(function() {
                    this._applyWithArgs("token", "||");
                    return this._applyWithArgs("expr5", true);
                });
                return [ "XOr", x ].concat(xs);
            }, function() {
                return this._applyWithArgs("expr5", false);
            });
        },
        expr5: function(ne) {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                x = this._apply("interleavePart");
                xs = this._many1(function() {
                    this._applyWithArgs("token", "&&");
                    return this._apply("interleavePart");
                });
                return [ "Interleave", x ].concat(xs);
            }, function() {
                return this._applyWithArgs("expr4", ne);
            });
        },
        interleavePart: function() {
            var _fromIdx = this.input.idx, $elf = this, part;
            return this._or(function() {
                this._applyWithArgs("token", "(");
                part = this._applyWithArgs("expr4", true);
                this._applyWithArgs("token", ")");
                return [ "1", part ];
            }, function() {
                part = this._applyWithArgs("expr4", true);
                return this._applyWithArgs("modedIPart", part);
            });
        },
        modedIPart: function() {
            var _fromIdx = this.input.idx, $elf = this, part;
            return this._or(function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "And");
                    return this._form(function() {
                        this._applyWithArgs("exactly", "Many");
                        return part = this._apply("anything");
                    });
                });
                return [ "*", part ];
            }, function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "And");
                    return this._form(function() {
                        this._applyWithArgs("exactly", "Many1");
                        return part = this._apply("anything");
                    });
                });
                return [ "+", part ];
            }, function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "And");
                    return this._form(function() {
                        this._applyWithArgs("exactly", "Opt");
                        return part = this._apply("anything");
                    });
                });
                return [ "?", part ];
            }, function() {
                part = this._apply("anything");
                return [ "1", part ];
            });
        },
        expr4: function(ne) {
            var _fromIdx = this.input.idx, $elf = this, act, xs;
            return this._or(function() {
                xs = this._many(function() {
                    return this._apply("expr3");
                });
                act = this._apply("arrSemAction");
                return [ "And" ].concat(xs).concat([ act ]);
            }, function() {
                this._pred(ne);
                xs = this._many1(function() {
                    return this._apply("expr3");
                });
                return [ "And" ].concat(xs);
            }, function() {
                this._pred(ne == false);
                xs = this._many(function() {
                    return this._apply("expr3");
                });
                return [ "And" ].concat(xs);
            });
        },
        optIter: function(x) {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "?":
                        return [ "Opt", x ];
                      case "+":
                        return [ "Many1", x ];
                      case "*":
                        return [ "Many", x ];
                      default:
                        throw this._fail();
                    }
                }.call(this);
            }, function() {
                this._apply("empty");
                return x;
            });
        },
        optBind: function(x) {
            var _fromIdx = this.input.idx, $elf = this, n;
            return this._or(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case ":":
                        return function() {
                            n = this._apply("name");
                            return function() {
                                this["locals"][n] = true;
                                return [ "Set", n, x ];
                            }.call(this);
                        }.call(this);
                      default:
                        throw this._fail();
                    }
                }.call(this);
            }, function() {
                this._apply("empty");
                return x;
            });
        },
        expr3: function() {
            var _fromIdx = this.input.idx, $elf = this, e, x, n;
            return this._or(function() {
                this._applyWithArgs("token", ":");
                n = this._apply("name");
                return function() {
                    this["locals"][n] = true;
                    return [ "Set", n, [ "App", "anything" ] ];
                }.call(this);
            }, function() {
                e = this._or(function() {
                    x = this._apply("expr2");
                    return this._applyWithArgs("optIter", x);
                }, function() {
                    return this._apply("semAction");
                });
                return this._applyWithArgs("optBind", e);
            }, function() {
                return this._apply("semPred");
            });
        },
        expr2: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return this._or(function() {
                this._applyWithArgs("token", "~");
                x = this._apply("expr2");
                return [ "Not", x ];
            }, function() {
                this._applyWithArgs("token", "&");
                x = this._apply("expr1");
                return [ "Lookahead", x ];
            }, function() {
                return this._apply("expr1");
            });
        },
        expr1: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return this._or(function() {
                return this._apply("application");
            }, function() {
                x = this._or(function() {
                    return this._applyWithArgs("keyword", "undefined");
                }, function() {
                    return this._applyWithArgs("keyword", "nil");
                }, function() {
                    return this._applyWithArgs("keyword", "true");
                }, function() {
                    return this._applyWithArgs("keyword", "false");
                });
                return [ "App", "exactly", x ];
            }, function() {
                this._apply("spaces");
                return this._or(function() {
                    return this._apply("seqString");
                }, function() {
                    return this._apply("tokenString");
                }, function() {
                    return this._apply("string");
                }, function() {
                    return this._apply("number");
                });
            }, function() {
                this._applyWithArgs("token", "[");
                x = this._apply("expr");
                this._applyWithArgs("token", "]");
                return [ "Form", x ];
            }, function() {
                this._applyWithArgs("token", "<");
                x = this._apply("expr");
                this._applyWithArgs("token", ">");
                return [ "ConsBy", x ];
            }, function() {
                this._applyWithArgs("token", "@<");
                x = this._apply("expr");
                this._applyWithArgs("token", ">");
                return [ "IdxConsBy", x ];
            }, function() {
                this._applyWithArgs("token", "(");
                x = this._apply("expr");
                this._applyWithArgs("token", ")");
                return x;
            });
        },
        param: function() {
            var _fromIdx = this.input.idx, $elf = this, n;
            this._applyWithArgs("token", ":");
            n = this._apply("name");
            return n;
        },
        ruleName: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return this._apply("name");
            }, function() {
                this._apply("spaces");
                return this._apply("tsString");
            });
        },
        rule: function() {
            var _fromIdx = this.input.idx, $elf = this, x, n, xs;
            this._lookahead(function() {
                return n = this._apply("ruleName");
            });
            this["locals"] = {
                "$elf=this": true,
                "_fromIdx=this.input.idx": true
            };
            this["params"] = [];
            x = this._applyWithArgs("rulePart", n);
            xs = this._many(function() {
                this._applyWithArgs("token", ",");
                return this._applyWithArgs("rulePart", n);
            });
            return [ "Rule", n, this["params"], Object.getOwnPropertyNames(this["locals"]), [ "Or", x ].concat(xs) ];
        },
        rulePart: function(rn) {
            var _fromIdx = this.input.idx, $elf = this, b, n, p;
            n = this._apply("ruleName");
            this._pred(n == rn);
            this._or(function() {
                p = this._many(function() {
                    return this._apply("param");
                });
                this._applyWithArgs("token", "=");
                this["params"] = this["params"].concat(p);
                return b = this._apply("expr");
            }, function() {
                return b = this._apply("expr");
            });
            return b;
        },
        grammar: function() {
            var _fromIdx = this.input.idx, $elf = this, rs, exported, sn, n;
            exported = this._or(function() {
                this._applyWithArgs("keyword", "export");
                return true;
            }, function() {
                return false;
            });
            this._applyWithArgs("keyword", "ometa");
            n = this._apply("name");
            sn = this._or(function() {
                this._applyWithArgs("token", "<:");
                return this._apply("name");
            }, function() {
                this._apply("empty");
                return "OMeta";
            });
            this._applyWithArgs("token", "{");
            rs = this._applyWithArgs("listOf", "rule", ",");
            this._applyWithArgs("token", "}");
            return this._applyWithArgs("foreign", BSOMetaOptimizer, "optimizeGrammar", [ "Grammar", exported, n, sn ].concat(rs));
        }
    });
    var BSOMetaTranslator = exports.BSOMetaTranslator = OMeta._extend({
        App: function() {
            var _fromIdx = this.input.idx, rule, $elf = this, args;
            return this._or(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "super":
                        return function() {
                            args = this._many1(function() {
                                return this._apply("anything");
                            });
                            return [ this["sName"], "._superApplyWithArgs(this,", args.join(","), ")" ].join("");
                        }.call(this);
                      default:
                        throw this._fail();
                    }
                }.call(this);
            }, function() {
                rule = this._apply("anything");
                args = this._many1(function() {
                    return this._apply("anything");
                });
                return [ 'this._applyWithArgs("', rule, '",', args.join(","), ")" ].join("");
            }, function() {
                rule = this._apply("anything");
                return [ 'this._apply("', rule, '")' ].join("");
            });
        },
        Act: function() {
            var _fromIdx = this.input.idx, $elf = this, expr;
            expr = this._apply("anything");
            return expr;
        },
        Pred: function() {
            var _fromIdx = this.input.idx, $elf = this, expr;
            expr = this._apply("anything");
            return [ "this._pred(", expr, ")" ].join("");
        },
        Or: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            xs = this._many(function() {
                return this._apply("transFn");
            });
            return [ "this._or(", xs.join(","), ")" ].join("");
        },
        XOr: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            xs = this._many(function() {
                return this._apply("transFn");
            });
            JSON.stringify(xs.unshift(this["name"] + "." + this["rName"]));
            return [ "this._xor(", xs.join(","), ")" ].join("");
        },
        Seq: function() {
            var _fromIdx = this.input.idx, $elf = this, xs, y;
            return this._or(function() {
                xs = this._many(function() {
                    return this._applyWithArgs("notLast", "trans");
                });
                y = this._apply("trans");
                xs.push("return " + y);
                return xs.join(";");
            }, function() {
                return "undefined";
            });
        },
        And: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            xs = this._apply("Seq");
            return [ "(function(){", xs, "}).call(this)" ].join("");
        },
        Opt: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("transFn");
            return [ "this._opt(", x, ")" ].join("");
        },
        Many: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("transFn");
            return [ "this._many(", x, ")" ].join("");
        },
        Many1: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("transFn");
            return [ "this._many1(", x, ")" ].join("");
        },
        Set: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            n = this._apply("anything");
            v = this._apply("trans");
            return [ n, "=", v ].join("");
        },
        Not: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("transFn");
            return [ "this._not(", x, ")" ].join("");
        },
        Lookahead: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("transFn");
            return [ "this._lookahead(", x, ")" ].join("");
        },
        Form: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("transFn");
            return [ "this._form(", x, ")" ].join("");
        },
        ConsBy: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("transFn");
            return [ "this._consumedBy(", x, ")" ].join("");
        },
        IdxConsBy: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("transFn");
            return [ "this._idxConsumedBy(", x, ")" ].join("");
        },
        JumpTable: function() {
            var _fromIdx = this.input.idx, $elf = this, cases;
            cases = this._many(function() {
                return this._apply("jtCase");
            });
            return this.jumpTableCode(cases);
        },
        Interleave: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            xs = this._many(function() {
                return this._apply("intPart");
            });
            return [ "this._interleave(", xs.join(","), ")" ].join("");
        },
        Rule: function() {
            var _fromIdx = this.input.idx, $elf = this, ps, name, body, ls;
            name = this._apply("anything");
            this["rName"] = name;
            ps = this._apply("params");
            ls = this._apply("locals");
            this._or(function() {
                return this._form(function() {
                    this._applyWithArgs("exactly", "And");
                    return body = this._apply("Seq");
                });
            }, function() {
                body = this._apply("trans");
                return body = [ "return ", body ].join("");
            });
            return [ '\n"', name, '":function(', ps, "){", ls, body, "}" ].join("");
        },
        Grammar: function() {
            var _fromIdx = this.input.idx, sName, rules, $elf = this, exported, name;
            exported = this._apply("anything");
            name = this._apply("anything");
            sName = this._apply("anything");
            this["name"] = name;
            this["sName"] = sName;
            rules = this._many(function() {
                return this._apply("trans");
            });
            return [ "var ", name, exported ? "=exports." + name : "", "=", sName, "._extend({", rules.join(","), "})" ].join("");
        },
        intPart: function() {
            var _fromIdx = this.input.idx, $elf = this, mode, part;
            this._form(function() {
                mode = this._apply("anything");
                return part = this._apply("transFn");
            });
            return JSON.stringify(mode) + "," + part;
        },
        jtCase: function() {
            var _fromIdx = this.input.idx, $elf = this, e, x;
            this._form(function() {
                x = this._apply("anything");
                return e = this._apply("trans");
            });
            return [ JSON.stringify(x), e ];
        },
        locals: function() {
            var _fromIdx = this.input.idx, $elf = this, vs;
            return this._or(function() {
                this._form(function() {
                    return vs = this._many1(function() {
                        return this._apply("string");
                    });
                });
                return [ "var ", vs.join(","), ";" ].join("");
            }, function() {
                this._form(function() {
                    undefined;
                });
                return "";
            });
        },
        params: function() {
            var _fromIdx = this.input.idx, $elf = this, vs;
            return this._or(function() {
                this._form(function() {
                    return vs = this._many1(function() {
                        return this._apply("string");
                    });
                });
                return vs.join(",");
            }, function() {
                this._form(function() {
                    undefined;
                });
                return "";
            });
        },
        trans: function() {
            var _fromIdx = this.input.idx, $elf = this, t, ans;
            this._form(function() {
                t = this._apply("anything");
                return ans = this._applyWithArgs("apply", t);
            });
            return ans;
        },
        transFn: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            this._or(function() {
                return this._form(function() {
                    this._applyWithArgs("exactly", "And");
                    return x = this._apply("Seq");
                });
            }, function() {
                x = this._apply("trans");
                return x = [ "return ", x ].join("");
            });
            return [ "(function(){", x, "})" ].join("");
        }
    });
    BSOMetaTranslator["jumpTableCode"] = function(cases) {
        var buf = [];
        buf.push("(function(){switch(this._apply('anything')){");
        for (var i = 0; i < cases["length"]; ++i) {
            buf.push("case " + cases[i][0] + ":return " + cases[i][1] + ";");
        }
        buf.push("default: throw this._fail()}}).call(this)");
        return buf.join("");
    };
    var BSOMetaJSParser = exports.BSOMetaJSParser = BSJSParser._extend({
        srcElem: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            return this._or(function() {
                this._apply("spaces");
                r = this._applyWithArgs("foreign", BSOMetaParser, "grammar");
                this._apply("sc");
                return r;
            }, function() {
                return BSJSParser._superApplyWithArgs(this, "srcElem");
            });
        }
    });
    var BSOMetaJSTranslator = exports.BSOMetaJSTranslator = BSJSTranslator._extend({
        Grammar: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._applyWithArgs("foreign", BSOMetaTranslator, "Grammar");
        }
    });
    var BSNullOptimization = exports.BSNullOptimization = OMeta._extend({
        setHelped: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this["_didSomething"] = true;
        },
        helped: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._pred(this["_didSomething"]);
        },
        trans: function() {
            var _fromIdx = this.input.idx, $elf = this, t, ans;
            this._form(function() {
                t = this._apply("anything");
                this._pred(this[t] != undefined);
                return ans = this._applyWithArgs("apply", t);
            });
            return ans;
        },
        optimize: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            this._apply("helped");
            return x;
        },
        App: function() {
            var _fromIdx = this.input.idx, rule, $elf = this, args;
            rule = this._apply("anything");
            args = this._many(function() {
                return this._apply("anything");
            });
            return [ "App", rule ].concat(args);
        },
        Act: function() {
            var _fromIdx = this.input.idx, $elf = this, expr;
            expr = this._apply("anything");
            return [ "Act", expr ];
        },
        Pred: function() {
            var _fromIdx = this.input.idx, $elf = this, expr;
            expr = this._apply("anything");
            return [ "Pred", expr ];
        },
        Or: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "Or" ].concat(xs);
        },
        XOr: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "XOr" ].concat(xs);
        },
        And: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            xs = this._many(function() {
                return this._apply("trans");
            });
            return [ "And" ].concat(xs);
        },
        Opt: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return [ "Opt", x ];
        },
        Many: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return [ "Many", x ];
        },
        Many1: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return [ "Many1", x ];
        },
        Set: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            n = this._apply("anything");
            v = this._apply("trans");
            return [ "Set", n, v ];
        },
        Not: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return [ "Not", x ];
        },
        Lookahead: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return [ "Lookahead", x ];
        },
        Form: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return [ "Form", x ];
        },
        ConsBy: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return [ "ConsBy", x ];
        },
        IdxConsBy: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            x = this._apply("trans");
            return [ "IdxConsBy", x ];
        },
        JumpTable: function() {
            var _fromIdx = this.input.idx, $elf = this, e, ces, c;
            ces = this._many(function() {
                this._form(function() {
                    c = this._apply("anything");
                    return e = this._apply("trans");
                });
                return [ c, e ];
            });
            return [ "JumpTable" ].concat(ces);
        },
        Interleave: function() {
            var _fromIdx = this.input.idx, $elf = this, m, p, xs;
            xs = this._many(function() {
                this._form(function() {
                    m = this._apply("anything");
                    return p = this._apply("trans");
                });
                return [ m, p ];
            });
            return [ "Interleave" ].concat(xs);
        },
        Rule: function() {
            var _fromIdx = this.input.idx, $elf = this, ps, name, body, ls;
            name = this._apply("anything");
            ps = this._apply("anything");
            ls = this._apply("anything");
            body = this._apply("trans");
            return [ "Rule", name, ps, ls, body ];
        }
    });
    BSNullOptimization["initialize"] = function() {
        this["_didSomething"] = false;
    };
    var BSAssociativeOptimization = exports.BSAssociativeOptimization = BSNullOptimization._extend({
        And: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                x = this._apply("trans");
                this._apply("end");
                this._apply("setHelped");
                return x;
            }, function() {
                xs = this._applyWithArgs("transInside", "And");
                return [ "And" ].concat(xs);
            });
        },
        Or: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                x = this._apply("trans");
                this._apply("end");
                this._apply("setHelped");
                return x;
            }, function() {
                xs = this._applyWithArgs("transInside", "Or");
                return [ "Or" ].concat(xs);
            });
        },
        XOr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                x = this._apply("trans");
                this._apply("end");
                this._apply("setHelped");
                return x;
            }, function() {
                xs = this._applyWithArgs("transInside", "XOr");
                return [ "XOr" ].concat(xs);
            });
        },
        transInside: function(t) {
            var _fromIdx = this.input.idx, $elf = this, ys, x, xs;
            return this._or(function() {
                this._form(function() {
                    this._applyWithArgs("exactly", t);
                    return xs = this._applyWithArgs("transInside", t);
                });
                ys = this._applyWithArgs("transInside", t);
                this._apply("setHelped");
                return xs.concat(ys);
            }, function() {
                x = this._apply("trans");
                xs = this._applyWithArgs("transInside", t);
                return [ x ].concat(xs);
            }, function() {
                return [];
            });
        }
    });
    var BSPushDownSet = exports.BSPushDownSet = BSNullOptimization._extend({
        Set: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n, xs, y;
            return this._or(function() {
                n = this._apply("anything");
                this._form(function() {
                    this._applyWithArgs("exactly", "And");
                    xs = this._many(function() {
                        return this._applyWithArgs("notLast", "trans");
                    });
                    return y = this._apply("trans");
                });
                this._apply("setHelped");
                return [ "And" ].concat(xs).concat([ [ "Set", n, y ] ]);
            }, function() {
                n = this._apply("anything");
                v = this._apply("trans");
                return [ "Set", n, v ];
            });
        }
    });
    var BSSeqInliner = exports.BSSeqInliner = BSNullOptimization._extend({
        App: function() {
            var _fromIdx = this.input.idx, rule, $elf = this, cs, s, args;
            return this._or(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "seq":
                        return function() {
                            s = this._apply("anything");
                            this._apply("end");
                            cs = this._applyWithArgs("seqString", s);
                            this._apply("setHelped");
                            return [ "And" ].concat(cs).concat([ [ "Act", s ] ]);
                        }.call(this);
                      default:
                        throw this._fail();
                    }
                }.call(this);
            }, function() {
                rule = this._apply("anything");
                args = this._many(function() {
                    return this._apply("anything");
                });
                return [ "App", rule ].concat(args);
            });
        },
        inlineChar: function() {
            var _fromIdx = this.input.idx, $elf = this, c;
            c = this._applyWithArgs("foreign", BSOMetaParser, "eChar");
            this._not(function() {
                return this._apply("end");
            });
            return [ "App", "exactly", JSON.stringify(c) ];
        },
        seqString: function() {
            var _fromIdx = this.input.idx, $elf = this, cs, s;
            this._lookahead(function() {
                s = this._apply("anything");
                return this._pred(typeof s === "string");
            });
            return this._or(function() {
                this._form(function() {
                    this._applyWithArgs("exactly", '"');
                    cs = this._many(function() {
                        return this._apply("inlineChar");
                    });
                    return this._applyWithArgs("exactly", '"');
                });
                return cs;
            }, function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "'");
                    cs = this._many(function() {
                        return this._apply("inlineChar");
                    });
                    return this._applyWithArgs("exactly", "'");
                });
                return cs;
            });
        }
    });
    JumpTable = function(choiceOp, choice) {
        this["choiceOp"] = choiceOp;
        this["choices"] = {};
        this.add(choice);
    };
    JumpTable["prototype"]["add"] = function(choice) {
        var c = choice[0], t = choice[1];
        if (this["choices"][c]) {
            if (this["choices"][c][0] == this["choiceOp"]) {
                this["choices"][c].push(t);
            } else {
                this["choices"][c] = [ this["choiceOp"], this["choices"][c], t ];
            }
        } else {
            this["choices"][c] = t;
        }
    };
    JumpTable["prototype"]["toTree"] = function() {
        var r = [ "JumpTable" ], choiceKeys = Object.getOwnPropertyNames(this["choices"]);
        for (var i = 0; i < choiceKeys["length"]; i += 1) {
            r.push([ choiceKeys[i], this["choices"][choiceKeys[i]] ]);
        }
        return r;
    };
    var BSJumpTableOptimization = exports.BSJumpTableOptimization = BSNullOptimization._extend({
        Or: function() {
            var _fromIdx = this.input.idx, $elf = this, cs;
            cs = this._many(function() {
                return this._or(function() {
                    return this._applyWithArgs("jtChoices", "Or");
                }, function() {
                    return this._apply("trans");
                });
            });
            return [ "Or" ].concat(cs);
        },
        XOr: function() {
            var _fromIdx = this.input.idx, $elf = this, cs;
            cs = this._many(function() {
                return this._or(function() {
                    return this._applyWithArgs("jtChoices", "XOr");
                }, function() {
                    return this._apply("trans");
                });
            });
            return [ "XOr" ].concat(cs);
        },
        quotedString: function() {
            var _fromIdx = this.input.idx, $elf = this, cs, c;
            this._lookahead(function() {
                return this._apply("string");
            });
            this._form(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case '"':
                        return function() {
                            cs = this._many(function() {
                                c = this._applyWithArgs("foreign", BSOMetaParser, "eChar");
                                this._not(function() {
                                    return this._apply("end");
                                });
                                return c;
                            });
                            return this._applyWithArgs("exactly", '"');
                        }.call(this);
                      case "'":
                        return function() {
                            cs = this._many(function() {
                                c = this._applyWithArgs("foreign", BSOMetaParser, "eChar");
                                this._not(function() {
                                    return this._apply("end");
                                });
                                return c;
                            });
                            return this._applyWithArgs("exactly", "'");
                        }.call(this);
                      default:
                        throw this._fail();
                    }
                }.call(this);
            });
            return cs.join("");
        },
        jtChoice: function() {
            var _fromIdx = this.input.idx, $elf = this, x, rest;
            return this._or(function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "And");
                    this._form(function() {
                        this._applyWithArgs("exactly", "App");
                        this._applyWithArgs("exactly", "exactly");
                        return x = this._apply("quotedString");
                    });
                    return rest = this._many(function() {
                        return this._apply("anything");
                    });
                });
                return [ x, [ "And" ].concat(rest) ];
            }, function() {
                this._form(function() {
                    this._applyWithArgs("exactly", "App");
                    this._applyWithArgs("exactly", "exactly");
                    return x = this._apply("quotedString");
                });
                return [ x, [ "Act", JSON.stringify(x) ] ];
            });
        },
        jtChoices: function(op) {
            var _fromIdx = this.input.idx, $elf = this, jt, c;
            c = this._apply("jtChoice");
            jt = new JumpTable(op, c);
            this._many(function() {
                c = this._apply("jtChoice");
                return jt.add(c);
            });
            this._apply("setHelped");
            return jt.toTree();
        }
    });
    var BSOMetaOptimizer = exports.BSOMetaOptimizer = OMeta._extend({
        optimizeGrammar: function() {
            var _fromIdx = this.input.idx, $elf = this, rs, exported, sn, n;
            this._form(function() {
                this._applyWithArgs("exactly", "Grammar");
                exported = this._apply("anything");
                n = this._apply("anything");
                sn = this._apply("anything");
                return rs = this._many(function() {
                    return this._apply("optimizeRule");
                });
            });
            return [ "Grammar", exported, n, sn ].concat(rs);
        },
        optimizeRule: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            r = this._apply("anything");
            this._or(function() {
                return r = this._applyWithArgs("foreign", BSSeqInliner, "optimize", r);
            }, function() {
                return this._apply("empty");
            });
            this._many(function() {
                return this._or(function() {
                    return r = this._applyWithArgs("foreign", BSAssociativeOptimization, "optimize", r);
                }, function() {
                    return r = this._applyWithArgs("foreign", BSJumpTableOptimization, "optimize", r);
                }, function() {
                    return r = this._applyWithArgs("foreign", BSPushDownSet, "optimize", r);
                });
            });
            return r;
        }
    });
};