define(["ometa-core"], (function() {
    var SQLBinds = OMeta._extend({
        "skipToEnd": function(quote) {
            var found, $elf = this,
                _fromIdx = this.input.idx,
                text, prev;
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
            var quote, sql, $elf = this,
                _fromIdx = this.input.idx,
                text;
            sql = this._many((function() {
                return this._or((function() {
                    quote = (function() {
                        switch (this._apply('anything')) {
                        case "'":
                            return "'";
                        case "\"":
                            return "\"";
                        default:
                            throw this._fail()
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
                            throw this._fail()
                        }
                    }).call(this)
                }), (function() {
                    return this._apply("anything")
                }))
            }));
            return sql.join("")
        }
    });
    return SQLBinds
}))