define(["sbvr-parser/SBVRLibs", "underscore", "ometa-core"], (function(SBVRLibs, _) {
    var ServerURIParser = SBVRLibs._extend({
        "Process": function() {
            var i, body, vocab, uri, _fromIdx = this.input.idx,
                method, $elf = this,
                resources;
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
                        throw this._fail()
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
            var _fromIdx = this.input.idx,
                $elf = this;
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
            var _fromIdx = this.input.idx,
                $elf = this,
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
                                throw this._fail()
                            }
                        }).call(this)
                    }))
                }))
            }));
            return resourcePart.replace(new RegExp("_", "g"), " ")
        },
        "ResourceName": function() {
            var _fromIdx = this.input.idx,
                $elf = this;
            return this._consumedBy((function() {
                this._apply("ResourcePart");
                return this._many((function() {
                    this._applyWithArgs("exactly", "-");
                    return this._apply("ResourcePart")
                }))
            }))
        },
        "Resource": function() {
            var query, _fromIdx = this.input.idx,
                $elf = this,
                resourceName;
            resourceName = this._apply("ResourceName");
            this._opt((function() {
                this._or((function() {
                    return this._pred((this["currentMethod"] != "GET"))
                }), (function() {
                    return this._lookahead((function() {
                        return this._applyWithArgs("exactly", "?")
                    }))
                }));
                query = ["Query"];
                this._applyWithArgs("AddQueryResource", query, resourceName);
                this._applyWithArgs("Modifiers", query);
                return this._opt((function() {
                    return this._applyWithArgs("exactly", "*")
                }))
            }));
            return ({
                "resourceName": resourceName,
                "query": query,
                "values": this["newBody"]
            })
        },
        "Comparator": function() {
            var _fromIdx = this.input.idx,
                $elf = this;
            return (function() {
                switch (this._apply('anything')) {
                case "<":
                    return this._or((function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case ":":
                                return "LessThanOrEqual";
                            default:
                                throw this._fail()
                            }
                        }).call(this)
                    }), (function() {
                        return "LessThan"
                    }));
                case "~":
                    return "Like";
                case "!":
                    return (function() {
                        this._applyWithArgs("exactly", ":");
                        "!:";
                        return "NotEquals"
                    }).call(this);
                case ":":
                    return "Equals";
                case ">":
                    return this._or((function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case ":":
                                return "GreaterThanOrEqual";
                            default:
                                throw this._fail()
                            }
                        }).call(this)
                    }), (function() {
                        return "GreaterThan"
                    }));
                default:
                    throw this._fail()
                }
            }).call(this)
        },
        "Modifiers": function(query) {
            var _fromIdx = this.input.idx,
                $elf = this,
                sorts;
            this._applyWithArgs("exactly", "?");
            return this._many((function() {
                this._opt((function() {
                    return this._applyWithArgs("exactly", "&")
                }));
                return this._or((function() {
                    return this._applyWithArgs("Filters", query)
                }), (function() {
                    sorts = this._apply("Sorts");
                    return query.push(sorts)
                }))
            }))
        },
        "Field": function() {
            var _fromIdx = this.input.idx,
                mapping, $elf = this,
                resourceName, resourceFieldName;
            this._or((function() {
                resourceName = this._apply("ResourcePart");
                this._applyWithArgs("exactly", ".");
                return resourceFieldName = this._apply("ResourcePart")
            }), (function() {
                resourceName = this["currentResource"];
                return resourceFieldName = this._apply("ResourcePart")
            }));
            mapping = this._applyWithArgs("GetMapping", resourceName, resourceFieldName);
            return ["ReferencedField"].concat(mapping)
        },
        "Filters": function(query) {
            var field, value, _fromIdx = this.input.idx,
                comparator, mapping, $elf = this,
                resourceName, resourceFieldName;
            this._applyWithArgs("exactly", "f");
            this._applyWithArgs("exactly", "i");
            this._applyWithArgs("exactly", "l");
            this._applyWithArgs("exactly", "t");
            this._applyWithArgs("exactly", "e");
            this._applyWithArgs("exactly", "r");
            this._applyWithArgs("exactly", "=");
            "filter=";
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
                resourceName = field[(1)];
                resourceFieldName = field[(2)];
                mapping = this._applyWithArgs("GetMapping", resourceName, resourceFieldName);
                this._applyWithArgs("AddWhereClause", query, [comparator, field, ["Bind", mapping[(0)], this.GetTableField(mapping)]]);
                this._applyWithArgs("AddBodyVar", resourceName, resourceFieldName, mapping, value);
                return this._applyWithArgs("AddQueryTable", query, mapping[(0)])
            }))
        },
        "Sorts": function() {
            var direction, field, _fromIdx = this.input.idx,
                $elf = this,
                sorts;
            this._applyWithArgs("exactly", "o");
            this._applyWithArgs("exactly", "r");
            this._applyWithArgs("exactly", "d");
            this._applyWithArgs("exactly", "e");
            this._applyWithArgs("exactly", "r");
            this._applyWithArgs("exactly", "=");
            "order=";
            sorts = this._many1((function() {
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
                        throw this._fail()
                    }
                }).call(this);
                this._opt((function() {
                    return this._applyWithArgs("exactly", ";")
                }));
                return [direction, field]
            }));
            return ["OrderBy"].concat(sorts)
        },
        "ValueBreak": function() {
            var _fromIdx = this.input.idx,
                $elf = this;
            return (function() {
                switch (this._apply('anything')) {
                case ";":
                    return ";";
                case "/":
                    return "/";
                case "*":
                    return "*";
                default:
                    throw this._fail()
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
    (ServerURIParser["GetTableField"] = (function(mapping) {
        return SBVRLibs["GetTableField"].call(this, this["sqlModels"][this["currentVocab"]]["tables"][mapping[(0)]], mapping[(1)])
    }));
    (ServerURIParser["GetMapping"] = (function(resourceName, resourceFieldName) {
        var resourceMapping = this["clientModels"][this["currentVocab"]]["resourceToSQLMappings"][resourceName];
        if (resourceMapping.hasOwnProperty(resourceFieldName)) {
            return resourceMapping[resourceFieldName]
        } else {
            undefined
        };
        (resourceFieldName = resourceFieldName.replace(/ /g, "_"));
        if (resourceMapping.hasOwnProperty(resourceFieldName)) {
            return resourceMapping[resourceFieldName]
        } else {
            undefined
        };
        throw ((("Could not map resource: " + resourceName) + " - ") + resourceFieldName)
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
            var field, bind;
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
    (ServerURIParser["AddQueryResource"] = (function(query, resourceName) {
        var newValue, fieldName, fields, mapping, resourceFieldName, $elf = this,
            clientModel = this["clientModels"][this["currentVocab"]],
            resourceModel = clientModel["resources"][resourceName],
            resourceToSQLMappings = clientModel["resourceToSQLMappings"][resourceName],
            getSelectFields = (function() {
                var mapping, resourceField, fields = [];
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
            });
        (this["currentResource"] = resourceName);
        switch (this["sqlModels"][this["currentVocab"]]["tables"][resourceName]) {
        case "ForeignKey":
            {
                __TODO__.die();
                break
            };
        case "Attribute":
            {
                (resourceFieldName = resourceModel["valueField"]);
                (mapping = this.GetMapping(resourceName, resourceFieldName));
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
                                    ["Bind", mapping[(0)], this.GetTableField(mapping)]
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
                (resourceFieldName = resourceModel["valueField"]);
                (mapping = this.GetMapping(resourceName, resourceFieldName));
                switch (this["currentMethod"]) {
                case "GET":
                    {
                        (query[(0)] = "SelectQuery");
                        query.push(["Select", getSelectFields()]);
                        this.AddQueryTable(query, mapping[(0)]);
                        this.AddWhereClause(query, ["Equals", ["ReferencedField"].concat(mapping), ["Boolean", true]]);
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
                            [mapping[(1)], newValue]
                        ]]);
                        this.AddQueryTable(query, mapping[(0)]);
                        (resourceFieldName = resourceModel["idField"]);
                        (mapping = this.GetMapping(resourceName, resourceFieldName));
                        (fieldName = mapping[(1)]);
                        if ((this.AddBodyVar(resourceName, resourceFieldName, mapping) !== undefined)) {
                            this.AddQueryTable(query, mapping[(0)]);
                            this.AddWhereClause(query, ["Equals", ["ReferencedField"].concat(mapping), ["Bind", mapping[(0)], this.GetTableField(mapping)]])
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
                        if ((this["currentMethod"] === "PUT")) {
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
                                        ["Bind", mapping[(0)], this.GetTableField(mapping)]
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