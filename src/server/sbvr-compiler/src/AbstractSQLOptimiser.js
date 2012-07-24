define(["underscore", "Prettify", "ometa/ometa-base"], (function(_, Prettify) {
    {
        var AbstractSQLOptimiser = undefined;
        var AbstractSQLValidator = undefined
    };
    AbstractSQLValidator = objectThatDelegatesTo(OMeta, {
        "Query": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._apply("SelectQuery")
        },
        "SelectQuery": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                query, select, from, where, queryPart;
            query = ["SelectQuery"];
            this._form((function() {
                this._applyWithArgs("exactly", "SelectQuery");
                this._many1((function() {
                    queryPart = this._or((function() {
                        this._pred((select == null));
                        return select = this._apply("Select")
                    }), (function() {
                        return from = this._apply("From")
                    }), (function() {
                        return this._apply("Join")
                    }), (function() {
                        this._pred((where == null));
                        return where = this._apply("Where")
                    }));
                    return query = query.concat(queryPart)
                }));
                this._pred((select != null));
                return this._pred((from != null))
            }));
            return query
        },
        "Select": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                fields;
            this._form((function() {
                this._applyWithArgs("exactly", "Select");
                return this._form((function() {
                    return fields = this._many((function() {
                        return this._apply("Count")
                    }))
                }))
            }));
            return [["Select", fields]]
        },
        "Count": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._form((function() {
                this._applyWithArgs("exactly", "Count");
                return this._applyWithArgs("exactly", "*")
            }))
        },
        "From": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                table, from, as;
            this._form((function() {
                this._applyWithArgs("exactly", "From");
                table = this._apply("anything");
                from = ["From", table];
                return this._opt((function() {
                    as = this._apply("anything");
                    return from.push(as)
                }))
            }));
            return [from]
        },
        "Join": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                table, boolStatement;
            this._form((function() {
                this._applyWithArgs("exactly", "Join");
                this._form((function() {
                    this._applyWithArgs("exactly", "With");
                    return table = this._apply("anything")
                }));
                return this._form((function() {
                    this._applyWithArgs("exactly", "On");
                    return boolStatement = this._apply("BooleanStatement")
                }))
            }));
            return [["Join", ["With", table],
                ["On", boolStatement]
            ]]
        },
        "BooleanStatement": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._apply("Not")
            }), (function() {
                return this._apply("And")
            }), (function() {
                return this._apply("Exists")
            }), (function() {
                return this._apply("Equals")
            }), (function() {
                return this._apply("EqualOrGreater")
            }), (function() {
                return this._apply("Between")
            }))
        },
        "Where": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                boolStatement;
            this._form((function() {
                this._applyWithArgs("exactly", "Where");
                return boolStatement = this._apply("BooleanStatement")
            }));
            return [["Where", boolStatement]]
        },
        "Not": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                boolStatement;
            this._form((function() {
                this._applyWithArgs("exactly", "Not");
                return boolStatement = this._apply("BooleanStatement")
            }));
            return ["Not", boolStatement]
        },
        "And": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                boolStatement1, boolStatement2;
            this._form((function() {
                this._applyWithArgs("exactly", "And");
                boolStatement1 = this._apply("BooleanStatement");
                return boolStatement2 = this._many1((function() {
                    return this._apply("BooleanStatement")
                }))
            }));
            return ["And", boolStatement1].concat(boolStatement2)
        },
        "Exists": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                query;
            this._form((function() {
                this._applyWithArgs("exactly", "Exists");
                return query = this._apply("Query")
            }));
            return ["Exists", query]
        },
        "NotEquals": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                comp1, comp2;
            this._form((function() {
                this._applyWithArgs("exactly", "NotEquals");
                comp1 = this._apply("Comparator");
                return comp2 = this._apply("Comparator")
            }));
            return ["NotEquals", comp1, comp2]
        },
        "Equals": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                comp1, comp2;
            this._form((function() {
                this._applyWithArgs("exactly", "Equals");
                comp1 = this._apply("Comparator");
                return comp2 = this._apply("Comparator")
            }));
            return ["Equals", comp1, comp2]
        },
        "EqualOrGreater": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                comp1, comp2;
            this._form((function() {
                this._applyWithArgs("exactly", "EqualOrGreater");
                comp1 = this._apply("Comparator");
                return comp2 = this._apply("Comparator")
            }));
            return ["EqualOrGreater", comp1, comp2]
        },
        "Between": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                comp1, comp2, comp3;
            this._form((function() {
                this._applyWithArgs("exactly", "Between");
                comp1 = this._apply("Comparator");
                comp2 = this._apply("Comparator");
                return comp3 = this._apply("Comparator")
            }));
            return ["Between", comp1, comp2, comp3]
        },
        "Comparator": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._apply("Query")
            }), (function() {
                return this._apply("Field")
            }), (function() {
                return this._apply("ReferencedField")
            }), (function() {
                return this._apply("Number")
            }), (function() {
                return this._apply("Boolean")
            }))
        },
        "Field": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                table, field;
            this._form((function() {
                this._applyWithArgs("exactly", "Field");
                table = this._apply("anything");
                return field = this._apply("anything")
            }));
            return ["Field", table, field]
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
            return ["ReferencedField", binding, field]
        },
        "Number": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                number;
            this._form((function() {
                this._applyWithArgs("exactly", "Number");
                return number = this._apply("anything")
            }));
            return ["Number", number]
        },
        "Boolean": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                bool;
            this._form((function() {
                this._applyWithArgs("exactly", "Boolean");
                return bool = this._or((function() {
                    return this._apply("true")
                }), (function() {
                    return this._apply("false")
                }))
            }));
            return ["Boolean", bool]
        }
    });
    AbstractSQLOptimiser = objectThatDelegatesTo(AbstractSQLValidator, {
        "Not": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                boolStatement;
            return this._or((function() {
                this._form((function() {
                    this._applyWithArgs("exactly", "Not");
                    return this._or((function() {
                        return this._form((function() {
                            this._applyWithArgs("exactly", "Not");
                            return boolStatement = this._apply("BooleanStatement")
                        }))
                    }), (function() {
                        boolStatement = this._apply("Equals");
                        return (boolStatement[(0)] = "NotEquals")
                    }))
                }));
                this._apply("SetHelped");
                return boolStatement
            }), (function() {
                return this._form((function() {
                    this._applyWithArgs("exactly", "Exists");
                    return this._form((function() {
                        return this._applyWithArgs("exactly", "SelectQuery")
                    }))
                }))
            }), (function() {
                return AbstractSQLValidator._superApplyWithArgs(this, 'Not')
            }))
        },
        "Helped": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._pred((this["helped"] === true));
            return (this["helped"] = false)
        },
        "SetHelped": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (this["helped"] = true)
        },
        "Process": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                boolStatement;
            boolStatement = this._apply("anything");
            boolStatement = this._applyWithArgs("BooleanStatement", boolStatement);
            this._many((function() {
                this._applyWithArgs("Helped", "disableMemoisation");
                return boolStatement = this._applyWithArgs("BooleanStatement", boolStatement)
            }));
            return boolStatement
        }
    });
    (AbstractSQLOptimiser["initialize"] = (function() {
        (this["helped"] = false)
    }));
    return AbstractSQLOptimiser
}))