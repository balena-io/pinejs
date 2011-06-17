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
            t, o, f, o, v;
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
            t, f, s, t, f, s, t, s;
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
            f, g, r, f;
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
            w, f, w, f;
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
            f, f;
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
