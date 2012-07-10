define(["ometa/ometa-base"], (function() {
    var ServerURIParser = undefined;
    ServerURIParser = objectThatDelegatesTo(OMeta, {
        "word": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._consumedBy((function() {
                return this._many1((function() {
                    return this._or((function() {
                        return this._apply("letter")
                    }), (function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case "_":
                                return "_";
                            default:
                                throw fail
                            }
                        }).call(this)
                    }))
                }))
            }))
        },
        "nmbr": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                number;
            number = this._consumedBy((function() {
                return this._many1((function() {
                    return this._apply("digit")
                }))
            }));
            return parseInt(number, (10))
        },
        "part": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._consumedBy((function() {
                return this._many1((function() {
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
                }))
            }))
        },
        "mdtp": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                switch (this._apply('anything')) {
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
        "parm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, f, o, v;
            t = this._apply("part");
            f = this._or((function() {
                return (function() {
                    switch (this._apply('anything')) {
                    case ".":
                        return this._apply("word");
                    default:
                        throw fail
                    }
                }).call(this)
            }), (function() {
                f = t;
                t = [];
                return f
            }));
            o = (function() {
                switch (this._apply('anything')) {
                case "=":
                    return "eq";
                case "!":
                    return (function() {
                        this._applyWithArgs("exactly", "=");
                        "!=";
                        return "ne"
                    }).call(this);
                case "~":
                    return "lk";
                default:
                    throw fail
                }
            }).call(this);
            v = this._apply("part");
            this._opt((function() {
                return this._applyWithArgs("exactly", ";")
            }));
            return [o, t, f, v]
        },
        "actn": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a, p;
            return this._or((function() {
                return this._many1((function() {
                    this._applyWithArgs("exactly", "*");
                    a = this._apply("mdtp");
                    p = this._or((function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case ":":
                                return this._many1((function() {
                                    return this._apply("parm")
                                }));
                            default:
                                throw fail
                            }
                        }).call(this)
                    }), (function() {
                        return []
                    }));
                    return [a].concat(p)
                }))
            }), (function() {
                return []
            }))
        },
        "Command": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                switch (this._apply('anything')) {
                case "c":
                    return (function() {
                        this._applyWithArgs("exactly", "r");
                        return "cr"
                    }).call(this);
                case "e":
                    return (function() {
                        this._applyWithArgs("exactly", "x");
                        this._applyWithArgs("exactly", "e");
                        this._applyWithArgs("exactly", "c");
                        this._applyWithArgs("exactly", "u");
                        this._applyWithArgs("exactly", "t");
                        this._applyWithArgs("exactly", "e");
                        return "execute"
                    }).call(this);
                default:
                    throw fail
                }
            }).call(this)
        },
        "Term": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                term;
            term = this._apply("word");
            return ["Term", term]
        },
        "FactType": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                terms, factType, term, verb;
            terms = ["terms"];
            factType = "";
            this._many1((function() {
                term = this._apply("word");
                this._applyWithArgs("exactly", "-");
                verb = this._apply("word");
                terms.push(term);
                return factType = (((factType + term) + "-") + verb)
            }));
            this._opt((function() {
                this._applyWithArgs("exactly", "-");
                term = this._apply("word");
                terms.push(term);
                return factType = ((factType + "-") + term)
            }));
            return ["FactType", factType, terms]
        },
        "id": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            return this._or((function() {
                return (function() {
                    switch (this._apply('anything')) {
                    case ".":
                        return (function() {
                            n = this._apply("nmbr");
                            return [n]
                        }).call(this);
                    default:
                        throw fail
                    }
                }).call(this)
            }), (function() {
                return [""]
            }))
        },
        "uri": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                w, f, i, a, c;
            this._applyWithArgs("exactly", "/");
            w = this._apply("word");
            this._opt((function() {
                return this._applyWithArgs("exactly", "/")
            }));
            return this._or((function() {
                f = this._or((function() {
                    return this._apply("FactType")
                }), (function() {
                    return this._apply("Term")
                }));
                i = this._apply("id");
                a = this._apply("actn");
                a = ["mod"].concat(a);
                this._opt((function() {
                    return this._applyWithArgs("exactly", "/")
                }));
                this._opt((function() {
                    c = this._apply("Command");
                    return a.push([c])
                }));
                f = f.concat(i);
                f.push(a);
                return [w].concat([f])
            }), (function() {
                return [w]
            }))
        }
    });
    return ServerURIParser
}))