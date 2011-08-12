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
        "isKwrd": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._pred(SBVRParser._isKwrd(x))
        },
        "isFctp": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._pred(this._isFctp(x))
        },
        "isKwrdSt": function(p, q) {
            var $elf = this,
                _fromIdx = this.input.idx,
                w, n;
            return (function() {
                this._lookahead((function() {
                    return (function() {
                        this._apply("spaces");
                        this._applyWithArgs("seq", q);
                        return w = this._apply("word")
                    }).call(this)
                }));
                w = ((q != "") ? ((q + " ") + w) : w);
                n = ((p + " ") + w);
                return this._or((function() {
                    return (function() {
                        this._applyWithArgs("isKwrd", n);
                        return true
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("isKwrdSt", p, w);
                        return true
                    }).call(this)
                }))
            }).call(this)
        },
        "isTermSt": function(p, q) {
            var $elf = this,
                _fromIdx = this.input.idx,
                w, n;
            return (function() {
                this._lookahead((function() {
                    return (function() {
                        this._apply("spaces");
                        this._applyWithArgs("seq", q);
                        return w = this._apply("word")
                    }).call(this)
                }));
                w = ((q != "") ? ((q + " ") + w) : w);
                n = ((p + " ") + w);
                return this._or((function() {
                    return (function() {
                        this._applyWithArgs("isTerm", n);
                        return true
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("isTermSt", p, w);
                        return true
                    }).call(this)
                }))
            }).call(this)
        },
        "isVerbSt": function(p, q) {
            var $elf = this,
                _fromIdx = this.input.idx,
                w, n;
            return (function() {
                this._lookahead((function() {
                    return (function() {
                        this._apply("spaces");
                        this._applyWithArgs("seq", q);
                        return w = this._apply("word")
                    }).call(this)
                }));
                w = ((q != "") ? ((q + " ") + w) : w);
                n = ((p + " ") + w);
                return this._or((function() {
                    return (function() {
                        this._applyWithArgs("isVerb", n);
                        return true
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("isVerbSt", p, w);
                        return true
                    }).call(this)
                }))
            }).call(this)
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
        "spaces": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._many((function() {
                return (function() {
                    switch (this._apply('anything')) {
                    case " ":
                        return " ";
                    case "\t":
                        return "\t";
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
                        return this._apply("spaces")
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
        "word": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                w;
            return (function() {
                this._opt((function() {
                    return this._apply("spaces")
                }));
                w = this._apply("letters");
                this._not((function() {
                    return this._applyWithArgs("isVerb", w)
                }));
                this._not((function() {
                    return this._applyWithArgs("isTerm", w)
                }));
                this._not((function() {
                    return this._applyWithArgs("isKwrd", w)
                }));
                return w
            }).call(this)
        },
        "nrText": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                w;
            return (function() {
                w = this._many1((function() {
                    return (function() {
                        w = this._apply("word");
                        this._not((function() {
                            return this._applyWithArgs("isKwrdSt", w, "")
                        }));
                        this._not((function() {
                            return this._applyWithArgs("isTermSt", w, "")
                        }));
                        this._not((function() {
                            return this._applyWithArgs("isVerbSt", w, "")
                        }));
                        return w
                    }).call(this)
                }));
                return w.join(" ")
            }).call(this)
        },
        "text": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                w;
            return (function() {
                w = this._many1((function() {
                    return (function() {
                        this._apply("spaces");
                        return w = this._apply("letters")
                    }).call(this)
                }));
                return w.join(" ")
            }).call(this)
        },
        "toEOL": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                w;
            return (function() {
                w = this._many((function() {
                    return (function() {
                        w = this._apply("anything");
                        this._pred(((w != "\n") && (w != "\r")));
                        return w
                    }).call(this)
                }));
                return $.trim(w.join(""))
            }).call(this)
        },
        "kwrd": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                w, a;
            return (function() {
                this._opt((function() {
                    return this._apply("spaces")
                }));
                w = this._apply("letters");
                w = ((x != "") ? ((x + " ") + w) : w);
                return this._or((function() {
                    return (function() {
                        this._applyWithArgs("isKwrd", w);
                        return w
                    }).call(this)
                }), (function() {
                    return (function() {
                        a = this._applyWithArgs("kwrd", w);
                        return a
                    }).call(this)
                }))
            }).call(this)
        },
        "token": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            return (function() {
                t = this._applyWithArgs("kwrd", "");
                this._pred((t == x));
                return ["kwrd", t]
            }).call(this)
        },
        "mkTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            return (function() {
                t = this._apply("nrText");
                return (this["terms"][t] = true)
            }).call(this)
        },
        "termR": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                w, a;
            return (function() {
                this._opt((function() {
                    return this._apply("spaces")
                }));
                w = this._apply("letters");
                w = ((x != "") ? ((x + " ") + w) : w);
                return this._or((function() {
                    return (function() {
                        this._applyWithArgs("isTerm", w);
                        return w
                    }).call(this)
                }), (function() {
                    return (function() {
                        a = this._applyWithArgs("termR", w);
                        return a
                    }).call(this)
                }))
            }).call(this)
        },
        "term": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            return (function() {
                t = this._applyWithArgs("termR", "");
                return ["term", this._termForm(t)]
            }).call(this)
        },
        "mkVerb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x;
            return (function() {
                x = this._apply("nrText");
                return (this["verbs"][x] = true)
            }).call(this)
        },
        "verbR": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                w, a;
            return (function() {
                this._opt((function() {
                    return this._apply("spaces")
                }));
                w = this._apply("letters");
                w = ((x != "") ? ((x + " ") + w) : w);
                return this._or((function() {
                    return (function() {
                        this._applyWithArgs("isVerb", w);
                        return w
                    }).call(this)
                }), (function() {
                    return (function() {
                        a = this._applyWithArgs("verbR", w);
                        return a
                    }).call(this)
                }))
            }).call(this)
        },
        "verb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v;
            return (function() {
                v = this._applyWithArgs("verbR", "");
                return ["verb", this._verbForm(v)]
            }).call(this)
        },
        "quant": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n, m;
            return this._or((function() {
                return (function() {
                    this._applyWithArgs("token", "each");
                    return ["univQ"]
                }).call(this)
            }), (function() {
                return (function() {
                    this._or((function() {
                        return this._applyWithArgs("token", "a")
                    }), (function() {
                        return this._applyWithArgs("token", "an")
                    }), (function() {
                        return this._applyWithArgs("token", "some")
                    }));
                    return ["existQ"]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("token", "at");
                    this._applyWithArgs("token", "most");
                    n = this._apply("num");
                    return ["atMostQ", ["maxCard", n]]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("token", "at");
                    this._applyWithArgs("token", "least");
                    n = this._apply("num");
                    return this._or((function() {
                        return (function() {
                            this._applyWithArgs("token", "and");
                            this._applyWithArgs("token", "at");
                            this._applyWithArgs("token", "most");
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
                    this._applyWithArgs("token", "more");
                    this._applyWithArgs("token", "than");
                    n = this._apply("num");
                    ++n[(1)];
                    return ["atLeastQ", ["minCard", n]]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("token", "exactly");
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
        "ruleDecl": function() {
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
                a, r, q;
            return (function() {
                this._apply("ruleDecl");
                this._opt((function() {
                    return this._apply("spaces")
                }));
                a = this._lookahead((function() {
                    return this._many((function() {
                        return (function() {
                            this._not((function() {
                                return this._applyWithArgs("exactly", "\n")
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
                return ["rule", r, ["text", a.join("")]]
            }).call(this)
        },
        "terb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, v;
            return (function() {
                t = this._apply("term");
                this._opt((function() {
                    return this._lookahead((function() {
                        return this._apply("mkVerb")
                    }))
                }));
                v = this._apply("verb");
                return [t, v]
            }).call(this)
        },
        "fcTpDecl": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                this._applyWithArgs("exactly", "F");
                this._applyWithArgs("exactly", ":");
                return "F:"
            }).call(this)
        },
        "fcTp": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                b, t, e;
            return (function() {
                this._apply("fcTpDecl");
                this._opt((function() {
                    return this._apply("spaces")
                }));
                (t = []);
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
        "termDecl": function() {
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
                this._apply("termDecl");
                this._opt((function() {
                    return this._apply("spaces")
                }));
                this._opt((function() {
                    return this._lookahead((function() {
                        return this._apply("mkTerm")
                    }))
                }));
                t = this._apply("term");
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
                _fromIdx = this.input.idx,
                a;
            return (function() {
                a = (function() {
                    switch (this._apply('anything')) {
                    case "C":
                        return (function() {
                            this._applyWithArgs("exactly", "o");
                            this._applyWithArgs("exactly", "n");
                            this._applyWithArgs("exactly", "c");
                            this._applyWithArgs("exactly", "e");
                            this._applyWithArgs("exactly", "p");
                            this._applyWithArgs("exactly", "t");
                            this._applyWithArgs("exactly", " ");
                            this._applyWithArgs("exactly", "T");
                            this._applyWithArgs("exactly", "y");
                            this._applyWithArgs("exactly", "p");
                            this._applyWithArgs("exactly", "e");
                            return "Concept Type"
                        }).call(this);
                    case "D":
                        return (function() {
                            switch (this._apply('anything')) {
                            case "a":
                                return (function() {
                                    switch (this._apply('anything')) {
                                    case "t":
                                        return (function() {
                                            switch (this._apply('anything')) {
                                            case "a":
                                                return (function() {
                                                    switch (this._apply('anything')) {
                                                    case "b":
                                                        return (function() {
                                                            switch (this._apply('anything')) {
                                                            case "a":
                                                                return (function() {
                                                                    switch (this._apply('anything')) {
                                                                    case "s":
                                                                        return (function() {
                                                                            switch (this._apply('anything')) {
                                                                            case "e":
                                                                                return (function() {
                                                                                    switch (this._apply('anything')) {
                                                                                    case " ":
                                                                                        return (function() {
                                                                                            switch (this._apply('anything')) {
                                                                                            case "I":
                                                                                                return (function() {
                                                                                                    this._applyWithArgs("exactly", "D");
                                                                                                    this._applyWithArgs("exactly", " ");
                                                                                                    this._applyWithArgs("exactly", "F");
                                                                                                    this._applyWithArgs("exactly", "i");
                                                                                                    this._applyWithArgs("exactly", "e");
                                                                                                    this._applyWithArgs("exactly", "l");
                                                                                                    this._applyWithArgs("exactly", "d");
                                                                                                    return "Database ID Field"
                                                                                                }).call(this);
                                                                                            case "N":
                                                                                                return (function() {
                                                                                                    this._applyWithArgs("exactly", "a");
                                                                                                    this._applyWithArgs("exactly", "m");
                                                                                                    this._applyWithArgs("exactly", "e");
                                                                                                    this._applyWithArgs("exactly", " ");
                                                                                                    this._applyWithArgs("exactly", "F");
                                                                                                    this._applyWithArgs("exactly", "i");
                                                                                                    this._applyWithArgs("exactly", "e");
                                                                                                    this._applyWithArgs("exactly", "l");
                                                                                                    this._applyWithArgs("exactly", "d");
                                                                                                    return "Database Name Field"
                                                                                                }).call(this);
                                                                                            case "T":
                                                                                                return (function() {
                                                                                                    this._applyWithArgs("exactly", "a");
                                                                                                    this._applyWithArgs("exactly", "b");
                                                                                                    this._applyWithArgs("exactly", "l");
                                                                                                    this._applyWithArgs("exactly", "e");
                                                                                                    this._applyWithArgs("exactly", " ");
                                                                                                    this._applyWithArgs("exactly", "N");
                                                                                                    this._applyWithArgs("exactly", "a");
                                                                                                    this._applyWithArgs("exactly", "m");
                                                                                                    this._applyWithArgs("exactly", "e");
                                                                                                    return "Database Table Name"
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
                                        }).call(this);
                                    default:
                                        throw fail
                                    }
                                }).call(this);
                            case "e":
                                return (function() {
                                    this._applyWithArgs("exactly", "f");
                                    this._applyWithArgs("exactly", "i");
                                    this._applyWithArgs("exactly", "n");
                                    this._applyWithArgs("exactly", "i");
                                    this._applyWithArgs("exactly", "t");
                                    this._applyWithArgs("exactly", "i");
                                    this._applyWithArgs("exactly", "o");
                                    this._applyWithArgs("exactly", "n");
                                    return "Definition"
                                }).call(this);
                            case "i":
                                return (function() {
                                    this._applyWithArgs("exactly", "c");
                                    this._applyWithArgs("exactly", "t");
                                    this._applyWithArgs("exactly", "i");
                                    this._applyWithArgs("exactly", "o");
                                    this._applyWithArgs("exactly", "n");
                                    this._applyWithArgs("exactly", "a");
                                    this._applyWithArgs("exactly", "r");
                                    this._applyWithArgs("exactly", "y");
                                    this._applyWithArgs("exactly", " ");
                                    this._applyWithArgs("exactly", "B");
                                    this._applyWithArgs("exactly", "a");
                                    this._applyWithArgs("exactly", "s");
                                    this._applyWithArgs("exactly", "i");
                                    this._applyWithArgs("exactly", "s");
                                    return "Dictionary Basis"
                                }).call(this);
                            default:
                                throw fail
                            }
                        }).call(this);
                    case "E":
                        return (function() {
                            this._applyWithArgs("exactly", "x");
                            this._applyWithArgs("exactly", "a");
                            this._applyWithArgs("exactly", "m");
                            this._applyWithArgs("exactly", "p");
                            this._applyWithArgs("exactly", "l");
                            this._applyWithArgs("exactly", "e");
                            return "Example"
                        }).call(this);
                    case "G":
                        return (function() {
                            this._applyWithArgs("exactly", "e");
                            this._applyWithArgs("exactly", "n");
                            this._applyWithArgs("exactly", "e");
                            this._applyWithArgs("exactly", "r");
                            this._applyWithArgs("exactly", "a");
                            this._applyWithArgs("exactly", "l");
                            this._applyWithArgs("exactly", " ");
                            this._applyWithArgs("exactly", "C");
                            this._applyWithArgs("exactly", "o");
                            this._applyWithArgs("exactly", "n");
                            this._applyWithArgs("exactly", "c");
                            this._applyWithArgs("exactly", "e");
                            this._applyWithArgs("exactly", "p");
                            this._applyWithArgs("exactly", "t");
                            return "General Concept"
                        }).call(this);
                    case "N":
                        return (function() {
                            switch (this._apply('anything')) {
                            case "a":
                                return (function() {
                                    this._applyWithArgs("exactly", "m");
                                    this._applyWithArgs("exactly", "e");
                                    this._applyWithArgs("exactly", "s");
                                    this._applyWithArgs("exactly", "p");
                                    this._applyWithArgs("exactly", "a");
                                    this._applyWithArgs("exactly", "c");
                                    this._applyWithArgs("exactly", "e");
                                    this._applyWithArgs("exactly", " ");
                                    this._applyWithArgs("exactly", "U");
                                    this._applyWithArgs("exactly", "R");
                                    this._applyWithArgs("exactly", "I");
                                    return "Namespace URI"
                                }).call(this);
                            case "e":
                                return (function() {
                                    this._applyWithArgs("exactly", "c");
                                    this._applyWithArgs("exactly", "e");
                                    this._applyWithArgs("exactly", "s");
                                    this._applyWithArgs("exactly", "s");
                                    this._applyWithArgs("exactly", "i");
                                    this._applyWithArgs("exactly", "t");
                                    this._applyWithArgs("exactly", "y");
                                    return "Necessity"
                                }).call(this);
                            case "o":
                                return (function() {
                                    this._applyWithArgs("exactly", "t");
                                    this._applyWithArgs("exactly", "e");
                                    return "Note"
                                }).call(this);
                            default:
                                throw fail
                            }
                        }).call(this);
                    case "P":
                        return (function() {
                            this._applyWithArgs("exactly", "o");
                            this._applyWithArgs("exactly", "s");
                            this._applyWithArgs("exactly", "s");
                            this._applyWithArgs("exactly", "i");
                            this._applyWithArgs("exactly", "b");
                            this._applyWithArgs("exactly", "i");
                            this._applyWithArgs("exactly", "l");
                            this._applyWithArgs("exactly", "i");
                            this._applyWithArgs("exactly", "t");
                            this._applyWithArgs("exactly", "y");
                            return "Possibility"
                        }).call(this);
                    case "R":
                        return (function() {
                            this._applyWithArgs("exactly", "e");
                            this._applyWithArgs("exactly", "f");
                            this._applyWithArgs("exactly", "e");
                            this._applyWithArgs("exactly", "r");
                            this._applyWithArgs("exactly", "e");
                            this._applyWithArgs("exactly", "n");
                            this._applyWithArgs("exactly", "c");
                            this._applyWithArgs("exactly", "e");
                            this._applyWithArgs("exactly", " ");
                            this._applyWithArgs("exactly", "S");
                            this._applyWithArgs("exactly", "c");
                            this._applyWithArgs("exactly", "h");
                            this._applyWithArgs("exactly", "e");
                            this._applyWithArgs("exactly", "m");
                            this._applyWithArgs("exactly", "e");
                            return "Reference Scheme"
                        }).call(this);
                    case "S":
                        return (function() {
                            switch (this._apply('anything')) {
                            case "e":
                                return (function() {
                                    this._applyWithArgs("exactly", "e");
                                    return "See"
                                }).call(this);
                            case "o":
                                return (function() {
                                    this._applyWithArgs("exactly", "u");
                                    this._applyWithArgs("exactly", "r");
                                    this._applyWithArgs("exactly", "c");
                                    this._applyWithArgs("exactly", "e");
                                    return "Source"
                                }).call(this);
                            case "u":
                                return (function() {
                                    this._applyWithArgs("exactly", "b");
                                    this._applyWithArgs("exactly", "j");
                                    this._applyWithArgs("exactly", "e");
                                    this._applyWithArgs("exactly", "c");
                                    this._applyWithArgs("exactly", "t");
                                    this._applyWithArgs("exactly", " ");
                                    this._applyWithArgs("exactly", "F");
                                    this._applyWithArgs("exactly", "i");
                                    this._applyWithArgs("exactly", "e");
                                    this._applyWithArgs("exactly", "l");
                                    this._applyWithArgs("exactly", "d");
                                    return "Subject Field"
                                }).call(this);
                            case "y":
                                return (function() {
                                    switch (this._apply('anything')) {
                                    case "n":
                                        return (function() {
                                            switch (this._apply('anything')) {
                                            case "o":
                                                return (function() {
                                                    switch (this._apply('anything')) {
                                                    case "n":
                                                        return (function() {
                                                            switch (this._apply('anything')) {
                                                            case "y":
                                                                return (function() {
                                                                    switch (this._apply('anything')) {
                                                                    case "m":
                                                                        return this._or((function() {
                                                                            return (function() {
                                                                                switch (this._apply('anything')) {
                                                                                case "o":
                                                                                    return (function() {
                                                                                        this._applyWithArgs("exactly", "u");
                                                                                        this._applyWithArgs("exactly", "s");
                                                                                        this._applyWithArgs("exactly", " ");
                                                                                        this._applyWithArgs("exactly", "F");
                                                                                        this._applyWithArgs("exactly", "o");
                                                                                        this._applyWithArgs("exactly", "r");
                                                                                        this._applyWithArgs("exactly", "m");
                                                                                        return "Synonymous Form"
                                                                                    }).call(this);
                                                                                default:
                                                                                    throw fail
                                                                                }
                                                                            }).call(this)
                                                                        }), (function() {
                                                                            return "Synonym"
                                                                        }));
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
                }).call(this);
                this._applyWithArgs("exactly", ":");
                return a
            }).call(this)
        },
        "line": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            return (function() {
                this._opt((function() {
                    return this._apply("spaces")
                }));
                l = this._or((function() {
                    return this._apply("newTerm")
                }), (function() {
                    return this._apply("fcTp")
                }), (function() {
                    return this._apply("newRule")
                }), (function() {
                    return this._apply("attribute")
                }));
                this._opt((function() {
                    return this._apply("spaces")
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
    (SBVRParser["keyTokens"] = ["termDecl", "fcTpDecl", "ruleDecl", "term", "modRule", "quant", "verb", "keyword", "allowedAttrs"]);
    (SBVRParser["kwrds"] = ({}));
    (kwrds = ["a", "an", "each", "at", "most", "least", "exactly", "that", "the", "one", "more", "than", "and", "some"]);
    for (var idx = (0);
    (idx < kwrds["length"]); idx++) {
        (SBVRParser["kwrds"][kwrds[idx]] = true)
    }(SBVRParser["_isKwrd"] = (function(k) {
        return this["kwrds"].hasOwnProperty(k)
    }));
    (SBVRParser["initialize"] = (function() {
        this.reset()
    }));
    (SBVRParser["_isTerm"] = (function(k) {
        return (this["terms"].hasOwnProperty(k) || this["terms"].hasOwnProperty(k.singularize()))
    }));
    (SBVRParser["_termForm"] = (function(k) {
        return (this["terms"].hasOwnProperty(k.singularize()) ? k.singularize() : k)
    }));
    (SBVRParser["_isVerb"] = (function(k) {
        if (this["verbs"].hasOwnProperty(k)) {
            return true
        } else {
            if (((k.slice((0), (3)) == "are") && this["verbs"].hasOwnProperty(("is" + k.slice((3)))))) {
                return true
            } else {
                if (((k == "have") && this["verbs"].hasOwnProperty("has"))) {
                    return true
                } else {
                    return false
                }
            }
        }
    }));
    (SBVRParser["_verbForm"] = (function(k) {
        if (((k.slice((0), (3)) == "are") && this["verbs"].hasOwnProperty(("is" + k.slice((3)))))) {
            return ("is" + k.slice((3)))
        } else {
            if (((k == "have") && this["verbs"].hasOwnProperty("has"))) {
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
        (this["terms"] = ({}));
        (this["verbs"] = ({}));
        (this["fctps"] = ({}));
        (this["ruleVars"] = ({}));
        (this["ruleVarsCount"] = (0));
        (this["lines"] = [])
    }))
}