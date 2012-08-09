define(["sbvr-compiler/LFOptimiser", "underscore"], (function(LFOptimiser, _) {
    var LF2AbstractSQLPrep = undefined;
    LF2AbstractSQLPrep = objectThatDelegatesTo(LFOptimiser, {
        "AttrConceptType": function(termName) {
            var $elf = this,
                _fromIdx = this.input.idx,
                conceptType;
            conceptType = LFOptimiser._superApplyWithArgs(this, 'AttrConceptType', termName);
            this._opt((function() {
                this._pred(((this["primitives"][termName] === false) && (this["primitives"][conceptType] !== false)));
                (this["primitives"][conceptType] = false);
                return this._apply("SetHelped")
            }));
            return conceptType
        },
        "AttrDatabaseAttribute": function(termOrFactType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                attrVal, newAttrVal;
            attrVal = this._apply("anything");
            newAttrVal = (((termOrFactType[(0)] == "Term") && ((!this["attributes"].hasOwnProperty(termOrFactType[(3)])) || (this["attributes"][termOrFactType[(3)]] === true))) || (((((termOrFactType[(0)] == "FactType") && (termOrFactType["length"] == (4))) && ((!this["attributes"].hasOwnProperty(termOrFactType[(3)])) || (this["attributes"][termOrFactType[(3)]] === true))) && this["primitives"].hasOwnProperty(termOrFactType[(3)])) && (this["primitives"][termOrFactType[(3)]] !== false)));
            (this["attributes"][termOrFactType] = newAttrVal);
            this._opt((function() {
                this._pred((newAttrVal != attrVal));
                console.log("Changing DatabaseAttribute attr to:", newAttrVal, termOrFactType);
                return this._apply("SetHelped")
            }));
            return newAttrVal
        },
        "AttrDatabasePrimitive": function(termOrFactType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                attrVal, newAttrVal;
            attrVal = this._apply("anything");
            newAttrVal = attrVal;
            this._opt((function() {
                this._pred(this["primitives"].hasOwnProperty(termOrFactType));
                newAttrVal = this["primitives"][termOrFactType];
                this._pred((newAttrVal != attrVal));
                console.log("Changing DatabasePrimitive attr to:", newAttrVal, termOrFactType);
                return this._apply("SetHelped")
            }));
            (this["primitives"][termOrFactType] = newAttrVal);
            return newAttrVal
        },
        "Variable": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                variable, term, newTerm;
            variable = LFOptimiser._superApplyWithArgs(this, 'Variable');
            this._opt((function() {
                term = variable[(2)];
                this._pred(((this["processingAttributeRule"] && this["primitives"].hasOwnProperty(term)) && (this["primitives"][term] !== false)));
                newTerm = (function() {
                    for (var i = (1);
                    (i < this["processingAttributeRule"]["length"]);
                    (i += (2))) {
                        if ((!this.IsChild(term[(1)], this["processingAttributeRule"][i][(1)]))) {
                            return this["processingAttributeRule"][i][(1)]
                        } else {
                            undefined
                        }
                    }
                }).call(this);
                console.log("Switched variable term", term, "to", newTerm);
                return (variable[(2)][(1)] = newTerm)
            }));
            return variable
        },
        "AtomicFormulation": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                factType, actualFactType;
            factType = this._lookahead((function() {
                return this._applyWithArgs("token", "FactType")
            }));
            actualFactType = this._applyWithArgs("ActualFactType", factType.slice((1)));
            actualFactType = ["FactType"].concat(actualFactType);
            return this._or((function() {
                this._pred(this["attributes"].hasOwnProperty(actualFactType));
                console.log("Atomic Formulation Attr", this["processingAttributeRule"]);
                return this._or((function() {
                    this._pred(this["processingAttributeRule"]);
                    return LFOptimiser._superApplyWithArgs(this, 'AtomicFormulation')
                }), (function() {
                    (this["processingAttributeRule"] = actualFactType);
                    return this._pred(false)
                }))
            }), (function() {
                this._pred((!this["attributes"].hasOwnProperty(actualFactType)));
                return LFOptimiser._superApplyWithArgs(this, 'AtomicFormulation')
            }))
        },
        "UniversalQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v, xs;
            v = this._applyWithArgs("token", "Variable");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            this._apply("SetHelped");
            return ["LogicalNegation", ["ExistentialQ", v, ["LogicalNegation"].concat(xs)]]
        },
        "AtMostNQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                maxCard, v, xs;
            maxCard = this._applyWithArgs("token", "MaximumCardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            this._apply("SetHelped");
            maxCard[(1)][(1)]++;
            return ["LogicalNegation", ["AtLeastNQ", ["MinimumCardinality", maxCard[(1)]], v].concat(xs)]
        },
        "ForeignKey": function(v1) {
            var $elf = this,
                _fromIdx = this.input.idx,
                card, v2, atomicForm, necessity, factType, actualFactType;
            this._pred((v1["length"] == (3)));
            this._or((function() {
                return this._form((function() {
                    this._applyWithArgs("exactly", "ExactQ");
                    card = this._applyWithArgs("token", "Cardinality");
                    this._pred((card[(1)][(1)] == (1)));
                    v2 = this._applyWithArgs("token", "Variable");
                    this._pred((v2["length"] == (3)));
                    atomicForm = this._applyWithArgs("token", "AtomicFormulation");
                    return necessity = "NOT NULL"
                }))
            }), (function() {
                return this._form((function() {
                    this._applyWithArgs("exactly", "AtMostNQ");
                    card = this._applyWithArgs("token", "MaximumCardinality");
                    this._pred((card[(1)][(1)] == (1)));
                    v2 = this._applyWithArgs("token", "Variable");
                    this._pred((v2["length"] == (3)));
                    atomicForm = this._applyWithArgs("token", "AtomicFormulation");
                    return necessity = "NULL"
                }))
            }));
            factType = atomicForm[(1)];
            this._pred(((atomicForm["length"] == (4)) && (factType["length"] == (4))));
            actualFactType = this._applyWithArgs("ActualFactType", factType.slice((1)));
            this._pred(((v1[(2)][(1)] == actualFactType[(0)][(1)]) && (v2[(2)][(1)] == actualFactType[(2)][(1)])));
            (this["foreignKeys"][factType] = necessity);
            return this._apply("SetHelped")
        },
        "Rule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v1;
            (this["processingAttributeRule"] = false);
            return this._or((function() {
                this._form((function() {
                    this._applyWithArgs("exactly", "ObligationF");
                    return this._form((function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case "UniversalQ":
                                return (function() {
                                    v1 = this._applyWithArgs("token", "Variable");
                                    return this._applyWithArgs("ForeignKey", v1)
                                }).call(this);
                            case "LogicalNegation":
                                return this._form((function() {
                                    this._applyWithArgs("exactly", "ExistentialQ");
                                    v1 = this._applyWithArgs("token", "Variable");
                                    return this._form((function() {
                                        this._applyWithArgs("exactly", "LogicalNegation");
                                        return this._applyWithArgs("ForeignKey", v1)
                                    }))
                                }));
                            default:
                                throw fail
                            }
                        }).call(this)
                    }))
                }));
                this._applyWithArgs("token", "StructuredEnglish");
                return null
            }), (function() {
                return LFOptimiser._superApplyWithArgs(this, 'Rule')
            }), (function() {
                this._pred(this["processingAttributeRule"]);
                return LFOptimiser._superApplyWithArgs(this, 'Rule')
            }))
        }
    });
    (LF2AbstractSQLPrep["initialize"] = (function() {
        LFOptimiser["initialize"].call(this);
        (this["foreignKeys"] = []);
        (this["primitives"] = []);
        (this["attributes"] = []);
        (this["processingAttributeRule"] = false)
    }));
    (LF2AbstractSQLPrep["defaultAttributes"] = (function(termOrVerb, attrsFound, attrs) {
        if ((!attrsFound.hasOwnProperty("DatabaseIDField"))) {
            attrs.push(["DatabaseIDField", "id"]);
            this.SetHelped()
        } else {
            undefined
        };
        switch (termOrVerb[(0)]) {
        case "Term":
            {
                if ((!attrsFound.hasOwnProperty("DatabaseValueField"))) {
                    attrs.push(["DatabaseValueField", "value"]);
                    this.SetHelped()
                } else {
                    undefined
                }
                if ((!attrsFound.hasOwnProperty("DatabaseTableName"))) {
                    attrs.push(["DatabaseTableName", termOrVerb[(1)].replace(new RegExp(" ", "g"), "_")]);
                    this.SetHelped()
                } else {
                    undefined
                }
                if ((!attrsFound.hasOwnProperty("DatabasePrimitive"))) {
                    if ((!this["primitives"].hasOwnProperty(termOrVerb))) {
                        (this["primitives"][termOrVerb] = this.IsPrimitive(termOrVerb[(1)]))
                    } else {
                        undefined
                    };
                    console.log("Adding primitive attr", this["primitives"][termOrVerb], termOrVerb);
                    attrs.push(["DatabasePrimitive", this["primitives"][termOrVerb]]);
                    this.SetHelped()
                } else {
                    undefined
                }
                break
            };
        case "FactType":
            {
                if ((!attrsFound.hasOwnProperty("DatabaseTableName"))) {
                    var tableName = termOrVerb[(1)][(1)].replace(new RegExp(" ", "g"), "_");
                    for (var i = (2);
                    (i < termOrVerb["length"]); i++) {
                        (tableName += ("-" + termOrVerb[i][(1)].replace(new RegExp(" ", "g"), "_")))
                    };
                    attrs.push(["DatabaseTableName", tableName]);
                    this.SetHelped()
                } else {
                    undefined
                }
                if (this["foreignKeys"].hasOwnProperty(termOrVerb)) {
                    if ((!attrsFound.hasOwnProperty("ForeignKey"))) {
                        console.log("Adding FK attr", this["foreignKeys"][termOrVerb], termOrVerb);
                        attrs.push(["ForeignKey", this["foreignKeys"][termOrVerb]]);
                        this.SetHelped()
                    } else {
                        if ((attrsFound["ForeignKey"] != this["foreignKeys"][termOrVerb])) {
                            console.error(attrsFound["ForeignKey"], this["foreignKeys"][termOrVerb]);
                            ___MISMATCHED_FOREIGN_KEY___.die()
                        } else {
                            undefined
                        }
                    };
                    if ((!attrsFound.hasOwnProperty("DatabaseAttribute"))) {
                        attrs.push(["DatabaseAttribute", false]);
                        this.SetHelped()
                    } else {
                        undefined
                    }
                } else {
                    undefined
                }
                if ((termOrVerb["length"] == (3))) {
                    if (((!this["primitives"].hasOwnProperty(termOrVerb[(1)])) || (this["primitives"][termOrVerb[(1)]] !== false))) {
                        this.SetHelped()
                    } else {
                        undefined
                    };
                    (this["primitives"][termOrVerb[(1)]] = false)
                } else {
                    if ((termOrVerb["length"] > (4))) {
                        for (var i = (1);
                        (i < termOrVerb["length"]);
                        (i += (2))) {
                            if (((!this["attributes"].hasOwnProperty(termOrVerb[i])) || (this["attributes"][termOrVerb[i]] !== false))) {
                                this.SetHelped()
                            } else {
                                undefined
                            };
                            (this["attributes"][termOrVerb[i]] = false)
                        }
                    } else {
                        undefined
                    }
                }
                break
            }
        };
        termOrVerb.push(attrs)
    }));
    return LF2AbstractSQLPrep
}))