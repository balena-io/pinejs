define(["ometa/ometa-base"], (function() {
    var Prettify = undefined;
    Prettify = objectThatDelegatesTo(OMeta, {
        "Elem": function(indent) {
            var $elf = this,
                _fromIdx = this.input.idx,
                e;
            this._form((function() {
                return e = this._many((function() {
                    return this._or((function() {
                        return this._apply("string")
                    }), (function() {
                        return this._applyWithArgs("Elem", (indent + "\t"))
                    }), (function() {
                        return this._apply("number")
                    }), (function() {
                        return this._apply("true")
                    }), (function() {
                        return this._apply("false")
                    }))
                }))
            }));
            return (("[" + e.join((",\n" + indent))) + "]")
        },
        "Process": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._applyWithArgs("Elem", "\t")
        }
    });
    return Prettify
}))