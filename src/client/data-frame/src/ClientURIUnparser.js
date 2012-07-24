define(["ometa/ometa-base"], (function() {
    var ClientURIUnparser = undefined;
    ClientURIUnparser = objectThatDelegatesTo(OMeta, {
        "word": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                l;
            this._form((function() {
                return l = this._many1((function() {
                    return this._or((function() {
                        return this._apply("letter")
                    }), (function() {
                        return (function() {
                            switch (this._apply('anything')) {
                            case "-":
                                return "-";
                            case "_":
                                return "_";
                            default:
                                throw fail
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
            var $elf = this,
                _fromIdx = this.input.idx,
                t, a;
            this._form((function() {
                t = this._apply("anything");
                return a = this._applyWithArgs("apply", t)
            }));
            return a
        },
        "uri": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                t;
            t = this._apply("trans");
            return ("#!/" + t)
        },
        "name": function() {
            var $elf = this,
                _fromIdx = this.input.idx,
                w, n, o;
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
            var $elf = this,
                _fromIdx = this.input.idx,
                n, m, t, r;
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
            var $elf = this,
                _fromIdx = this.input.idx,
                n, m, t, r;
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
            var $elf = this,
                _fromIdx = this.input.idx,
                a;
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
            var $elf = this,
                _fromIdx = this.input.idx,
                o;
            return this._or((function() {
                this._form((function() {
                    this._applyWithArgs("exactly", "filt");
                    return o = this._apply("eqi")
                }));
                return ""
            }), (function() {
                this._form((function() {
                    this._applyWithArgs("exactly", "filt");
                    return o = this._many((function() {
                        return this._apply("op")
                    }))
                }));
                return ("*filt:" + o)
            }))
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
        "eqi": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._or((function() {
                this._form((function() {
                    this._applyWithArgs("exactly", "eq");
                    this._or((function() {
                        return this._form((function() {
                            undefined
                        }))
                    }), (function() {
                        return this._apply("word")
                    }));
                    this._applyWithArgs("exactly", "id");
                    return this._apply("nmbr")
                }));
                return ""
            }), (function() {
                this._form((function() {
                    this._applyWithArgs("exactly", "eq");
                    this._or((function() {
                        return this._form((function() {
                            undefined
                        }))
                    }), (function() {
                        return this._apply("word")
                    }));
                    this._applyWithArgs("exactly", "name");
                    return this._apply("word")
                }));
                return ""
            }))
        },
        "eq": function() {
            var $elf = this,
                _fromIdx = this.input.idx;
            return this._form((function() {
                this._applyWithArgs("exactly", "eq");
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