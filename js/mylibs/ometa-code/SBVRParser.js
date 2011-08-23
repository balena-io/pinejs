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
        "lineSpaces": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._many1((function() {
                return (function() {
                    switch (this._apply('anything')) {
                    case " ":
                        return " ";
                    case "\t":
                        return "\t";
                    case "\r":
                        return "\r";
                    case "\n":
                        return "\n";
                    default:
                        throw fail
                    }
                }).call(this)
            }))
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
                    this._opt((function() {
                        return this._apply("lineSpaces")
                    }));
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
                w = this._many((function() {
                    return (function() {
                        this._not((function() {
                            return this._applyWithArgs("exactly", "\r")
                        }));
                        this._not((function() {
                            return this._applyWithArgs("exactly", "\n")
                        }));
                        return this._apply("anything")
                    }).call(this)
                }));
                return $.trim(w.join(""))
            }).call(this)
        },
        "token": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                s;
            return (function() {
                this._apply("lineSpaces");
                s = this._applyWithArgs("seq", x);
                this._lookahead((function() {
                    return this._apply("lineSpaces")
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
                this._opt((function() {
                    return this._apply("lineSpaces")
                }));
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
                this._opt((function() {
                    return this._apply("lineSpaces")
                }));
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
                return (function() {
                    (d = ["aFrm"]);
                    return d.concat(c)
                }).call(this)
            }).call(this)
        },
        "terbRi": function(c, i) {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, v, b, c;
            return (function() {
                t = this._apply("term");
                v = this._apply("verb");
                b = this._applyWithArgs("bind", t);
                c = (function() {
                    (c[(0)] = c[(0)].concat([t, v]));
                    return c.concat([b])
                }).call(this);
                return this._applyWithArgs("qTerbRi", c, i)
            }).call(this)
        },
        "qTerbRi": function(c, i) {
            var $elf = this,
                _fromIdx = this.input.idx,
                q, t, a, v, b, c, r;
            return this._or((function() {
                return (function() {
                    q = this._apply("quant");
                    t = this._apply("term");
                    a = this._applyWithArgs("adVar", t);
                    v = this._apply("verb");
                    b = this._applyWithArgs("bind", t);
                    c = (function() {
                        (q = q.concat([a]));
                        (c[(0)] = c[(0)].concat([t, v]));
                        return c.concat([b])
                    }).call(this);
                    r = this._applyWithArgs("qTerbRi", c, i);
                    return q.concat([r])
                }).call(this)
            }), (function() {
                return (function() {
                    v = this._apply("verb");
                    b = this._applyWithArgs("bind", i);
                    c = (function() {
                        (c[(0)] = c[(0)].concat([i, v]));
                        return c.concat([b])
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
                    c = (function() {
                        (c[(0)] = c[(0)].concat([i]));
                        return c.concat([b])
                    }).call(this);
                    return this._applyWithArgs("atfo", c)
                }).call(this)
            }))
        },
        "qTerm": function(c) {
            var $elf = this,
                _fromIdx = this.input.idx,
                q, t, a, b, c, r;
            return (function() {
                q = this._apply("quant");
                t = this._apply("term");
                a = this._applyWithArgs("adVar", t);
                b = this._applyWithArgs("bind", t);
                c = (function() {
                    (q = q.concat([a]));
                    (c[(0)] = c[(0)].concat([t]));
                    return c.concat([b])
                }).call(this);
                r = this._applyWithArgs("atfo", c);
                return q.concat([r])
            }).call(this)
        },
        "qTerbR": function(c) {
            var $elf = this,
                _fromIdx = this.input.idx,
                q, t, a, v, b, c, r;
            return (function() {
                q = this._apply("quant");
                t = this._apply("term");
                a = this._applyWithArgs("adVar", t);
                v = this._apply("verb");
                b = this._applyWithArgs("bind", t);
                c = (function() {
                    (q = q.concat([a]));
                    (c[(0)] = c[(0)].concat([t, v]));
                    return c.concat([b])
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
                _fromIdx = this.input.idx;
            return (function() {
                switch (this._apply('anything')) {
                case "I":
                    return (function() {
                        switch (this._apply('anything')) {
                        case "t":
                            return (function() {
                                switch (this._apply('anything')) {
                                case " ":
                                    return (function() {
                                        switch (this._apply('anything')) {
                                        case "i":
                                            return (function() {
                                                switch (this._apply('anything')) {
                                                case "s":
                                                    return (function() {
                                                        switch (this._apply('anything')) {
                                                        case " ":
                                                            return (function() {
                                                                switch (this._apply('anything')) {
                                                                case "o":
                                                                    return (function() {
                                                                        this._applyWithArgs("exactly", "b");
                                                                        this._applyWithArgs("exactly", "l");
                                                                        this._applyWithArgs("exactly", "i");
                                                                        this._applyWithArgs("exactly", "g");
                                                                        this._applyWithArgs("exactly", "a");
                                                                        this._applyWithArgs("exactly", "t");
                                                                        this._applyWithArgs("exactly", "o");
                                                                        this._applyWithArgs("exactly", "r");
                                                                        this._applyWithArgs("exactly", "y");
                                                                        this._applyWithArgs("exactly", " ");
                                                                        this._applyWithArgs("exactly", "t");
                                                                        this._applyWithArgs("exactly", "h");
                                                                        this._applyWithArgs("exactly", "a");
                                                                        this._applyWithArgs("exactly", "t");
                                                                        "It is obligatory that";
                                                                        return ["obl"]
                                                                    }).call(this);
                                                                case "n":
                                                                    return (function() {
                                                                        switch (this._apply('anything')) {
                                                                        case "e":
                                                                            return (function() {
                                                                                this._applyWithArgs("exactly", "c");
                                                                                this._applyWithArgs("exactly", "e");
                                                                                this._applyWithArgs("exactly", "s");
                                                                                this._applyWithArgs("exactly", "s");
                                                                                this._applyWithArgs("exactly", "a");
                                                                                this._applyWithArgs("exactly", "r");
                                                                                this._applyWithArgs("exactly", "y");
                                                                                this._applyWithArgs("exactly", " ");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                this._applyWithArgs("exactly", "h");
                                                                                this._applyWithArgs("exactly", "a");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                "It is necessary that";
                                                                                return ["nec"]
                                                                            }).call(this);
                                                                        case "o":
                                                                            return (function() {
                                                                                this._applyWithArgs("exactly", "t");
                                                                                this._applyWithArgs("exactly", " ");
                                                                                this._applyWithArgs("exactly", "p");
                                                                                this._applyWithArgs("exactly", "o");
                                                                                this._applyWithArgs("exactly", "s");
                                                                                this._applyWithArgs("exactly", "s");
                                                                                this._applyWithArgs("exactly", "i");
                                                                                this._applyWithArgs("exactly", "b");
                                                                                this._applyWithArgs("exactly", "l");
                                                                                this._applyWithArgs("exactly", "e");
                                                                                this._applyWithArgs("exactly", " ");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                this._applyWithArgs("exactly", "h");
                                                                                this._applyWithArgs("exactly", "a");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                "It is not possible that";
                                                                                return ["nec", ["neg"]]
                                                                            }).call(this);
                                                                        default:
                                                                            throw fail
                                                                        }
                                                                    }).call(this);
                                                                case "p":
                                                                    return (function() {
                                                                        switch (this._apply('anything')) {
                                                                        case "r":
                                                                            return (function() {
                                                                                this._applyWithArgs("exactly", "o");
                                                                                this._applyWithArgs("exactly", "h");
                                                                                this._applyWithArgs("exactly", "i");
                                                                                this._applyWithArgs("exactly", "b");
                                                                                this._applyWithArgs("exactly", "i");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                this._applyWithArgs("exactly", "e");
                                                                                this._applyWithArgs("exactly", "d");
                                                                                this._applyWithArgs("exactly", " ");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                this._applyWithArgs("exactly", "h");
                                                                                this._applyWithArgs("exactly", "a");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                "It is prohibited that";
                                                                                return ["obl", ["neg"]]
                                                                            }).call(this);
                                                                        case "o":
                                                                            return (function() {
                                                                                this._applyWithArgs("exactly", "s");
                                                                                this._applyWithArgs("exactly", "s");
                                                                                this._applyWithArgs("exactly", "i");
                                                                                this._applyWithArgs("exactly", "b");
                                                                                this._applyWithArgs("exactly", "l");
                                                                                this._applyWithArgs("exactly", "e");
                                                                                this._applyWithArgs("exactly", " ");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                this._applyWithArgs("exactly", "h");
                                                                                this._applyWithArgs("exactly", "a");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                "It is possible that";
                                                                                return ["pos"]
                                                                            }).call(this);
                                                                        case "e":
                                                                            return (function() {
                                                                                this._applyWithArgs("exactly", "r");
                                                                                this._applyWithArgs("exactly", "m");
                                                                                this._applyWithArgs("exactly", "i");
                                                                                this._applyWithArgs("exactly", "s");
                                                                                this._applyWithArgs("exactly", "s");
                                                                                this._applyWithArgs("exactly", "i");
                                                                                this._applyWithArgs("exactly", "b");
                                                                                this._applyWithArgs("exactly", "l");
                                                                                this._applyWithArgs("exactly", "e");
                                                                                this._applyWithArgs("exactly", " ");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                this._applyWithArgs("exactly", "h");
                                                                                this._applyWithArgs("exactly", "a");
                                                                                this._applyWithArgs("exactly", "t");
                                                                                "It is permissible that";
                                                                                return ["prm"]
                                                                            }).call(this);
                                                                        default:
                                                                            throw fail
                                                                        }
                                                                    }).call(this);
                                                                case "i":
                                                                    return (function() {
                                                                        this._applyWithArgs("exactly", "m");
                                                                        this._applyWithArgs("exactly", "p");
                                                                        this._applyWithArgs("exactly", "o");
                                                                        this._applyWithArgs("exactly", "s");
                                                                        this._applyWithArgs("exactly", "s");
                                                                        this._applyWithArgs("exactly", "i");
                                                                        this._applyWithArgs("exactly", "b");
                                                                        this._applyWithArgs("exactly", "l");
                                                                        this._applyWithArgs("exactly", "e");
                                                                        this._applyWithArgs("exactly", " ");
                                                                        this._applyWithArgs("exactly", "t");
                                                                        this._applyWithArgs("exactly", "h");
                                                                        this._applyWithArgs("exactly", "a");
                                                                        this._applyWithArgs("exactly", "t");
                                                                        "It is impossible that";
                                                                        return ["nec", ["neg"]]
                                                                    }).call(this);
                                                                default:
                                                                    throw fail
                                                                }
                                                            }).call(this);
                                                        default:
                                                            throw fail
                                                        }
                                                    }).call(this);
                                                default:
                                                    throw fail
                                                }
                                            }).call(this);
                                        default:
                                            throw fail
                                        }
                                    }).call(this);
                                default:
                                    throw fail
                                }
                            }).call(this);
                        default:
                            throw fail
                        }
                    }).call(this);
                default:
                    throw fail
                }
            }).call(this)
        },
        "startRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                this._applyWithArgs("exactly", "R");
                this._applyWithArgs("exactly", ":");
                return "R:"
            }).call(this)
        },
        "newRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                ruleText, r, q;
            return (function() {
                this._apply("startRule");
                this._opt((function() {
                    return this._apply("lineSpaces")
                }));
                ruleText = this._lookahead((function() {
                    return this._many((function() {
                        return (function() {
                            this._not((function() {
                                return (function() {
                                    this._apply("lineSpaces");
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
            return (function() {
                this._applyWithArgs("exactly", "F");
                this._applyWithArgs("exactly", ":");
                return "F:"
            }).call(this)
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
                        return t = t.concat([e])
                    }).call(this)
                }));
                (this["fctps"][t] = true);
                return ["fcTp"].concat(t)
            }).call(this)
        },
        "startTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                this._applyWithArgs("exactly", "T");
                this._applyWithArgs("exactly", ":");
                return "T:"
            }).call(this)
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
                this._pred(((this["lines"]["length"] > (0)) && (this["lines"][(this["lines"]["length"] - (1))][(0)] == "term")));
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
                this._opt((function() {
                    return this._apply("lineSpaces")
                }));
                l = this._or((function() {
                    return this._apply("newTerm")
                }), (function() {
                    return this._apply("newFactType")
                }), (function() {
                    return this._apply("newRule")
                }), (function() {
                    return this._apply("attribute")
                }));
                this._opt((function() {
                    return this._apply("lineSpaces")
                }));
                this["lines"].push(l);
                return l
            }).call(this)
        },
        "linef": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                this._apply("line");
                return this._or((function() {
                    return this._many((function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case "\r":
                                return "\r";
                            case "\n":
                                return "\n";
                            default:
                                throw fail
                            }
                        }).call(this)
                    }))
                }), (function() {
                    return this._apply("end")
                }))
            }).call(this)
        },
        "expr": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                this._many((function() {
                    return this._apply("linef")
                }));
                return ["model"].concat(this["lines"])
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
        (this["lines"] = [])
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