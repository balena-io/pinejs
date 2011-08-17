ClientURIUnparser = objectThatDelegatesTo(OMeta, {
    "word": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            l;
        return (function() {
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
        }).call(this)
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
        return (function() {
            this._form((function() {
                return (function() {
                    t = this._apply("anything");
                    return a = this._applyWithArgs("apply", t)
                }).call(this)
            }));
            return a
        }).call(this)
    },
    "uri": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            t;
        return (function() {
            t = this._apply("trans");
            return ("#!/" + t)
        }).call(this)
    },
    "name": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            w, n, o;
        return this._or((function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        w = this._apply("word");
                        return n = this._apply("nmbr")
                    }).call(this)
                }));
                return ((w + ".") + n)
            }).call(this)
        }), (function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        w = this._apply("word");
                        return o = this._apply("word")
                    }).call(this)
                }));
                return ((w + ".") + o)
            }).call(this)
        }), (function() {
            return (function() {
                this._form((function() {
                    return w = this._apply("word")
                }));
                return w
            }).call(this)
        }))
    },
    "col": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            n, m, t, r;
        return this._or((function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                r = this._many1((function() {
                    return this._apply("trans")
                }));
                (t = [t].concat(r));
                return ((((n + m) + "/(") + t.join(",")) + ")")
            }).call(this)
        }), (function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                return (((n + m) + "/") + t)
            }).call(this)
        }), (function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                return (n + m)
            }).call(this)
        }))
    },
    "ins": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            n, m, t, r;
        return this._or((function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                r = this._many1((function() {
                    return this._apply("trans")
                }));
                (t = [t].concat(r));
                return ((((n + m) + "/(") + t.join(",")) + ")")
            }).call(this)
        }), (function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                t = this._apply("trans");
                return (((n + m) + "/") + t)
            }).call(this)
        }), (function() {
            return (function() {
                n = this._apply("name");
                m = this._apply("mod");
                return (n + m)
            }).call(this)
        }))
    },
    "mod": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            a;
        return this._or((function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "mod");
                        return a = this._many1((function() {
                            return this._apply("actn")
                        }))
                    }).call(this)
                }));
                return a.join("")
            }).call(this)
        }), (function() {
            return (function() {
                this._form((function() {
                    return this._applyWithArgs("exactly", "mod")
                }));
                return ""
            }).call(this)
        }))
    },
    "actn": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._or((function() {
            return this._apply("add")
        }), (function() {
            return this._apply("filt")
        }), (function() {
            return this._apply("del")
        }), (function() {
            return this._apply("edit")
        }))
    },
    "add": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return (function() {
            this._form((function() {
                return this._applyWithArgs("exactly", "add")
            }));
            return "*add"
        }).call(this)
    },
    "del": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return (function() {
            this._form((function() {
                return this._applyWithArgs("exactly", "del")
            }));
            return "*del"
        }).call(this)
    },
    "edit": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return (function() {
            this._form((function() {
                return this._applyWithArgs("exactly", "edit")
            }));
            return "*edit"
        }).call(this)
    },
    "filt": function() {
        var $elf = this,
            _fromIdx = this.input.idx,
            o;
        return this._or((function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "filt");
                        return o = this._apply("eqi")
                    }).call(this)
                }));
                return ""
            }).call(this)
        }), (function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "filt");
                        return o = this._many((function() {
                            return this._apply("op")
                        }))
                    }).call(this)
                }));
                return ("*filt:" + o)
            }).call(this)
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
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "eq");
                        this._or((function() {
                            return this._form((function() {
                                return undefined
                            }))
                        }), (function() {
                            return this._apply("word")
                        }));
                        this._applyWithArgs("exactly", "id");
                        return this._apply("nmbr")
                    }).call(this)
                }));
                return ""
            }).call(this)
        }), (function() {
            return (function() {
                this._form((function() {
                    return (function() {
                        this._applyWithArgs("exactly", "eq");
                        this._or((function() {
                            return this._form((function() {
                                return undefined
                            }))
                        }), (function() {
                            return this._apply("word")
                        }));
                        this._applyWithArgs("exactly", "name");
                        return this._apply("word")
                    }).call(this)
                }));
                return ""
            }).call(this)
        }))
    },
    "eq": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._form((function() {
            return (function() {
                this._applyWithArgs("exactly", "eq");
                this._or((function() {
                    return this._form((function() {
                        return undefined
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
            }).call(this)
        }))
    },
    "ne": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._form((function() {
            return (function() {
                this._applyWithArgs("exactly", "ne");
                this._or((function() {
                    return this._form((function() {
                        return undefined
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
            }).call(this)
        }))
    },
    "lk": function() {
        var $elf = this,
            _fromIdx = this.input.idx;
        return this._form((function() {
            return (function() {
                this._applyWithArgs("exactly", "lk");
                this._or((function() {
                    return this._form((function() {
                        return undefined
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
            }).call(this)
        }))
    }
})