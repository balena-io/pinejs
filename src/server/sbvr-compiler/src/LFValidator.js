define(['sbvr-parser/SBVRLibs', 'ometa-core'], (function(SBVRLibs) {
    var LFValidator = objectThatDelegatesTo(SBVRLibs, {
        "$": function(x) {
            var _fromIdx = this.input.idx,
                $elf = this,
                a;
            return this._or((function() {
                a = this._applyWithArgs("token", x);
                return [a]
            }), (function() {
                return []
            }))
        },
        "trans": function() {
            var t, _fromIdx = this.input.idx,
                $elf = this,
                a;
            this._form((function() {
                t = this._apply("anything");
                return a = this._applyWithArgs("apply", t)
            }));
            return a
        },
        "token": function(x) {
            var t, _fromIdx = this.input.idx,
                $elf = this,
                a;
            this._form((function() {
                t = this._apply("anything");
                this._pred((t == x));
                return a = this._applyWithArgs("apply", x)
            }));
            return a
        },
        "letters": function() {
            var _fromIdx = this.input.idx,
                l, $elf = this;
            l = this._many1((function() {
                return this._apply("letter")
            }));
            this._many((function() {
                return this._apply("space")
            }));
            return l.join('')
        },
        "Number": function() {
            var _fromIdx = this.input.idx,
                $elf = this,
                n;
            n = this._apply("number");
            this._pred((!isNaN(n)));
            return ['Number', parseInt(n)]
        },
        "Model": function() {
            var _fromIdx = this.input.idx,
                x, xs, $elf = this;
            xs = [];
            this._many((function() {
                x = this._or((function() {
                    return this._applyWithArgs("token", 'Term')
                }), (function() {
                    return this._applyWithArgs("token", 'FactType')
                }), (function() {
                    return this._applyWithArgs("token", 'Rule')
                }));
                return this._opt((function() {
                    this._pred((x != null));
                    return xs.push(x)
                }))
            }));
            return ['Model'].concat(xs)
        },
        "FactType": function() {
            var t, _fromIdx = this.input.idx,
                attrs, v, factType, $elf = this;
            factType = [];
            this._many((function() {
                t = this._applyWithArgs("token", 'Term');
                v = this._applyWithArgs("token", 'Verb');
                return factType = factType.concat([t, v])
            }));
            t = this._applyWithArgs("$", 'Term');
            factType = factType.concat(t);
            this._opt((function() {
                return this._lookahead((function() {
                    attrs = this._apply("anything");
                    return this._applyWithArgs("AddFactType", factType, factType)
                }))
            }));
            return this._applyWithArgs("addAttributes", ['FactType'].concat(factType))
        },
        "Term": function() {
            var t, _fromIdx = this.input.idx,
                $elf = this;
            t = this._apply("anything");
            return this._applyWithArgs("addAttributes", ['Term', t])
        },
        "Verb": function() {
            var _fromIdx = this.input.idx,
                v, $elf = this;
            v = this._apply("anything");
            return ['Verb', v]
        },
        "Rule": function() {
            var t, _fromIdx = this.input.idx,
                x, $elf = this;
            x = this._or((function() {
                return this._applyWithArgs("token", 'ObligationF')
            }), (function() {
                return this._applyWithArgs("token", 'NecessityF')
            }), (function() {
                return this._applyWithArgs("token", 'PossibilityF')
            }), (function() {
                return this._applyWithArgs("token", 'PermissibilityF')
            }));
            t = this._applyWithArgs("token", 'StructuredEnglish');
            return ['Rule', x, t]
        },
        "addAttributes": function(termOrVerb) {
            var attrName, _fromIdx = this.input.idx,
                attrs, attrsFound, $elf = this,
                attrVal;
            this._or((function() {
                return this._apply("end")
            }), (function() {
                attrsFound = ({});
                this._form((function() {
                    attrs = this._many((function() {
                        this._form((function() {
                            attrName = this._apply("anything");
                            attrVal = this._applyWithArgs("ApplyFirstExisting", [('Attr' + attrName), 'DefaultAttr'], [termOrVerb]);
                            return (attrsFound[attrName] = attrVal)
                        }));
                        return [attrName, attrVal]
                    }));
                    return this._apply("end")
                }));
                return this._applyWithArgs("defaultAttributes", termOrVerb, attrsFound, attrs)
            }));
            return termOrVerb
        },
        "DefaultAttr": function(tableID) {
            var _fromIdx = this.input.idx,
                $elf = this;
            return this._apply("anything")
        },
        "AttrConceptType": function(termName) {
            var _fromIdx = this.input.idx,
                $elf = this,
                conceptType;
            return this._form((function() {
                this._applyWithArgs("exactly", 'Term');
                conceptType = this._apply("anything");
                return (this['conceptTypes'][termName[(1)]] = conceptType)
            }))
        },
        "AttrDefinition": function(termOrVerb) {
            var _fromIdx = this.input.idx,
                $elf = this,
                values;
            return this._or((function() {
                return this._form((function() {
                    this._applyWithArgs("exactly", 'Enum');
                    return values = this._apply("anything")
                }))
            }), (function() {
                return this._apply("trans")
            }))
        },
        "AttrSynonymousForm": function(factType) {
            var _fromIdx = this.input.idx,
                synForm, $elf = this;
            synForm = this._apply("anything");
            this._applyWithArgs("AddFactType", synForm.slice((0), (-(1))), factType.slice((1)));
            return synForm
        },
        "StructuredEnglish": function() {
            var _fromIdx = this.input.idx,
                $elf = this,
                a;
            a = this._apply("anything");
            return ['StructuredEnglish', a]
        },
        "ObligationF": function() {
            var _fromIdx = this.input.idx,
                xs, $elf = this;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ['ObligationF'].concat(xs)
        },
        "NecessityF": function() {
            var _fromIdx = this.input.idx,
                xs, $elf = this;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ['NecessityF'].concat(xs)
        },
        "PossibilityF": function() {
            var _fromIdx = this.input.idx,
                xs, $elf = this;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ['PossibilityF'].concat(xs)
        },
        "PermissibilityF": function() {
            var _fromIdx = this.input.idx,
                xs, $elf = this;
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ['PermissibilityF'].concat(xs)
        },
        "LogicalNegation": function() {
            var _fromIdx = this.input.idx,
                xs, $elf = this;
            xs = this._apply("trans");
            return ['LogicalNegation'].concat([xs])
        },
        "quant": function() {
            var _fromIdx = this.input.idx,
                $elf = this;
            return this._or((function() {
                return this._applyWithArgs("token", 'UniversalQ')
            }), (function() {
                return this._applyWithArgs("token", 'ExistentialQ')
            }), (function() {
                return this._applyWithArgs("token", 'ExactQ')
            }), (function() {
                return this._applyWithArgs("token", 'AtMostNQ')
            }), (function() {
                return this._applyWithArgs("token", 'AtLeastNQ')
            }), (function() {
                return this._applyWithArgs("token", 'NumericalRangeQ')
            }))
        },
        "UniversalQ": function() {
            var _fromIdx = this.input.idx,
                v, xs, $elf = this;
            v = this._applyWithArgs("token", 'Variable');
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ['UniversalQ', v].concat(xs)
        },
        "ExistentialQ": function() {
            var _fromIdx = this.input.idx,
                v, xs, $elf = this;
            v = this._applyWithArgs("token", 'Variable');
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ['ExistentialQ', v].concat(xs)
        },
        "ExactQ": function() {
            var _fromIdx = this.input.idx,
                v, xs, i, $elf = this;
            i = this._applyWithArgs("token", 'Cardinality');
            v = this._applyWithArgs("token", 'Variable');
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ['ExactQ', i, v].concat(xs)
        },
        "AtMostNQ": function() {
            var _fromIdx = this.input.idx,
                v, xs, $elf = this,
                a;
            a = this._applyWithArgs("token", 'MaximumCardinality');
            v = this._applyWithArgs("token", 'Variable');
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ['AtMostNQ', a, v].concat(xs)
        },
        "AtLeastNQ": function() {
            var _fromIdx = this.input.idx,
                v, xs, i, $elf = this;
            i = this._applyWithArgs("token", 'MinimumCardinality');
            v = this._applyWithArgs("token", 'Variable');
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ['AtLeastNQ', i, v].concat(xs)
        },
        "NumericalRangeQ": function() {
            var _fromIdx = this.input.idx,
                v, xs, i, $elf = this,
                a;
            i = this._applyWithArgs("token", 'MinimumCardinality');
            a = this._applyWithArgs("token", 'MaximumCardinality');
            v = this._applyWithArgs("token", 'Variable');
            xs = this._many((function() {
                return this._apply("trans")
            }));
            return ['NumericalRangeQ', i, a, v].concat(xs)
        },
        "Cardinality": function() {
            var _fromIdx = this.input.idx,
                $elf = this,
                n;
            n = this._applyWithArgs("token", 'Number');
            return ['Cardinality', n]
        },
        "MinimumCardinality": function() {
            var _fromIdx = this.input.idx,
                $elf = this,
                n;
            n = this._applyWithArgs("token", 'Number');
            return ['MinimumCardinality', n]
        },
        "MaximumCardinality": function() {
            var _fromIdx = this.input.idx,
                $elf = this,
                n;
            n = this._applyWithArgs("token", 'Number');
            return ['MaximumCardinality', n]
        },
        "Variable": function() {
            var _fromIdx = this.input.idx,
                num, w, $elf = this,
                term;
            num = this._applyWithArgs("token", 'Number');
            term = this._applyWithArgs("token", 'Term');
            w = this._many((function() {
                return this._or((function() {
                    return this._applyWithArgs("token", 'AtomicFormulation')
                }), (function() {
                    return this._apply("quant")
                }))
            }));
            return ['Variable', num, term].concat(w)
        },
        "RoleBinding": function() {
            var t, _fromIdx = this.input.idx,
                $elf = this,
                n;
            t = this._applyWithArgs("token", 'Term');
            n = this._apply("number");
            return ['RoleBinding', t, n]
        },
        "AtomicFormulation": function() {
            var _fromIdx = this.input.idx,
                b, f, $elf = this;
            f = this._applyWithArgs("token", 'FactType');
            b = this._many((function() {
                return this._applyWithArgs("token", 'RoleBinding')
            }));
            return ['AtomicFormulation', f].concat(b)
        }
    });
    (LFValidator['initialize'] = (function() {
        SBVRLibs['initialize'].call(this)
    }));
    (LFValidator['defaultAttributes'] = (function(termOrVerb, attrsFound, attrs) {
        termOrVerb.push(attrs)
    }));
    return LFValidator
}))