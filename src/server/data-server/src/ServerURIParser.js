define(["ometa/ometa-base"], (function() {
    var ServerURIParser = undefined;
    ServerURIParser = objectThatDelegatesTo(OMeta, {
        "word": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            l = this._many1((function() {
                return this._or((function() {
                    return this._apply("letter")
                }), (function() {
                    return (function() {
                        switch (this._apply('anything')) {
                        case "-":
                            return "-";
                        default:
                            throw fail
                        }
                    }).call(this)
                }))
            }));
            return l.join("")
        },
        "dgit": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                d;
            d = OMeta._superApplyWithArgs(this, 'digit');
            return d.digitValue()
        },
        "nmbr": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n, d;
            return this._or((function() {
                n = this._apply("nmbr");
                d = this._apply("dgit");
                return ((n * (10)) + d)
            }), (function() {
                return this._apply("dgit")
            }))
        },
        "part": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
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
                        return (function() {
                            ".";
                            return this._apply("word")
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
                this._applyWithArgs("exactly", ";");
                return ";"
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
                    "*";
                    a = this._apply("mdtp");
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
                }))
            }), (function() {
                return []
            }))
        },
        "comm": function() {
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
        "term": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            l = this._many1((function() {
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
            }));
            return l.join("")
        },
        "verb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            l = this._many1((function() {
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
            }));
            return l.join("")
        },
        "trmf": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            t = this._apply("term");
            return ["term", t]
        },
        "FactType": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, v;
            (function() {
                (ts = ["terms"]);
                return (ft = "")
            }).call(this);
            this._many1((function() {
                t = this._apply("term");
                this._applyWithArgs("exactly", "-");
                "-";
                v = this._apply("verb");
                return (function() {
                    ts.push(t);
                    return (ft += ((t + "-") + v))
                }).call(this)
            }));
            this._opt((function() {
                this._applyWithArgs("exactly", "-");
                "-";
                t = this._apply("term");
                return (function() {
                    ts.push(t);
                    return (ft += ("-" + t))
                }).call(this)
            }));
            return ["FactType", ft, ts]
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
                            ".";
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
                w, f, i, a, c, t;
            return (function() {
                switch (this._apply('anything')) {
                case "/":
                    return this._or((function() {
                        "/";
                        w = this._apply("word");
                        this._opt((function() {
                            this._applyWithArgs("exactly", "/");
                            return "/"
                        }));
                        f = this._apply("FactType");
                        i = this._apply("id");
                        a = this._apply("actn");
                        this._applyWithArgs("exactly", "/");
                        "/";
                        c = this._apply("comm");
                        return [w].concat([f.concat(i).concat([
                            ["mod"].concat(a).concat([
                                [c]
                            ])])])
                    }), (function() {
                        "/";
                        w = this._apply("word");
                        this._opt((function() {
                            this._applyWithArgs("exactly", "/");
                            return "/"
                        }));
                        t = this._apply("trmf");
                        i = this._apply("id");
                        a = this._apply("actn");
                        this._applyWithArgs("exactly", "/");
                        "/";
                        c = this._apply("comm");
                        return [w].concat([t.concat(i).concat([
                            ["mod"].concat(a).concat([
                                [c]
                            ])])])
                    }), (function() {
                        "/";
                        w = this._apply("word");
                        this._opt((function() {
                            this._applyWithArgs("exactly", "/");
                            return "/"
                        }));
                        f = this._apply("FactType");
                        i = this._apply("id");
                        a = this._apply("actn");
                        this._opt((function() {
                            this._applyWithArgs("exactly", "/");
                            return "/"
                        }));
                        return [w].concat([f.concat(i).concat([
                            ["mod"].concat(a)])])
                    }), (function() {
                        "/";
                        w = this._apply("word");
                        this._opt((function() {
                            this._applyWithArgs("exactly", "/");
                            return "/"
                        }));
                        t = this._apply("trmf");
                        i = this._apply("id");
                        a = this._apply("actn");
                        this._opt((function() {
                            this._applyWithArgs("exactly", "/");
                            return "/"
                        }));
                        return [w].concat([t.concat(i).concat([
                            ["mod"].concat(a)])])
                    }), (function() {
                        "/";
                        w = this._or((function() {
                            return this._apply("word")
                        }), (function() {
                            return ""
                        }));
                        this._opt((function() {
                            this._applyWithArgs("exactly", "/");
                            return "/"
                        }));
                        return [w]
                    }));
                default:
                    throw fail
                }
            }).call(this)
        }
    });
    return ServerURIParser
}))