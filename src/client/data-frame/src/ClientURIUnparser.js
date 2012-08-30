define(["ometa-core"], (function() {
    var ClientURIUnparser = OMeta._extend({
        "word": function() {
            var l, $elf = this,
                _fromIdx = this.input.idx;
            this._form((function() {
                return l = this._many1((function() {
                    return this._or((function() {
                        return this._apply("letter")
                    }), (function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case "_":
                                return "_";
                            case "-":
                                return "-";
                            default:
                                throw this._fail()
                            }
                        }).call(this)
                    }))
                }))
            }));
            return l.join("")
        },
        "nmbr": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._apply("number")
        },
        "trans": function() {
            var a, t, $elf = this,
                _fromIdx = this.input.idx;
            this._form((function() {
                t = this._apply("anything");
                return a = this._applyWithArgs("apply", t)
            }));
            return a
        },
        "uri": function() {
            var t, $elf = this,
                _fromIdx = this.input.idx;
            t = this._apply("trans");
            return ("#!/" + t)
        },
        "name": function() {
            var o, n, $elf = this,
                w, _fromIdx = this.input.idx;
            return this._or((function() {
                this._form((function() {
                    w = this._apply("word");
                    return n = this._apply("nmbr")
                }));
                return ((w + ".") + n)
            }), (function() {
                this._form((function() {
                    w = this._apply("word");
                    return o = this._apply("word")
                }));
                return ((w + ".") + o)
            }), (function() {
                this._form((function() {
                    return w = this._apply("word")
                }));
                return w
            }))
        },
        "collection": function() {
            var r, t, m, n, $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                r = this._many1((function() {
                    return this._apply("trans")
                }));
                (t = [t].concat(r));
                return ((((n + m) + "/(") + t.join(",")) + ")")
            }), (function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                return (((n + m) + "/") + t)
            }), (function() {
                n = this._apply("name");
                m = this._apply("mod");
                return (n + m)
            }))
        },
        "instance": function() {
            var r, t, m, n, $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                r = this._many1((function() {
                    return this._apply("trans")
                }));
                (t = [t].concat(r));
                return ((((n + m) + "/(") + t.join(",")) + ")")
            }), (function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                return (((n + m) + "/") + t)
            }), (function() {
                n = this._apply("name");
                m = this._apply("mod");
                return (n + m)
            }))
        },
        "mod": function() {
            var a, $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                this._form((function() {
                    this._applyWithArgs("exactly", "mod");
                    return a = this._many1((function() {
                        return this._apply("actn")
                    }))
                }));
                return a.join("")
            }), (function() {
                this._form((function() {
                    return this._applyWithArgs("exactly", "mod")
                }));
                return ""
            }))
        },
        "actn": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._apply("view")
            }), (function() {
                return this._apply("add")
            }), (function() {
                return this._apply("filt")
            }), (function() {
                return this._apply("del")
            }), (function() {
                return this._apply("edit")
            }))
        },
        "view": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._form((function() {
                return this._applyWithArgs("exactly", "view")
            }));
            return "*view"
        },
        "add": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._form((function() {
                return this._applyWithArgs("exactly", "add")
            }));
            return "*add"
        },
        "del": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._form((function() {
                return this._applyWithArgs("exactly", "del")
            }));
            return "*del"
        },
        "edit": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            this._form((function() {
                return this._applyWithArgs("exactly", "edit")
            }));
            return "*edit"
        },
        "filt": function() {
            var o, $elf = this,
                _fromIdx = this.input.idx;
            this._form((function() {
                this._applyWithArgs("exactly", "filt");
                return o = this._many((function() {
                    return this._apply("op")
                }))
            }));
            return ("*filt:" + o.join(";"))
        },
        "op": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                return this._apply("eq")
            }), (function() {
                return this._apply("ne")
            }), (function() {
                return this._apply("lk")
            }))
        },
        "eq": function() {
            var field, $elf = this,
                value, _fromIdx = this.input.idx;
            this._form((function() {
                this._applyWithArgs("exactly", "eq");
                this._or((function() {
                    return this._form((function() {
                        undefined
                    }))
                }), (function() {
                    return this._apply("word")
                }));
                field = this._apply("word");
                return value = this._or((function() {
                    return this._apply("word")
                }), (function() {
                    return this._apply("nmbr")
                }))
            }));
            return [field, value].join("=")
        },
        "ne": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._form((function() {
                this._applyWithArgs("exactly", "ne");
                this._or((function() {
                    return this._form((function() {
                        undefined
                    }))
                }), (function() {
                    return this._apply("word")
                }));
                this._apply("word");
                return this._or((function() {
                    return this._apply("word")
                }), (function() {
                    return this._apply("nmbr")
                }))
            }))
        },
        "lk": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._form((function() {
                this._applyWithArgs("exactly", "lk");
                this._or((function() {
                    return this._form((function() {
                        undefined
                    }))
                }), (function() {
                    return this._apply("word")
                }));
                this._apply("word");
                return this._or((function() {
                    return this._apply("word")
                }), (function() {
                    return this._apply("nmbr")
                }))
            }))
        }
    });
    return ClientURIUnparser
}))