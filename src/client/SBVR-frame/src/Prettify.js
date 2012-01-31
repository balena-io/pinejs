{
    Prettify = objectThatDelegatesTo(OMeta, {
        "elem": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                e;
            this._form((function() {
                this["d"]++;
                e = this._many((function() {
                    return this._or((function() {
                        return this._apply("string")
                    }), (function() {
                        return this._apply("elem")
                    }), (function() {
                        return this._apply("number")
                    }))
                }));
                return (s = this.s(this["d"]--))
            }));
            return (("[" + e.join((",\n" + s))) + "]")
        }
    });
    (Prettify["d"] = (1));
    (Prettify["s"] = (function(d) {
        (a = " ");
        for (var i = (0);
        (i < d); i++) {
            (a += "  ")
        };
        undefined;
        return a
    }))
}