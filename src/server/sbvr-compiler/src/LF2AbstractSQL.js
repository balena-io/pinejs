define(["sbvr-parser/SBVRLibs", "underscore", "ometa/ometa-base"], (function(SBVRLibs, _) {
    var LF2AbstractSQL = undefined;
    LF2AbstractSQL = objectThatDelegatesTo(SBVRLibs, {
        "TermName": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                termName;
            termName = this._apply("anything");
            this._or((function() {
                return this._pred((!this["tables"].hasOwnProperty(this.GetResourceName(termName))))
            }), (function() {
                console.error(("We already have a term with a name of: " + termName));
                return this._pred(false)
            }));
            (this["terms"][termName] = termName);
            (this["tables"][this.GetResourceName(termName)] = ({
                "fields": [],
                "primitive": false,
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
                conceptType, primitive, conceptTable, termTable, field, fieldID;
            this._form((function() {
                this._applyWithArgs("exactly", "Term");
                return conceptType = this._apply("anything")
            }));
            (this["conceptTypes"][termName] = conceptType);
            primitive = this._applyWithArgs("IsPrimitive", conceptType);
            conceptTable = this["tables"][this.GetResourceName(conceptType)];
            termTable = this["tables"][this.GetResourceName(termName)];
            field = ["ConceptType", conceptTable["name"], "NOT NULL", conceptTable["idField"]];
            this._opt((function() {
                this._pred(((primitive !== false) && (conceptType === primitive)));
                (field[(0)] = primitive);
                return this._or((function() {
                    this._pred(termTable.hasOwnProperty("valueField"));
                    fieldID = this._applyWithArgs("GetTableFieldID", termTable, termTable["valueField"]);
                    this._pred((fieldID !== false));
                    (field[(1)] = termTable["fields"][fieldID][(1)]);
                    return termTable["fields"].splice(fieldID, (1))
                }), (function() {
                    return (termTable["valueField"] = conceptTable["name"])
                }))
            }));
            return termTable["fields"].push(field)
        },
        "AttrDatabaseIDField": function(tableID) {
            var $elf = this,
                _fromIdx = this.input.idx,
                idField, table;
            idField = this._apply("anything");
            table = this["tables"][this.GetResourceName(tableID)];
            return this._or((function() {
                return this._pred(_.isString(table))
            }), (function() {
                table["fields"].push(["Serial", idField, "PRIMARY KEY"]);
                return (table["idField"] = idField)
            }))
        },
        "AttrDatabaseValueField": function(tableID) {
            var $elf = this,
                _fromIdx = this.input.idx,
                valueField, table, fieldID;
            valueField = this._apply("anything");
            table = this["tables"][this.GetResourceName(tableID)];
            return this._or((function() {
                return this._pred(_.isString(table))
            }), (function() {
                this._or((function() {
                    this._pred(table.hasOwnProperty("valueField"));
                    fieldID = this._applyWithArgs("GetTableFieldID", table, table["valueField"]);
                    this._pred((fieldID !== false));
                    return (table["fields"][fieldID][(1)] = valueField)
                }), (function() {
                    return table["fields"].push(["Value", valueField, "NOT NULL"])
                }));
                return (table["valueField"] = valueField)
            }))
        },
        "AttrDatabaseTableName": function(tableID) {
            var $elf = this,
                _fromIdx = this.input.idx,
                tableName, table;
            tableName = this._apply("anything");
            table = this["tables"][this.GetResourceName(tableID)];
            return this._or((function() {
                return this._pred(_.isString(table))
            }), (function() {
                return (table["name"] = tableName)
            }))
        },
        "AttrDatabasePrimitive": function(termName) {
            var $elf = this,
                _fromIdx = this.input.idx,
                attrVal;
            attrVal = this._apply("anything");
            return (this["tables"][this.GetResourceName(termName)]["primitive"] = attrVal)
        },
        "AttrDatabaseAttribute": function(factType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                attrVal, baseTable, attributeTable, fieldID;
            attrVal = this._apply("anything");
            return this._opt((function() {
                this._pred(attrVal);
                (this["tables"][this.GetResourceName(factType)] = "Attribute");
                baseTable = this["tables"][this.GetResourceName(factType[(0)][(1)])];
                attributeTable = this["tables"][this.GetResourceName(factType[(2)][(1)])];
                fieldID = this._applyWithArgs("GetTableFieldID", baseTable, attributeTable["name"]);
                return (baseTable["fields"][fieldID][(0)] = attributeTable["primitive"])
            }))
        },
        "AttrForeignKey": function(factType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                type, baseTable, fkTable, fieldID;
            type = this._apply("anything");
            baseTable = this["tables"][this.GetResourceName(factType[(0)][(1)])];
            fkTable = this["tables"][this.GetResourceName(factType[(2)][(1)])];
            this._or((function() {
                this._pred(((baseTable["valueField"] == fkTable["name"]) || (baseTable["idField"] == fkTable["name"])));
                fieldID = this._applyWithArgs("GetTableFieldID", baseTable, fkTable["name"]);
                this._pred((fieldID !== false));
                return (baseTable["fields"][fieldID][(0)] = "ForeignKey")
            }), (function() {
                return baseTable["fields"].push(["ForeignKey", fkTable["name"], type, fkTable["idField"]])
            }));
            return (this["tables"][this.GetResourceName(factType)] = "ForeignKey")
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
            return (this["tables"][this.GetResourceName(term[(1)])] = this["tables"][this.GetResourceName(factType)])
        },
        "FactType": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                factTypePart, attributes, factType, resourceName, termName, fkTable, verb;
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
            resourceName = this.GetResourceName(factType);
            this._or((function() {
                this._pred((factType["length"] == (2)));
                this._many1((function() {
                    factTypePart = this._apply("anything");
                    return this._lookahead((function() {
                        return attributes = this._apply("anything")
                    }))
                }));
                this["tables"][this.GetResourceName(factType[(0)][(1)])]["fields"].push(["Boolean", factType[(1)][(1)]]);
                return (this["tables"][resourceName] = "BooleanAttribute")
            }), (function() {
                (this["tables"][resourceName] = ({
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
                        fkTable = this["tables"][this.GetResourceName(termName)];
                        return this["tables"][resourceName]["fields"].push(["ForeignKey", fkTable["name"], "NOT NULL", fkTable["idField"]])
                    }), (function() {
                        return this._form((function() {
                            this._applyWithArgs("exactly", "Verb");
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
                    case "MinimumCardinality":
                        return "MinimumCardinality";
                    case "MaximumCardinality":
                        return "MaximumCardinality";
                    case "Cardinality":
                        return "Cardinality";
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
                this._applyWithArgs("exactly", "Number");
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
                this._applyWithArgs("exactly", "Variable");
                bind = this._apply("Number");
                this._form((function() {
                    this._applyWithArgs("exactly", "Term");
                    return termName = this._apply("anything")
                }));
                varAlias = ("var" + bind);
                query = ["SelectQuery", ["Select", []],
                    ["From", this["tables"][this.GetResourceName(termName)]["name"], (varAlias + termName)]
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
        "RoleBinding": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                termName, bind;
            this._form((function() {
                this._applyWithArgs("exactly", "RoleBinding");
                this._form((function() {
                    this._applyWithArgs("exactly", "Term");
                    return termName = this._apply("anything")
                }));
                return bind = this._apply("anything")
            }));
            return [termName, bind]
        },
        "LinkTable": function(actualFactType, rootTerms) {
            var $elf = this,
                _fromIdx = this.input.idx,
                tableAlias, query, i, bind, termName, resourceName;
            tableAlias = ("link" + this["linkTableBind"]++);
            query = ["SelectQuery", ["Select", []],
                ["From", this["tables"][this.GetResourceName(actualFactType)]["name"], tableAlias]
            ];
            i = (0);
            this._many1((function() {
                this._pred((i < rootTerms["length"]));
                bind = this._apply("RoleBinding");
                termName = rootTerms[i];
                resourceName = this.GetResourceName(termName);
                this._applyWithArgs("AddWhereClause", query, ["Equals", ["ReferencedField", tableAlias, this["tables"][resourceName]["name"]],
                    ["ReferencedField", (("var" + bind[(1)]) + termName), this["tables"][resourceName]["idField"]]
                ]);
                return i++
            }));
            return ["Exists", query]
        },
        "ForeignKey": function(actualFactType, rootTerms) {
            var $elf = this,
                _fromIdx = this.input.idx,
                bindFrom, bindTo, termFrom, termTo, temp, tableTo;
            this._pred((this["tables"][this.GetResourceName(actualFactType)] == "ForeignKey"));
            this._or((function() {
                bindFrom = this._apply("RoleBinding");
                bindTo = this._apply("RoleBinding");
                this._apply("end");
                this._or((function() {
                    this._pred(this.IsChild(bindFrom[(0)], actualFactType[(0)]));
                    termFrom = rootTerms[(0)];
                    return termTo = rootTerms[(1)]
                }), (function() {
                    temp = bindTo;
                    bindTo = bindFrom;
                    bindFrom = temp;
                    termFrom = rootTerms[(1)];
                    return termTo = rootTerms[(0)]
                }));
                return tableTo = this["tables"][this.GetResourceName(termTo)]
            }), (function() {
                return this._applyWithArgs("foreign", ___ForeignKeyMatchingFailed___, 'die')
            }));
            return ["Equals", ["ReferencedField", (("var" + bindFrom[(1)]) + termFrom), tableTo["name"]], ["ReferencedField", (("var" + bindTo[(1)]) + termTo), tableTo["idField"]]]
        },
        "BooleanAttribute": function(actualFactType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                bindFrom, termFrom, attributeName;
            this._pred((this["tables"][this.GetResourceName(actualFactType)] == "BooleanAttribute"));
            this._or((function() {
                bindFrom = this._apply("RoleBinding");
                this._apply("end");
                termFrom = actualFactType[(0)][(1)];
                return attributeName = actualFactType[(1)][(1)]
            }), (function() {
                console.error(this["input"]);
                return this._applyWithArgs("foreign", ___BooleanAttributeMatchingFailed___, 'die')
            }));
            return ["Equals", ["ReferencedField", (("var" + bindFrom[(1)]) + termFrom), attributeName], ["Boolean", true]]
        },
        "Attribute": function(actualFactType, rootTerms) {
            var $elf = this,
                _fromIdx = this.input.idx,
                query, bindReal, bindAttr, termNameReal, termNameAttr, temp, resourceAttr;
            this._pred((this["tables"][this.GetResourceName(actualFactType)] == "Attribute"));
            query = ["SelectQuery", ["Select", []]];
            this._or((function() {
                bindReal = this._apply("RoleBinding");
                bindAttr = this._apply("RoleBinding");
                this._apply("end");
                return this._or((function() {
                    this._pred(this.IsChild(bindReal[(0)], actualFactType[(0)]));
                    termNameReal = rootTerms[(0)];
                    return termNameAttr = rootTerms[(1)]
                }), (function() {
                    temp = bindAttr;
                    bindAttr = bindReal;
                    bindReal = temp;
                    termNameReal = rootTerms[(1)];
                    return termNameAttr = rootTerms[(0)]
                }))
            }), (function() {
                return this._applyWithArgs("foreign", ___AttributeMatchingFailed___, 'die')
            }));
            resourceAttr = this.GetResourceName(termNameAttr);
            this._applyWithArgs("AddWhereClause", query, ["Equals", ["ReferencedField", (("var" + bindAttr[(1)]) + termNameReal), this["tables"][resourceAttr]["name"]],
                ["ReferencedField", (("var" + bindReal[(1)]) + termNameReal), this["tables"][resourceAttr]["name"]]
            ]);
            return ["Exists", query]
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
                    return this._applyWithArgs("BooleanAttribute", actualFactType)
                }), (function() {
                    return this._applyWithArgs("Attribute", actualFactType, rootTerms)
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
                this._applyWithArgs("exactly", "AtLeastNQ");
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
                this._applyWithArgs("exactly", "ExactQ");
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
                this._applyWithArgs("exactly", "NumericalRangeQ");
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
                this._applyWithArgs("exactly", "ExistentialQ");
                return query = this._apply("Variable")
            }));
            return ["Exists", query]
        },
        "Negation": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                whereBody;
            this._form((function() {
                this._applyWithArgs("exactly", "LogicalNegation");
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
                    case "ObligationF":
                        return "ObligationF";
                    case "NecessityF":
                        return "NecessityF";
                    case "PossibilityF":
                        return "PossibilityF";
                    case "PermissibilityF":
                        return "PermissibilityF";
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
                termName, factType, ruleBody, ruleText, tables;
            this._form((function() {
                this._applyWithArgs("exactly", "Model");
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
                            case "Rule":
                                return (function() {
                                    ruleBody = this._apply("RuleBody");
                                    this._form((function() {
                                        this._applyWithArgs("exactly", "StructuredEnglish");
                                        return ruleText = this._apply("anything")
                                    }));
                                    (this["linkTableBind"] = (0));
                                    return this["rules"].push(["Rule", ["StructuredEnglish", ruleText],
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
            tables = ({});
            return ({
                "tables": this["tables"],
                "rules": this["rules"]
            })
        }
    });
    (LF2AbstractSQL["AddWhereClause"] = (function(query, whereBody) {
        if (((whereBody[(0)] == "Exists") && ((((whereBody[(1)][(0)] == "SelectQuery") || (whereBody[(1)][(0)] == "InsertQuery")) || (whereBody[(1)][(0)] == "UpdateQuery")) || (whereBody[(1)][(0)] == "UpsertQuery")))) {
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
            for (var i = (1);
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
            var conceptName = termName;
            var conceptTable = undefined
        };
        while (this["conceptTypes"].hasOwnProperty(conceptName)) {
            (conceptName = this["conceptTypes"][termName]);
            (conceptAlias = (varAlias + conceptName));
            (conceptTable = this["tables"][this.GetResourceName(conceptName)]);
            query.push(["From", conceptTable["name"], conceptAlias]);
            this.AddWhereClause(query, ["Equals", ["ReferencedField", parentAlias, conceptTable["name"]],
                ["ReferencedField", conceptAlias, conceptTable["idField"]]
            ]);
            (parentAlias = conceptAlias)
        }
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