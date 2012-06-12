define(["underscore", "ometa/ometa-base"], (function(_) {
    var SBVRLibs = undefined;
    SBVRLibs = objectThatDelegatesTo(OMeta, {});
    (SBVRLibs["initialize"] = (function() {
        (this["factTypes"] = ({}));
        (this["conceptTypes"] = ({}))
    }));
    (SBVRLibs["ApplyFirstExisting"] = (function(rules, ruleArgs) {
        if ((ruleArgs == null)) {
            (ruleArgs = [])
        } else {
            undefined
        };
        for (var i = (0);
        (i < rules["length"]); i++) {
            if ((this[rules[i]] != undefined)) {
                if (((ruleArgs != null) && (ruleArgs["length"] > (0)))) {
                    ruleArgs.unshift(rules[i]);
                    return this["_applyWithArgs"].apply(this, ruleArgs)
                } else {
                    undefined
                };
                return this._apply(rules[i], ruleArgs)
            } else {
                undefined
            }
        }
    }));
    (SBVRLibs["AddFactType"] = (function(factType, realFactType) {
        (realFactType = _.extend([], realFactType));
        this._traverseFactType(factType, realFactType);
        if (((factType["length"] == (3)) && (factType[(1)][(1)] == "has"))) {
            this._traverseFactType([factType[(2)],
                ["verb", "is of"], factType[(0)]
            ], realFactType)
        } else {
            if (((factType["length"] == (3)) && (factType[(1)][(1)] == "is of"))) {
                this._traverseFactType([factType[(2)],
                    ["verb", "has"], factType[(0)]
                ], realFactType)
            } else {
                undefined
            }
        }
    }));
    (SBVRLibs["_traverseFactType"] = (function(factType, create) {
        {
            var $elf = this;
            var traverseRecurse = (function(currentFactTypePart, remainingFactType, currentLevel) {
                if ((currentFactTypePart == null)) {
                    if (create) {
                        (currentLevel["__valid"] = create)
                    } else {
                        undefined
                    };
                    return currentLevel
                } else {
                    undefined
                }; {
                    var finalLevel = undefined;
                    var finalLevels = ({})
                };
                if ((currentLevel.hasOwnProperty(currentFactTypePart) || (create && (currentLevel[currentFactTypePart] = ({}))))) {
                    (finalLevel = traverseRecurse(remainingFactType[(0)], remainingFactType.slice((1)), currentLevel[currentFactTypePart]));
                    if ((finalLevel != false)) {
                        _.extend(finalLevels, finalLevel)
                    } else {
                        undefined
                    }
                } else {
                    undefined
                };
                if (((!create) && (currentFactTypePart[(0)] == "Term"))) {
                    while ($elf["conceptTypes"].hasOwnProperty(currentFactTypePart[(1)])) {
                        (currentFactTypePart = ["Term", $elf["conceptTypes"][currentFactTypePart[(1)]]]);
                        if (currentLevel.hasOwnProperty(currentFactTypePart)) {
                            (finalLevel = traverseRecurse(remainingFactType[(0)], remainingFactType.slice((1)), currentLevel[currentFactTypePart]));
                            if ((finalLevel !== false)) {
                                _.extend(finalLevels, finalLevel)
                            } else {
                                undefined
                            }
                        } else {
                            undefined
                        }
                    }
                } else {
                    undefined
                };
                return ((_.isEmpty(finalLevels) === true) ? false : finalLevels)
            })
        };
        return traverseRecurse(factType[(0)], factType.slice((1)), this["factTypes"])
    }));
    (SBVRLibs["ActualFactType"] = (function(factType) {
        var traverseInfo = this._traverseFactType(factType);
        if (((traverseInfo === false) || (!traverseInfo.hasOwnProperty("__valid")))) {
            return false
        } else {
            undefined
        };
        return traverseInfo["__valid"]
    }));
    (SBVRLibs["FactTypeRootTerms"] = (function(factType, actualFactType) {
        {
            var $elf = this;
            var rootTerms = [];
            var rootTermIndex = (0)
        };
        for (var i = (0);
        (i < actualFactType["length"]);
        (i += (2))) {
            if ((factType[i][(1)] != actualFactType[i][(1)])) {
                for (var j = (0);
                (j < actualFactType["length"]);
                (j++ && (rootTerms["length"] == rootTermIndex))) {
                    var termName = factType[i][(1)];
                    if ((termName != actualFactType[j][(1)])) {
                        while ($elf["conceptTypes"].hasOwnProperty(termName)) {
                            (termName = $elf["conceptTypes"][termName]);
                            if ((termName == actualFactType[j][(1)])) {
                                (rootTerms[rootTermIndex] = termName);
                                break
                            } else {
                                undefined
                            }
                        }
                    } else {
                        (rootTerms[rootTermIndex] = termName);
                        break
                    }
                }
            } else {
                (rootTerms[rootTermIndex] = factType[i][(1)])
            };
            rootTermIndex++
        };
        return rootTerms
    }));
    return SBVRLibs
}))