define(["sbvr-parser/SBVRLibs", "underscore", "ometa/ometa-base", "inflection"], (function(SBVRLibs, _) {
    var SBVRParser = undefined;
    SBVRParser = objectThatDelegatesTo(SBVRLibs, {
        "Bind": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return ["RoleBinding", x, this["ruleVars"][x[(1)]]]
        },
        "letters": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            l = this._many1((function() {
                return this._apply("letter")
            }));
            return l.join("")
        },
        "num": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n;
            return this._or((function() {
                this._apply("spaces");
                n = this._many1((function() {
                    return this._apply("digit")
                }));
                return ["Number", parseInt(n.join(""))]
            }), (function() {
                this._applyWithArgs("token", "one");
                return ["Number", (1)]
            }))
        },
        "Value": function(stopOn) {
            var $elf = this,
                _fromIdx = this.input.idx,
                alphaNum, value;
            value = this._many1((function() {
                this._apply("spaces");
                this._not((function() {
                    return this._applyWithArgs("token", stopOn)
                }));
                this._not((function() {
                    return this._apply("lineStart")
                }));
                alphaNum = this._many1((function() {
                    return this._apply("letterOrDigit")
                }));
                return alphaNum.join("")
            }));
            return value.join("")
        },
        "toSBVREOL": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                s, a, w;
            this._apply("spaces");
            w = this._many((function() {
                this._not((function() {
                    this._apply("spaces");
                    return this._apply("lineStart")
                }));
                s = this._opt((function() {
                    return this._apply("spaces")
                }));
                a = this._many1((function() {
                    this._not((function() {
                        return this._apply("space")
                    }));
                    return this._apply("anything")
                }));
                return s.concat(a).join("")
            }));
            return w.join("")
        },
        "toEOL": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a;
            a = this._many((function() {
                this._not((function() {
                    return (function() {
                        switch (this._apply('anything')) {
                        case "\r":
                            return "\r";
                        case "\n":
                            return "\n";
                        default:
                            throw fail
                        }
                    }).call(this)
                }));
                return this._apply("anything")
            }));
            return a.join("")
        },
        "token": function(x) {
            var $elf = this,
                _fromIdx = this.input.idx,
                s;
            this._apply("spaces");
            s = this._applyWithArgs("seq", x);
            this._lookahead((function() {
                return this._or((function() {
                    return this._apply("space")
                }), (function() {
                    return this._apply("end")
                }))
            }));
            return s
        },
        "addTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            t = this._lookahead((function() {
                return this._many1((function() {
                    return this._apply("termPart")
                }))
            }));
            (this["terms"][t.join(" ")] = t.join(" "));
            return this._apply("Term")
        },
        "Term": function(factTypeSoFar) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("findTerm", factTypeSoFar)
        },
        "findTerm": function(factTypeSoFar, termSoFar) {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            t = this._apply("termPart");
            (termSoFar = ((termSoFar == null) ? t : [termSoFar, t].join(" ")));
            return this._or((function() {
                return this._applyWithArgs("findTerm", factTypeSoFar, termSoFar)
            }), (function() {
                this._pred(this.isTerm(factTypeSoFar, termSoFar));
                return ["Term", this._termForm(factTypeSoFar, termSoFar)]
            }))
        },
        "termPart": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._apply("spaces");
            this._not((function() {
                return this._apply("lineStart")
            }));
            return this._apply("letters")
        },
        "addVerb": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._apply("clearSuggestions");
            return this._applyWithArgs("Verb", true)
        },
        "Verb": function(factTypeSoFar) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("findVerb", factTypeSoFar)
        },
        "findVerb": function(factTypeSoFar, verbSoFar) {
            var $elf = this,
                _fromIdx = this.input.idx,
                v;
            v = this._apply("verbPart");
            (verbSoFar = ((verbSoFar == undefined) ? v : [verbSoFar, v].join(" ")));
            return this._or((function() {
                return this._applyWithArgs("findVerb", factTypeSoFar, verbSoFar)
            }), (function() {
                this._or((function() {
                    return this._pred((factTypeSoFar === true))
                }), (function() {
                    return this._pred(this.isVerb(factTypeSoFar, verbSoFar))
                }));
                return ["Verb", this._verbForm(verbSoFar)]
            }))
        },
        "verbPart": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._apply("spaces");
            this._not((function() {
                return this._apply("lineStart")
            }));
            this._not((function() {
                return this._apply("Term")
            }));
            return this._apply("letters")
        },
        "joinQuant": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("matchForAll", "keyword", ["and", "at", "most"])
        },
        "quant": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                n, m;
            return this._or((function() {
                this._applyWithArgs("keyword", "each");
                return ["UniversalQ"]
            }), (function() {
                this._applyWithArgs("matchForAny", "keyword", ["a", "an", "some"]);
                return ["ExistentialQ"]
            }), (function() {
                this._applyWithArgs("matchForAll", "keyword", ["at", "most"]);
                n = this._apply("num");
                return ["AtMostNQ", ["maxCard", n]]
            }), (function() {
                this._applyWithArgs("matchForAll", "keyword", ["at", "least"]);
                n = this._apply("num");
                return this._or((function() {
                    this._apply("joinQuant");
                    m = this._apply("num");
                    return ["NumericalRangeQ", ["minCard", n], ["maxCard", m]]
                }), (function() {
                    return ["AtLeastNQ", ["minCard", n]]
                }))
            }), (function() {
                this._applyWithArgs("matchForAll", "keyword", ["more", "than"]);
                n = this._apply("num");
                ++n[(1)];
                return ["AtLeastNQ", ["minCard", n]]
            }), (function() {
                this._applyWithArgs("keyword", "exactly");
                n = this._apply("num");
                return ["ExactQ", ["card", n]]
            }))
        },
        "keyword": function(word, noToken) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                this._pred((noToken === true));
                return this._applyWithArgs("seq", word)
            }), (function() {
                this._pred((noToken !== true));
                return this._applyWithArgs("token", word)
            }))
        },
        "addThat": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("keyword", "that")
        },
        "addThe": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("keyword", "the")
        },
        "addComma": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("keyword", ",")
        },
        "addOr": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("keyword", "or")
        },
        "createVar": function(term) {
            var $elf = this,
                _fromIdx = this.input.idx;
            (this["ruleVars"][term[(1)]] = this["ruleVarsCount"]++);
            return ["Variable", ["Number", this["ruleVars"][term[(1)]]], term]
        },
        "checkThat": function(term, termBind) {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, b, c, v, r;
            this._apply("addThat");
            r = this._or((function() {
                this._apply("addThe");
                t = this._apply("Term");
                b = this._applyWithArgs("Bind", t);
                c = [
                    [t], b];
                v = this._applyWithArgs("Verb", c[(0)]);
                (function() {
                    c[(0)].push(v, term);
                    return c.push(termBind)
                }).call(this);
                return this._or((function() {
                    return this._applyWithArgs("ruleBody", c)
                }), (function() {
                    return this._applyWithArgs("atfo", c)
                }))
            }), (function() {
                c = [
                    [term], termBind];
                v = this._applyWithArgs("Verb", c[(0)]);
                c[(0)].push(v);
                return this._or((function() {
                    return this._applyWithArgs("ruleBody", c, true)
                }), (function() {
                    return this._applyWithArgs("atfo", c)
                }))
            }), (function() {
                return this._applyWithArgs("ruleBody", [
                    []
                ])
            }));
            this._opt((function() {
                return this._apply("addComma")
            }));
            return r
        },
        "atfo": function(c) {
            var $elf = this,
                _fromIdx = this.input.idx,
                realFactType;
            realFactType = this._applyWithArgs("isFactType", c[(0)]);
            this._pred(realFactType);
            (c[(0)] = ["FactType"].concat(c[(0)]));
            return ["AtomicFormulation"].concat(c)
        },
        "ruleBody": function(c, exitOnTermFactType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                body, t, tVar, b, thatC, v, r;
            body = this._apply("quant");
            t = this._applyWithArgs("Term", c[(0)]);
            tVar = this._applyWithArgs("createVar", t);
            b = this._applyWithArgs("Bind", t);
            (function() {
                c[(0)].push(t);
                return c.push(b)
            }).call(this);
            this._opt((function() {
                thatC = this._applyWithArgs("checkThat", t, b);
                return tVar.push(thatC)
            }));
            r = this._or((function() {
                v = this._applyWithArgs("Verb", c[(0)]);
                c[(0)].push(v);
                return this._or((function() {
                    return this._applyWithArgs("ruleBody", c, true)
                }), (function() {
                    return this._applyWithArgs("atfo", c)
                }))
            }), (function() {
                this._pred((exitOnTermFactType === true));
                return this._applyWithArgs("atfo", c)
            }));
            body.push(tVar, r);
            return body
        },
        "modRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                r;
            this._applyWithArgs("token", "It");
            this._applyWithArgs("token", "is");
            r = this._or((function() {
                this._applyWithArgs("token", "obligatory");
                return ["ObligationF"]
            }), (function() {
                this._applyWithArgs("token", "necessary");
                return ["NecessityF"]
            }), (function() {
                this._applyWithArgs("token", "prohibited");
                return ["ObligationF", ["LogicalNegation"]]
            }), (function() {
                this._applyWithArgs("token", "impossible");
                return ["NecessityF", ["LogicalNegation"]]
            }), (function() {
                this._applyWithArgs("token", "not");
                this._applyWithArgs("token", "possible");
                return ["NecessityF", ["LogicalNegation"]]
            }), (function() {
                this._applyWithArgs("token", "possible");
                return ["PossibilityF"]
            }), (function() {
                this._applyWithArgs("token", "permissible");
                return ["PermissibilityF"]
            }));
            this._applyWithArgs("token", "that");
            return r
        },
        "startRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._applyWithArgs("token", "R:")
            }), (function() {
                return this._applyWithArgs("token", "Rule:")
            }))
        },
        "newRule": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                ruleText, r, q;
            this._apply("startRule");
            this._apply("spaces");
            ruleText = this._lookahead((function() {
                return this._apply("toSBVREOL")
            }));
            (this["ruleVarsCount"] = (0));
            r = this._apply("modRule");
            q = this._applyWithArgs("ruleBody", [
                []
            ]);
            ((r["length"] == (2)) ? (r[(1)][(1)] = q) : (r[(1)] = q));
            return ["Rule", r, ["text", ruleText]]
        },
        "terb": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t, v;
            t = this._apply("Term");
            v = this._apply("addVerb");
            return [t, v]
        },
        "startFactType": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._applyWithArgs("token", "F:")
            }), (function() {
                return this._applyWithArgs("token", "Fact type:")
            }))
        },
        "newFactType": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                factType, t, v;
            this._apply("startFactType");
            factType = [];
            this._many1((function() {
                t = this._apply("Term");
                v = this._apply("addVerb");
                return factType.push(t, v)
            }));
            this._opt((function() {
                t = this._apply("Term");
                return factType.push(t)
            }));
            this._applyWithArgs("AddFactType", factType, factType);
            factType.push([]);
            return ["FactType"].concat(factType)
        },
        "startTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._applyWithArgs("token", "T:")
            }), (function() {
                return this._applyWithArgs("token", "Term:")
            }))
        },
        "newTerm": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            this._apply("startTerm");
            this._apply("clearSuggestions");
            t = this._apply("addTerm");
            t.push([]);
            return t
        },
        "attribute": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                currentLine, attrName, attrVal;
            currentLine = this["lines"][(this["lines"]["length"] - (1))];
            attrName = this._applyWithArgs("allowedAttrs", currentLine[(0)]);
            attrName = attrName.replace(new RegExp(" ", "g"), "");
            attrVal = this._applyWithArgs("ApplyFirstExisting", [("attr" + attrName), "defaultAttr"], [currentLine]);
            return (function() {
                var lastLine = this["lines"].pop();
                lastLine[(lastLine["length"] - (1))].push([attrName, attrVal]);
                return lastLine
            }).call(this)
        },
        "allowedAttrs": function(termOrFactType) {
            var $elf = this,
                _fromIdx = this.input.idx,
                attrName;
            attrName = this._applyWithArgs("matchForAny", "seq", this["possMap"]["allowedAttrs"].call(this, termOrFactType));
            return attrName.replace(":", "")
        },
        "defaultAttr": function(currentLine) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._apply("toSBVREOL")
        },
        "attrDefinition": function(currentLine) {
            var $elf = this,
                _fromIdx = this.input.idx,
                c, t, tVar, b, thatC, name, names;
            return this._or((function() {
                (this["ruleVarsCount"] = (0));
                c = [
                    []
                ];
                t = this._apply("Term");
                tVar = this._applyWithArgs("createVar", t);
                b = this._applyWithArgs("Bind", t);
                (function() {
                    c[(0)].push(t);
                    return c.push(b)
                }).call(this);
                thatC = this._applyWithArgs("checkThat", t, b);
                tVar.push(thatC);
                return tVar
            }), (function() {
                name = this._applyWithArgs("Value", "or");
                names = this._many((function() {
                    this._apply("addOr");
                    this._apply("clearSuggestions");
                    return this._applyWithArgs("Value", "or")
                }));
                names.unshift(name);
                return ["Enum", names]
            }))
        },
        "attrConceptType": function(currentLine) {
            var $elf = this,
                _fromIdx = this.input.idx,
                termName, t;
            termName = currentLine[(1)];
            this._pred((!this["conceptTypes"].hasOwnProperty(termName)));
            t = this._apply("Term");
            this._pred((termName != t[(1)]));
            (this["conceptTypes"][termName] = t[(1)]);
            return t
        },
        "attrSynonym": function(currentLine) {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            t = this._apply("addTerm");
            (this["terms"][t[(1)]] = currentLine[(1)]);
            return t
        },
        "attrSynonymousForm": function(currentLine) {
            var $elf = this,
                _fromIdx = this.input.idx,
                factType, t, v;
            factType = [];
            this._many1((function() {
                t = this._apply("Term");
                v = this._apply("addVerb");
                return factType.push(t, v)
            }));
            this._opt((function() {
                t = this._apply("Term");
                return factType.push(t)
            }));
            this._applyWithArgs("AddFactType", factType, currentLine.slice((1), (-(1))));
            factType.push([]);
            return factType
        },
        "attrTermForm": function(currentLine) {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            t = this._apply("addTerm");
            (function() {
                for (var i = (0);
                (i < currentLine["length"]); i++) {
                    if ((currentLine[i][(0)] == "Term")) {
                        var factType = [t, ["Verb", "has"], currentLine[i]];
                        this.AddFactType(factType, factType)
                    } else {
                        undefined
                    }
                }
            }).call(this);
            return t
        },
        "startComment": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._applyWithArgs("exactly", "-");
            this._applyWithArgs("exactly", "-");
            return "--"
        },
        "newComment": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._apply("startComment");
            return this._apply("toEOL")
        },
        "terminator": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._apply("spaces");
            return this._applyWithArgs("keyword", ".", true)
        },
        "lineStart": function(lineType) {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._apply("startTerm")
            }), (function() {
                return this._apply("startFactType")
            }), (function() {
                return this._apply("startRule")
            }), (function() {
                return this._apply("allowedAttrs")
            }), (function() {
                return this._apply("startComment")
            }))
        },
        "line": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            this._apply("spaces");
            return this._or((function() {
                l = this._or((function() {
                    return this._apply("newTerm")
                }), (function() {
                    return this._apply("newFactType")
                }), (function() {
                    return this._apply("newRule")
                }), (function() {
                    return this._apply("attribute")
                }));
                this._opt((function() {
                    return this._apply("terminator")
                }));
                this._apply("clearSuggestions");
                this._apply("spaces");
                this._lookahead((function() {
                    return this._or((function() {
                        return this._apply("lineStart")
                    }), (function() {
                        return this._apply("end")
                    }))
                }));
                this["lines"].push(l);
                return l
            }), (function() {
                return this._apply("newComment")
            }))
        },
        "expr": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._many((function() {
                return this._apply("line")
            }));
            this._apply("end");
            return this["lines"]
        }
    });
    (SBVRParser["keyTokens"] = ["startTerm", "startFactType", "startRule", "newComment", "Term", "modRule", "Verb", "keyword", "allowedAttrs", "num", "Value"]);
    (SBVRParser["clearSuggestions"] = (function() {}));
    (SBVRParser["initialize"] = (function() {
        this.reset()
    }));
    (SBVRParser["_baseTerm"] = (function(factTypeSoFar, term) {
        if (this["terms"].hasOwnProperty(term)) {
            return this["terms"][term]
        } else {
            undefined
        };
        if (this["terms"].hasOwnProperty(term.singularize())) {
            return this["terms"][term.singularize()]
        } else {
            undefined
        };
        return false
    }));
    (SBVRParser["isTerm"] = (function(factTypeSoFar, term) {
        var terms = this["possMap"]["Term"].call(this, factTypeSoFar);
        (term = this._baseTerm(factTypeSoFar, term));
        return ((term !== false) && (($.inArray(term, terms) !== (-(1))) || ($.inArray(term.singularize(), terms) !== (-(1)))))
    }));
    (SBVRParser["_termForm"] = (function(factTypeSoFar, term) {
        (term = this._baseTerm(factTypeSoFar, term));
        return (($.inArray(term.singularize(), this["possMap"]["Term"].call(this, factTypeSoFar)) !== (-(1))) ? term.singularize() : term)
    }));
    (SBVRParser["isVerb"] = (function(factTypeSoFar, verb) {
        (verb = ["Verb", this._verbForm(verb)]);
        var currentLevel = this._traverseFactType(factTypeSoFar);
        if ((currentLevel === false)) {
            return false
        } else {
            undefined
        };
        if (currentLevel.hasOwnProperty(verb)) {
            return true
        } else {
            undefined
        };
        if ((currentLevel.hasOwnProperty("__valid") && (currentLevel["__valid"] === true))) {
            return this.isVerb([], verb)
        } else {
            undefined
        };
        return false
    }));
    (SBVRParser["_verbForm"] = (function(verb) {
        if ((verb.slice((0), (4)) == "are ")) {
            return ("is " + verb.slice((4)))
        } else {
            undefined
        };
        if ((verb == "are")) {
            return "is"
        } else {
            undefined
        };
        if ((verb == "have")) {
            return "has"
        } else {
            undefined
        };
        return verb
    }));
    (SBVRParser["isFactType"] = (function(factType) {
        var currentLevel = this._traverseFactType(factType);
        if ((currentLevel === false)) {
            return false
        } else {
            undefined
        };
        return currentLevel["__valid"]
    })); {
        var removeVerbRegex = new RegExp(("^" + ["Verb", ""].toString()));
        var removeTermRegex = new RegExp(("^" + ["Term", ""].toString()));
        var allowedAttrLists = ["Database ID Field:", "Database Name Field:", "Database Table Name:", "Dictionary Basis:", "Example:", "General Concept:", "Namespace URI:", "Necessity:", "Note:", "Possibility:", "Reference Scheme:", "See:", "Source:", "Subject Field:"]
    };
    (allowedAttrLists = ({
        "Term": ["Concept Type:", "Definition:", "Synonym:"].concat(allowedAttrLists),
        "FactType": ["Synonymous Form:", "Term Form:"].concat(allowedAttrLists),
        "Rule": []
    }));
    (SBVRParser["reset"] = (function() {
        SBVRLibs["initialize"].call(this);
        (this["terms"] = ({}));
        (this["possMap"] = ({
            "clearSuggestions": [],
            "startTerm": ["Term:     "],
            "startFactType": ["Fact type:"],
            "startRule": ["Rule:     "],
            "Term": (function(factTypeSoFar) {
                if (((factTypeSoFar == null) || (factTypeSoFar["length"] == (0)))) {
                    return _.keys(this["terms"])
                } else {
                    undefined
                }; {
                    var term = undefined;
                    var currentLevel = this._traverseFactType(factTypeSoFar);
                    var terms = []
                };
                for (term in currentLevel) {
                    if (currentLevel.hasOwnProperty(term)) {
                        if (removeTermRegex.test(term)) {
                            terms.push(term.replace(removeTermRegex, ""))
                        } else {
                            undefined
                        }
                    } else {
                        undefined
                    }
                };
                return terms
            }),
            "Verb": (function(factTypeSoFar) {
                {
                    var verb = undefined;
                    var currentLevel = this._traverseFactType(factTypeSoFar);
                    var verbs = []
                };
                for (verb in currentLevel) {
                    if (currentLevel.hasOwnProperty(verb)) {
                        if (removeVerbRegex.test(verb)) {
                            verbs.push(verb.replace(removeVerbRegex, ""))
                        } else {
                            undefined
                        }
                    } else {
                        undefined
                    }
                };
                return verbs
            }),
            "allowedAttrs": (function(termOrFactType) {
                if (allowedAttrLists.hasOwnProperty(termOrFactType)) {
                    return allowedAttrLists[termOrFactType]
                } else {
                    if ((termOrFactType == null)) {
                        return allowedAttrLists["Term"].concat(allowedAttrLists["FactType"])
                    } else {
                        undefined
                    }
                };
                return []
            }),
            "modRule": ["It is obligatory that", "It is necessary that", "It is prohibited that", "It is impossible that", "It is not possible that", "It is possible that", "It is permissible that"],
            "quant": ["each", "a", "an", "some", "at most", "at least", "more than", "exactly"],
            "joinQuant": ["and at most"],
            "num": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "one"],
            "addThat": ["that", "that the"],
            "addThe": ["the"],
            "addComma": [","],
            "addOr": ["or"],
            "terminator": ["."]
        }));
        (this["ruleVars"] = ({}));
        (this["ruleVarsCount"] = (0));
        (this["lines"] = ["Model"])
    }));
    (SBVRParser["equals"] = (function(compareTo) {
        if ((!_.isEqual(this["terms"], compareTo["terms"]))) {
            return false
        } else {
            undefined
        };
        if ((!_.isEqual(this["conceptTypes"], compareTo["conceptTypes"]))) {
            return false
        } else {
            undefined
        };
        if ((!_.isEqual(this["factTypes"], compareTo["factTypes"]))) {
            return false
        } else {
            undefined
        };
        return true
    }));
    (SBVRParser["matchForAny"] = (function(rule, arr) {
        var origInput = this["input"];
        for (var idx = (0);
        (idx < arr["length"]); idx++) {
            try {
                (this["input"] = origInput);
                return this["_applyWithArgs"].call(this, rule, arr[idx])
            } catch (f) {
                if ((f != fail)) {
                    console.log(f["stack"]);
                    throw f
                } else {
                    undefined
                }
            } finally {
                undefined
            }
        };
        throw fail
    }));
    (SBVRParser["matchForAll"] = (function(rule, arr) {
        var ret = undefined;
        for (var idx = (0);
        (idx < arr["length"]); idx++) {
            (ret = this["_applyWithArgs"].call(this, rule, arr[idx]))
        };
        return ret
    }));
    (SBVRParser["exactly"] = (function(wanted) {
        if ((wanted.toLowerCase() === this._apply("anything").toLowerCase())) {
            return wanted
        } else {
            undefined
        };
        throw fail
    }));
    return SBVRParser
}))