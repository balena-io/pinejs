define(["sbvr-parser/SBVRParser", "underscore", "Prettify", "sbvr-frame/SBVRModels", "ometa-core", "inflection"], (function(SBVRParser, _, Prettify) {
    var SBVR_LF2SE = OMeta._extend({
        "$": function(x) {
            var a, _fromIdx = this.input.idx,
                $elf = this;
            return this._or((function() {
                a = this._applyWithArgs("token", x);
                return [a]
            }), (function() {
                return []
            }))
        },
        "trans": function() {
            var a, t, _fromIdx = this.input.idx,
                $elf = this;
            this._form((function() {
                t = this._apply("anything");
                return a = this._applyWithArgs("apply", t)
            }));
            return a
        },
        "token": function() {
            var a, t, _fromIdx = this.input.idx,
                $elf = this,
                x;
            x = this._apply("anything");
            this._form((function() {
                t = this._apply("anything");
                this._pred((t == x));
                return a = this._applyWithArgs("apply", x)
            }));
            return a
        },
        "letters": function() {
            var l, _fromIdx = this.input.idx,
                $elf = this;
            l = this._many1((function() {
                return this._apply("letter")
            }));
            this._many((function() {
                return this._apply("space")
            }));
            return l.join("")
        },
        "Number": function() {
            var _fromIdx = this.input.idx,
                $elf = this,
                n;
            n = this._apply("number");
            this._pred((!isNaN(n)));
            return ["Number", parseInt(n)]
        },
        "Model": function() {
            var xs, _fromIdx = this.input.idx,
                $elf = this;
            xs = this._many((function() {
                return this._or((function() {
                    return this._applyWithArgs("token", "Term")
                }), (function() {
                    return this._applyWithArgs("token", "FactType")
                }), (function() {
                    return this._applyWithArgs("token", "Rule")
                }))
            }));
            return ["Model"].concat(xs)
        },
        "FactType": function() {
            var t, _fromIdx = this.input.idx,
                v, $elf = this,
                e, attr;
            (a = []);
            this._many((function() {
                t = this._applyWithArgs("token", "Term");
                v = this._applyWithArgs("token", "Verb");
                return (a = a.concat([t, v]))
            }));
            e = this._applyWithArgs("$", "Term");
            attr = this._or((function() {
                attr = this._apply("anything");
                return [attr]
            }), (function() {
                return []
            }));
            return a.concat(e)
        },
        "Verb": function() {
            var _fromIdx = this.input.idx,
                v, $elf = this;
            v = this._apply("anything");
            return ["Verb", v]
        },
        "Term": function() {
            var t, _fromIdx = this.input.idx,
                $elf = this,
                attr;
            t = this._apply("anything");
            attr = this._or((function() {
                attr = this._apply("anything");
                return [attr]
            }), (function() {
                return []
            }));
            return ["Term", t].concat(attr)
        },
        "Rule": function() {
            var t, _fromIdx = this.input.idx,
                $elf = this,
                x;
            x = this._or((function() {
                return this._applyWithArgs("token", "ObligationF")
            }), (function() {
                return this._applyWithArgs("token", "NecessityF")
            }), (function() {
                return this._applyWithArgs("token", "PossibilityF")
            }), (function() {
                return this._applyWithArgs("token", "PermissibilityF")
            }));
            t = this._applyWithArgs("token", "StructuredEnglish");
            return ["Rule", x, t]
        },
        "StructuredEnglish": function() {
            var a, _fromIdx = this.input.idx,
                $elf = this;
            a = this._apply("anything");
            return ["StructuredEnglish", a]
        },
        "ObligationF": function() {
            var xs, _fromIdx = this.input.idx,
                $elf = this;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["ObligationF"].concat(xs)
        },
        "NecessityF": function() {
            var xs, _fromIdx = this.input.idx,
                $elf = this;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["NecessityF"].concat(xs)
        },
        "PossibilityF": function() {
            var xs, _fromIdx = this.input.idx,
                $elf = this;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["PossibilityF"].concat(xs)
        },
        "PermissibilityF": function() {
            var xs, _fromIdx = this.input.idx,
                $elf = this;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["PermissibilityF"].concat(xs)
        },
        "LogicalNegation": function() {
            var xs, _fromIdx = this.input.idx,
                $elf = this;
            xs = this._apply("trans");
            return ["LogicalNegation"].concat([xs])
        },
        "quant": function() {
            var _fromIdx = this.input.idx,
                $elf = this;
            return this._or((function() {
                return this._applyWithArgs("token", "UniversalQ")
            }), (function() {
                return this._applyWithArgs("token", "ExistentialQ")
            }), (function() {
                return this._applyWithArgs("token", "ExactQ")
            }), (function() {
                return this._applyWithArgs("token", "AtMostNQ")
            }), (function() {
                return this._applyWithArgs("token", "AtLeastNQ")
            }), (function() {
                return this._applyWithArgs("token", "NumericalRangeQ")
            }))
        },
        "UniversalQ": function() {
            var xs, _fromIdx = this.input.idx,
                v, $elf = this;
            v = this._applyWithArgs("token", "Variable");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["UniversalQ", v].concat(xs)
        },
        "ExistentialQ": function() {
            var xs, _fromIdx = this.input.idx,
                v, $elf = this;
            v = this._applyWithArgs("token", "Variable");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["ExistentialQ", v].concat(xs)
        },
        "ExactQ": function() {
            var xs, i, _fromIdx = this.input.idx,
                v, $elf = this;
            i = this._applyWithArgs("token", "Cardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["ExactQ", i, v].concat(xs)
        },
        "AtMostNQ": function() {
            var xs, a, _fromIdx = this.input.idx,
                v, $elf = this;
            a = this._applyWithArgs("token", "MaximumCardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["AtMostNQ", a, v].concat(xs)
        },
        "AtLeastNQ": function() {
            var xs, i, _fromIdx = this.input.idx,
                v, $elf = this;
            i = this._applyWithArgs("token", "MinimumCardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["AtLeastNQ", i, v].concat(xs)
        },
        "NumericalRangeQ": function() {
            var xs, i, a, _fromIdx = this.input.idx,
                v, $elf = this;
            i = this._applyWithArgs("token", "MinimumCardinality");
            a = this._applyWithArgs("token", "MaximumCardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ["NumericalRangeQ", i, a, v].concat(xs)
        },
        "Cardinality": function() {
            var _fromIdx = this.input.idx,
                $elf = this,
                n;
            n = this._applyWithArgs("token", "Number");
            return ["Cardinality", n]
        },
        "MinimumCardinality": function() {
            var _fromIdx = this.input.idx,
                $elf = this,
                n;
            n = this._applyWithArgs("token", "Number");
            return ["MinimumCardinality", n]
        },
        "MaximumCardinality": function() {
            var _fromIdx = this.input.idx,
                $elf = this,
                n;
            n = this._applyWithArgs("token", "Number");
            return ["MaximumCardinality", n]
        },
        "Variable": function() {
            var t, w, _fromIdx = this.input.idx,
                $elf = this,
                n;
            return this._or((function() {
                n = this._applyWithArgs("token", "Number");
                t = this._applyWithArgs("token", "Term");
                w = this._applyWithArgs("token", "AtomicFormulation");
                return ["Variable", n, t, w]
            }), (function() {
                n = this._applyWithArgs("token", "Number");
                t = this._applyWithArgs("token", "Term");
                w = this._apply("quant");
                return ["Variable", n, t, w]
            }), (function() {
                n = this._applyWithArgs("token", "Number");
                t = this._applyWithArgs("token", "Term");
                return ["Variable", n, t]
            }))
        },
        "RoleBinding": function() {
            var t, _fromIdx = this.input.idx,
                $elf = this,
                n;
            t = this._applyWithArgs("token", "Term");
            n = this._apply("number");
            return ["RoleBinding", t, n]
        },
        "AtomicFormulation": function() {
            var b, _fromIdx = this.input.idx,
                $elf = this,
                f;
            f = this._applyWithArgs("token", "FactType");
            b = this._many((function() {
                return this._applyWithArgs("token", "RoleBinding")
            }));
            (function() {
                for (var i = (0);
                (i < b["length"]); i++) {
                    this.findReplace(f, b[i][(1)], b[i][(2)])
                }
            }).call(this);
            return f
        }
    });
    (SBVR_LF2SE["initialize"] = (function() {
        (this["_didSomething"] = false)
    }));
    (SBVR_LF2SE["findReplace"] = (function(targetArray, oldValue) {
        (newValues = Array["prototype"]["slice"].call(arguments, (2)));
        for (var i = (0);
        (i < targetArray["length"]); i++) {
            if (((targetArray[i] == oldValue) || _.isEqual(targetArray[i], oldValue))) {
                Array["prototype"]["splice"].apply(targetArray, [i, (1)].concat(newValues))
            } else {
                undefined
            }
        }
    }));
    return SBVR_LF2SE
}))