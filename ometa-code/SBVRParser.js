{
    SBVRParser = objectThatDelegatesTo(OMeta, {
        "isTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x;
            return (function() {
                x = this._apply("anything");
                return this._pred(SBVRParser._isTerm(x))
            }).call(this)
        },
        "isVerb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x;
            return (function() {
                x = this._apply("anything");
                return this._pred(SBVRParser._isVerb(x))
            }).call(this)
        },
        "isKwrd": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x;
            return (function() {
                x = this._apply("anything");
                return this._pred(SBVRParser._isKwrd(x))
            }).call(this)
        },
        "isFctp": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x;
            return (function() {
                x = this._apply("anything");
                return this._pred(SBVRParser._isFctp(x))
            }).call(this)
        },
        "isKwrdSt": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                p, q, w, w, n;
            return (function() {
                p = this._apply("anything");
                q = this._apply("anything");
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
        "isTermSt": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                p, q, w, w, n;
            return (function() {
                p = this._apply("anything");
                q = this._apply("anything");
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
        "isVerbSt": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                p, q, w, w, n;
            return (function() {
                p = this._apply("anything");
                q = this._apply("anything");
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
        "findVar": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x;
            return (function() {
                x = this._apply("anything");
                return this["ruleVars"][x[(1)]]
            }).call(this)
        },
        "bind": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, y;
            return (function() {
                x = this._apply("anything");
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
            return (function() {
                this._apply("spaces");
                n = this._many1((function() {
                    return this._apply("digit")
                }));
                return ["num", parseInt(n.join(""))]
            }).call(this)
        },
        "word": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                w;
            return (function() {
                this._apply("spaces");
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
                w, w;
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
                w, w;
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
                w, w;
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
        "kwrd": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, w, w, a;
            return (function() {
                x = this._apply("anything");
                this._apply("spaces");
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
        "token": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, t;
            return (function() {
                x = this._apply("anything");
                t = this._applyWithArgs("kwrd", "");
                this._pred((t == x));
                return ["kwrd", t]
            }).call(this)
        },
        "termR": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, w, w, a;
            return (function() {
                x = this._apply("anything");
                this._apply("spaces");
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
                t, t;
            return (function() {
                t = this._applyWithArgs("termR", "");
                t = this._termForm(t);
                return ["term", t]
            }).call(this)
        },
        "mkVerb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x;
            return (function() {
                x = this._apply("anything");
                (this["verbs"][x] = true);
                return ["verb", x]
            }).call(this)
        },
        "verbR": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, w, w, a;
            return (function() {
                x = this._apply("anything");
                this._apply("spaces");
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
                v, v;
            return (function() {
                v = this._applyWithArgs("verbR", "");
                v = this._verbForm(v);
                return ["verb", v]
            }).call(this)
        },
        "quant": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n, n, n, n, n, n, m;
            return this._or((function() {
                return (function() {
                    this._applyWithArgs("token", "each");
                    this._lookahead((function() {
                        return this._apply("term")
                    }));
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
                    this._lookahead((function() {
                        return this._apply("term")
                    }));
                    return ["existQ"]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("token", "at");
                    this._applyWithArgs("token", "most");
                    n = this._or((function() {
                        return (function() {
                            this._applyWithArgs("token", "one");
                            return ["num", (1)]
                        }).call(this)
                    }), (function() {
                        return this._apply("num")
                    }));
                    this._lookahead((function() {
                        return this._apply("term")
                    }));
                    return ["atMostQ", ["maxCard", n]]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("token", "at");
                    this._applyWithArgs("token", "least");
                    n = this._or((function() {
                        return (function() {
                            this._applyWithArgs("token", "one");
                            return ["num", (1)]
                        }).call(this)
                    }), (function() {
                        return this._apply("num")
                    }));
                    this._lookahead((function() {
                        return this._apply("term")
                    }));
                    return ["atLeastQ", ["minCard", n]]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("token", "more");
                    this._applyWithArgs("token", "than");
                    n = this._or((function() {
                        return (function() {
                            this._applyWithArgs("token", "one");
                            return ["num", (2)]
                        }).call(this)
                    }), (function() {
                        return (function() {
                            n = this._apply("num");
                            ++n[(1)];
                            return n
                        }).call(this)
                    }));
                    this._lookahead((function() {
                        return this._apply("term")
                    }));
                    return ["atLeastQ", ["minCard", n]]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("token", "exactly");
                    n = this._or((function() {
                        return (function() {
                            this._applyWithArgs("token", "one");
                            return ["num", (1)]
                        }).call(this)
                    }), (function() {
                        return this._apply("num")
                    }));
                    this._lookahead((function() {
                        return this._apply("term")
                    }));
                    return ["exactQ", ["card", n]]
                }).call(this)
            }), (function() {
                return (function() {
                    this._applyWithArgs("token", "at");
                    this._applyWithArgs("token", "least");
                    n = this._or((function() {
                        return (function() {
                            this._applyWithArgs("token", "one");
                            return ["num", (1)]
                        }).call(this)
                    }), (function() {
                        return this._apply("num")
                    }));
                    this._applyWithArgs("token", "and");
                    this._applyWithArgs("token", "at");
                    this._applyWithArgs("token", "most");
                    m = this._or((function() {
                        return (function() {
                            this._applyWithArgs("token", "one");
                            return ["num", (1)]
                        }).call(this)
                    }), (function() {
                        return this._apply("num")
                    }));
                    this._lookahead((function() {
                        return this._apply("term")
                    }));
                    return ["numRngQ", ["minCard", n], ["maxCard", m]]
                }).call(this)
            }))
        },
        "adVar": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, q, q;
            return (function() {
                x = this._apply("anything");
                (this["ruleVars"][x[(1)]] = this["ruleVarsCount"]++);
                return this._or((function() {
                    return (function() {
                        this._applyWithArgs("token", "that");
                        this._applyWithArgs("token", "the");
                        q = this._applyWithArgs("terbRi", [
                            []
                        ], x);
                        return ["var", ["num", this["ruleVars"][x[(1)]]], x, q]
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._applyWithArgs("token", "that");
                        q = this._applyWithArgs("qTerbRi", [
                            []
                        ], x);
                        return ["var", ["num", this["ruleVars"][x[(1)]]], x, q]
                    }).call(this)
                }), (function() {
                    return ["var", ["num", this["ruleVars"][x[(1)]]], x]
                }))
            }).call(this)
        },
        "atfo": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                c;
            return (function() {
                c = this._apply("anything");
                this._applyWithArgs("isFctp", c[(0)]);
                (c[(0)] = ["fcTp"].concat(c[(0)]));
                return (function() {
                    (d = ["aFrm"]);
                    return d.concat(c)
                }).call(this)
            }).call(this)
        },
        "terbRi": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                c, i, t, v, b, c;
            return (function() {
                c = this._apply("anything");
                i = this._apply("anything");
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
        "qTerbRi": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                c, i, q, t, a, v, b, c, r, v, b, c, b, c;
            return (function() {
                c = this._apply("anything");
                i = this._apply("anything");
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
                            return this._applyWithArgs("qTerm", c)
                        }), (function() {
                            return this._applyWithArgs("qTerbR", c)
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
            }).call(this)
        },
        "qTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                c, q, t, a, b, c, r;
            return (function() {
                c = this._apply("anything");
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
        "qTerbR": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                c, q, t, a, v, b, c, r;
            return (function() {
                c = this._apply("anything");
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
                    return this._applyWithArgs("qTerm", c)
                }), (function() {
                    return this._applyWithArgs("qTerbR", c)
                }));
                return q.concat([r])
            }).call(this)
        },
        "modRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                q, q, q, q, q, q, q;
            return (function() {
                this._apply("spaces");
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
                                                                            q = this._applyWithArgs("qTerbR", [
                                                                                []
                                                                            ]);
                                                                            return ["obl", q]
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
                                                                                    q = this._applyWithArgs("qTerbR", [
                                                                                        []
                                                                                    ]);
                                                                                    return ["nec", q]
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
                                                                                    q = this._applyWithArgs("qTerbR", [
                                                                                        []
                                                                                    ]);
                                                                                    return ["nec", ["neg", q]]
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
                                                                                    q = this._applyWithArgs("qTerbR", [
                                                                                        []
                                                                                    ]);
                                                                                    return ["obl", ["neg", q]]
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
                                                                                    q = this._applyWithArgs("qTerbR", [
                                                                                        []
                                                                                    ]);
                                                                                    return ["pos", q]
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
                                                                                    q = this._applyWithArgs("qTerbR", [
                                                                                        []
                                                                                    ]);
                                                                                    return ["prm", q]
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
                                                                            q = this._applyWithArgs("qTerbR", [
                                                                                []
                                                                            ]);
                                                                            return ["nec", ["neg", q]]
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
            }).call(this)
        },
        "newRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a, r;
            return (function() {
                this._applyWithArgs("exactly", "R");
                this._applyWithArgs("exactly", ":");
                "R:";
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
                return ["rule", r, ["text", a.join("")]]
            }).call(this)
        },
        "terb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, f, v;
            return (function() {
                t = this._apply("term");
                v = this._or((function() {
                    return this._apply("verb")
                }), (function() {
                    return (function() {
                        f = this._apply("nrText");
                        return this._applyWithArgs("mkVerb", f)
                    }).call(this)
                }));
                return [t, v]
            }).call(this)
        },
        "fcTp": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                b, t, e, t;
            return (function() {
                this._applyWithArgs("exactly", "F");
                this._applyWithArgs("exactly", ":");
                "F:";
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
        "newTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, a;
            return (function() {
                this._applyWithArgs("exactly", "T");
                this._applyWithArgs("exactly", ":");
                "T:";
                t = this._apply("nrText");
                (this["terms"][t] = true);
                a = this._many((function() {
                    return this._apply("attribute")
                }));
                return ["term", t, a]
            }).call(this)
        },
        "attribute": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                attrName, attrVal;
            return (function() {
                (function() {
                    switch (this._apply('anything')) {
                    case "\n":
                        return this._or((function() {
                            return "\n"
                        }), (function() {
                            return (function() {
                                switch (this._apply('anything')) {
                                case "\r":
                                    return "\n\r";
                                default:
                                    throw fail
                                }
                            }).call(this)
                        }));
                    default:
                        throw fail
                    }
                }).call(this);
                attrName = this._apply("allowedAttrs");
                this._applyWithArgs("exactly", ":");
                attrVal = this._apply("toEOL");
                return [attrName.replace(new RegExp(" ", "g"), ""), attrVal]
            }).call(this)
        },
        "allowedAttrs": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                this._opt((function() {
                    return this._apply("spaces")
                }));
                return (function() {
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
                }).call(this)
            }).call(this)
        },
        "line": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._apply("newTerm")
            }), (function() {
                return this._apply("fcTp")
            }), (function() {
                return this._apply("newRule")
            }))
        },
        "linef": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            return this._or((function() {
                return (function() {
                    l = this._apply("line");
                    this._opt((function() {
                        return this._apply("spaces")
                    }));
                    this._or((function() {
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
                    }));
                    return l
                }).call(this)
            }), (function() {
                return (function() {
                    switch (this._apply('anything')) {
                    case "\n":
                        return "";
                    default:
                        throw fail
                    }
                }).call(this)
            }))
        },
        "expr": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            return (function() {
                l = this._many((function() {
                    return this._apply("linef")
                }));
                return ["model"].concat(l)
            }).call(this)
        }
    });
    (SBVRParser["kwrds"] = ({}));
    (SBVRParser["terms"] = ({}));
    (SBVRParser["verbs"] = ({}));
    (SBVRParser["fctps"] = ({}));
    (SBVRParser["ruleVars"] = ({}));
    (SBVRParser["ruleVarsCount"] = (0));
    (kwrds = ["a", "an", "each", "at", "most", "least", "exactly", "that", "the", "one", "more", "than", "and", "some"]);
    for (var idx = (0);
    (idx < kwrds["length"]); idx++) {
        (SBVRParser["kwrds"][kwrds[idx]] = true)
    }(SBVRParser["_isKwrd"] = (function(k) {
        return this["kwrds"].hasOwnProperty(k)
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
            undefined
        }
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
        (SBVRParser["terms"] = ({}));
        (SBVRParser["verbs"] = ({}));
        (SBVRParser["fctps"] = ({}));
        (SBVRParser["ruleVars"] = ({}));
        (SBVRParser["ruleVarsCount"] = (0))
    }))
}