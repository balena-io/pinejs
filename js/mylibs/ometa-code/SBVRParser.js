requirejs(["libs/underscore-1.2.1.min", "libs/inflection"], (function() {
    requirejs(["underscore"], (function(_) {
        SBVRParser = objectThatDelegatesTo(OMeta, {
            "isTerm": function(term) {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._pred(this._isTerm(term))
            },
            "isVerb": function(prevTerm, verb) {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._pred(this._isVerb(prevTerm, verb))
            },
            "isFctp": function(factType) {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._pred(this._isFctp(factType))
            },
            "findVar": function(x) {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this["state"]["ruleVars"][x[(1)]]
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
                    s, a, w;
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
                            s = this._opt((function() {
                                return this._apply("spaces")
                            }));
                            a = this._many1((function() {
                                return (function() {
                                    this._not((function() {
                                        return this._apply("space")
                                    }));
                                    return this._apply("anything")
                                }).call(this)
                            }));
                            return s.concat(a).join("")
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
            "term": function() {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._apply("findTerm")
            },
            "findTerm": function(termSoFar) {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    t;
                return (function() {
                    t = this._apply("termPart");
                    (termSoFar = ((termSoFar == undefined) ? t : [termSoFar, t].join(" ")));
                    return this._or((function() {
                        return this._applyWithArgs("findTerm", termSoFar)
                    }), (function() {
                        return (function() {
                            this._applyWithArgs("isTerm", termSoFar);
                            return ["term", this._termForm(termSoFar)]
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
            "addVerb": function(prevTerm) {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    v;
                return (function() {
                    this._apply("clearSuggestions");
                    v = this._lookahead((function() {
                        return this._many1((function() {
                            return this._apply("verbPart")
                        }))
                    }));
                    this._addVerbToTerm(prevTerm, v.join(" "));
                    return this._applyWithArgs("verb", prevTerm)
                }).call(this)
            },
            "verb": function(prevTerm) {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._applyWithArgs("findVerb", prevTerm)
            },
            "findVerb": function(prevTerm, verbSoFar) {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    v;
                return (function() {
                    v = this._apply("verbPart");
                    (verbSoFar = ((verbSoFar == undefined) ? v : [verbSoFar, v].join(" ")));
                    return this._or((function() {
                        return this._applyWithArgs("findVerb", prevTerm, verbSoFar)
                    }), (function() {
                        return (function() {
                            this._applyWithArgs("isVerb", prevTerm, verbSoFar);
                            return ["verb", this._verbForm(prevTerm, verbSoFar)]
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
            "keyword": function(word, noToken) {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._or((function() {
                    return (function() {
                        this._pred((noToken == true));
                        return this._applyWithArgs("seq", word)
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._pred((noToken != true));
                        return this._applyWithArgs("token", word)
                    }).call(this)
                }))
            },
            "addThat": function() {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._applyWithArgs("keyword", "that")
            },
            "addThe": function() {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._applyWithArgs("keyword", "the")
            },
            "addVar": function(prevTerm) {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    v, q;
                return (function() {
                    (this["state"]["ruleVars"][prevTerm[(1)]] = this["state"]["ruleVarsCount"]++);
                    v = ["var", ["num", this["state"]["ruleVars"][prevTerm[(1)]]], prevTerm];
                    this._opt((function() {
                        return (function() {
                            this._apply("addThat");
                            q = this._or((function() {
                                return (function() {
                                    this._apply("addThe");
                                    return this._applyWithArgs("terbRi", [
                                        []
                                    ], prevTerm)
                                }).call(this)
                            }), (function() {
                                return this._applyWithArgs("qTerbRi", [
                                    []
                                ], prevTerm)
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
            "terbRi": function(c, prevTerm) {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    t, v, b;
                return (function() {
                    t = this._apply("term");
                    v = this._applyWithArgs("verb", t);
                    b = this._applyWithArgs("bind", t);
                    (function() {
                        c[(0)].push(t, v);
                        return c.push(b)
                    }).call(this);
                    return this._applyWithArgs("qTerbRi", c, prevTerm)
                }).call(this)
            },
            "qTerbRi": function(c, prevTerm) {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    q, t, a, v, b, r;
                return this._or((function() {
                    return (function() {
                        q = this._apply("quant");
                        t = this._apply("term");
                        a = this._applyWithArgs("addVar", t);
                        v = this._applyWithArgs("verb", t);
                        b = this._applyWithArgs("bind", t);
                        (function() {
                            q.push(a);
                            c[(0)].push(t, v);
                            return c.push(b)
                        }).call(this);
                        r = this._applyWithArgs("qTerbRi", c, prevTerm);
                        return q.concat([r])
                    }).call(this)
                }), (function() {
                    return (function() {
                        v = this._applyWithArgs("verb", prevTerm);
                        b = this._applyWithArgs("bind", prevTerm);
                        (function() {
                            c[(0)].push(prevTerm, v);
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
                        b = this._applyWithArgs("bind", prevTerm);
                        (function() {
                            c[(0)].push(prevTerm);
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
                    a = this._applyWithArgs("addVar", t);
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
                    a = this._applyWithArgs("addVar", t);
                    v = this._applyWithArgs("verb", t);
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
                return this._or((function() {
                    return this._applyWithArgs("token", "R:")
                }), (function() {
                    return this._applyWithArgs("token", "Rule:")
                }))
            },
            "newRule": function() {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    ruleText, r, q;
                return (function() {
                    this._apply("startRule");
                    this._apply("spaces");
                    ruleText = this._lookahead((function() {
                        return this._apply("toEOL")
                    }));
                    (this["state"]["ruleVarsCount"] = (0));
                    r = this._apply("modRule");
                    q = this._applyWithArgs("qTerbR", [
                        []
                    ]);
                    ((r["length"] == (2)) ? (r[(1)][(1)] = q) : (r[(1)] = q));
                    return ["rule", r, ["text", ruleText]]
                }).call(this)
            },
            "terb": function() {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    t, v;
                return (function() {
                    t = this._apply("term");
                    v = this._applyWithArgs("addVerb", t);
                    return [t, v]
                }).call(this)
            },
            "startFactType": function() {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._or((function() {
                    return this._applyWithArgs("token", "F:")
                }), (function() {
                    return this._applyWithArgs("token", "Fact type:")
                }))
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
                    (function() {
                        (this["fctps"][t] = true);
                        return t.push([])
                    }).call(this);
                    return ["fcTp"].concat(t)
                }).call(this)
            },
            "startTerm": function() {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._or((function() {
                    return this._applyWithArgs("token", "T:")
                }), (function() {
                    return this._applyWithArgs("token", "Term:")
                }))
            },
            "newTerm": function() {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    t;
                return (function() {
                    this._apply("startTerm");
                    this._apply("clearSuggestions");
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
                    this._pred(((this["lines"][(this["lines"]["length"] - (1))][(0)] == "term") || (this["lines"][(this["lines"]["length"] - (1))][(0)] == "fcTp")));
                    attrName = this._apply("allowedAttrs");
                    attrVal = this._applyWithArgs("applyFirstExisting", [("attr" + attrName), "toEOL"]);
                    return (function() {
                        var lastLine = this["lines"].pop();
                        lastLine[(lastLine["length"] - (1))].push([attrName.replace(new RegExp(" ", "g"), ""), attrVal]);
                        return lastLine
                    }).call(this)
                }).call(this)
            },
            "allowedAttrs": function() {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    attrName;
                return (function() {
                    attrName = this._applyWithArgs("matchForAny", "seq", this["possMap"]["allowedAttrs"]);
                    return attrName.replace(":", "")
                }).call(this)
            },
            "attrDefinition": function() {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return this._applyWithArgs("qTerbR", [
                    []
                ])
            },
            "startComment": function() {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return (function() {
                    this._applyWithArgs("exactly", "-");
                    this._applyWithArgs("exactly", "-");
                    return "--"
                }).call(this)
            },
            "newComment": function() {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return (function() {
                    this._apply("startComment");
                    return this._apply("toEOL")
                }).call(this)
            },
            "terminator": function() {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return (function() {
                    this._apply("spaces");
                    return this._applyWithArgs("keyword", ".", true)
                }).call(this)
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
                    return this._apply("allowedAttrs")
                }), (function() {
                    return this._apply("startComment")
                }))
            },
            "line": function() {
                var $elf = this,
                    _fromIdx = this.input.idx,
                    l;
                return this._or((function() {
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
                        this._opt((function() {
                            return this._apply("terminator")
                        }));
                        this._apply("clearSuggestions");
                        this._apply("spaces");
                        this["lines"].push(l);
                        return l
                    }).call(this)
                }), (function() {
                    return this._apply("newComment")
                }))
            },
            "expr": function() {
                var $elf = this,
                    _fromIdx = this.input.idx;
                return (function() {
                    this._many((function() {
                        return this._apply("line")
                    }));
                    this._apply("end");
                    return this["lines"]
                }).call(this)
            }
        });
        (SBVRParser["keyTokens"] = ["startTerm", "startFactType", "startRule", "newComment", "term", "modRule", "verb", "keyword", "allowedAttrs", "num"]);
        (SBVRParser["clearSuggestions"] = (function() {}));
        (SBVRParser["initialize"] = (function() {
            this.reset()
        }));
        (SBVRParser["_isTerm"] = (function(k) {
            return (this["possMap"]["term"].hasOwnProperty(k) || this["possMap"]["term"].hasOwnProperty(k.singularize()))
        }));
        (SBVRParser["_termForm"] = (function(k) {
            return (this["possMap"]["term"].hasOwnProperty(k.singularize()) ? k.singularize() : k)
        }));
        (SBVRParser["_isVerb"] = (function(prevTerm, verb) {
            if (((typeof prevTerm) == "undefined")) {
                for (term in this["possMap"]["verb"]) {
                    if (this._isVerb(term, verb)) {
                        return true
                    } else {
                        undefined
                    }
                }
            } else {
                if ((!this["possMap"]["verb"].hasOwnProperty(prevTerm))) {
                    return false
                } else {
                    undefined
                };
                if (this["possMap"]["verb"][prevTerm].hasOwnProperty(verb)) {
                    return true
                } else {
                    undefined
                };
                if (((verb.slice((0), (3)) == "are") && this["possMap"]["verb"][prevTerm].hasOwnProperty(("is" + verb.slice((3)))))) {
                    return true
                } else {
                    undefined
                };
                if (((verb == "have") && this["possMap"]["verb"][prevTerm].hasOwnProperty("has"))) {
                    return true
                } else {
                    undefined
                }
            };
            return false
        }));
        (SBVRParser["_verbForm"] = (function(prevTerm, verb) {
            if (this["possMap"]["verb"].hasOwnProperty(prevTerm)) {
                if (((verb.slice((0), (3)) == "are") && this["possMap"]["verb"][prevTerm].hasOwnProperty(("is" + verb.slice((3)))))) {
                    return ("is" + verb.slice((3)))
                } else {
                    undefined
                };
                if (((verb == "have") && this["possMap"]["verb"][prevTerm].hasOwnProperty("has"))) {
                    return "has"
                } else {
                    undefined
                };
                return verb
            } else {
                undefined
            };
            return verb
        }));
        (SBVRParser["_addVerbToTerm"] = (function(term, verb) {
            if ((!this["possMap"]["verb"].hasOwnProperty(term))) {
                (this["possMap"]["verb"][term] = ({}))
            } else {
                undefined
            };
            (this["possMap"]["verb"][term][verb] = true)
        }));
        (SBVRParser["_isFctp"] = (function(k) {
            return this["fctps"].hasOwnProperty(k)
        }));
        (SBVRParser["reset"] = (function() {
            (this["possMap"] = ({
                "clearSuggestions": [],
                "startTerm": ["Term:     "],
                "startFactType": ["Fact type:"],
                "startRule": ["Rule:     "],
                "term": ({}),
                "verb": ({}),
                "allowedAttrs": ["Concept Type:", "Database ID Field:", "Database Name Field:", "Database Table Name:", "Definition:", "Dictionary Basis:", "Example:", "General Concept:", "Namespace URI:", "Necessity:", "Note:", "Possibility:", "Reference Scheme:", "See:", "Source:", "Subject Field:", "Synonymous Form:", "Synonym:"],
                "modRule": ["It is obligatory that", "It is necessary that", "It is prohibited that", "It is impossible that", "It is not possible that", "It is possible that", "It is permissible that"],
                "quant": ["each", "a", "an", "some", "at most", "at least", "more than", "exactly"],
                "joinQuant": ["and at most"],
                "num": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "one"],
                "addThat": ["that", "that the"],
                "addThe": ["the"],
                "terminator": ["."]
            }));
            (this["fctps"] = ({}));
            (this["state"] = ({}));
            (this["state"]["ruleVars"] = ({}));
            (this["state"]["ruleVarsCount"] = (0));
            (this["lines"] = ["model"])
        }));
        (SBVRParser["equals"] = (function(compareTo) {
            if ((!_.isEqual(this["possMap"]["term"], compareTo["possMap"]["term"]))) {
                return false
            } else {
                undefined
            };
            if ((!_.isEqual(this["possMap"]["verb"], compareTo["possMap"]["verb"]))) {
                return false
            } else {
                undefined
            };
            if ((!_.isEqual(this["fctps"], compareTo["fctps"]))) {
                return false
            } else {
                undefined
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
        }));
        (SBVRParser["applyFirstExisting"] = (function(arr) {
            for (var i = (0);
            (i < arr["length"]); i++) {
                if ((this[arr[i]] != undefined)) {
                    return this._apply(arr[i])
                } else {
                    undefined
                }
            }
        }));
        (SBVRParser["exactly"] = (function(wanted) {
            if ((wanted.toLowerCase() === this._apply("anything").toLowerCase())) {
                return wanted
            } else {
                undefined
            };
            throw fail
        }))
    }))
}))