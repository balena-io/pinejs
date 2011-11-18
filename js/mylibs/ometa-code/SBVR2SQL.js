{
    SBVR2SQL = objectThatDelegatesTo(OMeta, {
        "$": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                a;
            return this._or((function() {
                a = this._applyWithArgs("token", x);
                return [a]
            }), (function() {
                return []
            }))
        },
        "trans": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, a;
            this._form((function() {
                t = this._apply("anything");
                return a = this._applyWithArgs("apply", t)
            }));
            return a
        },
        "token": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, t, a;
            x = this._apply("anything");
            this._form((function() {
                t = this._apply("anything");
                this._pred((t == x));
                return a = this._applyWithArgs("apply", x)
            }));
            return a
        },
        "letters": function() {
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
            this._many((function() {
                return this._apply("space")
            }));
            return l.join("")
        },
        "num": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            n = this._apply("number");
            this._pred((!isNaN(n)));
            return ["num", n]
        },
        "text": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a;
            a = this._apply("anything");
            return a
        },
        "ftsc": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, tt;
            this._form((function() {
                return tt = this._many((function() {
                    t = this._applyWithArgs("token", "term");
                    return ["ForeignKey", (t[(1)] + "_id"), t[(2)], [t[(1)], "id", "name"]]
                }))
            }));
            return tt
        },
        "ftfl": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, tt;
            this._form((function() {
                return tt = this._many((function() {
                    t = this._applyWithArgs("token", "term");
                    return (("\"" + t[(1)]) + "_id\" INTEGER")
                }))
            }));
            return tt
        },
        "ftfk": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, tt;
            this._form((function() {
                return tt = this._many((function() {
                    t = this._applyWithArgs("token", "term");
                    return (((("FOREIGN KEY (\"" + t[(1)]) + "_id\") REFERENCES \"") + t[(1)]) + "\"(\"id\")")
                }))
            }));
            return tt
        },
        "model": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, f, l, k, s, xs;
            xs = this._many((function() {
                return this._or((function() {
                    t = this._applyWithArgs("token", "term");
                    return ["term", t[(1)], t[(2)], t[(3)], ((("CREATE TABLE " + "\"") + t[(1)]) + "\" (\"id\" INTEGER PRIMARY KEY AUTOINCREMENT,\"name\" TEXT)"), (("DROP TABLE \"" + t[(1)]) + "\";")]
                }), (function() {
                    f = this._applyWithArgs("token", "fcTp");
                    l = this._applyWithArgs("ftfl", f[(3)]);
                    k = this._applyWithArgs("ftfk", f[(3)]);
                    s = this._applyWithArgs("ftsc", f[(3)]);
                    return ["fcTp", f[(1)], f[(2)], s, ((((((("CREATE TABLE " + "\"") + f[(1)]) + "\" (\"id\" INTEGER PRIMARY KEY AUTOINCREMENT, ") + l.join(", ")) + ", ") + k.join(", ")) + ")"), (("DROP TABLE \"" + f[(1)]) + "\";"), f[(4)]]
                }), (function() {
                    return this._applyWithArgs("token", "rule")
                }))
            }));
            return ["model"].concat(xs)
        },
        "fcTp": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                c, d, b, t, s, e, v, r, attr;
            (a = []);
            this._lookahead((function() {
                this._many((function() {
                    c = this._applyWithArgs("token", "term");
                    d = this._applyWithArgs("token", "verb");
                    return (a = a.concat([
                        [c[(0)], c[(2)]],
                        [d[(0)], d[(2)]]
                    ]))
                }));
                return this._opt((function() {
                    b = this._applyWithArgs("token", "term");
                    return (a = a.concat([
                        [b[(0)], b[(2)]]
                    ]))
                }))
            }));
            this._lookahead((function() {
                s = this._many((function() {
                    t = this._applyWithArgs("token", "term");
                    this._applyWithArgs("token", "verb");
                    return t
                }));
                return e = this._applyWithArgs("$", "term")
            }));
            (s = s.concat(e));
            r = this._many((function() {
                t = this._applyWithArgs("token", "term");
                v = this._applyWithArgs("token", "verb");
                return [t, v]
            }));
            e = this._or((function() {
                t = this._applyWithArgs("token", "term");
                return [("-" + t[(1)]), (" " + t[(1)])]
            }), (function() {
                this._apply("empty");
                return ["", ""]
            }));
            this._many((function() {
                return this._apply("anything")
            }));
            attr = ["", ""];
            return ["fcTp", this._fLst(r).concat(e[(0)]), this._fLstt(r).concat(e[(1)]), s, a]
        },
        "verb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            this._form((function() {
                return l = this._many1((function() {
                    return this._apply("letters")
                }))
            }));
            return ["verb", l.join("_"), l.join(" ")]
        },
        "term": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l, m;
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
        },
        "rule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs, t;
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
        },
        "obl": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            xs = this._apply("expr");
            return (("SELECT " + (xs[(3)] ? xs[(3)] : (xs[(0)] + xs[(1)]))) + " AS \"result\"")
        },
        "nec": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            xs = this._apply("expr");
            return (("SELECT " + (xs[(3)] ? xs[(3)] : (xs[(0)] + xs[(1)]))) + " AS \"result\"")
        },
        "pos": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            xs = this._apply("expr");
            return (("SELECT " + (xs[(3)] ? xs[(3)] : (xs[(0)] + xs[(1)]))) + " AS \"result\"")
        },
        "prm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            xs = this._apply("expr");
            return (("SELECT " + (xs[(3)] ? xs[(3)] : (xs[(0)] + xs[(1)]))) + " AS \"result\"")
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
            f = this._applyWithArgs("token", "fcTp");
            b = this._many((function() {
                return this._applyWithArgs("token", "bind")
            }));
            return [((("EXISTS(SELECT * FROM \"" + f[(1)]) + "\" AS \"f\" WHERE ") + b.join(" AND ")), ")", ""]
        },
        "existQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v, xs;
            v = this._applyWithArgs("token", "var");
            xs = this._apply("expr");
            return ["1=1", "", ((((((((((" JOIN \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\" ON ") + v[(3)][(0)]) + xs[(0)]) + xs[(1)]) + v[(3)][(1)]) + v[(3)][(2)]) + xs[(2)]), ((((((((("EXISTS(SELECT * FROM \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\" WHERE ") + v[(3)][(0)]) + xs[(0)]) + xs[(1)]) + v[(3)][(1)]) + ")")]
        },
        "exactQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, v, xs;
            i = this._applyWithArgs("token", "card");
            v = this._applyWithArgs("token", "var");
            xs = this._apply("expr");
            return [((((((((("EXISTS(SELECT count(*) AS \"card\" FROM \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\"") + v[(3)][(2)]) + xs[(2)]) + " WHERE ") + v[(3)][(0)]) + xs[(0)]), ((((xs[(1)] + v[(3)][(1)]) + " GROUP BY NULL HAVING count(*)=") + i[(1)][(1)]) + ")"), "", ""]
        },
        "atLeastQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, v, xs;
            i = this._applyWithArgs("token", "minCard");
            v = this._applyWithArgs("token", "var");
            xs = this._apply("expr");
            return [((((((((("EXISTS(SELECT count(*) AS \"card\" FROM \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\"") + v[(3)][(2)]) + xs[(2)]) + " WHERE ") + v[(3)][(0)]) + xs[(0)]), ((((xs[(1)] + v[(3)][(1)]) + " GROUP BY NULL HAVING count(*)>=") + i[(1)][(1)]) + ")"), "", ""]
        },
        "numRngQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, a, v, xs;
            i = this._applyWithArgs("token", "minCard");
            a = this._applyWithArgs("token", "maxCard");
            v = this._applyWithArgs("token", "var");
            xs = this._apply("expr");
            return [((((((((("EXISTS(SELECT count(*) AS \"card\" FROM \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\"") + v[(3)][(2)]) + xs[(2)]) + " WHERE ") + v[(3)][(0)]) + xs[(0)]), ((((((xs[(1)] + v[(3)][(1)]) + " GROUP BY NULL HAVING count(*)>=") + i[(1)][(1)]) + " AND \"card\"<=") + a[(1)][(1)]) + ")"), "", ""]
        },
        "neg": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                s, v, xs;
            return this._or((function() {
                this._form((function() {
                    s = this._apply("anything");
                    this._pred((s == "existQ"));
                    v = this._applyWithArgs("token", "var");
                    return xs = this._apply("expr")
                }));
                return [((((((((("NOT EXISTS(SELECT * FROM \"" + v[(2)][(1)]) + "\" AS \"var") + v[(1)][(1)]) + "\"") + v[(3)][(2)]) + xs[(2)]) + " WHERE ") + v[(3)][(0)]) + xs[(0)]), ((xs[(1)] + v[(3)][(1)]) + ")"), "", ""]
            }), (function() {
                xs = this._apply("expr");
                return [("NOT " + xs[(0)]), xs[(1)], "", ""]
            }))
        },
        "card": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            n = this._applyWithArgs("token", "num");
            return ["card", n]
        },
        "minCard": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            n = this._applyWithArgs("token", "num");
            return ["minCard", n]
        },
        "maxCard": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            n = this._applyWithArgs("token", "num");
            return ["maxCard", n]
        },
        "var": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n, t, w;
            return this._or((function() {
                n = this._applyWithArgs("token", "num");
                t = this._applyWithArgs("token", "term");
                w = this._apply("expr");
                ((w[(0)] == "") ? "" : (w[(0)] += " AND "));
                return ["var", n, t, w]
            }), (function() {
                n = this._applyWithArgs("token", "num");
                t = this._applyWithArgs("token", "term");
                return ["var", n, t, ["", "", ""]]
            }))
        },
        "bind": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, n;
            t = this._applyWithArgs("token", "term");
            n = this._apply("number");
            return (((("\"var" + n) + "\".\"id\" = \"f\".\"") + t[(1)]) + "_id\"")
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