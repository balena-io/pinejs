define(["ometa/ometa-base"], (function() {
    {
        var AbstractSQLRules2SQL = undefined;
        var comparisons = ({
            "Equals": " = ",
            "EqualOrGreater": " >= ",
            "NotEquals": " != "
        })
    };
    AbstractSQLRules2SQL = objectThatDelegatesTo(OMeta, {
        "NestedIndent": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (indent + "\t")
        },
        "Not": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                nestedIndent, ruleBody, notStatement;
            nestedIndent = this._applyWithArgs("NestedIndent", indent);
            this._form((function() {
                this._applyWithArgs("exactly", "Not");
                return notStatement = this._or((function() {
                    ruleBody = this._applyWithArgs("Exists", indent);
                    return ("NOT " + ruleBody)
                }), (function() {
                    ruleBody = this._applyWithArgs("RuleBody", nestedIndent);
                    return (((("NOT (" + nestedIndent) + ruleBody) + indent) + ")")
                }))
            }));
            return notStatement
        },
        "Exists": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                x, ruleBody;
            this._form((function() {
                x = this._applyWithArgs("exactly", "Exists");
                return ruleBody = this._applyWithArgs("Query", indent)
            }));
            return ("EXISTS " + ruleBody)
        },
        "Query": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                noBrackets, indent, origIndent, query;
            this._or((function() {
                this._pred((!indent));
                noBrackets = true;
                return indent = "\n"
            }), (function() {
                origIndent = indent;
                return indent = this._applyWithArgs("NestedIndent", indent)
            }));
            query = this._or((function() {
                return this._applyWithArgs("SelectQuery", indent)
            }), (function() {
                return this._applyWithArgs("InsertQuery", indent)
            }), (function() {
                return this._applyWithArgs("UpdateQuery", indent)
            }), (function() {
                return this._applyWithArgs("DeleteQuery", indent)
            }), (function() {
                return this._applyWithArgs("UpsertQuery", indent)
            }));
            this._opt((function() {
                this._pred((!noBrackets));
                return query = (((("(" + indent) + query) + origIndent) + ")")
            }));
            return query
        },
        "SelectQuery": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                nestedIndent, tables, fields, table, where, orderBy;
            nestedIndent = this._applyWithArgs("NestedIndent", indent);
            tables = [];
            this._form((function() {
                this._applyWithArgs("exactly", "SelectQuery");
                return this._many((function() {
                    return this._form((function() {
                        return this._or((function() {
                            return fields = this._apply("Select")
                        }), (function() {
                            table = this._apply("Table");
                            return tables.push(table)
                        }), (function() {
                            where = this._applyWithArgs("Where", indent);
                            return where = ((indent + "WHERE ") + where)
                        }), (function() {
                            orderBy = this._applyWithArgs("OrderBy", indent);
                            return orderBy = ((indent + "ORDER BY ") + orderBy)
                        }))
                    }))
                }))
            }));
            return (((((("SELECT " + fields.join(", ")) + indent) + "FROM ") + tables.join(("," + nestedIndent))) + ((where != null) ? where : "")) + ((orderBy != null) ? orderBy : ""))
        },
        "DeleteQuery": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                tables, table, where;
            tables = [];
            this._form((function() {
                this._applyWithArgs("exactly", "DeleteQuery");
                return this._many((function() {
                    return this._form((function() {
                        return this._or((function() {
                            table = this._apply("Table");
                            return tables.push(table)
                        }), (function() {
                            where = this._applyWithArgs("Where", indent);
                            return where = ((indent + "WHERE ") + where)
                        }))
                    }))
                }))
            }));
            return ((("DELETE FROM " + tables.join(", ")) + indent) + ((where != null) ? where : ""))
        },
        "InsertBody": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                tables, fieldValues, table;
            tables = [];
            this._many((function() {
                return this._form((function() {
                    return this._or((function() {
                        return fieldValues = this._apply("Fields")
                    }), (function() {
                        table = this._apply("Table");
                        return tables.push(table)
                    }))
                }))
            }));
            return (((((((("INSERT INTO " + tables.join(", ")) + " (") + fieldValues[(0)].join(", ")) + ")") + indent) + " VALUES (") + fieldValues[(1)].join(", ")) + ")")
        },
        "UpdateBody": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                tables, fieldValues, table, where, sets;
            tables = [];
            this._many((function() {
                return this._form((function() {
                    return this._or((function() {
                        return fieldValues = this._apply("Fields")
                    }), (function() {
                        table = this._apply("Table");
                        return tables.push(table)
                    }), (function() {
                        where = this._applyWithArgs("Where", indent);
                        return where = ((indent + "WHERE ") + where)
                    }))
                }))
            }));
            sets = [];
            (function() {
                for (var i = (0);
                (i < fieldValues[(0)]["length"]); i++) {
                    (sets[i] = ((fieldValues[(0)][i] + " = ") + fieldValues[(1)][i]))
                }
            }).call(this);
            return ((((("UPDATE " + tables.join(", ")) + indent) + " SET ") + sets.join(("," + indent))) + ((where != null) ? where : ""))
        },
        "UpsertQuery": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                tables, insert, update;
            tables = [];
            this._form((function() {
                this._applyWithArgs("exactly", "UpsertQuery");
                insert = this._lookahead((function() {
                    return this._applyWithArgs("InsertBody", indent)
                }));
                return update = this._applyWithArgs("UpdateBody", indent)
            }));
            return [insert, update]
        },
        "InsertQuery": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                insert;
            this._form((function() {
                this._applyWithArgs("exactly", "InsertQuery");
                return insert = this._applyWithArgs("InsertBody", indent)
            }));
            return insert
        },
        "UpdateQuery": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                update;
            this._form((function() {
                this._applyWithArgs("exactly", "UpdateQuery");
                return update = this._applyWithArgs("UpdateBody", indent)
            }));
            return update
        },
        "Null": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                next;
            next = this._apply("anything");
            this._pred((next === null));
            return null
        },
        "Fields": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                fields, values, field, value;
            this._applyWithArgs("exactly", "Fields");
            fields = [];
            values = [];
            this._form((function() {
                return this._many1((function() {
                    return this._form((function() {
                        field = this._apply("anything");
                        fields.push((("\"" + field) + "\""));
                        value = this._or((function() {
                            return (function() {
                                switch (this._apply('anything')) {
                                case "?":
                                    return "?";
                                default:
                                    throw fail
                                }
                            }).call(this)
                        }), (function() {
                            this._apply("true");
                            return (1)
                        }), (function() {
                            this._apply("false");
                            return (0)
                        }), (function() {
                            this._apply("Null");
                            return "NULL"
                        }), (function() {
                            value = this._apply("anything");
                            return (("\'" + value) + "\'")
                        }));
                        return values.push(value)
                    }))
                }))
            }));
            return [fields, values]
        },
        "Select": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                fields, field;
            this._applyWithArgs("exactly", "Select");
            fields = [];
            this._form((function() {
                return this._or((function() {
                    this._apply("end");
                    return fields.push("1")
                }), (function() {
                    return this._many((function() {
                        return this._or((function() {
                            return this._form((function() {
                                this._applyWithArgs("exactly", "Count");
                                this._applyWithArgs("exactly", "*");
                                field = "COUNT(*)";
                                return fields.push(field)
                            }))
                        }), (function() {
                            return (function() {
                                switch (this._apply('anything')) {
                                case "*":
                                    return fields.push("*");
                                default:
                                    throw fail
                                }
                            }).call(this)
                        }), (function() {
                            this._apply("Null");
                            return fields.push("NULL")
                        }), (function() {
                            field = this._apply("anything");
                            return fields.push((("\"" + field) + "\""))
                        }))
                    }))
                }))
            }));
            return fields
        },
        "Table": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                table, alias;
            this._applyWithArgs("exactly", "From");
            table = this._apply("anything");
            alias = [];
            this._opt((function() {
                alias = this._apply("anything");
                return alias = [(("\"" + alias) + "\"")]
            }));
            return [(("\"" + table) + "\"")].concat(alias).join(" AS ")
        },
        "Where": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "Where");
            return this._applyWithArgs("RuleBody", indent)
        },
        "OrderBy": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                orders, order, field;
            this._applyWithArgs("exactly", "OrderBy");
            orders = [];
            this._many1((function() {
                return this._form((function() {
                    order = (function() {
                        switch (this._apply('anything')) {
                        case "ASC":
                            return "ASC";
                        case "DESC":
                            return "DESC";
                        default:
                            throw fail
                        }
                    }).call(this);
                    field = this._apply("Field");
                    return orders.push(((field + " ") + order))
                }))
            }));
            return orders.join(", ")
        },
        "Field": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                field;
            this._form((function() {
                this._applyWithArgs("exactly", "Field");
                return field = this._apply("anything")
            }));
            return (("\"" + field) + "\"")
        },
        "ReferencedField": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                binding, field;
            this._form((function() {
                this._applyWithArgs("exactly", "ReferencedField");
                binding = this._apply("anything");
                return field = this._apply("anything")
            }));
            return (((("\"" + binding) + "\".\"") + field) + "\"")
        },
        "Number": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                number;
            this._form((function() {
                this._applyWithArgs("exactly", "Number");
                return number = this._apply("anything")
            }));
            return number
        },
        "Boolean": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                bool;
            this._form((function() {
                this._applyWithArgs("exactly", "Boolean");
                return bool = this._or((function() {
                    this._apply("true");
                    return (1)
                }), (function() {
                    this._apply("false");
                    return (2)
                }))
            }));
            return bool
        },
        "Value": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                value;
            this._form((function() {
                this._applyWithArgs("exactly", "Value");
                return value = this._apply("anything")
            }));
            return (("\'" + value) + "\'")
        },
        "And": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                ruleBodies;
            this._form((function() {
                this._applyWithArgs("exactly", "And");
                return ruleBodies = this._many((function() {
                    return this._applyWithArgs("RuleBody", indent)
                }))
            }));
            return ruleBodies.join(" AND ")
        },
        "Comparison": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                comparison, a, b;
            this._form((function() {
                comparison = (function() {
                    switch (this._apply('anything')) {
                    case "Equals":
                        return "Equals";
                    case "EqualOrGreater":
                        return "EqualOrGreater";
                    case "NotEquals":
                        return "NotEquals";
                    default:
                        throw fail
                    }
                }).call(this);
                a = this._applyWithArgs("RuleBody", indent);
                return b = this._applyWithArgs("RuleBody", indent)
            }));
            return ((a + comparisons[comparison]) + b)
        },
        "Between": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                val, a, b;
            this._form((function() {
                this._applyWithArgs("exactly", "Between");
                val = this._applyWithArgs("Comparator", indent);
                a = this._applyWithArgs("Comparator", indent);
                return b = this._applyWithArgs("Comparator", indent)
            }));
            return ((((val + " BETWEEN ") + a) + " AND ") + b)
        },
        "Comparator": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._applyWithArgs("Query", indent)
            }), (function() {
                return this._apply("Field")
            }), (function() {
                return this._apply("ReferencedField")
            }), (function() {
                return this._apply("Number")
            }), (function() {
                return this._apply("Boolean")
            }), (function() {
                return this._apply("Value")
            }))
        },
        "RuleBody": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._applyWithArgs("Comparator", indent)
            }), (function() {
                return this._applyWithArgs("Not", indent)
            }), (function() {
                return this._applyWithArgs("Exists", indent)
            }), (function() {
                return this._applyWithArgs("Comparison", indent)
            }), (function() {
                return this._applyWithArgs("Between", indent)
            }), (function() {
                return this._applyWithArgs("And", indent)
            }))
        },
        "Process": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                ruleBody;
            ruleBody = this._applyWithArgs("RuleBody", "\n");
            return (("SELECT " + ruleBody) + " AS \"result\";")
        }
    });
    var primitives = ({
        "integer": true
    });
    return AbstractSQLRules2SQL
}))