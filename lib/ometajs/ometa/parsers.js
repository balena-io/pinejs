var ometajs_ = require("../../ometajs").globals || global;

var StringBuffer = ometajs_.StringBuffer;

var objectThatDelegatesTo = ometajs_.objectThatDelegatesTo;

var isImmutable = ometajs_.isImmutable;

var digitValue = ometajs_.digitValue;

var isSequenceable = ometajs_.isSequenceable;

var escapeChar = ometajs_.escapeChar;

var unescape = ometajs_.unescape;

var getTag = ometajs_.getTag;

var inspect = ometajs_.inspect;

var lift = ometajs_.lift;

var clone = ometajs_.clone;

var Parser = ometajs_.Parser;

var fail = ometajs_.fail;

var OMeta = ometajs_.OMeta;

var BSNullOptimization = ometajs_.BSNullOptimization;

var BSAssociativeOptimization = ometajs_.BSAssociativeOptimization;

var BSSeqInliner = ometajs_.BSSeqInliner;

var BSJumpTableOptimization = ometajs_.BSJumpTableOptimization;

var BSOMetaOptimizer = ometajs_.BSOMetaOptimizer;

var BSOMetaParser = ometajs_.BSOMetaParser;

var BSOMetaTranslator = ometajs_.BSOMetaTranslator;

var BSJSParser = ometajs_.BSJSParser;

var BSSemActionParser = ometajs_.BSSemActionParser;

var BSJSIdentity = ometajs_.BSJSIdentity;

var BSJSTranslator = ometajs_.BSJSTranslator;

var BSOMetaJSParser = ometajs_.BSOMetaJSParser;

var BSOMetaJSTranslator = ometajs_.BSOMetaJSTranslator;

if (global === ometajs_) {
    fail = function(fail) {
        return function() {
            return fail;
        };
    }(fail);
    OMeta = require("../../ometajs").OMeta;
}

