{
    Prettify = objectThatDelegatesTo(OMeta, {
        "elem": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                e;
            return (function() {
                this._form((function() {
                    return (function() {
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
                    }).call(this)
                }));
                return (("[" + e.join((",\n" + s))) + "]")
            }).call(this)
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
    }));
}
