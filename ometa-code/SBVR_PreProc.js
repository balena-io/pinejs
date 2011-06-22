{
    SBVR_NullOpt = objectThatDelegatesTo(OMeta, {
        "setHelped": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return ($elf["_didSomething"] = true)
        },
        "helped": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._pred($elf["_didSomething"])
        },
        "optimize": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x;
            return (function() {
                x = this._apply("trans");
                this._apply("helped");
                return x
            }).call(this)
        },
        "$": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, a;
            return (function() {
                x = this._apply("anything");
                return this._or((function() {
                    return (function() {
                        a = this._applyWithArgs("token", x);
                        return [a]
                    }).call(this)
                }), (function() {
                    return []
                }))
            }).call(this)
        },
        "trans": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, a;
            return (function() {
                this._form((function() {
                    return (function() {
                        t = this._apply("anything");
                        return a = this._applyWithArgs("apply", t)
                    }).call(this)
                }));
                return a
            }).call(this)
        },
        "token": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, t, a;
            return (function() {
                x = this._apply("anything");
                this._form((function() {
                    return (function() {
                        t = this._apply("anything");
                        this._pred((t == x));
                        return a = this._applyWithArgs("apply", x)
                    }).call(this)
                }));
                return a
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
                this._many((function() {
                    return this._apply("space")
                }));
                return l.join("")
            }).call(this)
        },
        "num": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            return (function() {
                n = this._apply("number");
                this._pred((!isNaN(n)));
                return ["num", parseInt(n)]
            }).call(this)
        },
        "model": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return (function() {
                xs = this._many((function() {
                    return this._or((function() {
                        return this._applyWithArgs("token", "nTerm")
                    }), (function() {
                        return this._applyWithArgs("token", "nFcTp")
                    }), (function() {
                        return this._applyWithArgs("token", "rule")
                    }))
                }));
                return ["model"].concat(xs)
            }).call(this)
        },
        "fcTp": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, v, e;
            return (function() {
                (a = []);
                this._many((function() {
                    return (function() {
                        t = this._applyWithArgs("token", "term");
                        v = this._applyWithArgs("token", "verb");
                        return (a = a.concat([t, v]))
                    }).call(this)
                }));
                e = this._applyWithArgs("$", "term");
                return ["fcTp"].concat(a).concat(e)
            }).call(this)
        },
        "verb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v;
            return (function() {
                v = this._apply("anything");
                return ["verb", v]
            }).call(this)
        },
        "term": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            return (function() {
                t = this._apply("anything");
                return ["term", t]
            }).call(this)
        },
        "rule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, t;
            return (function() {
                x = this._or((function() {
                    return this._applyWithArgs("token", "obl")
                }), (function() {
                    return this._applyWithArgs("token", "nec")
                }), (function() {
                    return this._applyWithArgs("token", "pos")
                }), (function() {
                    return this._applyWithArgs("token", "prm")
                }));
                t = this._applyWithArgs("token", "text");
                return ["rule", x, t]
            }).call(this)
        },
        "text": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a;
            return (function() {
                a = this._apply("anything");
                return ["text", a]
            }).call(this)
        },
        "obl": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return (function() {
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                return ["obl"].concat(xs)
            }).call(this)
        },
        "nec": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return (function() {
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                return ["nec"].concat(xs)
            }).call(this)
        },
        "pos": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return (function() {
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                return ["pos"].concat(xs)
            }).call(this)
        },
        "prm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return (function() {
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                return ["prm"].concat(xs)
            }).call(this)
        },
        "neg": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return (function() {
                xs = this._apply("trans");
                return ["neg"].concat([xs])
            }).call(this)
        },
        "quant": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._applyWithArgs("token", "univQ")
            }), (function() {
                return this._applyWithArgs("token", "existQ")
            }), (function() {
                return this._applyWithArgs("token", "exactQ")
            }), (function() {
                return this._applyWithArgs("token", "atMostQ")
            }), (function() {
                return this._applyWithArgs("token", "atLeastQ")
            }), (function() {
                return this._applyWithArgs("token", "numRngQ")
            }))
        },
        "univQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v, xs;
            return (function() {
                v = this._applyWithArgs("token", "var");
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                return ["univQ", v].concat(xs)
            }).call(this)
        },
        "existQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v, xs;
            return (function() {
                v = this._applyWithArgs("token", "var");
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                return ["existQ", v].concat(xs)
            }).call(this)
        },
        "exactQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, v, xs;
            return (function() {
                i = this._applyWithArgs("token", "card");
                v = this._applyWithArgs("token", "var");
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                return ["exactQ", i, v].concat(xs)
            }).call(this)
        },
        "atMostQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a, v, xs;
            return (function() {
                a = this._applyWithArgs("token", "maxCard");
                v = this._applyWithArgs("token", "var");
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                return ["atMostQ", a, v].concat(xs)
            }).call(this)
        },
        "atLeastQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, v, xs;
            return (function() {
                i = this._applyWithArgs("token", "minCard");
                v = this._applyWithArgs("token", "var");
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                return ["atLeastQ", i, v].concat(xs)
            }).call(this)
        },
        "numRngQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, a, v, xs;
            return (function() {
                i = this._applyWithArgs("token", "minCard");
                a = this._applyWithArgs("token", "maxCard");
                v = this._applyWithArgs("token", "var");
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                return ["numRngQ", i, a, v].concat(xs)
            }).call(this)
        },
        "card": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            return (function() {
                n = this._applyWithArgs("token", "num");
                return ["card", n]
            }).call(this)
        },
        "minCard": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            return (function() {
                n = this._applyWithArgs("token", "num");
                return ["minCard", n]
            }).call(this)
        },
        "maxCard": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            return (function() {
                n = this._applyWithArgs("token", "num");
                return ["maxCard", n]
            }).call(this)
        },
        "var": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n, t, w, n, t;
            return this._or((function() {
                return (function() {
                    n = this._applyWithArgs("token", "num");
                    t = this._applyWithArgs("token", "term");
                    w = this._or((function() {
                        return this._applyWithArgs("token", "aFrm")
                    }), (function() {
                        return this._apply("quant")
                    }));
                    return ["var", n, t, w]
                }).call(this)
            }), (function() {
                return (function() {
                    n = this._applyWithArgs("token", "num");
                    t = this._applyWithArgs("token", "term");
                    return ["var", n, t]
                }).call(this)
            }))
        },
        "bind": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, n;
            return (function() {
                t = this._applyWithArgs("token", "term");
                n = this._apply("number");
                return ["bind", t, n]
            }).call(this)
        },
        "aFrm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                f, b;
            return (function() {
                f = this._applyWithArgs("token", "fcTp");
                b = this._many((function() {
                    return this._applyWithArgs("token", "bind")
                }));
                return ["aFrm", f].concat(b)
            }).call(this)
        }
    });
    (SBVR_NullOpt["initialize"] = (function() {
        (this["_didSomething"] = false)
    }));
    FNN_Elim = objectThatDelegatesTo(SBVR_NullOpt, {
        "univQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v, xs;
            return (function() {
                v = this._applyWithArgs("token", "var");
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                this._apply("setHelped");
                return ["neg", ["existQ", v, ["neg"].concat(xs)]]
            }).call(this)
        },
        "atLeastQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, v, xs, i, v, xs;
            return this._or((function() {
                return (function() {
                    i = this._applyWithArgs("token", "minCard");
                    this._pred((i[(1)][(1)] == (1)));
                    v = this._applyWithArgs("token", "var");
                    xs = this._many((function() {
                        return this._apply("trans")
                    }));
                    this._apply("setHelped");
                    return ["existQ", v].concat(xs)
                }).call(this)
            }), (function() {
                return (function() {
                    i = this._applyWithArgs("token", "minCard");
                    v = this._applyWithArgs("token", "var");
                    xs = this._many((function() {
                        return this._apply("trans")
                    }));
                    return ["atLeastQ", i, v].concat(xs)
                }).call(this)
            }))
        },
        "atMostQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a, v, xs;
            return (function() {
                a = this._applyWithArgs("token", "maxCard");
                v = this._applyWithArgs("token", "var");
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                this._apply("setHelped");
                return (function() {
                    a[(1)][(1)]++;
                    return ["neg", ["atLeastQ", ["minCard", a[(1)]], v].concat(xs)]
                }).call(this)
            }).call(this)
        },
        "neg": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs, xs;
            return this._or((function() {
                return (function() {
                    this._form((function() {
                        return (function() {
                            this._applyWithArgs("exactly", "neg");
                            return xs = this._apply("trans")
                        }).call(this)
                    }));
                    this._apply("setHelped");
                    return xs
                }).call(this)
            }), (function() {
                return (function() {
                    xs = this._apply("trans");
                    return ["neg"].concat([xs])
                }).call(this)
            }))
        }
    });
    SBVR_PreProc = objectThatDelegatesTo(OMeta, {
        "optimizeTree": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                rs;
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "model");
                        return rs = this._many((function() {
                            return this._apply("optimizeRule")
                        }))
                    }).call(this)
                }));
                return ["model"].concat(rs)
            }).call(this)
        },
        "optimizeRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                r, r;
            return (function() {
                r = this._apply("anything");
                this._many((function() {
                    return r = this._applyWithArgs("foreign", FNN_Elim, 'optimize', r)
                }));
                return r
            }).call(this)
        }
    })
}