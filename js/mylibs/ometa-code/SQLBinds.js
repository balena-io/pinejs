SQLBinds = objectThatDelegatesTo(OMeta, {
    "skipToEnd": function(quote) {
        var $elf = this,
            _fromIdx = this.input.idx,
            found, prev, text;
        text = this._many((function() {
            this._not((function() {
                return (found == quote)
            }));
            return this._or((function() {
                this._not((function() {
                    return ((prev == quote) || (prev == "\\"))
                }));
                return found = this._applyWithArgs("seq", quote)
            }), (function() {
                return prev = this._apply("anything")
            }))
        }));
        return text.join("")
    },
    "parse": function(nextBind) {
        var $elf = this,
            _fromIdx = this.input.idx,
            quote, text, sql;
        sql = this._many((function() {
            return this._or((function() {
                quote = (function() {
                    switch (this._apply('anything')) {
                    case "\'":
                        return "\'";
                    case "\"":
                        return "\"";
                    default:
                        throw fail
                    }
                }).call(this);
                text = this._applyWithArgs("skipToEnd", quote);
                return [quote, text].join("")
            }), (function() {
                return (function() {
                    switch (this._apply('anything')) {
                    case "?":
                        return nextBind();
                    default:
                        throw fail
                    }
                }).call(this)
            }), (function() {
                return this._apply("anything")
            }))
        }));
        return sql.join("")
    }
})