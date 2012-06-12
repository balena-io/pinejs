define(["sbvr-parser/SBVRLibs", "ometa/ometa-base"], (function(SBVRLibs) {
    var LFValidator = undefined;
    LFValidator = objectThatDelegatesTo(SBVRLibs, {
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
        "token": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, a;
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
                return this._apply("letter")
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
            return ["num", parseInt(n)]
        },
        "Model": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs, x;
            xs = [];
            this._many((function() {
                x = this._or((function() {
                    return this._applyWithArgs("token", "Term")
                }), (function() {
                    return this._applyWithArgs("token", "FactType")
                }), (function() {
                    return this._applyWithArgs("token", "Rule")
                }));
                return this._opt((function() {
                    this._pred((x != null));
                    return xs.push(x)
                }))
            }));
            return ["Model"].concat(xs)
        },
        "FactType": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                factType, t, v, attrs;
            factType = [];
            this._many((function() {
                t = this._applyWithArgs("token", "Term");
                v = this._applyWithArgs("token", "Verb");
                return factType = factType.concat([t, v])
            }));
            t = this._applyWithArgs("$", "Term");
            factType = factType.concat(t);
            this._opt((function() {
                return this._lookahead((function() {
                    attrs = this._apply("anything");
                    return this._applyWithArgs("AddFactType", factType, factType)
                }))
            }));
            return this._applyWithArgs("addAttributes", ["FactType"].concat(factType))
        },
        "Term": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            t = this._apply("anything");
            return this._applyWithArgs("addAttributes", ["Term", t])
        },
        "Verb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v;
            v = this._apply("anything");
            return ["Verb", v]
        },
        "Rule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, t;
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
            return ["Rule", x, t]
        },
        "addAttributes": function(termOrVerb) {
            var $elf = this,
                _fromIdx = this.input.idx,
                attrsFound, attrName, attrVal, attrs;
            this._or((function() {
                return this._apply("end")
            }), (function() {
                attrsFound = ({});
                this._form((function() {
                    attrs = this._many((function() {
                        this._form((function() {
                            attrName = this._apply("anything");
                            (attrsFound[attrName] = true);
                            return attrVal = this._or((function() {
                                this._pred(this[("attr" + attrName)]);
                                return this["_applyWithArgs"].call(this, ("attr" + attrName), termOrVerb)
                            }), (function() {
                                return this._apply("anything")
                            }))
                        }));
                        return [attrName, attrVal]
                    }));
                    return this._apply("end")
                }));
                return this._applyWithArgs("defaultAttributes", termOrVerb, attrsFound, attrs)
            }));
            return termOrVerb
        },
        "attrDefinition": function(termOrVerb) {
            var $elf = this,
                _fromIdx = this.input.idx,
                values;
            return this._or((function() {
                return this._form((function() {
                    this._applyWithArgs("exactly", "Enum");
                    return values = this._apply("anything")
                }))
            }), (function() {
                return this._apply("trans")
            }))
        },
        "attrSynonymousForm": function(factType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                synForm;
            synForm = this._apply("anything");
            this._applyWithArgs("AddFactType", synForm.slice((0), (-(1))), factType.slice((1)));
            return synForm
        },
        "text": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a;
            a = this._apply("anything");
            return ["text", a]
        },
        "obl": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["obl"].concat(xs)
        },
        "nec": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["nec"].concat(xs)
        },
        "pos": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["pos"].concat(xs)
        },
        "prm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["prm"].concat(xs)
        },
        "neg": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            xs = this._apply("trans");
            return ["neg"].concat([xs])
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
            v = this._applyWithArgs("token", "var");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["univQ", v].concat(xs)
        },
        "existQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v, xs;
            v = this._applyWithArgs("token", "var");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["existQ", v].concat(xs)
        },
        "exactQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, v, xs;
            i = this._applyWithArgs("token", "card");
            v = this._applyWithArgs("token", "var");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["exactQ", i, v].concat(xs)
        },
        "atMostQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a, v, xs;
            a = this._applyWithArgs("token", "maxCard");
            v = this._applyWithArgs("token", "var");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["atMostQ", a, v].concat(xs)
        },
        "atLeastQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, v, xs;
            i = this._applyWithArgs("token", "minCard");
            v = this._applyWithArgs("token", "var");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["atLeastQ", i, v].concat(xs)
        },
        "numRngQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, a, v, xs;
            i = this._applyWithArgs("token", "minCard");
            a = this._applyWithArgs("token", "maxCard");
            v = this._applyWithArgs("token", "var");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["numRngQ", i, a, v].concat(xs)
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
                t = this._applyWithArgs("token", "Term");
                w = this._or((function() {
                    return this._applyWithArgs("token", "AtomicFormulation")
                }), (function() {
                    return this._apply("quant")
                }));
                return ["var", n, t, w]
            }), (function() {
                n = this._applyWithArgs("token", "num");
                t = this._applyWithArgs("token", "Term");
                return ["var", n, t]
            }))
        },
        "bind": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, n;
            t = this._applyWithArgs("token", "Term");
            n = this._apply("number");
            return ["bind", t, n]
        },
        "AtomicFormulation": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                f, b;
            f = this._applyWithArgs("token", "FactType");
            b = this._many((function() {
                return this._applyWithArgs("token", "bind")
            }));
            return ["AtomicFormulation", f].concat(b)
        }
    });
    (LFValidator["initialize"] = (function() {
        SBVRLibs["initialize"].call(this)
    }));
    (LFValidator["defaultAttributes"] = (function(termOrVerb, attrsFound, attrs) {
        termOrVerb.push(attrs)
    }));
    return LFValidator
}))