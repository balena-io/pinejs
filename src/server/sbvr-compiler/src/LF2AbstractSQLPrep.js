define(["sbvr-compiler/LFOptimiser"], (function(LFOptimiser) {
    var LF2AbstractSQLPrep = undefined;
    LF2AbstractSQLPrep = objectThatDelegatesTo(LFOptimiser, {
        "univQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                v, xs;
            v = this._applyWithArgs("token", "var");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            this._apply("SetHelped");
            return ["neg", ["existQ", v, ["neg"].concat(xs)]]
        },
        "atMostQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                a, v, xs;
            a = this._applyWithArgs("token", "maxCard");
            v = this._applyWithArgs("token", "var");
            xs = this._many((function() {
                return this._apply("trans")
            }));
            this._apply("SetHelped");
            return (function() {
                a[(1)][(1)]++;
                return ["neg", ["atLeastQ", ["minCard", a[(1)]], v].concat(xs)]
            }).call(this)
        }
    });
    (LF2AbstractSQLPrep["defaultAttributes"] = (function(termOrVerb, attrsFound, attrs) {
        if ((!attrsFound.hasOwnProperty("DatabaseIDField"))) {
            attrs.push(["DatabaseIDField", "id"])
        } else {
            undefined
        };
        switch (termOrVerb[(0)]) {
        case "term":
            {
                if ((!attrsFound.hasOwnProperty("DatabaseNameField"))) {
                    attrs.push(["DatabaseNameField", "name"])
                } else {
                    undefined
                }
                if ((!attrsFound.hasOwnProperty("DatabaseTableName"))) {
                    attrs.push(["DatabaseTableName", termOrVerb[(1)].replace(new RegExp(" ", "g"), "_")])
                } else {
                    undefined
                }
                break
            };
        case "fcTp":
            {
                if ((!attrsFound.hasOwnProperty("DatabaseTableName"))) {
                    var tableName = termOrVerb[(1)][(1)].replace(new RegExp(" ", "g"), "_");
                    for (var i = (2);
                    (i < termOrVerb["length"]); i++) {
                        (tableName += ("-" + termOrVerb[i][(1)].replace(new RegExp(" ", "g"), "_")))
                    };
                    attrs.push(["DatabaseTableName", tableName])
                } else {
                    undefined
                }
                break
            }
        };
        termOrVerb.push(attrs)
    }));
    return LF2AbstractSQLPrep
}))