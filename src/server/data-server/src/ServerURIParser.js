define(["sbvr-parser/SBVRLibs", "underscore", "ometa/ometa-base"], (function(SBVRLibs, _) {
    var ServerURIParser = undefined;
    ServerURIParser = objectThatDelegatesTo(SBVRLibs, {
        "Process": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                method, body, vocab, uri, resources, i;
            this._form((function() {
                method = (function() {
                    switch (this._apply('anything')) {
                    case "GET":
                        return "GET";
                    case "PUT":
                        return "PUT";
                    case "POST":
                        return "POST";
                    case "DELETE":
                        return "DELETE";
                    default:
                        throw fail
                    }
                }).call(this);
                (this["currentMethod"] = method);
                body = this._apply("anything");
                this._opt((function() {
                    this._pred((!_.isArray(body)));
                    return body = [({})]
                }));
                return this._form((function() {
                    this._applyWithArgs("exactly", "/");
                    vocab = this._apply("Vocabulary");
                    this._opt((function() {
                        return this._applyWithArgs("exactly", "/")
                    }));
                    (this["currentVocab"] = vocab);
                    uri = ["URI", ["Vocabulary", vocab]];
                    resources = [];
                    i = (0);
                    this._opt((function() {
                        return (function() {
                            for (undefined;
                            (i < body["length"]); i++) {
                                (this["currentBody"] = body[i]);
                                if ((i < (body["length"] - (1)))) {
                                    this._lookahead((function() {
                                        resources.push(this._apply("Resource"))
                                    }))
                                } else {
                                    resources.push(this._apply("Resource"))
                                }
                            }
                        }).call(this)
                    }));
                    return this._opt((function() {
                        return this._applyWithArgs("exactly", "/")
                    }))
                }))
            }));
            return uri.concat(resources)
        },
        "Vocabulary": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._consumedBy((function() {
                return this._many1((function() {
                    this._not((function() {
                        return this._applyWithArgs("exactly", "/")
                    }));
                    return this._apply("anything")
                }))
            }))
        },
        "ResourcePart": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                resourcePart;
            resourcePart = this._consumedBy((function() {
                return this._many1((function() {
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
                }))
            }));
            return resourcePart.replace(new RegExp("_", "g"), " ")
        },
        "Term": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                term;
            term = this._apply("ResourcePart");
            return ["Term", term]
        },
        "Verb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                verb;
            verb = this._apply("ResourcePart");
            return ["Verb", verb]
        },
        "TermOrFactType": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                term, factType, verb, resourceName, tableName;
            resourceName = this._consumedBy((function() {
                term = this._apply("Term");
                factType = [term];
                return this._many((function() {
                    this._applyWithArgs("exactly", "-");
                    verb = this._apply("Verb");
                    factType.push(verb);
                    return this._opt((function() {
                        this._applyWithArgs("exactly", "-");
                        term = this._apply("Term");
                        return factType.push(term)
                    }))
                }))
            }));
            tableName = this._or((function() {
                this._pred(verb);
                return factType
            }), (function() {
                return term[(1)]
            }));
            return ({
                "resourceName": resourceName,
                "tableName": tableName
            })
        },
        "Resource": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                resourceInfo, query;
            resourceInfo = this._apply("TermOrFactType");
            this._opt((function() {
                this._or((function() {
                    return this._pred((this["currentMethod"] != "GET"))
                }), (function() {
                    return this._lookahead((function() {
                        return this._applyWithArgs("exactly", "*")
                    }))
                }));
                query = ["Query"];
                this._applyWithArgs("AddQueryResource", query, resourceInfo["tableName"], resourceInfo["resourceName"]);
                this._applyWithArgs("Modifiers", query);
                return this._opt((function() {
                    return this._applyWithArgs("exactly", "*")
                }))
            }));
            return ({
                "resourceName": resourceInfo["resourceName"],
                "query": query,
                "values": this["newBody"]
            })
        },
        "Comparator": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                switch (this._apply('anything')) {
                case "=":
                    return "Equals";
                case "!":
                    return (function() {
                        this._applyWithArgs("exactly", "=");
                        "!=";
                        return "NotEquals"
                    }).call(this);
                case "~":
                    return "Like";
                default:
                    throw fail
                }
            }).call(this)
        },
        "Modifiers": function(query) {
            var $elf = this,
                _fromIdx = this.input.idx,
                sorts;
            return this._many((function() {
                return this._or((function() {
                    return this._applyWithArgs("Filters", query)
                }), (function() {
                    sorts = this._apply("Sorts");
                    return query.push(sorts)
                }))
            }))
        },
        "Field": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                table, field;
            return this._or((function() {
                table = this._apply("ResourcePart");
                this._applyWithArgs("exactly", ".");
                field = this._apply("ResourcePart");
                return ["ReferencedField", table, field]
            }), (function() {
                field = this._apply("ResourcePart");
                return ["Field", field]
            }))
        },
        "Filters": function(query) {
            var $elf = this,
                _fromIdx = this.input.idx,
                field, comparator, value, resourceName, resourceFieldName, mapping;
            this._applyWithArgs("exactly", "*");
            this._applyWithArgs("exactly", "f");
            this._applyWithArgs("exactly", "i");
            this._applyWithArgs("exactly", "l");
            this._applyWithArgs("exactly", "t");
            this._applyWithArgs("exactly", ":");
            "*filt:";
            return this._many1((function() {
                field = this._apply("Field");
                comparator = this._apply("Comparator");
                value = this._consumedBy((function() {
                    return this._many1((function() {
                        this._not((function() {
                            return this._apply("ValueBreak")
                        }));
                        return this._apply("anything")
                    }))
                }));
                this._opt((function() {
                    return this._applyWithArgs("exactly", ";")
                }));
                this._or((function() {
                    this._pred((field[(0)] == "ReferencedField"));
                    resourceName = field[(1)];
                    return resourceFieldName = field[(2)]
                }), (function() {
                    resourceName = this["currentResource"];
                    return resourceFieldName = field[(1)]
                }));
                mapping = this["clientModels"][this["currentVocab"]]["resourceToSQLMappings"][resourceName][resourceFieldName];
                this._applyWithArgs("AddWhereClause", query, [comparator, field, ["Bind", mapping[(0)], this.GetTableField(this["sqlModels"][this["currentVocab"]]["tables"][mapping[(0)]], mapping[(1)])]]);
                this._applyWithArgs("AddBodyVar", resourceName, resourceFieldName, mapping, value);
                return this._applyWithArgs("AddQueryTable", query, mapping[(0)])
            }))
        },
        "Sorts": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                field, direction, sorts;
            this._applyWithArgs("exactly", "*");
            this._applyWithArgs("exactly", "s");
            this._applyWithArgs("exactly", "o");
            this._applyWithArgs("exactly", "r");
            this._applyWithArgs("exactly", "t");
            this._applyWithArgs("exactly", ":");
            "*sort:";
            sorts = this._many1((function() {
                this._opt((function() {
                    return this._applyWithArgs("exactly", ";")
                }));
                field = this._apply("Field");
                this._applyWithArgs("exactly", "=");
                direction = (function() {
                    switch (this._apply('anything')) {
                    case "A":
                        return (function() {
                            this._applyWithArgs("exactly", "S");
                            this._applyWithArgs("exactly", "C");
                            return "ASC"
                        }).call(this);
                    case "D":
                        return (function() {
                            this._applyWithArgs("exactly", "E");
                            this._applyWithArgs("exactly", "S");
                            this._applyWithArgs("exactly", "C");
                            return "DESC"
                        }).call(this);
                    default:
                        throw fail
                    }
                }).call(this);
                return [direction, field]
            }));
            return ["OrderBy"].concat(sorts)
        },
        "ValueBreak": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (function() {
                switch (this._apply('anything')) {
                case ";":
                    return ";";
                case "*":
                    return "*";
                case "/":
                    return "/";
                default:
                    throw fail
                }
            }).call(this)
        }
    });
    (ServerURIParser["initialize"] = (function() {
        (this["sqlModels"] = ({}));
        (this["clientModels"] = ({}));
        (this["currentVocab"] = "");
        (this["currentMethod"] = "");
        (this["currentBody"] = []);
        (this["newBody"] = []);
        (this["currentResource"] = null)
    }));
    (ServerURIParser["setSQLModel"] = (function(vocab, model) {
        (this["sqlModels"][vocab] = model)
    }));
    (ServerURIParser["setClientModel"] = (function(vocab, model) {
        (this["clientModels"][vocab] = model)
    }));
    (ServerURIParser["AddWhereClause"] = (function(query, whereBody) {
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
        };
        if (((query[(0)] == "UpsertQuery") && (whereBody[(0)] == "Equals"))) {
            {
                var field = undefined;
                var value = undefined
            };
            if ((whereBody[(1)][(0)] == "Field")) {
                (field = whereBody[(1)][(1)])
            } else {
                if ((whereBody[(1)][(0)] == "ReferencedField")) {
                    (field = whereBody[(1)][(2)])
                } else {
                    if ((whereBody[(2)][(0)] == "Field")) {
                        (field = whereBody[(2)][(1)])
                    } else {
                        if ((whereBody[(2)][(0)] == "ReferencedField")) {
                            (field = whereBody[(2)][(2)])
                        } else {
                            undefined
                        }
                    }
                }
            };
            if ((whereBody[(1)][(0)] == "Bind")) {
                (bind = whereBody[(1)])
            } else {
                if ((whereBody[(2)][(0)] == "Bind")) {
                    (bind = whereBody[(2)])
                } else {
                    undefined
                }
            };
            for (var i = (1);
            (i < query["length"]); i++) {
                var queryPart = query[i];
                if ((queryPart[(0)] == "Fields")) {
                    for (var j = (0);
                    (j < queryPart[(1)]["length"]); j++) {
                        var queryFields = queryPart[(1)][j];
                        if ((queryFields[(0)] == field)) {
                            (queryFields[(1)] = bind);
                            break
                        } else {
                            undefined
                        }
                    };
                    if ((j === queryPart[(1)]["length"])) {
                        queryPart[(1)].push([field, bind])
                    } else {
                        undefined
                    };
                    break
                } else {
                    undefined
                }
            }
        } else {
            undefined
        }
    }));
    (ServerURIParser["AddBodyVar"] = (function(resourceName, resourceFieldName, mapping, value) {
        if ((value === undefined)) {
            if (this["currentBody"].hasOwnProperty(((resourceName + ".") + resourceFieldName))) {
                (value = this["currentBody"][((resourceName + ".") + resourceFieldName)])
            } else {
                if (this["currentBody"].hasOwnProperty(resourceFieldName)) {
                    (value = this["currentBody"][resourceFieldName])
                } else {
                    return undefined
                }
            }
        } else {
            undefined
        };
        return (this["newBody"][mapping.join(".")] = value)
    }));
    (ServerURIParser["AddQueryTable"] = (function(query, tableName) {
        var i = (0);
        for (undefined;
        (i < query["length"]); i++) {
            if (((query[i][(0)] === "From") && (query[i][(1)] === tableName))) {
                return undefined
            } else {
                undefined
            }
        };
        query.push(["From", tableName])
    }));
    (ServerURIParser["AddQueryResource"] = (function(query, termOrFactType, resourceName) {
        {
            var newValue = undefined;
            var fieldName = undefined;
            var value = undefined;
            var fields = undefined;
            var i = undefined;
            var field = undefined;
            var mapping = undefined;
            var resourceField = undefined;
            var $elf = this;
            var clientModel = this["clientModels"][this["currentVocab"]];
            var resourceModel = clientModel["resources"][resourceName];
            var resourceToSQLMappings = clientModel["resourceToSQLMappings"][resourceName];
            var sqlTables = this["sqlModels"][this["currentVocab"]]["tables"];
            var table = sqlTables[resourceName];
            var getSelectFields = (function() {
                {
                    var mapping = undefined;
                    var resourceField = undefined;
                    var fields = [];
                    var table = undefined
                };
                for (resourceField in resourceToSQLMappings) {
                    if (resourceToSQLMappings.hasOwnProperty(resourceField)) {
                        (mapping = resourceToSQLMappings[resourceField]);
                        $elf.AddQueryTable(query, mapping[(0)]);
                        fields.push([
                            ["ReferencedField"].concat(mapping), resourceField])
                    } else {
                        undefined
                    }
                };
                return fields
            })
        };
        (this["currentResource"] = resourceName);
        switch (table) {
        case "ForeignKey":
            {
                __TODO__.die();
                break
            };
        case "Attribute":
            {
                (resourceFieldName = resourceModel["valueField"]);
                (mapping = resourceToSQLMappings[resourceFieldName]);
                switch (this["currentMethod"]) {
                case "DELETE":
                    {
                        (query[(0)] = "UpdateQuery");
                        this.AddQueryTable(query, mapping[(0)]);
                        query.push(["Fields", [
                            [mapping[(1)], "NULL"]
                        ]]);
                        break
                    };
                case "GET":
                    {
                        (query[(0)] = "SelectQuery");
                        query.push(["Select", getSelectFields()]);
                        break
                    };
                case "PUT":
                    {};
                case "POST":
                    {
                        (query[(0)] = "UpdateQuery");
                        if ((this.AddBodyVar(resourceName, resourceFieldName, mapping) !== undefined)) {
                            this.AddQueryTable(query, mapping[(0)]);
                            query.push(["Fields", [
                                [mapping[(0)],
                                    ["Bind", mapping[(0)], this.GetTableField(sqlTables[mapping[(0)]], mapping[(1)])]
                                ]
                            ]])
                        } else {
                            undefined
                        }
                        break
                    }
                }
                break
            };
        case "BooleanAttribute":
            {
                (table = sqlTables[termOrFactType[(0)][(1)]]);
                (attributeName = termOrFactType[(1)][(1)]);
                switch (this["currentMethod"]) {
                case "GET":
                    {
                        (query[(0)] = "SelectQuery");
                        query.push(["Select", getSelectFields()]);
                        this.AddWhereClause(query, ["Equals", ["Field", attributeName],
                            ["Boolean", true]
                        ]);
                        break
                    };
                case "DELETE":
                    (newValue = false);
                case "PUT":
                    {};
                case "POST":
                    {
                        if ((newValue == null)) {
                            (newValue = true)
                        } else {
                            undefined
                        }(query[(0)] = "UpdateQuery");
                        query.push(["Fields", [
                            [attributeName, newValue]
                        ]]);
                        this.AddQueryTable(query, table["name"]);
                        (resourceFieldName = resourceModel["idField"]);
                        (mapping = resourceToSQLMappings[resourceFieldName]);
                        (fieldName = mapping[(1)]);
                        if ((this.AddBodyVar(resourceName, resourceFieldName, mapping) !== undefined)) {
                            this.AddQueryTable(query, mapping[(0)]);
                            this.AddWhereClause(query, ["Equals", ["ReferencedField"].concat(mapping), ["Bind", mapping[(0)], this.GetTableField(sqlTables[mapping[(0)]], mapping[(1)])]])
                        } else {
                            undefined
                        }
                        break
                    }
                }
                break
            };
        default:
            {
                switch (this["currentMethod"]) {
                case "DELETE":
                    {
                        (query[(0)] = "DeleteQuery");
                        break
                    };
                case "GET":
                    {
                        (query[(0)] = "SelectQuery");
                        query.push(["Select", getSelectFields()]);
                        break
                    };
                case "PUT":
                    {};
                case "POST":
                    {
                        if ((this["currentMethod"] == "PUT")) {
                            (query[(0)] = "UpsertQuery")
                        } else {
                            (query[(0)] = "InsertQuery")
                        }(fields = []);
                        for (resourceFieldName in resourceToSQLMappings) {
                            if (resourceToSQLMappings.hasOwnProperty(resourceFieldName)) {
                                (mapping = resourceToSQLMappings[resourceFieldName]);
                                if ((this.AddBodyVar(resourceName, resourceFieldName, mapping) !== undefined)) {
                                    this.AddQueryTable(query, mapping[(0)]);
                                    fields.push([mapping[(1)],
                                        ["Bind", mapping[(0)], this.GetTableField(sqlTables[mapping[(0)]], mapping[(1)])]
                                    ])
                                } else {
                                    undefined
                                }
                            } else {
                                undefined
                            }
                        }
                        query.push(["Fields", fields]);
                        break
                    }
                }
                break
            }
        }
    }));
    return ServerURIParser
}))