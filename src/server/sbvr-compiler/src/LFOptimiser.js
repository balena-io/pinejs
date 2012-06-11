define(["sbvr-compiler/LFValidator"], (function(LFValidator) {
    var LFOptimiser = undefined;
    LFOptimiser = objectThatDelegatesTo(LFValidator, {
        "Helped": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._pred((this["helped"] === true));
            return (this["helped"] = false)
        },
        "SetHelped": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return (this["helped"] = true)
        },
        "Process": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                x;
            x = this._apply("anything");
            x = this._applyWithArgs("trans", x);
            this._many((function() {
                this._applyWithArgs("Helped", "disableMemoisation");
                return x = this._applyWithArgs("trans", x)
            }));
            return x
        },
        "atLeastQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, v, xs;
            return this._or((function() {
                i = this._applyWithArgs("token", "minCard");
                this._pred((i[(1)][(1)] == (1)));
                v = this._applyWithArgs("token", "var");
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                this._apply("SetHelped");
                return ["existQ", v].concat(xs)
            }), (function() {
                return LFValidator._superApplyWithArgs(this, 'atLeastQ')
            }))
        },
        "numRngQ": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                i, j, v, xs;
            return this._or((function() {
                i = this._applyWithArgs("token", "minCard");
                j = this._applyWithArgs("token", "maxCard");
                this._pred((i[(1)][(1)] == j[(1)][(1)]));
                v = this._applyWithArgs("token", "var");
                xs = this._many((function() {
                    return this._apply("trans")
                }));
                this._apply("SetHelped");
                return ["exactQ", ["card", i[(1)]], v].concat(xs)
            }), (function() {
                return LFValidator._superApplyWithArgs(this, 'numRngQ')
            }))
        },
        "neg": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                xs;
            return this._or((function() {
                this._form((function() {
                    this._applyWithArgs("exactly", "neg");
                    return xs = this._apply("trans")
                }));
                this._apply("SetHelped");
                return xs
            }), (function() {
                return LFValidator._superApplyWithArgs(this, 'neg')
            }))
        }
    });
    (LFOptimiser["initialize"] = (function() {
        LFValidator["initialize"].call(this);
        (this["_didSomething"] = false)
    }));
    return LFOptimiser
}))