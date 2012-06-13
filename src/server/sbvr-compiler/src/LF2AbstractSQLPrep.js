define(["sbvr-compiler/LFOptimiser"], (function(LFOptimiser) {
    var LF2AbstractSQLPrep = undefined;
    LF2AbstractSQLPrep = objectThatDelegatesTo(LFOptimiser, {
        "AttrConceptType": function(termName) {
            var $elf = this,
                _fromIdx = this.input.idx,
                conceptType;
            conceptType = LFOptimiser._superApplyWithArgs(this, 'AttrConceptType', termName);
            (this["primitives"][conceptType] = false);
            return conceptType
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
                a, v, xs;
            a = this._applyWithArgs("token", "MaximumCardinality");
            v = this._applyWithArgs("token", "Variable");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            this._apply("SetHelped");
            return (function() {
                a[(1)][(1)]++;
                return ["LogicalNegation", ["AtLeastNQ", ["MinimumCardinality", a[(1)]], v].concat(xs)]
            }).call(this)
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
            }))
        }
    });
    (LF2AbstractSQLPrep["initialize"] = (function() {
        LFOptimiser["initialize"].call(this);
        (this["foreignKeys"] = []);
        (this["primitives"] = [])
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
                if ((!attrsFound.hasOwnProperty("DatabaseNameField"))) {
                    attrs.push(["DatabaseNameField", "_name"]);
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
                if ((!this["primitives"].hasOwnProperty(termOrVerb))) {
                    (this["primitives"][termOrVerb] = (this.isPrimitive(termOrVerb[(1)]) !== false))
                } else {
                    undefined
                }
                if ((this["primitives"].hasOwnProperty(termOrVerb) && ((!attrsFound.hasOwnProperty("DatabasePrimitive")) || (this["primitives"][termOrVerb] != attrsFound["DatabasePrimitive"])))) {
                    console.log("Adding primitive attr", termOrVerb, this["primitives"][termOrVerb]);
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
                        console.log("Adding FK attr", termOrVerb, this["foreignKeys"][termOrVerb]);
                        attrs.push(["ForeignKey", this["foreignKeys"][termOrVerb]]);
                        this.SetHelped()
                    } else {
                        if ((attrsFound["ForeignKey"] != this["foreignKeys"][termOrVerb])) {
                            console.error(attrsFound["ForeignKey"], this["foreignKeys"][termOrVerb]);
                            __MISMATCHED_FOREIGN_KEY__.die()
                        } else {
                            undefined
                        }
                    };
                    (delete this["foreignKeys"][termOrVerb])
                } else {
                    undefined
                }
                if (((termOrVerb["length"] == (3)) && (!this["primitives"].hasOwnProperty(termOrVerb[(1)])))) {
                    (this["primitives"][termOrVerb[(1)]] = false);
                    this.SetHelped()
                } else {
                    undefined
                }
                break
            }
        };
        termOrVerb.push(attrs)
    }));
    var primitives = ({
        "Integer": true,
        "Short Text": true,
        "Long Text": true
    });
    (LF2AbstractSQLPrep["isPrimitive"] = (function(termName) {
        if (primitives.hasOwnProperty(termName)) {
            return termName
        } else {
            undefined
        };
        if ((this["conceptTypes"].hasOwnProperty(termName) && (termName = this["conceptTypes"][termName]))) {
            if (primitives.hasOwnProperty(termName)) {
                return termName
            } else {
                undefined
            }
        } else {
            undefined
        };
        return false
    }));
    return LF2AbstractSQLPrep
}))