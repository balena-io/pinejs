define(['ometa-core'], (function() {
    var Prettify = objectThatDelegatesTo(OMeta, {
        "Elem": function(indent) {
            var _fromIdx = this.input.idx,
                s, $elf = this,
                e;
            this._form((function() {
                return e = this._many((function() {
                    return this._or((function() {
                        s = this._apply("string");
                        return (('\'' + s) + '\'')
                    }), (function() {
                        return this._applyWithArgs("Elem", (indent + '\t'))
                    }), (function() {
                        return this._apply("number")
                    }), (function() {
                        return this._apply("true")
                    }), (function() {
                        return this._apply("false")
                    }))
                }))
            }));
            return (('[' + e.join((',\n' + indent))) + ']')
        },
        "Process": function() {
            var _fromIdx = this.input.idx,
                $elf = this;
            return this._applyWithArgs("Elem", '\t')
        }
    });
    return Prettify
}))