{
    var BSJSParser = exports.BSJSParser = objectThatDelegatesTo(OMeta, {
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
                return this._apply("letter");
            }, function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "$":
                        return "$";
                      case "_":
                        return "_";
                      default:
                        throw fail();
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
                return function() {
                    this._apply("nameFirst");
                    return this._many(function() {
                        return this._apply("nameRest");
                    });
                }.call(this);
            });
        },
        isKeyword: function(x) {
            var _fromIdx = this.input.idx, $elf = this;
            return this._pred(BSJSParser._isKeyword(x));
        },
        name: function() {
            var _fromIdx = this.input.idx, $elf = this, n;
            return function() {
                n = this._apply("iName");
                this._not(function() {
                    return this._applyWithArgs("isKeyword", n);
                });
                return [ "name", n == "self" ? "$elf" : n ];
            }.call(this);
        },
        keyword: function() {
            var _fromIdx = this.input.idx, $elf = this, k;
            return function() {
                k = this._apply("iName");
                this._applyWithArgs("isKeyword", k);
                return [ k, k ];
            }.call(this);
        },
        hexDigit: function() {
            var _fromIdx = this.input.idx, $elf = this, v, x;
            return function() {
                x = this._apply("char");
                v = this["hexDigits"].indexOf(x.toLowerCase());
                this._pred(v >= 0);
                return v;
            }.call(this);
        },
        hexLit: function() {
            var _fromIdx = this.input.idx, $elf = this, n, d;
            return this._or(function() {
                return function() {
                    n = this._apply("hexLit");
                    d = this._apply("hexDigit");
                    return n * 16 + d;
                }.call(this);
            }, function() {
                return this._apply("hexDigit");
            });
        },
        number: function() {
            var _fromIdx = this.input.idx, f, $elf = this, n;
            return this._or(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "0":
                        return function() {
                            this._applyWithArgs("exactly", "x");
                            "0x";
                            n = this._apply("hexLit");
                            return [ "number", n ];
                        }.call(this);
                      default:
                        throw fail();
                    }
                }.call(this);
            }, function() {
                return function() {
                    f = this._consumedBy(function() {
                        return function() {
                            this._many1(function() {
                                return this._apply("digit");
                            });
                            return this._opt(function() {
                                return function() {
                                    ((function() {
                                        switch (this._apply("anything")) {
                                          case "E":
                                            return "E";
                                          case "e":
                                            return "e";
                                          default:
                                            throw fail();
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
                                                throw fail();
                                            }
                                        }.call(this);
                                    });
                                    return this._many1(function() {
                                        return this._apply("digit");
                                    });
                                }.call(this);
                            });
                        }.call(this);
                    });
                    return [ "number", parseFloat(f) ];
                }.call(this);
            }, function() {
                return function() {
                    f = this._consumedBy(function() {
                        return function() {
                            this._many1(function() {
                                return this._apply("digit");
                            });
                            return this._opt(function() {
                                return function() {
                                    this._applyWithArgs("exactly", ".");
                                    return this._many1(function() {
                                        return this._apply("digit");
                                    });
                                }.call(this);
                            });
                        }.call(this);
                    });
                    return [ "number", parseFloat(f) ];
                }.call(this);
            });
        },
        escapeChar: function() {
            var _fromIdx = this.input.idx, $elf = this, s;
            return function() {
                s = this._consumedBy(function() {
                    return function() {
                        this._applyWithArgs("exactly", "\\");
                        return this._or(function() {
                            return function() {
                                switch (this._apply("anything")) {
                                  case "x":
                                    return function() {
                                        this._apply("hexDigit");
                                        return this._apply("hexDigit");
                                    }.call(this);
                                  case "u":
                                    return function() {
                                        this._apply("hexDigit");
                                        this._apply("hexDigit");
                                        this._apply("hexDigit");
                                        return this._apply("hexDigit");
                                    }.call(this);
                                  default:
                                    throw fail();
                                }
                            }.call(this);
                        }, function() {
                            return this._apply("char");
                        });
                    }.call(this);
                });
                return unescape(s);
            }.call(this);
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
                                                return this._apply("escapeChar");
                                            }, function() {
                                                return function() {
                                                    this._not(function() {
                                                        return function() {
                                                            this._applyWithArgs("exactly", '"');
                                                            this._applyWithArgs("exactly", '"');
                                                            this._applyWithArgs("exactly", '"');
                                                            return '"""';
                                                        }.call(this);
                                                    });
                                                    return this._apply("char");
                                                }.call(this);
                                            });
                                        });
                                        this._applyWithArgs("exactly", '"');
                                        this._applyWithArgs("exactly", '"');
                                        this._applyWithArgs("exactly", '"');
                                        '"""';
                                        return [ "string", cs.join("") ];
                                    }.call(this);
                                  default:
                                    throw fail();
                                }
                            }.call(this);
                        }, function() {
                            return function() {
                                cs = this._many(function() {
                                    return this._or(function() {
                                        return this._apply("escapeChar");
                                    }, function() {
                                        return function() {
                                            this._not(function() {
                                                return this._applyWithArgs("exactly", '"');
                                            });
                                            return this._apply("char");
                                        }.call(this);
                                    });
                                });
                                this._applyWithArgs("exactly", '"');
                                return [ "string", cs.join("") ];
                            }.call(this);
                        });
                      case "'":
                        return function() {
                            cs = this._many(function() {
                                return this._or(function() {
                                    return this._apply("escapeChar");
                                }, function() {
                                    return function() {
                                        this._not(function() {
                                            return this._applyWithArgs("exactly", "'");
                                        });
                                        return this._apply("char");
                                    }.call(this);
                                });
                            });
                            this._applyWithArgs("exactly", "'");
                            return [ "string", cs.join("") ];
                        }.call(this);
                      default:
                        throw fail();
                    }
                }.call(this);
            }, function() {
                return function() {
                    ((function() {
                        switch (this._apply("anything")) {
                          case "`":
                            return "`";
                          case "#":
                            return "#";
                          default:
                            throw fail();
                        }
                    })).call(this);
                    n = this._apply("iName");
                    return [ "string", n ];
                }.call(this);
            });
        },
        special: function() {
            var _fromIdx = this.input.idx, $elf = this, s;
            return function() {
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
                                    throw fail();
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
                                                throw fail();
                                            }
                                        }.call(this);
                                    }, function() {
                                        return "==";
                                    });
                                  default:
                                    throw fail();
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
                                    throw fail();
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
                                    throw fail();
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
                                                throw fail();
                                            }
                                        }.call(this);
                                    }, function() {
                                        return "!=";
                                    });
                                  default:
                                    throw fail();
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
                                            throw fail();
                                        }
                                    }.call(this);
                                }, function() {
                                    return "&&";
                                });
                              default:
                                throw fail();
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
                                    throw fail();
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
                                    throw fail();
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
                                            throw fail();
                                        }
                                    }.call(this);
                                }, function() {
                                    return "||";
                                });
                              default:
                                throw fail();
                            }
                        }.call(this);
                      case "%":
                        return this._or(function() {
                            return function() {
                                switch (this._apply("anything")) {
                                  case "=":
                                    return "%=";
                                  default:
                                    throw fail();
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
                                    throw fail();
                                }
                            }.call(this);
                        }, function() {
                            return "*";
                        });
                      default:
                        throw fail();
                    }
                }.call(this);
                return [ s, s ];
            }.call(this);
        },
        tok: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return function() {
                this._apply("spaces");
                return this._or(function() {
                    return this._apply("name");
                }, function() {
                    return this._apply("keyword");
                }, function() {
                    return this._apply("number");
                }, function() {
                    return this._apply("str");
                }, function() {
                    return this._apply("special");
                });
            }.call(this);
        },
        toks: function() {
            var _fromIdx = this.input.idx, $elf = this, ts;
            return function() {
                ts = this._many(function() {
                    return this._apply("token");
                });
                this._apply("spaces");
                this._apply("end");
                return ts;
            }.call(this);
        },
        token: function(tt) {
            var _fromIdx = this.input.idx, $elf = this, t;
            return function() {
                t = this._apply("tok");
                this._pred(t[0] == tt);
                return t[1];
            }.call(this);
        },
        spacesNoNl: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._many(function() {
                return function() {
                    this._not(function() {
                        return this._applyWithArgs("exactly", "\n");
                    });
                    return this._apply("space");
                }.call(this);
            });
        },
        expr: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._apply("commaExpr");
        },
        commaExpr: function() {
            var _fromIdx = this.input.idx, e2, e1, $elf = this;
            return this._or(function() {
                return function() {
                    e1 = this._apply("commaExpr");
                    this._applyWithArgs("token", ",");
                    e2 = this._apply("asgnExpr");
                    return [ "binop", ",", e1, e2 ];
                }.call(this);
            }, function() {
                return this._apply("asgnExpr");
            });
        },
        asgnExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, e, rhs;
            return function() {
                e = this._apply("condExpr");
                return this._or(function() {
                    return function() {
                        this._applyWithArgs("token", "=");
                        rhs = this._apply("asgnExpr");
                        return [ "set", e, rhs ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._applyWithArgs("token", "+=");
                        rhs = this._apply("asgnExpr");
                        return [ "mset", e, "+", rhs ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._applyWithArgs("token", "-=");
                        rhs = this._apply("asgnExpr");
                        return [ "mset", e, "-", rhs ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._applyWithArgs("token", "*=");
                        rhs = this._apply("asgnExpr");
                        return [ "mset", e, "*", rhs ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._applyWithArgs("token", "/=");
                        rhs = this._apply("asgnExpr");
                        return [ "mset", e, "/", rhs ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._applyWithArgs("token", "%=");
                        rhs = this._apply("asgnExpr");
                        return [ "mset", e, "%", rhs ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._applyWithArgs("token", "&&=");
                        rhs = this._apply("asgnExpr");
                        return [ "mset", e, "&&", rhs ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._applyWithArgs("token", "||=");
                        rhs = this._apply("asgnExpr");
                        return [ "mset", e, "||", rhs ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._apply("empty");
                        return e;
                    }.call(this);
                });
            }.call(this);
        },
        condExpr: function() {
            var _fromIdx = this.input.idx, f, $elf = this, e, t;
            return function() {
                e = this._apply("orExpr");
                return this._or(function() {
                    return function() {
                        this._applyWithArgs("token", "?");
                        t = this._apply("condExpr");
                        this._applyWithArgs("token", ":");
                        f = this._apply("condExpr");
                        return [ "condExpr", e, t, f ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._apply("empty");
                        return e;
                    }.call(this);
                });
            }.call(this);
        },
        orExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                return function() {
                    x = this._apply("orExpr");
                    this._applyWithArgs("token", "||");
                    y = this._apply("andExpr");
                    return [ "binop", "||", x, y ];
                }.call(this);
            }, function() {
                return this._apply("andExpr");
            });
        },
        andExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                return function() {
                    x = this._apply("andExpr");
                    this._applyWithArgs("token", "&&");
                    y = this._apply("eqExpr");
                    return [ "binop", "&&", x, y ];
                }.call(this);
            }, function() {
                return this._apply("eqExpr");
            });
        },
        eqExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                return function() {
                    x = this._apply("eqExpr");
                    return this._or(function() {
                        return function() {
                            this._applyWithArgs("token", "==");
                            y = this._apply("relExpr");
                            return [ "binop", "==", x, y ];
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", "!=");
                            y = this._apply("relExpr");
                            return [ "binop", "!=", x, y ];
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", "===");
                            y = this._apply("relExpr");
                            return [ "binop", "===", x, y ];
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", "!==");
                            y = this._apply("relExpr");
                            return [ "binop", "!==", x, y ];
                        }.call(this);
                    });
                }.call(this);
            }, function() {
                return this._apply("relExpr");
            });
        },
        relExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                return function() {
                    x = this._apply("relExpr");
                    return this._or(function() {
                        return function() {
                            this._applyWithArgs("token", ">");
                            y = this._apply("addExpr");
                            return [ "binop", ">", x, y ];
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", ">=");
                            y = this._apply("addExpr");
                            return [ "binop", ">=", x, y ];
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", "<");
                            y = this._apply("addExpr");
                            return [ "binop", "<", x, y ];
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", "<=");
                            y = this._apply("addExpr");
                            return [ "binop", "<=", x, y ];
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", "instanceof");
                            y = this._apply("addExpr");
                            return [ "binop", "instanceof", x, y ];
                        }.call(this);
                    });
                }.call(this);
            }, function() {
                return this._apply("addExpr");
            });
        },
        addExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                return function() {
                    x = this._apply("addExpr");
                    this._applyWithArgs("token", "+");
                    y = this._apply("mulExpr");
                    return [ "binop", "+", x, y ];
                }.call(this);
            }, function() {
                return function() {
                    x = this._apply("addExpr");
                    this._applyWithArgs("token", "-");
                    y = this._apply("mulExpr");
                    return [ "binop", "-", x, y ];
                }.call(this);
            }, function() {
                return this._apply("mulExpr");
            });
        },
        mulExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return this._or(function() {
                return function() {
                    x = this._apply("mulExpr");
                    this._applyWithArgs("token", "*");
                    y = this._apply("unary");
                    return [ "binop", "*", x, y ];
                }.call(this);
            }, function() {
                return function() {
                    x = this._apply("mulExpr");
                    this._applyWithArgs("token", "/");
                    y = this._apply("unary");
                    return [ "binop", "/", x, y ];
                }.call(this);
            }, function() {
                return function() {
                    x = this._apply("mulExpr");
                    this._applyWithArgs("token", "%");
                    y = this._apply("unary");
                    return [ "binop", "%", x, y ];
                }.call(this);
            }, function() {
                return this._apply("unary");
            });
        },
        unary: function() {
            var _fromIdx = this.input.idx, $elf = this, p;
            return this._or(function() {
                return function() {
                    this._applyWithArgs("token", "-");
                    p = this._apply("postfix");
                    return [ "unop", "-", p ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "+");
                    p = this._apply("postfix");
                    return [ "unop", "+", p ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "++");
                    p = this._apply("postfix");
                    return [ "preop", "++", p ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "--");
                    p = this._apply("postfix");
                    return [ "preop", "--", p ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "!");
                    p = this._apply("unary");
                    return [ "unop", "!", p ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "void");
                    p = this._apply("unary");
                    return [ "unop", "void", p ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "delete");
                    p = this._apply("unary");
                    return [ "unop", "delete", p ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "typeof");
                    p = this._apply("unary");
                    return [ "unop", "typeof", p ];
                }.call(this);
            }, function() {
                return this._apply("postfix");
            });
        },
        postfix: function() {
            var _fromIdx = this.input.idx, $elf = this, p;
            return function() {
                p = this._apply("primExpr");
                return this._or(function() {
                    return function() {
                        this._apply("spacesNoNl");
                        this._applyWithArgs("token", "++");
                        return [ "postop", "++", p ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._apply("spacesNoNl");
                        this._applyWithArgs("token", "--");
                        return [ "postop", "--", p ];
                    }.call(this);
                }, function() {
                    return function() {
                        this._apply("empty");
                        return p;
                    }.call(this);
                });
            }.call(this);
        },
        primExpr: function() {
            var _fromIdx = this.input.idx, i, as, $elf = this, f, m, p;
            return this._or(function() {
                return function() {
                    p = this._apply("primExpr");
                    return this._or(function() {
                        return function() {
                            this._applyWithArgs("token", "[");
                            i = this._apply("expr");
                            this._applyWithArgs("token", "]");
                            return [ "getp", i, p ];
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", ".");
                            m = this._applyWithArgs("token", "name");
                            this._applyWithArgs("token", "(");
                            as = this._applyWithArgs("listOf", "asgnExpr", ",");
                            this._applyWithArgs("token", ")");
                            return [ "send", m, p ].concat(as);
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", ".");
                            this._apply("spaces");
                            m = this._apply("iName");
                            this._applyWithArgs("token", "(");
                            as = this._applyWithArgs("listOf", "asgnExpr", ",");
                            this._applyWithArgs("token", ")");
                            this._applyWithArgs("isKeyword", m);
                            return [ "send", m, p ].concat(as);
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", ".");
                            f = this._applyWithArgs("token", "name");
                            return [ "getp", [ "string", f ], p ];
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", ".");
                            this._apply("spaces");
                            f = this._apply("iName");
                            this._applyWithArgs("isKeyword", f);
                            return [ "getp", [ "string", f ], p ];
                        }.call(this);
                    }, function() {
                        return function() {
                            this._applyWithArgs("token", "(");
                            as = this._applyWithArgs("listOf", "asgnExpr", ",");
                            this._applyWithArgs("token", ")");
                            return [ "call", p ].concat(as);
                        }.call(this);
                    });
                }.call(this);
            }, function() {
                return this._apply("primExprHd");
            });
        },
        primExprHd: function() {
            var _fromIdx = this.input.idx, as, $elf = this, e, es, s, n;
            return this._or(function() {
                return function() {
                    this._applyWithArgs("token", "(");
                    e = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    return e;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "this");
                    return [ "this" ];
                }.call(this);
            }, function() {
                return function() {
                    n = this._applyWithArgs("token", "name");
                    return [ "get", n ];
                }.call(this);
            }, function() {
                return function() {
                    n = this._applyWithArgs("token", "number");
                    return [ "number", n ];
                }.call(this);
            }, function() {
                return function() {
                    s = this._applyWithArgs("token", "string");
                    return [ "string", s ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "function");
                    return this._apply("funcRest");
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "new");
                    n = this._applyWithArgs("token", "name");
                    this._applyWithArgs("token", "(");
                    as = this._applyWithArgs("listOf", "asgnExpr", ",");
                    this._applyWithArgs("token", ")");
                    return [ "new", n ].concat(as);
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "[");
                    es = this._applyWithArgs("listOf", "asgnExpr", ",");
                    this._applyWithArgs("token", "]");
                    return [ "arr" ].concat(es);
                }.call(this);
            }, function() {
                return this._apply("json");
            }, function() {
                return this._apply("re");
            });
        },
        json: function() {
            var _fromIdx = this.input.idx, $elf = this, bs;
            return function() {
                this._applyWithArgs("token", "{");
                bs = this._applyWithArgs("listOf", "jsonBinding", ",");
                this._applyWithArgs("token", "}");
                return [ "json" ].concat(bs);
            }.call(this);
        },
        jsonBinding: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            return function() {
                n = this._apply("jsonPropName");
                this._applyWithArgs("token", ":");
                v = this._apply("asgnExpr");
                return [ "binding", n, v ];
            }.call(this);
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
                return function() {
                    this._apply("spaces");
                    n = this._apply("iName");
                    this._applyWithArgs("isKeyword", n);
                    return n;
                }.call(this);
            });
        },
        re: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                this._apply("spaces");
                x = this._consumedBy(function() {
                    return function() {
                        this._applyWithArgs("exactly", "/");
                        this._apply("reBody");
                        this._applyWithArgs("exactly", "/");
                        return this._many(function() {
                            return this._apply("reFlag");
                        });
                    }.call(this);
                });
                return [ "regExp", x ];
            }.call(this);
        },
        reBody: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return function() {
                this._apply("re1stChar");
                return this._many(function() {
                    return this._apply("reChar");
                });
            }.call(this);
        },
        re1stChar: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return function() {
                    this._not(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "\\":
                                return "\\";
                              case "/":
                                return "/";
                              case "[":
                                return "[";
                              case "*":
                                return "*";
                              default:
                                throw fail();
                            }
                        }.call(this);
                    });
                    return this._apply("reNonTerm");
                }.call(this);
            }, function() {
                return this._apply("escapeChar");
            }, function() {
                return this._apply("reClass");
            });
        },
        reChar: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return this._apply("re1stChar");
            }, function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "*":
                        return "*";
                      default:
                        throw fail();
                    }
                }.call(this);
            });
        },
        reNonTerm: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return function() {
                this._not(function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case "\n":
                            return "\n";
                          case "\r":
                            return "\r";
                          default:
                            throw fail();
                        }
                    }.call(this);
                });
                return this._apply("char");
            }.call(this);
        },
        reClass: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return function() {
                this._applyWithArgs("exactly", "[");
                this._many(function() {
                    return this._apply("reClassChar");
                });
                return this._applyWithArgs("exactly", "]");
            }.call(this);
        },
        reClassChar: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return function() {
                this._not(function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case "]":
                            return "]";
                          case "[":
                            return "[";
                          default:
                            throw fail();
                        }
                    }.call(this);
                });
                return this._apply("reChar");
            }.call(this);
        },
        reFlag: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._apply("nameFirst");
        },
        formal: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return function() {
                this._apply("spaces");
                return this._applyWithArgs("token", "name");
            }.call(this);
        },
        funcRest: function() {
            var _fromIdx = this.input.idx, $elf = this, fs, body;
            return function() {
                this._applyWithArgs("token", "(");
                fs = this._applyWithArgs("listOf", "formal", ",");
                this._applyWithArgs("token", ")");
                this._applyWithArgs("token", "{");
                body = this._apply("srcElems");
                this._applyWithArgs("token", "}");
                return [ "func", fs, body ];
            }.call(this);
        },
        sc: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return function() {
                    this._apply("spacesNoNl");
                    return this._or(function() {
                        return function() {
                            switch (this._apply("anything")) {
                              case "\n":
                                return "\n";
                              default:
                                throw fail();
                            }
                        }.call(this);
                    }, function() {
                        return this._lookahead(function() {
                            return this._applyWithArgs("exactly", "}");
                        });
                    }, function() {
                        return this._apply("end");
                    });
                }.call(this);
            }, function() {
                return this._applyWithArgs("token", ";");
            });
        },
        binding: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            return this._or(function() {
                return function() {
                    n = this._applyWithArgs("token", "name");
                    this._applyWithArgs("token", "=");
                    v = this._apply("asgnExpr");
                    return [ n, v ];
                }.call(this);
            }, function() {
                return function() {
                    n = this._applyWithArgs("token", "name");
                    return [ n ];
                }.call(this);
            });
        },
        block: function() {
            var _fromIdx = this.input.idx, $elf = this, ss;
            return function() {
                this._applyWithArgs("token", "{");
                ss = this._apply("srcElems");
                this._applyWithArgs("token", "}");
                return ss;
            }.call(this);
        },
        vars: function() {
            var _fromIdx = this.input.idx, $elf = this, bs;
            return function() {
                this._applyWithArgs("token", "var");
                bs = this._applyWithArgs("listOf", "binding", ",");
                return [ "var" ].concat(bs);
            }.call(this);
        },
        stmt: function() {
            var _fromIdx = this.input.idx, f, i, $elf = this, t, e, b, cs, v, u, x, bs, c, s;
            return this._or(function() {
                return this._apply("block");
            }, function() {
                return function() {
                    bs = this._apply("vars");
                    this._apply("sc");
                    return bs;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "if");
                    this._applyWithArgs("token", "(");
                    c = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    t = this._apply("stmt");
                    f = this._or(function() {
                        return function() {
                            this._applyWithArgs("token", "else");
                            return this._apply("stmt");
                        }.call(this);
                    }, function() {
                        return function() {
                            this._apply("empty");
                            return [ "get", "undefined" ];
                        }.call(this);
                    });
                    return [ "if", c, t, f ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "while");
                    this._applyWithArgs("token", "(");
                    c = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    s = this._apply("stmt");
                    return [ "while", c, s ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "do");
                    s = this._apply("stmt");
                    this._applyWithArgs("token", "while");
                    this._applyWithArgs("token", "(");
                    c = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    this._apply("sc");
                    return [ "doWhile", s, c ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "for");
                    this._applyWithArgs("token", "(");
                    i = this._or(function() {
                        return this._apply("vars");
                    }, function() {
                        return this._apply("expr");
                    }, function() {
                        return function() {
                            this._apply("empty");
                            return [ "get", "undefined" ];
                        }.call(this);
                    });
                    this._applyWithArgs("token", ";");
                    c = this._or(function() {
                        return this._apply("expr");
                    }, function() {
                        return function() {
                            this._apply("empty");
                            return [ "get", "true" ];
                        }.call(this);
                    });
                    this._applyWithArgs("token", ";");
                    u = this._or(function() {
                        return this._apply("expr");
                    }, function() {
                        return function() {
                            this._apply("empty");
                            return [ "get", "undefined" ];
                        }.call(this);
                    });
                    this._applyWithArgs("token", ")");
                    s = this._apply("stmt");
                    return [ "for", i, c, u, s ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "for");
                    this._applyWithArgs("token", "(");
                    v = this._or(function() {
                        return function() {
                            this._applyWithArgs("token", "var");
                            b = this._apply("binding");
                            return [ "var", b ];
                        }.call(this);
                    }, function() {
                        return this._apply("expr");
                    });
                    this._applyWithArgs("token", "in");
                    e = this._apply("asgnExpr");
                    this._applyWithArgs("token", ")");
                    s = this._apply("stmt");
                    return [ "forIn", v, e, s ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "switch");
                    this._applyWithArgs("token", "(");
                    e = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    this._applyWithArgs("token", "{");
                    cs = this._many(function() {
                        return this._or(function() {
                            return function() {
                                this._applyWithArgs("token", "case");
                                c = this._apply("asgnExpr");
                                this._applyWithArgs("token", ":");
                                cs = this._apply("srcElems");
                                return [ "case", c, cs ];
                            }.call(this);
                        }, function() {
                            return function() {
                                this._applyWithArgs("token", "default");
                                this._applyWithArgs("token", ":");
                                cs = this._apply("srcElems");
                                return [ "default", cs ];
                            }.call(this);
                        });
                    });
                    this._applyWithArgs("token", "}");
                    return [ "switch", e ].concat(cs);
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "break");
                    this._apply("sc");
                    return [ "break" ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "continue");
                    this._apply("sc");
                    return [ "continue" ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "throw");
                    this._apply("spacesNoNl");
                    e = this._apply("asgnExpr");
                    this._apply("sc");
                    return [ "throw", e ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "try");
                    t = this._apply("block");
                    this._applyWithArgs("token", "catch");
                    this._applyWithArgs("token", "(");
                    e = this._applyWithArgs("token", "name");
                    this._applyWithArgs("token", ")");
                    c = this._apply("block");
                    f = this._or(function() {
                        return function() {
                            this._applyWithArgs("token", "finally");
                            return this._apply("block");
                        }.call(this);
                    }, function() {
                        return function() {
                            this._apply("empty");
                            return [ "get", "undefined" ];
                        }.call(this);
                    });
                    return [ "try", t, e, c, f ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "return");
                    e = this._or(function() {
                        return this._apply("expr");
                    }, function() {
                        return function() {
                            this._apply("empty");
                            return [ "get", "undefined" ];
                        }.call(this);
                    });
                    this._apply("sc");
                    return [ "return", e ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "with");
                    this._applyWithArgs("token", "(");
                    x = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    s = this._apply("stmt");
                    return [ "with", x, s ];
                }.call(this);
            }, function() {
                return function() {
                    e = this._apply("expr");
                    this._apply("sc");
                    return e;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", ";");
                    return [ "get", "undefined" ];
                }.call(this);
            });
        },
        srcElem: function() {
            var _fromIdx = this.input.idx, f, $elf = this, n;
            return this._or(function() {
                return function() {
                    this._applyWithArgs("token", "function");
                    n = this._applyWithArgs("token", "name");
                    f = this._apply("funcRest");
                    return [ "var", [ n, f ] ];
                }.call(this);
            }, function() {
                return this._apply("stmt");
            });
        },
        srcElems: function() {
            var _fromIdx = this.input.idx, $elf = this, ss;
            return function() {
                ss = this._many(function() {
                    return this._apply("srcElem");
                });
                return [ "begin" ].concat(ss);
            }.call(this);
        },
        topLevel: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            return function() {
                r = this._apply("srcElems");
                this._apply("spaces");
                this._apply("end");
                return r;
            }.call(this);
        }
    });
    BSJSParser["hexDigits"] = "0123456789abcdef";
    BSJSParser["keywords"] = {};
    keywords = [ "break", "case", "catch", "continue", "default", "delete", "do", "else", "finally", "for", "function", "if", "in", "instanceof", "new", "return", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with", "ometa" ];
    for (var idx = 0; idx < keywords["length"]; idx++) {
        BSJSParser["keywords"][keywords[idx]] = true;
    }
    BSJSParser["_isKeyword"] = function(k) {
        return this["keywords"].hasOwnProperty(k);
    };
    var BSSemActionParser = exports.BSSemActionParser = objectThatDelegatesTo(BSJSParser, {
        curlySemAction: function() {
            var _fromIdx = this.input.idx, r, $elf = this, ss, s;
            return this._or(function() {
                return function() {
                    this._applyWithArgs("token", "{");
                    r = this._apply("asgnExpr");
                    this._apply("sc");
                    this._applyWithArgs("token", "}");
                    this._apply("spaces");
                    return r;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "{");
                    ss = this._many(function() {
                        return function() {
                            s = this._apply("srcElem");
                            this._lookahead(function() {
                                return this._apply("srcElem");
                            });
                            return s;
                        }.call(this);
                    });
                    s = this._or(function() {
                        return function() {
                            r = this._apply("asgnExpr");
                            this._apply("sc");
                            return [ "return", r ];
                        }.call(this);
                    }, function() {
                        return this._apply("srcElem");
                    });
                    ss.push(s);
                    this._applyWithArgs("token", "}");
                    this._apply("spaces");
                    return [ "send", "call", [ "func", [], [ "begin" ].concat(ss) ], [ "this" ] ];
                }.call(this);
            });
        },
        semAction: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            return this._or(function() {
                return this._apply("curlySemAction");
            }, function() {
                return function() {
                    r = this._apply("primExpr");
                    this._apply("spaces");
                    return r;
                }.call(this);
            });
        }
    });
    var BSJSIdentity = exports.BSJSIdentity = objectThatDelegatesTo(OMeta, {
        trans: function() {
            var _fromIdx = this.input.idx, $elf = this, t, ans;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            t = this._apply("anything");
                            return ans = this._applyWithArgs("apply", t);
                        }.call(this);
                    });
                    return ans;
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return t = this._apply("anything");
                    });
                    return t;
                }.call(this);
            });
        },
        curlyTrans: function() {
            var _fromIdx = this.input.idx, r, $elf = this, rs;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "begin");
                            return r = this._apply("curlyTrans");
                        }.call(this);
                    });
                    return [ "begin", r ];
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "begin");
                            return rs = this._many(function() {
                                return this._apply("trans");
                            });
                        }.call(this);
                    });
                    return [ "begin" ].concat(rs);
                }.call(this);
            }, function() {
                return function() {
                    r = this._apply("trans");
                    return r;
                }.call(this);
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
            return function() {
                n = this._apply("anything");
                return [ "number", n ];
            }.call(this);
        },
        string: function() {
            var _fromIdx = this.input.idx, $elf = this, s;
            return function() {
                s = this._apply("anything");
                return [ "string", s ];
            }.call(this);
        },
        regExp: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("anything");
                return [ "regExp", x ];
            }.call(this);
        },
        arr: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                xs = this._many(function() {
                    return this._apply("trans");
                });
                return [ "arr" ].concat(xs);
            }.call(this);
        },
        unop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            return function() {
                op = this._apply("anything");
                x = this._apply("trans");
                return [ "unop", op, x ];
            }.call(this);
        },
        get: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("anything");
                return [ "get", x ];
            }.call(this);
        },
        getp: function() {
            var _fromIdx = this.input.idx, $elf = this, fd, x;
            return function() {
                fd = this._apply("trans");
                x = this._apply("trans");
                return [ "getp", fd, x ];
            }.call(this);
        },
        set: function() {
            var _fromIdx = this.input.idx, $elf = this, rhs, lhs;
            return function() {
                lhs = this._apply("trans");
                rhs = this._apply("trans");
                return [ "set", lhs, rhs ];
            }.call(this);
        },
        mset: function() {
            var _fromIdx = this.input.idx, $elf = this, op, rhs, lhs;
            return function() {
                lhs = this._apply("trans");
                op = this._apply("anything");
                rhs = this._apply("trans");
                return [ "mset", lhs, op, rhs ];
            }.call(this);
        },
        binop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x, y;
            return function() {
                op = this._apply("anything");
                x = this._apply("trans");
                y = this._apply("trans");
                return [ "binop", op, x, y ];
            }.call(this);
        },
        preop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            return function() {
                op = this._apply("anything");
                x = this._apply("trans");
                return [ "preop", op, x ];
            }.call(this);
        },
        postop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            return function() {
                op = this._apply("anything");
                x = this._apply("trans");
                return [ "postop", op, x ];
            }.call(this);
        },
        "return": function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "return", x ];
            }.call(this);
        },
        "with": function() {
            var _fromIdx = this.input.idx, $elf = this, x, s;
            return function() {
                x = this._apply("trans");
                s = this._apply("curlyTrans");
                return [ "with", x, s ];
            }.call(this);
        },
        "if": function() {
            var _fromIdx = this.input.idx, $elf = this, t, e, cond;
            return function() {
                cond = this._apply("trans");
                t = this._apply("curlyTrans");
                e = this._apply("curlyTrans");
                return [ "if", cond, t, e ];
            }.call(this);
        },
        condExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, t, e, cond;
            return function() {
                cond = this._apply("trans");
                t = this._apply("trans");
                e = this._apply("trans");
                return [ "condExpr", cond, t, e ];
            }.call(this);
        },
        "while": function() {
            var _fromIdx = this.input.idx, $elf = this, body, cond;
            return function() {
                cond = this._apply("trans");
                body = this._apply("curlyTrans");
                return [ "while", cond, body ];
            }.call(this);
        },
        doWhile: function() {
            var _fromIdx = this.input.idx, $elf = this, body, cond;
            return function() {
                body = this._apply("curlyTrans");
                cond = this._apply("trans");
                return [ "doWhile", body, cond ];
            }.call(this);
        },
        "for": function() {
            var _fromIdx = this.input.idx, $elf = this, init, cond, body, upd;
            return function() {
                init = this._apply("trans");
                cond = this._apply("trans");
                upd = this._apply("trans");
                body = this._apply("curlyTrans");
                return [ "for", init, cond, upd, body ];
            }.call(this);
        },
        forIn: function() {
            var _fromIdx = this.input.idx, $elf = this, arr, x, body;
            return function() {
                x = this._apply("trans");
                arr = this._apply("trans");
                body = this._apply("curlyTrans");
                return [ "forIn", x, arr, body ];
            }.call(this);
        },
        begin: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                return function() {
                    x = this._apply("trans");
                    this._apply("end");
                    return [ "begin", x ];
                }.call(this);
            }, function() {
                return function() {
                    xs = this._many(function() {
                        return this._apply("trans");
                    });
                    return [ "begin" ].concat(xs);
                }.call(this);
            });
        },
        func: function() {
            var _fromIdx = this.input.idx, $elf = this, body, args;
            return function() {
                args = this._apply("anything");
                body = this._apply("curlyTrans");
                return [ "func", args, body ];
            }.call(this);
        },
        call: function() {
            var _fromIdx = this.input.idx, $elf = this, args, fn;
            return function() {
                fn = this._apply("trans");
                args = this._many(function() {
                    return this._apply("trans");
                });
                return [ "call", fn ].concat(args);
            }.call(this);
        },
        send: function() {
            var msg, _fromIdx = this.input.idx, $elf = this, recv, args;
            return function() {
                msg = this._apply("anything");
                recv = this._apply("trans");
                args = this._many(function() {
                    return this._apply("trans");
                });
                return [ "send", msg, recv ].concat(args);
            }.call(this);
        },
        "new": function() {
            var _fromIdx = this.input.idx, $elf = this, args, cls;
            return function() {
                cls = this._apply("anything");
                args = this._many(function() {
                    return this._apply("trans");
                });
                return [ "new", cls ].concat(args);
            }.call(this);
        },
        "var": function() {
            var _fromIdx = this.input.idx, $elf = this, vs;
            return function() {
                vs = this._many1(function() {
                    return this._apply("varItem");
                });
                return [ "var" ].concat(vs);
            }.call(this);
        },
        varItem: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            n = this._apply("anything");
                            return v = this._apply("trans");
                        }.call(this);
                    });
                    return [ n, v ];
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return n = this._apply("anything");
                    });
                    return [ n ];
                }.call(this);
            });
        },
        "throw": function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "throw", x ];
            }.call(this);
        },
        "try": function() {
            var _fromIdx = this.input.idx, f, $elf = this, x, name, c;
            return function() {
                x = this._apply("curlyTrans");
                name = this._apply("anything");
                c = this._apply("curlyTrans");
                f = this._apply("curlyTrans");
                return [ "try", x, name, c, f ];
            }.call(this);
        },
        json: function() {
            var _fromIdx = this.input.idx, props, $elf = this;
            return function() {
                props = this._many(function() {
                    return this._apply("trans");
                });
                return [ "json" ].concat(props);
            }.call(this);
        },
        binding: function() {
            var _fromIdx = this.input.idx, val, $elf = this, name;
            return function() {
                name = this._apply("anything");
                val = this._apply("trans");
                return [ "binding", name, val ];
            }.call(this);
        },
        "switch": function() {
            var _fromIdx = this.input.idx, $elf = this, cases, x;
            return function() {
                x = this._apply("trans");
                cases = this._many(function() {
                    return this._apply("trans");
                });
                return [ "switch", x ].concat(cases);
            }.call(this);
        },
        "case": function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return function() {
                x = this._apply("trans");
                y = this._apply("trans");
                return [ "case", x, y ];
            }.call(this);
        },
        "default": function() {
            var _fromIdx = this.input.idx, $elf = this, y;
            return function() {
                y = this._apply("trans");
                return [ "default", y ];
            }.call(this);
        }
    });
    var BSJSTranslator = exports.BSJSTranslator = objectThatDelegatesTo(OMeta, {
        trans: function() {
            var _fromIdx = this.input.idx, $elf = this, t, ans;
            return function() {
                this._form(function() {
                    return function() {
                        t = this._apply("anything");
                        return ans = this._applyWithArgs("apply", t);
                    }.call(this);
                });
                return ans;
            }.call(this);
        },
        curlyTrans: function() {
            var _fromIdx = this.input.idx, r, $elf = this, rs;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "begin");
                            return r = this._apply("curlyTrans");
                        }.call(this);
                    });
                    return r;
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "begin");
                            return rs = this._many(function() {
                                return this._apply("trans");
                            });
                        }.call(this);
                    });
                    return "{" + rs.join(";") + "}";
                }.call(this);
            }, function() {
                return function() {
                    r = this._apply("trans");
                    return "{" + r + "}";
                }.call(this);
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
            return function() {
                n = this._apply("anything");
                return "(" + n + ")";
            }.call(this);
        },
        string: function() {
            var _fromIdx = this.input.idx, $elf = this, s;
            return function() {
                s = this._apply("anything");
                return inspect(s);
            }.call(this);
        },
        regExp: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("anything");
                return x;
            }.call(this);
        },
        arr: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                xs = this._many(function() {
                    return this._apply("trans");
                });
                return "[" + xs.join(",") + "]";
            }.call(this);
        },
        unop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            return function() {
                op = this._apply("anything");
                x = this._apply("trans");
                return "(" + op + " " + x + ")";
            }.call(this);
        },
        getp: function() {
            var _fromIdx = this.input.idx, $elf = this, fd, x;
            return function() {
                fd = this._apply("trans");
                x = this._apply("trans");
                return x + "[" + fd + "]";
            }.call(this);
        },
        get: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("anything");
                return x;
            }.call(this);
        },
        set: function() {
            var _fromIdx = this.input.idx, $elf = this, rhs, lhs;
            return function() {
                lhs = this._apply("trans");
                rhs = this._apply("trans");
                return "(" + lhs + "=" + rhs + ")";
            }.call(this);
        },
        mset: function() {
            var _fromIdx = this.input.idx, $elf = this, op, rhs, lhs;
            return function() {
                lhs = this._apply("trans");
                op = this._apply("anything");
                rhs = this._apply("trans");
                return "(" + lhs + op + "=" + rhs + ")";
            }.call(this);
        },
        binop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x, y;
            return function() {
                op = this._apply("anything");
                x = this._apply("trans");
                y = this._apply("trans");
                return "(" + x + " " + op + " " + y + ")";
            }.call(this);
        },
        preop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            return function() {
                op = this._apply("anything");
                x = this._apply("trans");
                return op + x;
            }.call(this);
        },
        postop: function() {
            var _fromIdx = this.input.idx, $elf = this, op, x;
            return function() {
                op = this._apply("anything");
                x = this._apply("trans");
                return x + op;
            }.call(this);
        },
        "return": function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return "return " + x;
            }.call(this);
        },
        "with": function() {
            var _fromIdx = this.input.idx, $elf = this, x, s;
            return function() {
                x = this._apply("trans");
                s = this._apply("curlyTrans");
                return "with(" + x + ")" + s;
            }.call(this);
        },
        "if": function() {
            var _fromIdx = this.input.idx, $elf = this, t, e, cond;
            return function() {
                cond = this._apply("trans");
                t = this._apply("curlyTrans");
                e = this._apply("curlyTrans");
                return "if(" + cond + ")" + t + "else" + e;
            }.call(this);
        },
        condExpr: function() {
            var _fromIdx = this.input.idx, $elf = this, t, e, cond;
            return function() {
                cond = this._apply("trans");
                t = this._apply("trans");
                e = this._apply("trans");
                return "(" + cond + "?" + t + ":" + e + ")";
            }.call(this);
        },
        "while": function() {
            var _fromIdx = this.input.idx, $elf = this, body, cond;
            return function() {
                cond = this._apply("trans");
                body = this._apply("curlyTrans");
                return "while(" + cond + ")" + body;
            }.call(this);
        },
        doWhile: function() {
            var _fromIdx = this.input.idx, $elf = this, body, cond;
            return function() {
                body = this._apply("curlyTrans");
                cond = this._apply("trans");
                return "do" + body + "while(" + cond + ")";
            }.call(this);
        },
        "for": function() {
            var _fromIdx = this.input.idx, $elf = this, init, cond, body, upd;
            return function() {
                init = this._apply("trans");
                cond = this._apply("trans");
                upd = this._apply("trans");
                body = this._apply("curlyTrans");
                return "for(" + init + ";" + cond + ";" + upd + ")" + body;
            }.call(this);
        },
        forIn: function() {
            var _fromIdx = this.input.idx, $elf = this, arr, x, body;
            return function() {
                x = this._apply("trans");
                arr = this._apply("trans");
                body = this._apply("curlyTrans");
                return "for(" + x + " in " + arr + ")" + body;
            }.call(this);
        },
        begin: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                return function() {
                    x = this._apply("trans");
                    this._apply("end");
                    return x;
                }.call(this);
            }, function() {
                return function() {
                    xs = this._many(function() {
                        return function() {
                            x = this._apply("trans");
                            return this._or(function() {
                                return function() {
                                    this._or(function() {
                                        return this._pred(x[x["length"] - 1] == "}");
                                    }, function() {
                                        return this._apply("end");
                                    });
                                    return x;
                                }.call(this);
                            }, function() {
                                return function() {
                                    this._apply("empty");
                                    return x + ";";
                                }.call(this);
                            });
                        }.call(this);
                    });
                    return "{" + xs.join("") + "}";
                }.call(this);
            });
        },
        func: function() {
            var _fromIdx = this.input.idx, $elf = this, body, args;
            return function() {
                args = this._apply("anything");
                body = this._apply("curlyTrans");
                return "(function (" + args.join(",") + ")" + body + ")";
            }.call(this);
        },
        call: function() {
            var _fromIdx = this.input.idx, $elf = this, args, fn;
            return function() {
                fn = this._apply("trans");
                args = this._many(function() {
                    return this._apply("trans");
                });
                return fn + "(" + args.join(",") + ")";
            }.call(this);
        },
        send: function() {
            var msg, _fromIdx = this.input.idx, $elf = this, recv, args;
            return function() {
                msg = this._apply("anything");
                recv = this._apply("trans");
                args = this._many(function() {
                    return this._apply("trans");
                });
                return recv + "." + msg + "(" + args.join(",") + ")";
            }.call(this);
        },
        "new": function() {
            var _fromIdx = this.input.idx, $elf = this, args, cls;
            return function() {
                cls = this._apply("anything");
                args = this._many(function() {
                    return this._apply("trans");
                });
                return "new " + cls + "(" + args.join(",") + ")";
            }.call(this);
        },
        "var": function() {
            var _fromIdx = this.input.idx, $elf = this, vs;
            return function() {
                vs = this._many1(function() {
                    return this._apply("varItem");
                });
                return "var " + vs.join(",");
            }.call(this);
        },
        varItem: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            n = this._apply("anything");
                            return v = this._apply("trans");
                        }.call(this);
                    });
                    return n + " = " + v;
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return n = this._apply("anything");
                    });
                    return n;
                }.call(this);
            });
        },
        "throw": function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return "throw " + x;
            }.call(this);
        },
        "try": function() {
            var _fromIdx = this.input.idx, f, $elf = this, x, name, c;
            return function() {
                x = this._apply("curlyTrans");
                name = this._apply("anything");
                c = this._apply("curlyTrans");
                f = this._apply("curlyTrans");
                return "try " + x + "catch(" + name + ")" + c + "finally" + f;
            }.call(this);
        },
        json: function() {
            var _fromIdx = this.input.idx, props, $elf = this;
            return function() {
                props = this._many(function() {
                    return this._apply("trans");
                });
                return "({" + props.join(",") + "})";
            }.call(this);
        },
        binding: function() {
            var _fromIdx = this.input.idx, val, $elf = this, name;
            return function() {
                name = this._apply("anything");
                val = this._apply("trans");
                return inspect(name) + ": " + val;
            }.call(this);
        },
        "switch": function() {
            var _fromIdx = this.input.idx, $elf = this, cases, x;
            return function() {
                x = this._apply("trans");
                cases = this._many(function() {
                    return this._apply("trans");
                });
                return "switch(" + x + "){" + cases.join(";") + "}";
            }.call(this);
        },
        "case": function() {
            var _fromIdx = this.input.idx, $elf = this, x, y;
            return function() {
                x = this._apply("trans");
                y = this._apply("trans");
                return "case " + x + ": " + y;
            }.call(this);
        },
        "default": function() {
            var _fromIdx = this.input.idx, $elf = this, y;
            return function() {
                y = this._apply("trans");
                return "default: " + y;
            }.call(this);
        }
    });
    var BSOMetaParser = exports.BSOMetaParser = objectThatDelegatesTo(OMeta, {
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
                        throw fail();
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
                return function() {
                    this._apply("nameFirst");
                    return this._many(function() {
                        return this._apply("nameRest");
                    });
                }.call(this);
            });
        },
        name: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return function() {
                this._apply("spaces");
                return this._apply("tsName");
            }.call(this);
        },
        eChar: function() {
            var _fromIdx = this.input.idx, $elf = this, c;
            return this._or(function() {
                return function() {
                    switch (this._apply("anything")) {
                      case "\\":
                        return function() {
                            c = this._apply("char");
                            return unescape("\\" + c);
                        }.call(this);
                      default:
                        throw fail();
                    }
                }.call(this);
            }, function() {
                return this._apply("char");
            });
        },
        tsString: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                this._applyWithArgs("exactly", "'");
                xs = this._many(function() {
                    return function() {
                        this._not(function() {
                            return this._applyWithArgs("exactly", "'");
                        });
                        return this._apply("eChar");
                    }.call(this);
                });
                this._applyWithArgs("exactly", "'");
                return xs.join("");
            }.call(this);
        },
        characters: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                this._applyWithArgs("exactly", "`");
                this._applyWithArgs("exactly", "`");
                xs = this._many(function() {
                    return function() {
                        this._not(function() {
                            return function() {
                                this._applyWithArgs("exactly", "'");
                                return this._applyWithArgs("exactly", "'");
                            }.call(this);
                        });
                        return this._apply("eChar");
                    }.call(this);
                });
                this._applyWithArgs("exactly", "'");
                this._applyWithArgs("exactly", "'");
                return [ "App", "seq", inspect(xs.join("")) ];
            }.call(this);
        },
        sCharacters: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                this._applyWithArgs("exactly", '"');
                xs = this._many(function() {
                    return function() {
                        this._not(function() {
                            return this._applyWithArgs("exactly", '"');
                        });
                        return this._apply("eChar");
                    }.call(this);
                });
                this._applyWithArgs("exactly", '"');
                return [ "App", "token", inspect(xs.join("")) ];
            }.call(this);
        },
        string: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                xs = this._or(function() {
                    return function() {
                        ((function() {
                            switch (this._apply("anything")) {
                              case "`":
                                return "`";
                              case "#":
                                return "#";
                              default:
                                throw fail();
                            }
                        })).call(this);
                        return this._apply("tsName");
                    }.call(this);
                }, function() {
                    return this._apply("tsString");
                });
                return [ "App", "exactly", inspect(xs) ];
            }.call(this);
        },
        number: function() {
            var _fromIdx = this.input.idx, $elf = this, n;
            return function() {
                n = this._consumedBy(function() {
                    return function() {
                        this._opt(function() {
                            return this._applyWithArgs("exactly", "-");
                        });
                        return this._many1(function() {
                            return this._apply("digit");
                        });
                    }.call(this);
                });
                return [ "App", "exactly", n ];
            }.call(this);
        },
        keyword: function(xs) {
            var _fromIdx = this.input.idx, $elf = this;
            return function() {
                this._applyWithArgs("token", xs);
                this._not(function() {
                    return this._apply("letterOrDigit");
                });
                return xs;
            }.call(this);
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
                        throw fail();
                    }
                }.call(this);
            }, function() {
                return function() {
                    this._apply("empty");
                    return [];
                }.call(this);
            });
        },
        application: function() {
            var _fromIdx = this.input.idx, rule, as, $elf = this, grm;
            return this._or(function() {
                return function() {
                    this._applyWithArgs("token", "^");
                    rule = this._apply("name");
                    as = this._apply("args");
                    return [ "App", "super", "'" + rule + "'" ].concat(as);
                }.call(this);
            }, function() {
                return function() {
                    grm = this._apply("name");
                    this._applyWithArgs("token", ".");
                    rule = this._apply("name");
                    as = this._apply("args");
                    return [ "App", "foreign", grm, "'" + rule + "'" ].concat(as);
                }.call(this);
            }, function() {
                return function() {
                    rule = this._apply("name");
                    as = this._apply("args");
                    return [ "App", rule ].concat(as);
                }.call(this);
            });
        },
        hostExpr: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            return function() {
                r = this._applyWithArgs("foreign", BSSemActionParser, "asgnExpr");
                return this._applyWithArgs("foreign", BSJSTranslator, "trans", r);
            }.call(this);
        },
        curlyHostExpr: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            return function() {
                r = this._applyWithArgs("foreign", BSSemActionParser, "curlySemAction");
                return this._applyWithArgs("foreign", BSJSTranslator, "trans", r);
            }.call(this);
        },
        primHostExpr: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            return function() {
                r = this._applyWithArgs("foreign", BSSemActionParser, "semAction");
                return this._applyWithArgs("foreign", BSJSTranslator, "trans", r);
            }.call(this);
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
                return function() {
                    x = this._apply("curlyHostExpr");
                    return [ "Act", x ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "!");
                    x = this._apply("atomicHostExpr");
                    return [ "Act", x ];
                }.call(this);
            });
        },
        arrSemAction: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                this._applyWithArgs("token", "->");
                x = this._apply("atomicHostExpr");
                return [ "Act", x ];
            }.call(this);
        },
        semPred: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                this._applyWithArgs("token", "?");
                x = this._apply("atomicHostExpr");
                return [ "Pred", x ];
            }.call(this);
        },
        expr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                return function() {
                    x = this._applyWithArgs("expr5", true);
                    xs = this._many1(function() {
                        return function() {
                            this._applyWithArgs("token", "|");
                            return this._applyWithArgs("expr5", true);
                        }.call(this);
                    });
                    return [ "Or", x ].concat(xs);
                }.call(this);
            }, function() {
                return function() {
                    x = this._applyWithArgs("expr5", true);
                    xs = this._many1(function() {
                        return function() {
                            this._applyWithArgs("token", "||");
                            return this._applyWithArgs("expr5", true);
                        }.call(this);
                    });
                    return [ "XOr", x ].concat(xs);
                }.call(this);
            }, function() {
                return this._applyWithArgs("expr5", false);
            });
        },
        expr5: function(ne) {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                return function() {
                    x = this._apply("interleavePart");
                    xs = this._many1(function() {
                        return function() {
                            this._applyWithArgs("token", "&&");
                            return this._apply("interleavePart");
                        }.call(this);
                    });
                    return [ "Interleave", x ].concat(xs);
                }.call(this);
            }, function() {
                return this._applyWithArgs("expr4", ne);
            });
        },
        interleavePart: function() {
            var _fromIdx = this.input.idx, $elf = this, part;
            return this._or(function() {
                return function() {
                    this._applyWithArgs("token", "(");
                    part = this._applyWithArgs("expr4", true);
                    this._applyWithArgs("token", ")");
                    return [ "1", part ];
                }.call(this);
            }, function() {
                return function() {
                    part = this._applyWithArgs("expr4", true);
                    return this._applyWithArgs("modedIPart", part);
                }.call(this);
            });
        },
        modedIPart: function() {
            var _fromIdx = this.input.idx, $elf = this, part;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "And");
                            return this._form(function() {
                                return function() {
                                    this._applyWithArgs("exactly", "Many");
                                    return part = this._apply("anything");
                                }.call(this);
                            });
                        }.call(this);
                    });
                    return [ "*", part ];
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "And");
                            return this._form(function() {
                                return function() {
                                    this._applyWithArgs("exactly", "Many1");
                                    return part = this._apply("anything");
                                }.call(this);
                            });
                        }.call(this);
                    });
                    return [ "+", part ];
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "And");
                            return this._form(function() {
                                return function() {
                                    this._applyWithArgs("exactly", "Opt");
                                    return part = this._apply("anything");
                                }.call(this);
                            });
                        }.call(this);
                    });
                    return [ "?", part ];
                }.call(this);
            }, function() {
                return function() {
                    part = this._apply("anything");
                    return [ "1", part ];
                }.call(this);
            });
        },
        expr4: function(ne) {
            var _fromIdx = this.input.idx, $elf = this, act, xs;
            return this._or(function() {
                return function() {
                    xs = this._many(function() {
                        return this._apply("expr3");
                    });
                    act = this._apply("arrSemAction");
                    return [ "And" ].concat(xs).concat([ act ]);
                }.call(this);
            }, function() {
                return function() {
                    this._pred(ne);
                    xs = this._many1(function() {
                        return this._apply("expr3");
                    });
                    return [ "And" ].concat(xs);
                }.call(this);
            }, function() {
                return function() {
                    this._pred(ne == false);
                    xs = this._many(function() {
                        return this._apply("expr3");
                    });
                    return [ "And" ].concat(xs);
                }.call(this);
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
                        throw fail();
                    }
                }.call(this);
            }, function() {
                return function() {
                    this._apply("empty");
                    return x;
                }.call(this);
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
                        throw fail();
                    }
                }.call(this);
            }, function() {
                return function() {
                    this._apply("empty");
                    return x;
                }.call(this);
            });
        },
        expr3: function() {
            var _fromIdx = this.input.idx, $elf = this, e, x, n;
            return this._or(function() {
                return function() {
                    this._applyWithArgs("token", ":");
                    n = this._apply("name");
                    return function() {
                        this["locals"][n] = true;
                        return [ "Set", n, [ "App", "anything" ] ];
                    }.call(this);
                }.call(this);
            }, function() {
                return function() {
                    e = this._or(function() {
                        return function() {
                            x = this._apply("expr2");
                            return this._applyWithArgs("optIter", x);
                        }.call(this);
                    }, function() {
                        return this._apply("semAction");
                    });
                    return this._applyWithArgs("optBind", e);
                }.call(this);
            }, function() {
                return this._apply("semPred");
            });
        },
        expr2: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return this._or(function() {
                return function() {
                    this._applyWithArgs("token", "~");
                    x = this._apply("expr2");
                    return [ "Not", x ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "&");
                    x = this._apply("expr1");
                    return [ "Lookahead", x ];
                }.call(this);
            }, function() {
                return this._apply("expr1");
            });
        },
        expr1: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return this._or(function() {
                return this._apply("application");
            }, function() {
                return function() {
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
                }.call(this);
            }, function() {
                return function() {
                    this._apply("spaces");
                    return this._or(function() {
                        return this._apply("characters");
                    }, function() {
                        return this._apply("sCharacters");
                    }, function() {
                        return this._apply("string");
                    }, function() {
                        return this._apply("number");
                    });
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "[");
                    x = this._apply("expr");
                    this._applyWithArgs("token", "]");
                    return [ "Form", x ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "<");
                    x = this._apply("expr");
                    this._applyWithArgs("token", ">");
                    return [ "ConsBy", x ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "@<");
                    x = this._apply("expr");
                    this._applyWithArgs("token", ">");
                    return [ "IdxConsBy", x ];
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "(");
                    x = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    return x;
                }.call(this);
            });
        },
        param: function() {
            var _fromIdx = this.input.idx, $elf = this, n;
            return function() {
                this._applyWithArgs("token", ":");
                n = this._apply("name");
                return n;
            }.call(this);
        },
        ruleName: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._or(function() {
                return this._apply("name");
            }, function() {
                return function() {
                    this._apply("spaces");
                    return this._apply("tsString");
                }.call(this);
            });
        },
        rule: function() {
            var _fromIdx = this.input.idx, $elf = this, x, n, xs;
            return function() {
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
                    return function() {
                        this._applyWithArgs("token", ",");
                        return this._applyWithArgs("rulePart", n);
                    }.call(this);
                });
                return [ "Rule", n, this["params"], Object.getOwnPropertyNames(this["locals"]), [ "Or", x ].concat(xs) ];
            }.call(this);
        },
        rulePart: function(rn) {
            var _fromIdx = this.input.idx, $elf = this, b, n, p;
            return function() {
                n = this._apply("ruleName");
                this._pred(n == rn);
                this._or(function() {
                    return function() {
                        p = this._many(function() {
                            return this._apply("param");
                        });
                        this._applyWithArgs("token", "=");
                        this["params"] = this["params"].concat(p);
                        return b = this._apply("expr");
                    }.call(this);
                }, function() {
                    return b = this._apply("expr");
                });
                return b;
            }.call(this);
        },
        grammar: function() {
            var _fromIdx = this.input.idx, $elf = this, rs, sn, n;
            return function() {
                this._applyWithArgs("keyword", "ometa");
                n = this._apply("name");
                sn = this._or(function() {
                    return function() {
                        this._applyWithArgs("token", "<:");
                        return this._apply("name");
                    }.call(this);
                }, function() {
                    return function() {
                        this._apply("empty");
                        return "OMeta";
                    }.call(this);
                });
                this._applyWithArgs("token", "{");
                rs = this._applyWithArgs("listOf", "rule", ",");
                this._applyWithArgs("token", "}");
                return this._applyWithArgs("foreign", BSOMetaOptimizer, "optimizeGrammar", [ "Grammar", n, sn ].concat(rs));
            }.call(this);
        }
    });
    var BSOMetaTranslator = exports.BSOMetaTranslator = objectThatDelegatesTo(OMeta, {
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
                        throw fail();
                    }
                }.call(this);
            }, function() {
                return function() {
                    rule = this._apply("anything");
                    args = this._many1(function() {
                        return this._apply("anything");
                    });
                    return [ 'this._applyWithArgs("', rule, '",', args.join(","), ")" ].join("");
                }.call(this);
            }, function() {
                return function() {
                    rule = this._apply("anything");
                    return [ 'this._apply("', rule, '")' ].join("");
                }.call(this);
            });
        },
        Act: function() {
            var _fromIdx = this.input.idx, $elf = this, expr;
            return function() {
                expr = this._apply("anything");
                return expr;
            }.call(this);
        },
        Pred: function() {
            var _fromIdx = this.input.idx, $elf = this, expr;
            return function() {
                expr = this._apply("anything");
                return [ "this._pred(", expr, ")" ].join("");
            }.call(this);
        },
        Or: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                xs = this._many(function() {
                    return this._apply("transFn");
                });
                return [ "this._or(", xs.join(","), ")" ].join("");
            }.call(this);
        },
        XOr: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                xs = this._many(function() {
                    return this._apply("transFn");
                });
                inspect(xs.unshift(this["name"] + "." + this["rName"]));
                return [ "this._xor(", xs.join(","), ")" ].join("");
            }.call(this);
        },
        And: function() {
            var _fromIdx = this.input.idx, $elf = this, xs, y;
            return this._or(function() {
                return function() {
                    xs = this._many(function() {
                        return this._applyWithArgs("notLast", "trans");
                    });
                    y = this._apply("trans");
                    xs.push("return " + y);
                    return [ "(function(){", xs.join(";"), "}).call(this)" ].join("");
                }.call(this);
            }, function() {
                return "undefined";
            });
        },
        Opt: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("transFn");
                return [ "this._opt(", x, ")" ].join("");
            }.call(this);
        },
        Many: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("transFn");
                return [ "this._many(", x, ")" ].join("");
            }.call(this);
        },
        Many1: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("transFn");
                return [ "this._many1(", x, ")" ].join("");
            }.call(this);
        },
        Set: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            return function() {
                n = this._apply("anything");
                v = this._apply("trans");
                return [ n, "=", v ].join("");
            }.call(this);
        },
        Not: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("transFn");
                return [ "this._not(", x, ")" ].join("");
            }.call(this);
        },
        Lookahead: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("transFn");
                return [ "this._lookahead(", x, ")" ].join("");
            }.call(this);
        },
        Form: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("transFn");
                return [ "this._form(", x, ")" ].join("");
            }.call(this);
        },
        ConsBy: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("transFn");
                return [ "this._consumedBy(", x, ")" ].join("");
            }.call(this);
        },
        IdxConsBy: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("transFn");
                return [ "this._idxConsumedBy(", x, ")" ].join("");
            }.call(this);
        },
        JumpTable: function() {
            var _fromIdx = this.input.idx, $elf = this, cases;
            return function() {
                cases = this._many(function() {
                    return this._apply("jtCase");
                });
                return this.jumpTableCode(cases);
            }.call(this);
        },
        Interleave: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                xs = this._many(function() {
                    return this._apply("intPart");
                });
                return [ "this._interleave(", xs.join(","), ")" ].join("");
            }.call(this);
        },
        Rule: function() {
            var _fromIdx = this.input.idx, $elf = this, ps, name, body, ls;
            return function() {
                name = this._apply("anything");
                this["rName"] = name;
                ps = this._apply("params");
                ls = this._apply("locals");
                body = this._apply("trans");
                return [ '\n"', name, '":function(', ps, "){", ls, "return ", body, "}" ].join("");
            }.call(this);
        },
        Grammar: function() {
            var _fromIdx = this.input.idx, sName, rules, $elf = this, name;
            return function() {
                name = this._apply("anything");
                sName = this._apply("anything");
                this["name"] = name;
                this["sName"] = sName;
                rules = this._many(function() {
                    return this._apply("trans");
                });
                return [ "var ", name, "=exports.", name, "=objectThatDelegatesTo(", sName, ",{", rules.join(","), "})" ].join("");
            }.call(this);
        },
        intPart: function() {
            var _fromIdx = this.input.idx, $elf = this, mode, part;
            return function() {
                this._form(function() {
                    return function() {
                        mode = this._apply("anything");
                        return part = this._apply("transFn");
                    }.call(this);
                });
                return inspect(mode) + "," + part;
            }.call(this);
        },
        jtCase: function() {
            var _fromIdx = this.input.idx, $elf = this, e, x;
            return function() {
                this._form(function() {
                    return function() {
                        x = this._apply("anything");
                        return e = this._apply("trans");
                    }.call(this);
                });
                return [ inspect(x), e ];
            }.call(this);
        },
        locals: function() {
            var _fromIdx = this.input.idx, $elf = this, vs;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return vs = this._many1(function() {
                            return this._apply("string");
                        });
                    });
                    return [ "var ", vs.join(","), ";" ].join("");
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return undefined;
                    });
                    return "";
                }.call(this);
            });
        },
        params: function() {
            var _fromIdx = this.input.idx, $elf = this, vs;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return vs = this._many1(function() {
                            return this._apply("string");
                        });
                    });
                    return vs.join(",");
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return undefined;
                    });
                    return "";
                }.call(this);
            });
        },
        trans: function() {
            var _fromIdx = this.input.idx, $elf = this, t, ans;
            return function() {
                this._form(function() {
                    return function() {
                        t = this._apply("anything");
                        return ans = this._applyWithArgs("apply", t);
                    }.call(this);
                });
                return ans;
            }.call(this);
        },
        transFn: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "(function(){return ", x, "})" ].join("");
            }.call(this);
        }
    });
    BSOMetaTranslator["jumpTableCode"] = function(cases) {
        var buf = new StringBuffer;
        buf.put("(function(){switch(this._apply('anything')){");
        for (var i = 0; i < cases["length"]; i += 1) {
            buf.put("case " + cases[i][0] + ":return " + cases[i][1] + ";");
        }
        buf.put("default: throw fail()}}).call(this)");
        return buf.contents();
    };
    var BSOMetaJSParser = exports.BSOMetaJSParser = objectThatDelegatesTo(BSJSParser, {
        srcElem: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            return this._or(function() {
                return function() {
                    this._apply("spaces");
                    r = this._applyWithArgs("foreign", BSOMetaParser, "grammar");
                    this._apply("sc");
                    return r;
                }.call(this);
            }, function() {
                return BSJSParser._superApplyWithArgs(this, "srcElem");
            });
        }
    });
    var BSOMetaJSTranslator = exports.BSOMetaJSTranslator = objectThatDelegatesTo(BSJSTranslator, {
        Grammar: function() {
            var _fromIdx = this.input.idx, $elf = this;
            return this._applyWithArgs("foreign", BSOMetaTranslator, "Grammar");
        }
    });
    var BSNullOptimization = exports.BSNullOptimization = objectThatDelegatesTo(OMeta, {
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
            return function() {
                this._form(function() {
                    return function() {
                        t = this._apply("anything");
                        this._pred(this[t] != undefined);
                        return ans = this._applyWithArgs("apply", t);
                    }.call(this);
                });
                return ans;
            }.call(this);
        },
        optimize: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                this._apply("helped");
                return x;
            }.call(this);
        },
        App: function() {
            var _fromIdx = this.input.idx, rule, $elf = this, args;
            return function() {
                rule = this._apply("anything");
                args = this._many(function() {
                    return this._apply("anything");
                });
                return [ "App", rule ].concat(args);
            }.call(this);
        },
        Act: function() {
            var _fromIdx = this.input.idx, $elf = this, expr;
            return function() {
                expr = this._apply("anything");
                return [ "Act", expr ];
            }.call(this);
        },
        Pred: function() {
            var _fromIdx = this.input.idx, $elf = this, expr;
            return function() {
                expr = this._apply("anything");
                return [ "Pred", expr ];
            }.call(this);
        },
        Or: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                xs = this._many(function() {
                    return this._apply("trans");
                });
                return [ "Or" ].concat(xs);
            }.call(this);
        },
        XOr: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                xs = this._many(function() {
                    return this._apply("trans");
                });
                return [ "XOr" ].concat(xs);
            }.call(this);
        },
        And: function() {
            var _fromIdx = this.input.idx, $elf = this, xs;
            return function() {
                xs = this._many(function() {
                    return this._apply("trans");
                });
                return [ "And" ].concat(xs);
            }.call(this);
        },
        Opt: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "Opt", x ];
            }.call(this);
        },
        Many: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "Many", x ];
            }.call(this);
        },
        Many1: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "Many1", x ];
            }.call(this);
        },
        Set: function() {
            var _fromIdx = this.input.idx, $elf = this, v, n;
            return function() {
                n = this._apply("anything");
                v = this._apply("trans");
                return [ "Set", n, v ];
            }.call(this);
        },
        Not: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "Not", x ];
            }.call(this);
        },
        Lookahead: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "Lookahead", x ];
            }.call(this);
        },
        Form: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "Form", x ];
            }.call(this);
        },
        ConsBy: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "ConsBy", x ];
            }.call(this);
        },
        IdxConsBy: function() {
            var _fromIdx = this.input.idx, $elf = this, x;
            return function() {
                x = this._apply("trans");
                return [ "IdxConsBy", x ];
            }.call(this);
        },
        JumpTable: function() {
            var _fromIdx = this.input.idx, $elf = this, e, ces, c;
            return function() {
                ces = this._many(function() {
                    return function() {
                        this._form(function() {
                            return function() {
                                c = this._apply("anything");
                                return e = this._apply("trans");
                            }.call(this);
                        });
                        return [ c, e ];
                    }.call(this);
                });
                return [ "JumpTable" ].concat(ces);
            }.call(this);
        },
        Interleave: function() {
            var _fromIdx = this.input.idx, $elf = this, m, p, xs;
            return function() {
                xs = this._many(function() {
                    return function() {
                        this._form(function() {
                            return function() {
                                m = this._apply("anything");
                                return p = this._apply("trans");
                            }.call(this);
                        });
                        return [ m, p ];
                    }.call(this);
                });
                return [ "Interleave" ].concat(xs);
            }.call(this);
        },
        Rule: function() {
            var _fromIdx = this.input.idx, $elf = this, ps, name, body, ls;
            return function() {
                name = this._apply("anything");
                ps = this._apply("anything");
                ls = this._apply("anything");
                body = this._apply("trans");
                return [ "Rule", name, ps, ls, body ];
            }.call(this);
        }
    });
    BSNullOptimization["initialize"] = function() {
        this["_didSomething"] = false;
    };
    var BSAssociativeOptimization = exports.BSAssociativeOptimization = objectThatDelegatesTo(BSNullOptimization, {
        And: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                return function() {
                    x = this._apply("trans");
                    this._apply("end");
                    this._apply("setHelped");
                    return x;
                }.call(this);
            }, function() {
                return function() {
                    xs = this._applyWithArgs("transInside", "And");
                    return [ "And" ].concat(xs);
                }.call(this);
            });
        },
        Or: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                return function() {
                    x = this._apply("trans");
                    this._apply("end");
                    this._apply("setHelped");
                    return x;
                }.call(this);
            }, function() {
                return function() {
                    xs = this._applyWithArgs("transInside", "Or");
                    return [ "Or" ].concat(xs);
                }.call(this);
            });
        },
        XOr: function() {
            var _fromIdx = this.input.idx, $elf = this, x, xs;
            return this._or(function() {
                return function() {
                    x = this._apply("trans");
                    this._apply("end");
                    this._apply("setHelped");
                    return x;
                }.call(this);
            }, function() {
                return function() {
                    xs = this._applyWithArgs("transInside", "XOr");
                    return [ "XOr" ].concat(xs);
                }.call(this);
            });
        },
        transInside: function(t) {
            var _fromIdx = this.input.idx, $elf = this, ys, x, xs;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", t);
                            return xs = this._applyWithArgs("transInside", t);
                        }.call(this);
                    });
                    ys = this._applyWithArgs("transInside", t);
                    this._apply("setHelped");
                    return xs.concat(ys);
                }.call(this);
            }, function() {
                return function() {
                    x = this._apply("trans");
                    xs = this._applyWithArgs("transInside", t);
                    return [ x ].concat(xs);
                }.call(this);
            }, function() {
                return [];
            });
        }
    });
    var BSSeqInliner = exports.BSSeqInliner = objectThatDelegatesTo(BSNullOptimization, {
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
                        throw fail();
                    }
                }.call(this);
            }, function() {
                return function() {
                    rule = this._apply("anything");
                    args = this._many(function() {
                        return this._apply("anything");
                    });
                    return [ "App", rule ].concat(args);
                }.call(this);
            });
        },
        inlineChar: function() {
            var _fromIdx = this.input.idx, $elf = this, c;
            return function() {
                c = this._applyWithArgs("foreign", BSOMetaParser, "eChar");
                this._not(function() {
                    return this._apply("end");
                });
                return [ "App", "exactly", inspect(c) ];
            }.call(this);
        },
        seqString: function() {
            var _fromIdx = this.input.idx, $elf = this, cs, s;
            return function() {
                this._lookahead(function() {
                    return function() {
                        s = this._apply("anything");
                        return this._pred(typeof s === "string");
                    }.call(this);
                });
                return this._or(function() {
                    return function() {
                        this._form(function() {
                            return function() {
                                this._applyWithArgs("exactly", '"');
                                cs = this._many(function() {
                                    return this._apply("inlineChar");
                                });
                                return this._applyWithArgs("exactly", '"');
                            }.call(this);
                        });
                        return cs;
                    }.call(this);
                }, function() {
                    return function() {
                        this._form(function() {
                            return function() {
                                this._applyWithArgs("exactly", "'");
                                cs = this._many(function() {
                                    return this._apply("inlineChar");
                                });
                                return this._applyWithArgs("exactly", "'");
                            }.call(this);
                        });
                        return cs;
                    }.call(this);
                });
            }.call(this);
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
    var BSJumpTableOptimization = exports.BSJumpTableOptimization = objectThatDelegatesTo(BSNullOptimization, {
        Or: function() {
            var _fromIdx = this.input.idx, $elf = this, cs;
            return function() {
                cs = this._many(function() {
                    return this._or(function() {
                        return this._applyWithArgs("jtChoices", "Or");
                    }, function() {
                        return this._apply("trans");
                    });
                });
                return [ "Or" ].concat(cs);
            }.call(this);
        },
        XOr: function() {
            var _fromIdx = this.input.idx, $elf = this, cs;
            return function() {
                cs = this._many(function() {
                    return this._or(function() {
                        return this._applyWithArgs("jtChoices", "XOr");
                    }, function() {
                        return this._apply("trans");
                    });
                });
                return [ "XOr" ].concat(cs);
            }.call(this);
        },
        quotedString: function() {
            var _fromIdx = this.input.idx, $elf = this, cs, c;
            return function() {
                this._lookahead(function() {
                    return this._apply("string");
                });
                this._form(function() {
                    return function() {
                        switch (this._apply("anything")) {
                          case '"':
                            return function() {
                                cs = this._many(function() {
                                    return function() {
                                        c = this._applyWithArgs("foreign", BSOMetaParser, "eChar");
                                        this._not(function() {
                                            return this._apply("end");
                                        });
                                        return c;
                                    }.call(this);
                                });
                                return this._applyWithArgs("exactly", '"');
                            }.call(this);
                          case "'":
                            return function() {
                                cs = this._many(function() {
                                    return function() {
                                        c = this._applyWithArgs("foreign", BSOMetaParser, "eChar");
                                        this._not(function() {
                                            return this._apply("end");
                                        });
                                        return c;
                                    }.call(this);
                                });
                                return this._applyWithArgs("exactly", "'");
                            }.call(this);
                          default:
                            throw fail();
                        }
                    }.call(this);
                });
                return cs.join("");
            }.call(this);
        },
        jtChoice: function() {
            var _fromIdx = this.input.idx, $elf = this, x, rest;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "And");
                            this._form(function() {
                                return function() {
                                    this._applyWithArgs("exactly", "App");
                                    this._applyWithArgs("exactly", "exactly");
                                    return x = this._apply("quotedString");
                                }.call(this);
                            });
                            return rest = this._many(function() {
                                return this._apply("anything");
                            });
                        }.call(this);
                    });
                    return [ x, [ "And" ].concat(rest) ];
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "App");
                            this._applyWithArgs("exactly", "exactly");
                            return x = this._apply("quotedString");
                        }.call(this);
                    });
                    return [ x, [ "Act", inspect(x) ] ];
                }.call(this);
            });
        },
        jtChoices: function(op) {
            var _fromIdx = this.input.idx, $elf = this, jt, c;
            return function() {
                c = this._apply("jtChoice");
                jt = new JumpTable(op, c);
                this._many(function() {
                    return function() {
                        c = this._apply("jtChoice");
                        return jt.add(c);
                    }.call(this);
                });
                this._apply("setHelped");
                return jt.toTree();
            }.call(this);
        }
    });
    var BSOMetaOptimizer = exports.BSOMetaOptimizer = objectThatDelegatesTo(OMeta, {
        optimizeGrammar: function() {
            var _fromIdx = this.input.idx, $elf = this, rs, sn, n;
            return function() {
                this._form(function() {
                    return function() {
                        this._applyWithArgs("exactly", "Grammar");
                        n = this._apply("anything");
                        sn = this._apply("anything");
                        return rs = this._many(function() {
                            return this._apply("optimizeRule");
                        });
                    }.call(this);
                });
                return [ "Grammar", n, sn ].concat(rs);
            }.call(this);
        },
        optimizeRule: function() {
            var _fromIdx = this.input.idx, r, $elf = this;
            return function() {
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
                    });
                });
                return r;
            }.call(this);
        }
    });
};