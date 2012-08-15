define(['underscore', 'ometa-core'], (function(_) {
    var primitives = ({
        'Integer': true,
        'Short Text': true,
        'Long Text': true,
        'Real': true,
        'Date': true,
        'Date Time': true,
        'Time': true,
        'Interval': true
    });
    var SBVRLibs = objectThatDelegatesTo(OMeta, {});
    (SBVRLibs['initialize'] = (function() {
        (this['factTypes'] = ({}));
        (this['conceptTypes'] = ({}))
    }));
    (SBVRLibs['ApplyFirstExisting'] = (function(rules, ruleArgs) {
        if ((ruleArgs == null)) {
            (ruleArgs = [])
        } else {
            undefined
        };
        ruleArgs.unshift('');
        for (var i = (0);
        (i < rules['length']); i++) {
            if ((this[rules[i]] != undefined)) {
                if (((ruleArgs != null) && (ruleArgs['length'] > (0)))) {
                    (ruleArgs[(0)] = rules[i]);
                    return this['_applyWithArgs'].apply(this, ruleArgs)
                } else {
                    undefined
                };
                return this._apply(rules[i], ruleArgs)
            } else {
                undefined
            }
        }
    }));
    (SBVRLibs['IsPrimitive'] = (function(termName) {
        if (primitives.hasOwnProperty(termName)) {
            return termName
        } else {
            undefined
        };
        if ((this['conceptTypes'].hasOwnProperty(termName) && (termName = this['conceptTypes'][termName]))) {
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
    (SBVRLibs['AddFactType'] = (function(factType, realFactType) {
        (realFactType = _.extend([], realFactType));
        this._traverseFactType(factType, realFactType);
        if (((factType['length'] == (3)) && (factType[(1)][(1)] == 'has'))) {
            this._traverseFactType([factType[(2)],
                ['Verb', 'is of'], factType[(0)]
            ], realFactType)
        } else {
            if (((factType['length'] == (3)) && (factType[(1)][(1)] == 'is of'))) {
                this._traverseFactType([factType[(2)],
                    ['Verb', 'has'], factType[(0)]
                ], realFactType)
            } else {
                undefined
            }
        }
    }));
    (SBVRLibs['_traverseFactType'] = (function(factType, create) {
        var $elf = this,
            traverseRecurse = (function(currentFactTypePart, remainingFactType, currentLevel) {
                if ((currentFactTypePart == null)) {
                    if (create) {
                        (currentLevel['__valid'] = create)
                    } else {
                        undefined
                    };
                    return currentLevel
                } else {
                    undefined
                };
                var finalLevel, finalLevels = ({});
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
                if (((!create) && (currentFactTypePart[(0)] == 'Term'))) {
                    while ($elf['conceptTypes'].hasOwnProperty(currentFactTypePart[(1)])) {
                        (currentFactTypePart = ['Term', $elf['conceptTypes'][currentFactTypePart[(1)]]]);
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
            });
        return traverseRecurse(factType[(0)], factType.slice((1)), this['factTypes'])
    }));
    (SBVRLibs['ActualFactType'] = (function(factType) {
        var traverseInfo = this._traverseFactType(factType);
        if (((traverseInfo === false) || (!traverseInfo.hasOwnProperty('__valid')))) {
            return false
        } else {
            undefined
        };
        return traverseInfo['__valid']
    }));
    (SBVRLibs['IsChild'] = (function(child, parent) {
        do {
            if ((child == parent)) {
                return true
            } else {
                undefined
            }
        } while ((this['conceptTypes'].hasOwnProperty(child) && (child = this['conceptTypes'][child])));
        return false
    }));
    (SBVRLibs['FactTypeRootTerm'] = (function(term, actualFactType) {
        for (var i = (0);
        (i < actualFactType['length']); i++) {
            if (this.IsChild(term, actualFactType[i][(1)])) {
                return actualFactType[i][(1)]
            } else {
                undefined
            }
        };
        return false
    }));
    (SBVRLibs['FactTypeRootTerms'] = (function(factType, actualFactType) {
        var rootTerms = [],
            rootTermIndex = (0);
        for (var i = (0);
        (i < actualFactType['length']);
        (i += (2))) {
            (rootTerms[rootTermIndex++] = this.FactTypeRootTerm(factType[i][(1)], actualFactType))
        };
        return rootTerms
    }));
    (SBVRLibs['GetResourceName'] = (function(termOrFactType) {
        var i = (0),
            resource = [];
        if (_.isString(termOrFactType)) {
            return termOrFactType.replace(new RegExp(' ', 'g'), '_')
        } else {
            for (undefined;
            (i < termOrFactType['length']); i++) {
                resource.push(termOrFactType[i][(1)].replace(new RegExp(' ', 'g'), '_'))
            };
            return resource.join('-')
        }
    }));
    (SBVRLibs['GetTableField'] = (function(table, fieldName) {
        (fieldID = this.GetTableFieldID(table, fieldName));
        if ((fieldID === false)) {
            return false
        } else {
            undefined
        };
        return table['fields'][fieldID]
    }));
    (SBVRLibs['GetTableFieldID'] = (function(table, fieldName) {
        (tableFields = table['fields']);
        for (var i = (0);
        (i < tableFields['length']); i++) {
            if ((tableFields[i][(1)] == fieldName)) {
                return i
            } else {
                undefined
            }
        };
        return false
    }));
    return SBVRLibs
}))