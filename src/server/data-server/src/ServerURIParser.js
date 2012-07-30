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
                    console.error("Body is not an array:", body);
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
                    (function() {
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
                    }).call(this);
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
        "TermOrFactType": function(query) {
            var $elf = this,
                _fromIdx = this.input.idx,
                term, factType, verb;
            term = this._apply("Term");
            factType = [term];
            this._many((function() {
                this._applyWithArgs("exactly", "-");
                verb = this._apply("Verb");
                factType.push(verb);
                return this._opt((function() {
                    this._applyWithArgs("exactly", "-");
                    term = this._apply("Term");
                    return factType.push(term)
                }))
            }));
            return this._or((function() {
                this._pred(verb);
                return this._applyWithArgs("AddQueryTable", query, factType)
            }), (function() {
                return this._applyWithArgs("AddQueryTable", query, term[(1)])
            }))
        },
        "Resource": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                query, fields;
            query = ["Query"];
            fields = this._applyWithArgs("TermOrFactType", query);
            this._applyWithArgs("Modifiers", query, fields);
            return [query].concat(fields)
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
        "Modifiers": function(query, fields) {
            var $elf = this,
                _fromIdx = this.input.idx,
                sorts;
            return this._many((function() {
                return this._or((function() {
                    return this._applyWithArgs("Filters", query, fields)
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
        "Filters": function(query, fields) {
            var $elf = this,
                _fromIdx = this.input.idx,
                field, comparator, value;
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
                return this._applyWithArgs("AddWhereClause", query, [comparator, field, ["Value", value]], fields)
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
        (this["currentVocab"] = "");
        (this["currentMethod"] = "");
        (this["currentBody"] = [])
    }));
    (ServerURIParser["setSQLModel"] = (function(vocab, model) {
        (this["sqlModels"][vocab] = model)
    }));
    (ServerURIParser["AddWhereClause"] = (function(query, whereBody, fields) {
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
                    this.AddWhereClause(query, whereBody[i][(1)], fields)
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
            if ((whereBody[(1)][(0)] == "Value")) {
                (value = whereBody[(1)][(1)])
            } else {
                if ((whereBody[(2)][(0)] == "Value")) {
                    (value = whereBody[(2)][(1)])
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
                            (queryFields[(1)] = value);
                            for (var k = (0);
                            (k < fields[(0)]["length"]); k++) {
                                if ((fields[(0)][k][(1)] == field)) {
                                    fields[(0)].splice(k, (1));
                                    break
                                } else {
                                    undefined
                                }
                            };
                            break
                        } else {
                            undefined
                        }
                    };
                    if ((j === queryPart[(1)]["length"])) {
                        queryPart[(1)].push([field, value])
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
    (ServerURIParser["AddQueryTable"] = (function(query, termOrFactType) {
        var tables = this["sqlModels"][this["currentVocab"]]["tables"];
        var table = tables[termOrFactType];
        var fieldOrdering = [];
        console.log(termOrFactType, table, this["sqlModels"][this["currentVocab"]]);
        switch (table) {
        case "ForeignKey":
            {
                __TODO__.die();
                break
            };
        case "Attribute":
            {
                (table = tables[termOrFactType[(0)][(1)]]);
                (attributeName = termOrFactType[(1)][(1)]);
                switch (this["currentMethod"]) {
                case "DELETE":
                    {
                        (query[(0)] = "UpdateQuery");
                        query.push(["Fields", [
                            [attributeName, "NULL"]
                        ]]);
                        break
                    };
                case "GET":
                    {
                        (query[(0)] = "SelectQuery");
                        query.push(["Select", ["*"]]);
                        break
                    };
                case "PUT":
                    {};
                case "POST":
                    {
                        (query[(0)] = "UpdateQuery");
                        query.push(["Fields", [
                            [attributeName, "?"]
                        ]]);
                        fieldOrdering.push(this.GetTableField(table, attributeName));
                        break
                    }
                }
                query.push(["From", table["name"]]);
                break
            };
        case "BooleanAttribute":
            {
                (table = tables[termOrFactType[(0)][(1)]]);
                (attributeName = termOrFactType[(1)][(1)]);
                switch (this["currentMethod"]) {
                case "DELETE":
                    {
                        (query[(0)] = "UpdateQuery");
                        query.push(["Fields", [
                            [attributeName, false]
                        ]]);
                        this.AddWhereClause(query, ["Equals", ["Field", table["idField"]],
                            ["Bind"]
                        ]);
                        var field = this.GetTableField(table, table["idField"]);
                        fieldOrdering.push([field[(0)], table["name"], field[(1)]]);
                        break
                    };
                case "GET":
                    {
                        (query[(0)] = "SelectQuery");
                        query.push(["Select", ["*"]]);
                        break
                    };
                case "PUT":
                    {};
                case "POST":
                    {
                        (query[(0)] = "UpdateQuery");
                        query.push(["Fields", [
                            [attributeName, true]
                        ]]);
                        this.AddWhereClause(query, ["Equals", ["Field", table["idField"]],
                            ["Bind"]
                        ]);
                        var field = this.GetTableField(table, table["idField"]);
                        fieldOrdering.push([field[(0)], table["name"], field[(1)]]);
                        break
                    }
                }
                query.push(["From", table["name"]]);
                switch (this["currentMethod"]) {
                case "GET":
                    {};
                case "DELETE":
                    this.AddWhereClause(query, ["Equals", ["Field", attributeName],
                        ["Boolean", true]
                    ])
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
                        query.push(["Select", ["*"]]);
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
                        }
                        var fields = [];
                        for (var i = (0);
                        (i < table["fields"]["length"]); i++) {
                            var field = table["fields"][i];
                            if (((field[(2)] == "NOT NULL") || ((field[(2)] == "PRIMARY KEY") && (field[(0)] != "Serial")))) {
                                fieldOrdering.push(field);
                                fields.push([field[(1)], "?"])
                            } else {
                                undefined
                            }
                        }
                        query.push(["Fields", fields]);
                        break
                    }
                }
                query.push(["From", table["name"]]);
                break
            }
        };
        return [fieldOrdering]
    }));
    return ServerURIParser
}))