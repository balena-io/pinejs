define(["ometa-base"], (function() {
    var Prettify = undefined;
    Prettify = objectThatDelegatesTo(OMeta, {
        "elem": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                e;
            this._form((function() {
                this["indentLevel"]++;
                e = this._many((function() {
                    return this._or((function() {
                        return this._apply("string")
                    }), (function() {
                        return this._apply("elem")
                    }), (function() {
                        return this._apply("number")
                    }))
                }));
                return (spaces = this.indent(this["indentLevel"]--))
            }));
            return (("[" + e.join((",\n" + spaces))) + "]")
        }
    });
    (Prettify["indentLevel"] = (1));
    (Prettify["indent"] = (function(indentLevel) {
        {
            var i = (0);
            var spaces = " "
        };
        for (undefined;
        (i < indentLevel); i++) {
            (spaces += "  ")
        };
        undefined;
        return spaces
    }));
    return Prettify
}))