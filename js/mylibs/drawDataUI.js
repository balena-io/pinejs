(function() {
  var addInst, delInst, drawData, editInst, filtmerge, getBranch, getPid, getTarg, processForm, serverAPI, uidraw;
  requirejs(["mylibs/ometa-code/SBVRParser", "mylibs/ometa-code/SBVR_PreProc", "mylibs/ometa-code/SBVR2SQL"]);
  getBranch = function(branch, loc) {
    var childIndex, _i, _len;
    for (_i = 0, _len = loc.length; _i < _len; _i++) {
      childIndex = loc[_i];
      branch = branch[childIndex + 2];
    }
    return branch;
  };
  getPid = function(branch, loc) {
    var childIndex, pid, _i, _len;
    pid = branch[1][0];
    for (_i = 0, _len = loc.length; _i < _len; _i++) {
      childIndex = loc[_i];
      branch = branch[childIndex + 2];
      if (branch[0] === "col") {
        pid += "--" + branch[1][0];
      } else {
        pid += "--" + branch[1][1];
      }
    }
    return pid;
  };
  getTarg = function(tree, loc, actn, newb) {
    var childIndex, parr, ptree, _i, _len;
    ptree = jQuery.extend(true, [], tree);
    parr = ptree;
    for (_i = 0, _len = loc.length; _i < _len; _i++) {
      childIndex = loc[_i];
      parr = parr[childIndex + 2];
    }
    switch (actn) {
      case "add":
        parr.push(newb);
        break;
      case "del":
        parr.splice(newb + 2, 1);
    }
    return ClientURIUnparser.match(ptree, "trans");
  };
  serverAPI = function(about, filters) {
    var filter, flts, op, _i, _len, _ref;
    op = {
      eq: "=",
      ne: "!=",
      lk: "~"
    };
    flts = "";
    _ref = filters.slice(1);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      filter = _ref[_i];
      if (about === filter[1]) {
        flts = flts + filter[1] + "." + filter[2] + op[filter[0]] + filter[3] + ";";
      }
    }
    if (flts !== "") {
      flts = "*filt:" + flts;
    }
    return "/data/" + about + flts;
  };
  drawData = function(tree) {
    var filters, rootURI;
    rootURI = location.pathname;
    filters = ["filters"];
    $("#dataTab").html("<table id='terms'><tbody><tr><td></td></tr></tbody></table>" + "<div align='left'><br/><input type='button' value='Apply All Changes' " + " onClick='runTrans();return false;'></div>");
    return serverRequest("GET", "/data/", [], "", function(statusCode, result, headers) {
      var i, j, launch, newb, npos, objcb, post, pre, term, _ref, _ref2, _results;
      objcb = {
        totsub: result.terms.length,
        totend: 0,
        data: [],
        callback: function(n, prod) {
          var i, _results;
          this.data.push([n, prod]);
          if (++this.totend === this.totsub) {
            this.data.sort(function(a, b) {
              return a[0] - b[0];
            });
            i = 0;
            _results = [];
            while (i < this.data.length) {
              $("#terms").append(this.data[i][1]);
              _results.push(i++);
            }
            return _results;
          }
        }
      };
      _results = [];
      for (i = 0, _ref = result.terms.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        term = result.terms[i];
        launch = -1;
        for (j = 3, _ref2 = tree.length; 3 <= _ref2 ? j < _ref2 : j > _ref2; 3 <= _ref2 ? j++ : j--) {
          if (tree[j][1][0] === term.id) {
            launch = j;
            break;
          }
        }
        pre = "<tr id='tr--data--" + term.id + "'><td>";
        post = "</td></tr>";
        _results.push(launch !== -1 ? (npos = getTarg(tree, [], "del", launch - 2), pre += "<div style='display:inline; background-color:#FFFFFF; " + "'>" + term.name + "</div>", pre += "<div style='display:inline;background-color:#FFFFFF" + "'> " + "<a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>", (function(i, pre, post, launch) {
          return serverRequest("GET", "/model/", [], "", function(statusCode, result) {
            var model, uid;
            model = SBVRParser.matchAll(result, "expr");
            model = SBVR_PreProc.match(model, "optimizeTree");
            model = SBVR2SQL.match(model, "trans");
            uid = new uidraw(i, objcb, pre, post, rootURI, [], [], filters, [launch - 2], true, tree, model);
            return uid.subRowIn();
          });
        })(i, pre, post, launch)) : (newb = ["col", [term.id], ["mod"]], npos = getTarg(tree, [], "add", newb), pre += term.name, pre += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>", objcb.callback(i, pre + post)));
      }
      return _results;
    });
  };
  uidraw = function(idx, objcb, pre, post, rootURI, pos, pid, filters, loc, even, ftree, cmod) {
    var j;
    this.idx = idx;
    this.objcb = objcb;
    this.pre = pre;
    this.post = post;
    this.rootURI = rootURI;
    this.pos = pos;
    this.loc = loc;
    this.even = even;
    this.ftree = ftree;
    this.branch = getBranch(this.ftree, this.loc);
    this.filters = filters;
    this.filters = filtmerge(this.branch, this.filters);
    this.pid = getPid(this.ftree, this.loc);
    this.about = this.branch[1][0];
    this.data = [];
    this.items = 0;
    this.submitted = 0;
    this.html = "";
    this.adds = 0;
    this.addsout = 0;
    this.cols = 0;
    this.colsout = 0;
    this.rows = 0;
    this.targ = "";
    this.type = "term";
    this.schema = [];
    if (even) {
      this.bg = "#FFFFFF";
      this.unbg = "#EEEEEE";
    } else {
      this.bg = "#EEEEEE";
      this.unbg = "#FFFFFF";
    }
    this.callback = function(n, prod) {
      var i;
      this.data.push([n, prod]);
      if (this.data.length === this.items) {
        this.data.sort(function(a, b) {
          return a[0] - b[0];
        });
        this.html = this.pre;
        i = 0;
        while (i < this.data.length) {
          this.html += this.data[i][1];
          i++;
        }
        this.html += this.post;
        return this.objcb.callback(this.idx, this.html);
      }
    };
    j = 1;
    while (j < cmod.length) {
      if (cmod[j][1] === this.about) {
        this.type = cmod[j][0];
        if (this.type === "fcTp") {
          this.schema = cmod[j][6];
        }
      }
      j++;
    }
    this.subRowIn = function() {
      var actn, addftcb, branchType, col, currBranch, currBranchType, currSchema, instance, mod, parent, posl, res, schema, schm, tar, targ, trmres, trms, trmsel, _i, _j, _k, _l, _len, _len2, _len3, _len4, _len5, _len6, _len7, _len8, _len9, _m, _n, _o, _p, _q, _ref, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9, _results;
      parent = this;
      if (this.branch[0] === "col") {
        this.pre += "<div class='panel' style='background-color:" + this.bg + ";'>" + "<table id='tbl--" + pid + "'><tbody>";
        this.post += "</tbody></table></div>";
        this.targ = serverAPI(this.about, this.filters);
        j = 3;
        _ref = this.branch;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          currBranch = _ref[_i];
          if (currBranch[0] === "ins" && currBranch[1][0] === this.about && currBranch[1][1] === void 0) {
            _ref2 = currBranch[2].slice(1);
            for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
              currBranchType = _ref2[_j];
              if (currBranchType[0] === "add") {
                this.adds++;
              }
            }
          }
        }
        _ref3 = cmod.slice(1);
        for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
          mod = _ref3[_k];
          if (mod[0] === "fcTp") {
            _ref4 = mod[6];
            for (_l = 0, _len4 = _ref4.length; _l < _len4; _l++) {
              col = _ref4[_l];
              if (col[1] === this.about) {
                this.cols++;
              }
            }
          }
        }
        return serverRequest("GET", this.targ, [], "", function(statusCode, result, headers) {
          var actn, currBranchType, i, instance, j, launch, locn, mod, newb, npos, posl, postl, prel, res, resl, schema, subcolcb, uid, _len5, _len6, _len7, _len8, _m, _n, _o, _p, _ref10, _ref11, _ref12, _ref5, _ref6, _ref7, _ref8, _ref9, _results;
          resl = "";
          parent.rows = result.instances.length;
          parent.items = parent.rows + 2 + parent.adds + 1 + parent.cols;
          newb = ["ins", [parent.about], ["mod", ["add"]]];
          npos = getTarg(parent.ftree, parent.loc, "add", newb);
          parent.data.push([parent.rows + 1, "<tr><td><a href = '" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false;'>" + "[(+)add new]</a></td></tr>"]);
          for (i = 0, _ref5 = result.instances.length; 0 <= _ref5 ? i < _ref5 : i > _ref5; 0 <= _ref5 ? i++ : i--) {
            instance = result.instances[i];
            launch = -1;
            actn = "view";
            for (j = 3, _ref6 = parent.branch.length; 3 <= _ref6 ? j < _ref6 : j > _ref6; 3 <= _ref6 ? j++ : j--) {
              currBranch = parent.branch[j];
              if (currBranch[0] === "ins" && currBranch[1][0] === parent.about && currBranch[1][1] !== void 0 && (currBranch[1][1] === instance.id || currBranch[1][1] === instance.name)) {
                launch = j;
                _ref7 = currBranch[2].slice(1);
                for (_m = 0, _len5 = _ref7.length; _m < _len5; _m++) {
                  currBranchType = _ref7[_m];
                  if ((_ref8 = currBranchType[0]) === "edit" || _ref8 === "del") {
                    actn = currBranchType[0];
                    break;
                  }
                }
              }
            }
            posl = parent.targ + "/" + parent.about + "." + instance.id;
            prel = "<tr id='tr--" + pid + "--" + instance.id + "'><td>";
            if (launch !== -1) {
              prel += "<div style='display:inline;background-color:" + parent.unbg + "'>";
            }
            if (parent.type === "term") {
              prel += instance.name;
            } else if (parent.type === "fcTp") {
              _ref9 = parent.schema;
              for (_n = 0, _len6 = _ref9.length; _n < _len6; _n++) {
                schema = _ref9[_n];
                if (schema[0] === "term") {
                  prel += instance[schema[1] + "_name"] + " ";
                } else if (schema[0] === "verb") {
                  prel += "<em>" + schema[1] + "</em> ";
                }
              }
            }
            if (launch !== -1) {
              prel += "</div>";
            }
            if (launch !== -1 && actn === "view") {
              npos = getTarg(parent.ftree, parent.loc, "del", launch - 2);
              prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
            } else if (launch === -1) {
              newb = ["ins", [parent.about, instance.id], ["mod"]];
              npos = getTarg(parent.ftree, parent.loc, "add", newb);
              prel += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='View' class='ui-icon ui-icon-search'></span></a>";
            }
            if (launch !== -1 && actn === "edit") {
              npos = getTarg(parent.ftree, parent.loc, "del", launch - 2);
              prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
            } else if (launch === -1) {
              newb = ["ins", [parent.about, instance.id], ["mod", ["edit"]]];
              npos = getTarg(parent.ftree, parent.loc, "add", newb);
              prel += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Edit' class='ui-icon ui-icon-pencil'></span></a>";
            }
            if (launch !== -1 && actn === "del") {
              npos = getTarg(parent.ftree, parent.loc, "del", launch - 2);
              prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'>[unmark]</a></div>";
            } else if (launch === -1) {
              newb = ["ins", [parent.about, instance.id], ["mod", ["del"]]];
              npos = getTarg(parent.ftree, parent.loc, "add", newb);
              prel += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Delete' class='ui-icon ui-icon-trash'></span></a>";
            }
            postl = "</td></tr>";
            if (launch !== -1) {
              locn = parent.loc.concat([launch - 2]);
              uid = new uidraw(i, parent, prel, postl, rootURI, [], [], parent.filters, locn, !parent.even, parent.ftree, cmod);
              uid.subRowIn();
            } else {
              parent.callback(i, prel + postl);
            }
          }
          parent.callback(parent.rows, "<tr><td>" + "<hr style='border:0px; width:90%; background-color: #999; height:1px;'>" + "</td></tr>");
          posl = parent.targ + "/" + parent.about;
          for (j = 3, _ref10 = parent.branch.length; 3 <= _ref10 ? j < _ref10 : j > _ref10; 3 <= _ref10 ? j++ : j--) {
            currBranch = parent.branch[j];
            if (currBranch[0] === "ins" && currBranch[1][0] === parent.about && currBranch[1][1] === void 0) {
              _ref11 = currBranch[2];
              for (_o = 0, _len7 = _ref11.length; _o < _len7; _o++) {
                currBranchType = _ref11[_o];
                if (currBranchType[0] === "add") {
                  locn = parent.loc.concat([j - 2]);
                  uid = new uidraw(parent.rows + 1 + ++parent.addsout, parent, "<tr><td>", "</td></tr>", rootURI, [], [], parent.filters, locn, !parent.even, parent.ftree, cmod);
                  uid.subRowIn();
                  break;
                }
              }
            }
          }
          parent.callback(parent.rows + 1 + parent.adds + 1, "<tr><td>" + "<hr style='border:0px; width:90%; background-color: #999; height:1px;'>" + "</td></tr>");
          _ref12 = cmod.slice(1);
          _results = [];
          for (_p = 0, _len8 = _ref12.length; _p < _len8; _p++) {
            mod = _ref12[_p];
            if (mod[0] === "fcTp") {
              _results.push((function() {
                var _ref13, _ref14, _results2;
                _results2 = [];
                for (j = 0, _ref13 = mod[6].length; 0 <= _ref13 ? j < _ref13 : j > _ref13; 0 <= _ref13 ? j++ : j--) {
                  if (mod[6][j][1] === parent.about) {
                    launch = -1;
                    for (j = 3, _ref14 = parent.branch.length; 3 <= _ref14 ? j < _ref14 : j > _ref14; 3 <= _ref14 ? j++ : j--) {
                      if (parent.branch[j][1][0] === mod[1]) {
                        launch = j - 2;
                        break;
                      }
                    }
                    parent.colsout++;
                    res = "";
                    pre = "<tr id='tr--data--" + mod[1] + "'><td>";
                    if (launch === -1) {
                      pre += mod[2];
                    } else {
                      pre += "<div style='display:inline;background-color:" + parent.unbg + "'>" + mod[2] + "</div>";
                    }
                    post = "</td></tr>";
                    _results2.push(launch !== -1 ? (npos = getTarg(parent.ftree, parent.loc, "del", launch), pre += "<div style='display:inline;background-color:" + parent.unbg + "'>" + " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a>" + "</div>", subcolcb = {
                      callback: function(n, prod) {
                        return parent.callback(n, prod);
                      }
                    }, uid = new uidraw(parent.rows + 1 + parent.adds + 1 + parent.colsout, subcolcb, pre, post, rootURI, [], [], parent.filters, loc.concat([launch]), !parent.even, parent.ftree, cmod), uid.subRowIn()) : (newb = ["col", [mod[1]], ["mod"]], npos = getTarg(parent.ftree, parent.loc, "add", newb), pre += " <a href='" + parent.rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>", res += pre + post, parent.callback(parent.rows + 1 + parent.adds + 1 + parent.colsout, res)));
                  }
                }
                return _results2;
              })());
            }
          }
          return _results;
        });
      } else if (this.branch[0] === "ins") {
        this.items = 1;
        this.pre += "<div class='panel' style='background-color:" + this.bg + ";'>";
        this.post += "</div>";
        targ = serverAPI(this.about, this.filters);
        posl = targ;
        this.id = this.branch[1][1];
        actn = "view";
        _ref5 = this.branch[2].slice(1);
        for (_m = 0, _len5 = _ref5.length; _m < _len5; _m++) {
          branchType = _ref5[_m];
          if ((_ref6 = branchType[0]) === "add" || _ref6 === "edit" || _ref6 === "del") {
            actn = branchType[0];
            break;
          }
        }
        switch (actn) {
          case "view":
            instance = result.instances[0];
            if (this.type === "term") {
              this.targ = serverAPI(this.about, this.filters);
              return serverRequest("GET", this.targ, [], "", function(statusCode, result, headers) {
                var item, res;
                res = "";
                for (item in instance) {
                  if (item !== "__clone") {
                    res += item + ": " + instance[item] + "<br/>";
                  }
                }
                return parent.callback(1, res);
              });
            } else if (this.type === "fcTp") {
              this.targ = serverAPI(this.about, this.filters);
              return serverRequest("GET", this.targ, [], "", function(statusCode, result, headers) {
                var res, schema, _len6, _n, _ref7;
                res = "";
                res += "id: " + instance.id + "<br/>";
                _ref7 = parent.schema;
                for (_n = 0, _len6 = _ref7.length; _n < _len6; _n++) {
                  schema = _ref7[_n];
                  if (schema[0] === "term") {
                    res += instance[schema[1] + "_name"] + " ";
                  } else if (schema[0] === "verb") {
                    res += schema[1] + " ";
                  }
                }
                return parent.callback(1, res);
              });
            }
            break;
          case "add":
            if (this.type === "term") {
              schema = [];
              _ref7 = cmod.slice(1);
              for (_n = 0, _len6 = _ref7.length; _n < _len6; _n++) {
                mod = _ref7[_n];
                if (mod[1] === this.about) {
                  schema = mod[3];
                }
              }
              res = "<div align='right'>";
              res += "<form class = 'action' >";
              res += "<input type='hidden' id='__actype' value='addterm'>";
              res += "<input type='hidden' id='__serverURI' value='" + serverAPI(this.about, []) + "'>";
              res += "<input type='hidden' id='__backURI' value='" + targ + "'>";
              console.log("addterm backURI=" + targ);
              res += "<input type='hidden' id='__type' value='" + this.about + "'>";
              for (_o = 0, _len7 = schema.length; _o < _len7; _o++) {
                currSchema = schema[_o];
                switch (currSchema[0]) {
                  case "Text":
                    res += currSchema[2] + ": <input type='text' id='" + currSchema[1] + "' /><br />";
                    break;
                  case "ForeignKey":
                    alert(currSchema);
                }
              }
              res += "<input type='submit' value='Submit This'" + " onClick='processForm(" + "this.parentNode" + ");return false;'>";
              res += "</form>";
              res += "</div>";
              return this.callback(1, res);
            } else if (this.type === "fcTp") {
              trms = [];
              trmres = [];
              trmsel = {};
              addftcb = function(statusCode, result, headers) {
                var currTermRes, j, schema, _len8, _len9, _p, _q, _ref10, _ref8, _ref9;
                res = "";
                trmres.push(result.instances);
                if (trms.length === trmres.length) {
                  for (j = 0, _ref8 = trms.length; 0 <= _ref8 ? j < _ref8 : j > _ref8; 0 <= _ref8 ? j++ : j--) {
                    res = "<select id='" + trms[j] + "_id'>";
                    _ref9 = trmres[j];
                    for (_p = 0, _len8 = _ref9.length; _p < _len8; _p++) {
                      currTermRes = _ref9[_p];
                      res += "<option value='" + currTermRes.id + "'>" + currTermRes.name + "</option>";
                    }
                    res += "</select>";
                    trmsel[trms[j]] = res;
                  }
                  res = "";
                  res += "<form class = 'action' >";
                  res += "<input type='hidden' id='__actype' value='addfctp'>";
                  res += "<input type='hidden' id='__serverURI' value='" + serverAPI(parent.about, []) + "'>";
                  res += "<input type='hidden' id='__backURI' value='" + posl + "'>";
                  res += "<input type='hidden' id='__type' value='" + parent.about + "'>";
                  _ref10 = parent.schema;
                  for (_q = 0, _len9 = _ref10.length; _q < _len9; _q++) {
                    schema = _ref10[_q];
                    if (schema[0] === "term") {
                      res += trmsel[schema[1]] + " ";
                    } else if (schema[0] === "verb") {
                      res += parent.schema[j][1] + " ";
                    }
                  }
                  res += "<div align='right'>";
                  res += "<input type='submit' value='Submit This'" + " onClick='processForm(this.parentNode.parentNode);return false;'>";
                  res += "</div>";
                  res += "</form>";
                  return parent.callback(1, res);
                }
              };
              _ref8 = this.schema;
              for (_p = 0, _len8 = _ref8.length; _p < _len8; _p++) {
                schema = _ref8[_p];
                if (schema[0] === "term") {
                  trms.push(schema[1]);
                }
              }
              _ref9 = this.schema;
              _results = [];
              for (_q = 0, _len9 = _ref9.length; _q < _len9; _q++) {
                schema = _ref9[_q];
                _results.push(schema[0] === "term" ? (tar = serverAPI(schema[1], this.filters), serverRequest("GET", tar, [], "", addftcb)) : schema[0] === "verb" ? null : void 0);
              }
              return _results;
            }
            break;
          case "edit":
            if (this.type === "term") {
              schm = "";
              j = 1;
              while (j < cmod.length) {
                if (cmod[j][1] === this.about) {
                  schm = cmod[j][3];
                }
                j++;
              }
              this.targ = serverAPI(this.about, this.filters);
              return serverRequest("GET", this.targ, [], "", function(statusCode, result, headers) {
                var id;
                res = "";
                id = result.instances[0].id;
                res = "<div align='left'>";
                res += "<form class = 'action' >";
                res += "<input type='hidden' id='__actype' value='editterm'>";
                res += "<input type='hidden' id='__serverURI' value='" + serverAPI(parent.about, []) + "." + id + "'>";
                res += "<input type='hidden' id='__backURI' value='" + serverAPI(parent.about, []) + "'>";
                res += "<input type='hidden' id='__id' value='" + id + "'>";
                res += "<input type='hidden' id='__type' value='" + parent.about + "'>";
                res += "id: " + id + "<br/>";
                j = 0;
                while (j < schm.length) {
                  switch (schm[j][0]) {
                    case "Text":
                      res += schm[j][2] + ": <input type='text' id='" + schm[j][1] + "' value = '" + result.instances[0][schm[j][1]] + "' /><br />";
                      break;
                    case "ForeignKey":
                      console.log(schm[j]);
                  }
                  j++;
                }
                res += "<div align = 'right'>";
                res += "<input type='submit' value='Submit This' " + "onClick='processForm(this.parentNode.parentNode);return false;'>";
                res += "</div>";
                res += "</form>";
                res += "</div>";
                return parent.callback(1, res);
              });
            } else if (this.type === "fcTp") {
              this.targ = serverAPI(this.about, this.filters);
              return serverRequest("GET", targ, [], "", function(statusCode, result, headers) {
                var editftcb, resu, _results2;
                resu = result;
                trms = [];
                trmres = [];
                trmsel = {};
                editftcb = function(statusCode, result, headers) {
                  var k, respo, respr;
                  res = "";
                  trmres.push(result.instances);
                  if (trms.length === trmres.length) {
                    respo = "";
                    respr = "<div align='left'>";
                    respr += "<form class = 'action' >";
                    respr += "<input type='hidden' id='__actype' value='editfctp'>";
                    respr += "<input type='hidden' id='__serverURI' value='" + serverAPI(parent.about, []) + "." + resu.instances[0].id + "'>";
                    respr += "<input type='hidden' id='__backURI' value='" + serverAPI(parent.about, []) + "'>";
                    console.log("editfctp backURI=" + serverAPI(parent.about, []));
                    respr += "<input type='hidden' id='__id' value='" + resu.instances[0].id + "'>";
                    respr += "<input type='hidden' id='__type' value='" + parent.about + "'>";
                    j = 0;
                    while (j < trms.length) {
                      res = "<select id='" + trms[j] + "_id'>";
                      k = 0;
                      while (k < trmres[j].length) {
                        res += "<option value='" + trmres[j][k].id + "'";
                        if (resu.instances[0][trms[j] + "_id"] === trmres[j][k].id) {
                          res += " selected";
                        }
                        res += ">" + trmres[j][k].name + "</option>";
                        k++;
                      }
                      res += "</select>";
                      trmsel[trms[j]] = res;
                      j++;
                    }
                    res = "";
                    j = 0;
                    while (j < parent.schema.length) {
                      if (parent.schema[j][0] === "term") {
                        res += trmsel[parent.schema[j][1]] + " ";
                      } else if (parent.schema[j][0] === "verb") {
                        res += parent.schema[j][1] + " ";
                      }
                      j++;
                    }
                    respo += "<div align = 'right'>";
                    respo += "<input type='submit' value='Submit This' " + "onClick='processForm(this.parentNode.parentNode);return false;'>";
                    respo += "</div>";
                    respo += "</form>";
                    respo += "</div>";
                    return parent.callback(1, respr + res + respo);
                  }
                };
                j = 0;
                while (j < parent.schema.length) {
                  if (parent.schema[j][0] === "term") {
                    trms.push(parent.schema[j][1]);
                  }
                  j++;
                }
                j = 0;
                _results2 = [];
                while (j < parent.schema.length) {
                  if (parent.schema[j][0] === "term") {
                    tar = serverAPI(parent.schema[j][1], parent.filters);
                    serverRequest("GET", tar, [], "", editftcb);
                  } else if (parent.schema[j][0] === "verb") {
                    null;
                  }
                  _results2.push(j++);
                }
                return _results2;
              });
            }
            break;
          case "del":
            res = "<div align='left'>";
            res += "marked for deletion";
            res += "<div align = 'right'>";
            res += "<form class = 'action' >";
            res += "<input type='hidden' id='__actype' value='del'>";
            res += "<input type='hidden' id='__serverURI' value='" + serverAPI(this.about, []) + "." + this.id + "'>";
            res += "<input type='hidden' id='__id' value='" + this.id + "'>";
            res += "<input type='hidden' id='__type' value='" + this.about + "'>";
            res += "<input type='hidden' id='__backURI' value='" + serverAPI(this.about, []) + "'>";
            res += "<input type='submit' value='Confirm' " + "onClick='processForm(this.parentNode.parentNode);return false;'>";
            res += "</form>";
            res += "</div>";
            res += "</div>";
            return this.callback(1, res);
        }
      }
    };
    return this;
  };
  processForm = function(forma) {
    var action, backURI, id, serverURI, type;
    action = $("#__actype", forma).val();
    serverURI = $("#__serverURI", forma).val();
    id = $("#__id", forma).val();
    type = $("#__type", forma).val();
    backURI = $("#__backURI", forma).val();
    switch (action) {
      case "editterm":
      case "editfctp":
        return editInst(forma, serverURI, backURI);
      case "addterm":
      case "addfctp":
        return addInst(forma, serverURI, backURI);
      case "del":
        return delInst(forma, serverURI, backURI);
    }
  };
  delInst = function(forma, uri, backURI) {
    this.backURI = backURI;
    serverRequest("DELETE", uri, [], "", function(statusCode, result, headers) {
      return location.hash = "#!" + backURI;
    });
    return false;
  };
  editInst = function(forma, serverURI, backURI) {
    var inputs, obj;
    this.backURI = backURI;
    inputs = $(":input:not(:submit)", forma);
    obj = $.map(inputs, function(n, i) {
      var o;
      if (n.id.slice(0, 2) !== "__") {
        o = {};
        o[n.id] = $(n).val();
        return o;
      }
    });
    console.log(JSON.stringify(obj));
    serverRequest("PUT", serverURI, [], JSON.stringify(obj), function(statusCode, result, headers) {
      return location.hash = "#!" + backURI;
    });
    return false;
  };
  addInst = function(forma, uri, backURI) {
    var inputs, obj;
    this.backURI = backURI;
    inputs = $(":input:not(:submit)", forma);
    obj = $.map(inputs, function(n, i) {
      var o;
      if (n.id.slice(0, 2) !== "__") {
        o = {};
        o[n.id] = $(n).val();
        return o;
      }
    });
    serverRequest("POST", uri, [], JSON.stringify(obj), function(statusCode, result, headers) {
      return location.hash = "#!" + backURI;
    });
    return false;
  };
  filtmerge = function(branch, fltrs) {
    var filters, i, rootURI;
    filters = jQuery.extend(true, [], fltrs);
    rootURI = "/data/" + branch[1][0];
    i = 1;
    while (i < branch[2].length) {
      if (branch[2][i][0] === "filt") {
        if (branch[2][i][1][1][0] === void 0) {
          branch[2][i][1][1] = branch[1][0];
        }
        filters.push(branch[2][i][1]);
      }
      i++;
    }
    return filters;
  };
  window.drawData = drawData;
  window.processForm = processForm;
}).call(this);
