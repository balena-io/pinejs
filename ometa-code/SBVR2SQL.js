{
    SBVR2SQL = objectThatDelegatesTo(OMeta, {
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
                return ["num", n]
            }).call(this)
        },
        "text": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a;
            return (function() {
                a = this._apply("anything");
                return a
            }).call(this)
        },
        "ftsc": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, tt;
            return (function() {
                this._form((function() {
                    return tt = this._many((function() {
                        return (function() {
                            t = this._applyWithArgs("token", "term");
                            return ["ForeignKey", (t[(1)] + "_id"), t[(2)], [t[(1)], "id", "name"]]
                        }).call(this)
                    }))
                }));
                return tt
            }).call(this)
        },
        "ftfl": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, tt;
            return (function() {
                this._form((function() {
                    return tt = this._many((function() {
                        return (function() {
                            t = this._applyWithArgs("token", "term");
                            return (("\"" + t[(1)]) + "_id\" INTEGER")
                        }).call(this)
                    }))
                }));
                return tt
            }).call(this)
        },
        "ftfk": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, tt;
            return (function() {
                this._form((function() {
                    return tt = this._many((function() {
                        return (function() {
                            t = this._applyWithArgs("token", "term");
                            return (((("FOREIGN KEY (\"" + t[(1)]) + "_id\") REFERENCES \"") + t[(1)]) + "\"(\"id\")")
                        }).call(this)
                    }))
                }));
                return tt
            }).call(this)
        },
        "model": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, f, l, k, s, xs;
            return (function() {
                xs = this._many((function() {
                    return this._or((function() {
                        return (function() {
                            t = this._applyWithArgs("token", "term");
                            return ["term", t[(1)], t[(2)], t[(3)], (("CREATE TABLE IF NOT EXISTS \"" + t[(1)]) + "\" (\"id\" INTEGER PRIMARY KEY,\"name\" TEXT)"), (("DROP TABLE \"" + t[(1)]) + "\";")]
                        }).call(this)
                    }), (function() {
                        return (function() {
                            f = this._applyWithArgs("token", "fcTp");
                            l = this._applyWithArgs("ftfl", f[(3)]);
                            k = this._applyWithArgs("ftfk", f[(3)]);
                            s = this._applyWithArgs("ftsc", f[(3)]);
                            return ["fcTp", f[(1)], f[(2)], s, (((((("CREATE TABLE IF NOT EXISTS \"" + f[(1)]) + "\" (\"id\" INTEGER PRIMARY KEY, ") + l.join(", ")) + ", ") + k.join(", ")) + ")"), (("DROP TABLE \"" + f[(1)]) + "\";"), f[(4)]]
                        }).call(this)
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
                c, d, b, t, s, e, t, v, r, t, e;
            return (function() {
                (a = []);
                this._lookahead((function() {
                    return (function() {
                        this._many((function() {
                            return (function() {
                                c = this._applyWithArgs("token", "term");
                                d = this._applyWithArgs("token", "verb");
                                return (a = a.concat([
                                    [c[(0)], c[(2)]],
                                    [d[(0)], d[(2)]]
                                ]))
                            }).call(this)
                        }));
                        return this._opt((function() {
                            return (function() {
                                b = this._applyWithArgs("token", "term");
                                return (a = a.concat([
                                    [b[(0)], b[(2)]]
                                ]))
                            }).call(this)
                        }))
                    }).call(this)
                }));
                this._lookahead((function() {
                    return (function() {
                        s = this._many((function() {
                            return (function() {
                                t = this._applyWithArgs("token", "term");
                                this._applyWithArgs("token", "verb");
                                return t
                            }).call(this)
                        }));
                        return e = this._applyWithArgs("$", "term")
                    }).call(this)
                }));
                (s = s.concat(e));
                r = this._many((function() {
                    return (function() {
                        t = this._applyWithArgs("token", "term");
                        v = this._applyWithArgs("token", "verb");
                        return [t, v]
                    }).call(this)
                }));
                e = this._or((function() {
                    return (function() {
                        t = this._applyWithArgs("token", "term");
                        return [("-" + t[(1)]), (" " + t[(1)])]
                    }).call(this)
                }), (function() {
                    return (function() {
                        this._apply("empty");
                        return ["", ""]
                    }).call(this)
                }));
                return ["fcTp", this._fLst(r).concat(e[(0)]), this._fLstt(r).concat(e[(1)]), s, a]
            }).call(this)
        },
        "verb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            return (function() {
                this._form((function() {
                    return l = this._many1((function() {
                        return this._apply("letters")
                    }))
                }));
                return ["verb", l.join("_"), l.join(" ")]
            }).call(this)
        },
        "term": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l, m;
            return (function() {
                this._form((function() {
                    return l = this._many1((function() {
                        return this._apply("letters")
                    }))
                }));
                this._opt((function() {
                    return this._form((function() {
                        return m = this._many1((function() {
                            return this._apply("letters")
                        }))
                    }))
                }));
                this._opt((function() {
                    return this._form((function() {
                        return this._many((function() {
                            return this._apply("anything")
                        }))
                    }))
                }));
                return ["term", l.join("_"), l.join(" "), [
                    ["Text", "name", "Name", []]
                ]]
            }).call(this)
        },
        "rule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs, t;
            return (function() {
                xs = this._or((function() {
                    return this._applyWithArgs("token", "obl")
                }), (function() {
                    return this._applyWithArgs("token", "nec")
                }), (function() {
                    return this._applyWithArgs("token", "pos")
                }), (function() {
                    return this._applyWithArgs("token", "prm")
                }));
                t = this._applyWithArgs("token", "text");
                return ["rule", [], t, [], xs, []]
            }).call(this)
        },
        "obl": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return (function() {
                xs = this._apply("expr");
                return (("SELECT " + (xs[(3)] ? xs[(3)] : (xs[(0)] + xs[(1)]))) + " AS \"result\"")
            }).call(this)
        },
        "nec": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return (function() {
                xs = this._apply("expr");
                return (("SELECT " + (xs[(3)] ? xs[(3)] : (xs[(0)] + xs[(1)]))) + " AS \"result\"")
            }).call(this)
        },
        "pos": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return (function() {
                xs = this._apply("expr");
                return (("SELECT " + (xs[(3)] ? xs[(3)] : (xs[(0)] + xs[(1)]))) + " AS \"result\"")
            }).call(this)
        },
        "prm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return (function() {
                xs = this._apply("expr");
                return (("SELECT " + (xs[(3)] ? xs[(3)] : (xs[(0)] + xs[(1)]))) + " AS \"result\"")
            }).call(this)
        },
        "expr": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._applyWithArgs("token", "aFrm")
            }), (function() {
                return this._applyWithArgs("token", "existQ")
            }), (function() {
                return this._applyWithArgs("token", "exactQ")
            }), (function() {
                return this._applyWithArgs("token", "atLeastQ")
            }), (function() {
                return this._applyWithArgs("token", "numRngQ")
            }), (function() {
                return this._applyWithArgs("token", "neg")
            }))
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
                return [((("EXISTS(SELECT * FROM \"" + f[(1)]) + "\" AS \"f\" WHERE ") + b.join(" AND ")), ")", ""]
            }).call(this)
        },
        "existQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v, xs;
            return (function() {
                v = this._applyWithArgs("token", "var");
                xs = this._apply("expr");
                return ["1=1", "", ((((((((((" JOIN \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\" ON ") + v[(3)][(0)]) + xs[(0)]) + xs[(1)]) + v[(3)][(1)]) + v[(3)][(2)]) + xs[(2)]), ((((((((("EXISTS(SELECT * FROM \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\" WHERE ") + v[(3)][(0)]) + xs[(0)]) + xs[(1)]) + v[(3)][(1)]) + ")")]
            }).call(this)
        },
        "exactQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, v, xs;
            return (function() {
                i = this._applyWithArgs("token", "card");
                v = this._applyWithArgs("token", "var");
                xs = this._apply("expr");
                return [((((((((("EXISTS(SELECT count(*) AS \"card\" FROM \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\" ") + v[(3)][(2)]) + xs[(2)]) + " WHERE ") + v[(3)][(0)]) + xs[(0)]), ((((xs[(1)] + v[(3)][(1)]) + " GROUP BY NULL HAVING \"card\"=") + i[(1)][(1)]) + ")"), "", ""]
            }).call(this)
        },
        "atLeastQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, v, xs;
            return (function() {
                i = this._applyWithArgs("token", "minCard");
                v = this._applyWithArgs("token", "var");
                xs = this._apply("expr");
                return [((((((((("EXISTS(SELECT count(*) AS \"card\" FROM \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\" ") + v[(3)][(2)]) + xs[(2)]) + " WHERE ") + v[(3)][(0)]) + xs[(0)]), ((((xs[(1)] + v[(3)][(1)]) + " GROUP BY NULL HAVING \"card\">=") + i[(1)][(1)]) + ")"), "", ""]
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
                xs = this._apply("expr");
                return [((((((((((("EXISTS(SELECT count(*) AS \"card\" FROM \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\" ") + v[(3)][(2)]) + xs[(2)]) + " ") + xs[(2)]) + " WHERE ") + v[(3)][(0)]) + xs[(0)]), ((((((xs[(1)] + v[(3)][(1)]) + " GROUP BY NULL HAVING \"card\">=") + i[(1)][(1)]) + " AND \"card\"<=") + a[(1)][(1)]) + ")"), "", ""]
            }).call(this)
        },
        "neg": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                s, v, xs, xs;
            return this._or((function() {
                return (function() {
                    this._form((function() {
                        return (function() {
                            s = this._apply("anything");
                            this._pred((s == "existQ"));
                            v = this._applyWithArgs("token", "var");
                            return xs = this._apply("expr")
                        }).call(this)
                    }));
                    return [((((((((("NOT EXISTS(SELECT * FROM \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\"") + v[(3)][(2)]) + xs[(2)]) + " WHERE ") + v[(3)][(0)]) + xs[(0)]), ((xs[(1)] + v[(3)][(1)]) + ")"), "", ""]
                }).call(this)
            }), (function() {
                return (function() {
                    xs = this._apply("expr");
                    return [("NOT " + xs[(0)]), xs[(1)], "", ""]
                }).call(this)
            }))
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
                    w = this._apply("expr");
                    ((w[(0)] == "") ? "" : (w[(0)] += " AND "));
                    return ["var", n, t, w]
                }).call(this)
            }), (function() {
                return (function() {
                    n = this._applyWithArgs("token", "num");
                    t = this._applyWithArgs("token", "term");
                    return ["var", n, t, ["", "", ""]]
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
                return (((("\"var" + n) + "\".\"id\" = \"f\".\"") + t[(1)]) + "_id\"")
            }).call(this)
        }
    });
    (SBVR2SQL["_cLst"] = (function(v) {
        for (var i = (1);
        (i < v["length"]); i++) {
            (v[(0)] = v[(0)].concat(v[i]))
        };
        undefined;
        return v[(0)]
    }));
    (SBVR2SQL["_fLst"] = (function(v) {
        (v = this._cLst(v));
        var r = [];
        for (var i = (0);
        (i < v["length"]); i++) {
            (r = r.concat(v[i][(1)]))
        };
        undefined;
        return r.join("-")
    }));
    (SBVR2SQL["_fLstt"] = (function(v) {
        (v = this._cLst(v));
        var r = [];
        for (var i = (0);
        (i < v["length"]); i++) {
            (r = r.concat(v[i][(2)]))
        };
        undefined;
        return r.join(" ")
    }))
}