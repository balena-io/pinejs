define(["sbvr-parser/SBVRLibs", "underscore", "ometa/ometa-base"], (function(SBVRLibs, _) {
    var LF2AbstractSQL = undefined;
    LF2AbstractSQL = objectThatDelegatesTo(SBVRLibs, {
        "TermName": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                termName;
            termName = this._apply("anything");
            (this["terms"][termName] = termName);
            this._or((function() {
                return this._pred((!this["tables"].hasOwnProperty(termName)))
            }), (function() {
                console.error(("We already have a term with a name of: " + termName));
                return this._pred(false)
            }));
            (this["tables"][termName] = ({
                "fields": [],
                "primitive": this.isPrimitive(termName),
                "name": null,
                "idField": null
            }));
            return termName
        },
        "Attributes": function(tableID) {
            var $elf = this,
                _fromIdx = this.input.idx,
                attributeName, attributeValue;
            return this._form((function() {
                return this._many((function() {
                    return this._form((function() {
                        attributeName = this._apply("anything");
                        return attributeValue = this._applyWithArgs("ApplyFirstExisting", [("Attr" + attributeName), "DefaultAttr"], [tableID])
                    }))
                }))
            }))
        },
        "DefaultAttr": function(tableID) {
            var $elf = this,
                _fromIdx = this.input.idx,
                anything;
            anything = this._apply("anything");
            return console.log("Default", tableID, anything)
        },
        "AttrConceptType": function(termName) {
            var $elf = this,
                _fromIdx = this.input.idx,
                conceptType;
            this._form((function() {
                this._applyWithArgs("exactly", "Term");
                return conceptType = this._apply("anything")
            }));
            (this["conceptTypes"][termName] = conceptType);
            return (function() {
                this["tables"][termName]["fields"].push(["ConceptType", this["tables"][conceptType]["name"], this["tables"][conceptType]["idField"], "NOT NULL"]);
                return (this["tables"][termName]["primitive"] = this.isPrimitive(termName))
            }).call(this)
        },
        "AttrDatabaseIDField": function(tableID) {
            var $elf = this,
                _fromIdx = this.input.idx,
                idField;
            idField = this._apply("anything");
            return this._or((function() {
                return this._pred((this["tables"][tableID] == "Attribute"))
            }), (function() {
                this["tables"][tableID]["fields"].push(["PrimaryKey", idField]);
                return (this["tables"][tableID]["idField"] = idField)
            }))
        },
        "AttrDatabaseNameField": function(tableID) {
            var $elf = this,
                _fromIdx = this.input.idx,
                nameField;
            nameField = this._apply("anything");
            return this._or((function() {
                return this._pred((this["tables"][tableID] == "Attribute"))
            }), (function() {
                return this["tables"][tableID]["fields"].push(["Name", nameField])
            }))
        },
        "AttrDatabaseTableName": function(tableID) {
            var $elf = this,
                _fromIdx = this.input.idx,
                tableName;
            tableName = this._apply("anything");
            return this._or((function() {
                return this._pred((this["tables"][tableID] == "Attribute"))
            }), (function() {
                return (this["tables"][tableID]["name"] = tableName)
            }))
        },
        "AttrForeignKey": function(factType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                type;
            type = this._apply("anything");
            this["tables"][factType[(0)][(1)]]["fields"].push(["ForeignKey", this["tables"][factType[(2)][(1)]]["name"], this["tables"][factType[(2)][(1)]]["idField"], type]);
            return (this["tables"][factType] = "ForeignKey")
        },
        "AttrSynonymousForm": function(factType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                synForm;
            synForm = this._apply("anything");
            return this._applyWithArgs("AddFactType", synForm.slice((0), (-(1))), factType)
        },
        "AttrTermForm": function(factType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                term;
            term = this._apply("anything");
            (this["terms"][term[(1)]] = factType);
            return (this["tables"][term[(1)]] = this["tables"][factType])
        },
        "FactType": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                factTypePart, attributes, factType, termName, verb;
            this._lookahead((function() {
                return factType = this._many1((function() {
                    factTypePart = this._apply("anything");
                    this._lookahead((function() {
                        return attributes = this._apply("anything")
                    }));
                    return factTypePart
                }))
            }));
            this._applyWithArgs("AddFactType", factType, factType);
            this._or((function() {
                this._pred((factType["length"] == (2)));
                this._many1((function() {
                    factTypePart = this._apply("anything");
                    return this._lookahead((function() {
                        return attributes = this._apply("anything")
                    }))
                }));
                this["tables"][factType[(0)][(1)]]["fields"].push(["Boolean", factType[(1)][(1)]]);
                return (this["tables"][factType] = "Attribute")
            }), (function() {
                (this["tables"][factType] = ({
                    "fields": [],
                    "primitive": false,
                    "name": null
                }));
                return this._many1((function() {
                    return this._or((function() {
                        this._form((function() {
                            this._applyWithArgs("exactly", "Term");
                            return termName = this._apply("anything")
                        }));
                        return this["tables"][factType]["fields"].push(["ForeignKey", this["tables"][termName]["name"], this["tables"][termName]["idField"], "NOT NULL"])
                    }), (function() {
                        return this._form((function() {
                            this._applyWithArgs("exactly", "verb");
                            return verb = this._apply("anything")
                        }))
                    }))
                }))
            }));
            return factType
        },
        "Cardinality": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                cardinality;
            this._form((function() {
                (function() {
                    switch (this._apply('anything')) {
                    case "minCard":
                        return "minCard";
                    case "maxCard":
                        return "maxCard";
                    case "card":
                        return "card";
                    default:
                        throw fail
                    }
                }).call(this);
                return cardinality = this._apply("Number")
            }));
            return cardinality
        },
        "Number": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                num;
            this._form((function() {
                this._applyWithArgs("exactly", "num");
                num = this._apply("anything");
                return this._pred((!isNaN(num)))
            }));
            return num
        },
        "Variable": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                bind, termName, varAlias, query, whereBody;
            this._form((function() {
                this._applyWithArgs("exactly", "var");
                bind = this._apply("Number");
                this._form((function() {
                    this._applyWithArgs("exactly", "Term");
                    return termName = this._apply("anything")
                }));
                varAlias = ("var" + bind);
                query = ["Query", ["Select", []],
                    ["From", this["tables"][termName]["name"], (varAlias + termName)]
                ];
                this._applyWithArgs("ResolveConceptTypes", query, termName, varAlias);
                return this._opt((function() {
                    whereBody = this._apply("RulePart");
                    return this._applyWithArgs("AddWhereClause", query, whereBody)
                }))
            }));
            whereBody = this._apply("RulePart");
            this._applyWithArgs("AddWhereClause", query, whereBody);
            return query
        },
        "Bind": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                termName, bind;
            this._form((function() {
                this._applyWithArgs("exactly", "bind");
                this._form((function() {
                    this._applyWithArgs("exactly", "Term");
                    return termName = this._apply("anything")
                }));
                return bind = this._apply("anything")
            }));
            return bind
        },
        "LinkTable": function(actualFactType, rootTerms) {
            var $elf = this,
                _fromIdx = this.input.idx,
                tableAlias, query, i, bind, termName;
            tableAlias = ("link" + this["linkTableBind"]++);
            query = ["Query", ["Select", []],
                ["From", this["tables"][actualFactType]["name"], tableAlias]
            ];
            i = (0);
            this._many1((function() {
                this._pred((i < rootTerms["length"]));
                bind = this._apply("Bind");
                termName = rootTerms[i];
                this._applyWithArgs("AddWhereClause", query, ["Equals", ["ReferencedField", tableAlias, this["tables"][termName]["name"]],
                    ["ReferencedField", (("var" + bind) + termName), this["tables"][termName]["idField"]]
                ]);
                return i++
            }));
            return ["Exists", query]
        },
        "ForeignKey": function(actualFactType, rootTerms) {
            var $elf = this,
                _fromIdx = this.input.idx,
                bindFrom, bindTo, termFrom, termTo;
            this._pred((this["tables"][actualFactType] == "ForeignKey"));
            this._or((function() {
                bindFrom = this._apply("Bind");
                bindTo = this._apply("Bind");
                this._apply("end");
                termFrom = rootTerms[(0)];
                return termTo = rootTerms[(1)]
            }), (function() {
                return this._applyWithArgs("foreign", ___ForeignKeyMatchingFailed___, 'die')
            }));
            return ["Equals", ["ReferencedField", (("var" + bindFrom) + termFrom), this["tables"][termTo]["name"]], ["ReferencedField", (("var" + bindTo) + termTo), this["tables"][termTo]["idField"]]]
        },
        "Attribute": function(actualFactType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                bindFrom, termFrom, attributeName;
            this._pred((this["tables"][actualFactType] == "Attribute"));
            this._or((function() {
                bindFrom = this._apply("Bind");
                this._apply("end");
                termFrom = actualFactType[(0)][(1)];
                return attributeName = actualFactType[(1)][(1)]
            }), (function() {
                return this._applyWithArgs("foreign", ___AttributeMatchingFailed___, 'die')
            }));
            return ["Equals", ["ReferencedField", (("var" + bindFrom) + termFrom), attributeName], ["Boolean", true]]
        },
        "AtomicFormulation": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                factType, actualFactType, rootTerms, whereClause;
            this._form((function() {
                this._applyWithArgs("exactly", "AtomicFormulation");
                this._form((function() {
                    this._applyWithArgs("exactly", "FactType");
                    return factType = this._many1((function() {
                        return this._apply("anything")
                    }))
                }));
                actualFactType = this._applyWithArgs("ActualFactType", factType);
                rootTerms = this._applyWithArgs("FactTypeRootTerms", factType, actualFactType);
                return whereClause = this._or((function() {
                    return this._applyWithArgs("ForeignKey", actualFactType, rootTerms)
                }), (function() {
                    return this._applyWithArgs("Attribute", actualFactType)
                }), (function() {
                    return this._applyWithArgs("LinkTable", actualFactType, rootTerms)
                }))
            }));
            return whereClause
        },
        "AtLeast": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                minCard, query;
            this._form((function() {
                this._applyWithArgs("exactly", "atLeastQ");
                minCard = this._apply("Cardinality");
                query = this._apply("Variable");
                return query[(1)][(1)].push(["Count", "*"])
            }));
            return ["EqualOrGreater", query, ["Number", minCard]]
        },
        "Exactly": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                card, query;
            this._form((function() {
                this._applyWithArgs("exactly", "exactQ");
                card = this._apply("Cardinality");
                query = this._apply("Variable");
                return query[(1)][(1)].push(["Count", "*"])
            }));
            return ["Equals", query, ["Number", card]]
        },
        "Range": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                minCard, maxCard, query;
            this._form((function() {
                this._applyWithArgs("exactly", "numRngQ");
                minCard = this._apply("Cardinality");
                maxCard = this._apply("Cardinality");
                query = this._apply("Variable");
                return query[(1)][(1)].push(["Count", "*"])
            }));
            return ["Between", query, ["Number", minCard], ["Number", maxCard]]
        },
        "Exists": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                query;
            this._form((function() {
                this._applyWithArgs("exactly", "existQ");
                return query = this._apply("Variable")
            }));
            return ["Exists", query]
        },
        "Negation": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                whereBody;
            this._form((function() {
                this._applyWithArgs("exactly", "neg");
                return whereBody = this._apply("RulePart")
            }));
            return ["Not", whereBody]
        },
        "RulePart": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, whereBody;
            whereBody = this._or((function() {
                return this._apply("AtomicFormulation")
            }), (function() {
                return this._apply("AtLeast")
            }), (function() {
                return this._apply("Exactly")
            }), (function() {
                return this._apply("Exists")
            }), (function() {
                return this._apply("Negation")
            }), (function() {
                return this._apply("Range")
            }), (function() {
                x = this._apply("anything");
                console.error("Hit unhandled operation:", x);
                return this._pred(false)
            }));
            return whereBody
        },
        "RuleBody": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                rule;
            this._form((function() {
                (function() {
                    switch (this._apply('anything')) {
                    case "obl":
                        return "obl";
                    case "nec":
                        return "nec";
                    case "pos":
                        return "pos";
                    case "prm":
                        return "prm";
                    default:
                        throw fail
                    }
                }).call(this);
                return rule = this._apply("RulePart")
            }));
            return rule
        },
        "Process": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                termName, factType, ruleBody, ruleText;
            this._form((function() {
                this._applyWithArgs("exactly", "model");
                return this._many1((function() {
                    return this._form((function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case "Term":
                                return (function() {
                                    termName = this._apply("TermName");
                                    return this._applyWithArgs("Attributes", termName)
                                }).call(this);
                            case "FactType":
                                return (function() {
                                    factType = this._apply("FactType");
                                    return this._applyWithArgs("Attributes", factType)
                                }).call(this);
                            case "rule":
                                return (function() {
                                    ruleBody = this._apply("RuleBody");
                                    this._form((function() {
                                        this._applyWithArgs("exactly", "text");
                                        return ruleText = this._apply("anything")
                                    }));
                                    (this["linkTableBind"] = (0));
                                    return this["rules"].push(["Rule", ["Text", ruleText],
                                        ["Body", ruleBody]
                                    ])
                                }).call(this);
                            default:
                                throw fail
                            }
                        }).call(this)
                    }))
                }))
            }));
            return ({
                "tables": this["tables"],
                "rules": this["rules"]
            })
        }
    });
    (LF2AbstractSQL["AddWhereClause"] = (function(query, whereBody) {
        if (((whereBody[(0)] == "Exists") && (whereBody[(1)][(0)] == "Query"))) {
            (whereBody = whereBody[(1)].slice((1)));
            for (var i = (0);
            (i < whereBody["length"]); i++) {
                if ((whereBody[i][(0)] == "From")) {
                    query.push(whereBody[i])
                } else {
                    undefined
                }
            };
            for (var i = (0);
            (i < whereBody["length"]); i++) {
                if ((whereBody[i][(0)] == "Where")) {
                    this.AddWhereClause(query, whereBody[i][(1)])
                } else {
                    undefined
                }
            }
        } else {
            for (var i = (0);
            (i < query["length"]); i++) {
                if ((query[i][(0)] == "Where")) {
                    (query[i][(1)] = ["And", query[i][(1)], whereBody]);
                    return undefined
                } else {
                    undefined
                }
            };
            query.push(["Where", whereBody])
        }
    }));
    (LF2AbstractSQL["ResolveConceptTypes"] = (function(query, termName, varAlias) {
        {
            var conceptAlias = undefined;
            var parentAlias = (varAlias + termName);
            var conceptName = termName
        };
        while (this["conceptTypes"].hasOwnProperty(conceptName)) {
            (conceptName = this["conceptTypes"][termName]);
            (conceptAlias = (varAlias + conceptName));
            query.push(["From", this["tables"][conceptName]["name"], conceptAlias]);
            this.AddWhereClause(query, ["Equals", ["ReferencedField", parentAlias, this["tables"][conceptName]["name"]],
                ["ReferencedField", conceptAlias, this["tables"][conceptName]["idField"]]
            ]);
            (parentAlias = conceptAlias)
        }
    }));
    var primitives = ({
        "Integer": true,
        "Short Text": true,
        "Long Text": true
    });
    (LF2AbstractSQL["isPrimitive"] = (function(termName) {
        do {
            if (primitives.hasOwnProperty(termName)) {
                return termName
            } else {
                undefined
            }
        } while ((this["conceptTypes"].hasOwnProperty(termName) && (termName = this["conceptTypes"][termName])));
        return false
    }));
    (LF2AbstractSQL["initialize"] = (function() {
        SBVRLibs["initialize"].call(this);
        (this["tables"] = ({}));
        (this["terms"] = ({}));
        (this["rules"] = []);
        (this["linkTableBind"] = (0))
    }));
    return LF2AbstractSQL
}))