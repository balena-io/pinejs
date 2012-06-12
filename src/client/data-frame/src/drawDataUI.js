(function() {

  define(['data-frame/ClientURIUnparser'], function(ClientURIUnparser) {
    var addInst, createFactTypeForm, createHiddenInputs, delInst, drawData, editInst, filtmerge, getBranch, getPid, getTarg, processForm, serverAPI, uidraw, widgets;
    widgets = {};
    requirejs(['data-frame/widgets/inputText'], function(inputText) {
      return widgets.inputText = inputText;
    });
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
      if (flts !== "") flts = "*filt:" + flts;
      return "/data/" + about + flts;
    };
    drawData = function(tree) {
      var filters, rootURI;
      rootURI = location.pathname;
      filters = ["filters"];
      $("#dataTab").html("<table id='terms'><tbody><tr><td></td></tr></tbody></table><div align='left'><br/><input type='button' value='Apply All Changes' onClick='runTrans($(\"#terms\"));return false;'></div>");
      return serverRequest("GET", "/data/", {}, null, function(statusCode, result, headers) {
        var i, j, launch, leaf, newb, npos, objcb, post, pre, term, _len, _len2, _ref, _ref2, _results;
        objcb = {
          totsub: result.terms.length,
          totend: 0,
          data: [],
          callback: function(n, prod) {
            var item, _i, _len, _ref, _results;
            this.data.push([n, prod]);
            if (++this.totend === this.totsub) {
              this.data.sort(function(a, b) {
                return a[0] - b[0];
              });
              _ref = this.data;
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                item = _ref[_i];
                _results.push($("#terms").append(item[1]));
              }
              return _results;
            }
          }
        };
        _ref = result.terms;
        _results = [];
        for (i = 0, _len = _ref.length; i < _len; i++) {
          term = _ref[i];
          term = result.terms[i];
          launch = -1;
          _ref2 = tree.slice(3);
          for (j = 0, _len2 = _ref2.length; j < _len2; j++) {
            leaf = _ref2[j];
            if (!(leaf[1][0] === term.id)) continue;
            launch = j + 3;
            break;
          }
          pre = "<tr id='tr--data--" + term.id + "'><td>";
          post = "</td></tr>";
          if (launch !== -1) {
            npos = getTarg(tree, [], "del", launch - 2);
            pre += "<div style='display:inline; background-color:#FFFFFF;'>" + term.name + "</div>";
            pre += "<div style='display:inline;background-color:#FFFFFF'><a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
            _results.push((function(i, pre, post, launch) {
              return serverRequest("GET", "/lfmodel/", {}, null, function(statusCode, result) {
                var uid;
                uid = new uidraw(i, objcb, pre, post, rootURI, [], [], filters, [launch - 2], true, tree, result);
                return uid.subRowIn();
              });
            })(i, pre, post, launch));
          } else {
            newb = ["col", [term.id], ["mod"]];
            npos = getTarg(tree, [], "add", newb);
            pre += term.name;
            pre += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
            _results.push(objcb.callback(i, pre + post));
          }
        }
        return _results;
      });
    };
    uidraw = function(idx, objcb, pre, post, rootURI, pos, pid, filters, loc, even, ftree, cmod) {
      var getIdent, mod, _i, _len, _ref;
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
      this.type = "Term";
      this.schema = [];
      if (even) {
        this.bg = "#FFFFFF";
        this.unbg = "#EEEEEE";
      } else {
        this.bg = "#EEEEEE";
        this.unbg = "#FFFFFF";
      }
      this.callback = function(n, prod) {
        var item, _i, _len, _ref;
        this.data.push([n, prod]);
        if (this.data.length === this.items) {
          this.data.sort(function(a, b) {
            return a[0] - b[0];
          });
          this.html = this.pre;
          _ref = this.data;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            item = _ref[_i];
            this.html += item[1];
          }
          this.html += this.post;
          return this.objcb.callback(this.idx, this.html);
        }
      };
      getIdent = function(mod) {
        var factTypePart, ident, _i, _len, _ref;
        switch (mod[0]) {
          case 'Term':
          case 'Verb':
            return mod[1].replace(new RegExp(' ', 'g'), '_');
          case 'FactType':
            ident = [];
            _ref = mod.slice(1, -1);
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              factTypePart = _ref[_i];
              ident.push(getIdent(factTypePart));
            }
            return ident.join('-');
          default:
            return '';
        }
      };
      _ref = cmod.slice(1);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mod = _ref[_i];
        if (!(getIdent(mod) === this.about)) continue;
        this.type = mod[0];
        if (this.type === "FactType") this.schema = mod.slice(1);
      }
      this.subRowIn = function() {
        var actn, branchType, col, currBranch, currBranchType, currSchema, mod, parent, posl, res, resultsReceived, resultsRequested, schema, targ, termName, termResults, _j, _k, _l, _len2, _len3, _len4, _len5, _len6, _len7, _len8, _m, _n, _o, _p, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _results;
        parent = this;
        if (this.branch[0] === "col") {
          this.pre += "<div class='panel' style='background-color:" + this.bg + ";'><table id='tbl--" + pid + "'><tbody>";
          this.post += "</tbody></table></div>";
          _ref2 = this.branch;
          for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
            currBranch = _ref2[_j];
            if (currBranch[0] === "ins" && currBranch[1][0] === this.about && currBranch[1][1] === void 0) {
              _ref3 = currBranch[2].slice(1);
              for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
                currBranchType = _ref3[_k];
                if (currBranchType[0] === "add") this.adds++;
              }
            }
          }
          _ref4 = cmod.slice(1);
          for (_l = 0, _len4 = _ref4.length; _l < _len4; _l++) {
            mod = _ref4[_l];
            if (mod[0] === "FactType") {
              _ref5 = mod.slice(1);
              for (_m = 0, _len5 = _ref5.length; _m < _len5; _m++) {
                col = _ref5[_m];
                if (getIdent(col) === this.about) this.cols++;
              }
            }
          }
          this.targ = serverAPI(this.about, this.filters);
          return serverRequest("GET", this.targ, {}, null, function(statusCode, result, headers) {
            var actn, branch, currBranch, currBranchType, i, instance, j, k, launch, locn, mod, newb, npos, posl, postl, prel, res, resl, schema, subcolcb, termVerb, uid, _len10, _len11, _len12, _len6, _len7, _len8, _len9, _n, _o, _p, _q, _ref10, _ref11, _ref12, _ref13, _ref14, _ref6, _ref7, _ref8, _ref9, _results;
            resl = "";
            parent.rows = result.instances.length;
            parent.items = parent.rows + 2 + parent.adds + 1 + parent.cols;
            newb = ["ins", [parent.about], ["mod", ["add"]]];
            npos = getTarg(parent.ftree, parent.loc, "add", newb);
            parent.data.push([parent.rows + 1, "<tr><td><a href = '" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false;'>[(+)add new]</a></td></tr>"]);
            _ref6 = result.instances;
            for (i = 0, _len6 = _ref6.length; i < _len6; i++) {
              instance = _ref6[i];
              launch = -1;
              actn = "view";
              _ref7 = parent.branch.slice(3);
              for (j = 0, _len7 = _ref7.length; j < _len7; j++) {
                currBranch = _ref7[j];
                if (currBranch[0] === "ins" && currBranch[1][0] === parent.about && currBranch[1][1] !== void 0 && ((_ref8 = currBranch[1][1]) === instance.id || _ref8 === instance._name)) {
                  launch = j + 3;
                  _ref9 = currBranch[2].slice(1);
                  for (_n = 0, _len8 = _ref9.length; _n < _len8; _n++) {
                    currBranchType = _ref9[_n];
                    if (!((_ref10 = currBranchType[0]) === "edit" || _ref10 === "del")) {
                      continue;
                    }
                    actn = currBranchType[0];
                    break;
                  }
                }
              }
              posl = parent.targ + "/" + parent.about + "." + instance.id;
              prel = "<tr id='tr--" + pid + "--" + instance.id + "'><td>";
              if (launch !== -1) {
                prel += "<div style='display:inline;background-color:" + parent.unbg + "'>";
              }
              if (parent.type === "Term") {
                prel += instance._name;
              } else if (parent.type === "FactType") {
                _ref11 = parent.schema;
                for (_o = 0, _len9 = _ref11.length; _o < _len9; _o++) {
                  schema = _ref11[_o];
                  if (schema[0] === "Term") {
                    prel += instance[schema[1] + "_name"] + " ";
                  } else if (schema[0] === "Verb") {
                    prel += "<em>" + schema[1] + "</em> ";
                  }
                }
              }
              if (launch !== -1) prel += "</div>";
              if (launch === -1) {
                newb = ["ins", [parent.about, instance.id], ["mod"]];
                npos = getTarg(parent.ftree, parent.loc, "add", newb);
                prel += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='View' class='ui-icon ui-icon-search'></span></a>";
              } else if (actn === "view") {
                npos = getTarg(parent.ftree, parent.loc, "del", launch - 2);
                prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
              }
              if (launch === -1) {
                newb = ["ins", [parent.about, instance.id], ["mod", ["edit"]]];
                npos = getTarg(parent.ftree, parent.loc, "add", newb);
                prel += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Edit' class='ui-icon ui-icon-pencil'></span></a>";
              } else if (actn === "edit") {
                npos = getTarg(parent.ftree, parent.loc, "del", launch - 2);
                prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
              }
              if (launch === -1) {
                newb = ["ins", [parent.about, instance.id], ["mod", ["del"]]];
                npos = getTarg(parent.ftree, parent.loc, "add", newb);
                prel += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Delete' class='ui-icon ui-icon-trash'></span></a>";
              } else if (actn === "del") {
                npos = getTarg(parent.ftree, parent.loc, "del", launch - 2);
                prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'>[unmark]</a></div>";
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
            parent.callback(parent.rows, "<tr><td><hr style='border:0px; width:90%; background-color: #999; height:1px;'></td></tr>");
            posl = parent.targ + "/" + parent.about;
            _ref12 = parent.branch.slice(3);
            for (j = 0, _len10 = _ref12.length; j < _len10; j++) {
              currBranch = _ref12[j];
              if (currBranch[0] === "ins" && currBranch[1][0] === parent.about && currBranch[1][1] === void 0) {
                _ref13 = currBranch[2];
                for (_p = 0, _len11 = _ref13.length; _p < _len11; _p++) {
                  currBranchType = _ref13[_p];
                  if (!(currBranchType[0] === "add")) continue;
                  locn = parent.loc.concat([j + 1]);
                  uid = new uidraw(parent.rows + 1 + ++parent.addsout, parent, "<tr><td>", "</td></tr>", rootURI, [], [], parent.filters, locn, !parent.even, parent.ftree, cmod);
                  uid.subRowIn();
                  break;
                }
              }
            }
            parent.callback(parent.rows + 1 + parent.adds + 1, "<tr><td><hr style='border:0px; width:90%; background-color: #999; height:1px;'></td></tr>");
            _ref14 = cmod.slice(1);
            _results = [];
            for (_q = 0, _len12 = _ref14.length; _q < _len12; _q++) {
              mod = _ref14[_q];
              if (mod[0] === "FactType") {
                _results.push((function() {
                  var _len13, _len14, _r, _ref15, _ref16, _results2;
                  _ref15 = mod.slice(1);
                  _results2 = [];
                  for (_r = 0, _len13 = _ref15.length; _r < _len13; _r++) {
                    termVerb = _ref15[_r];
                    if (!(termVerb[1] === parent.about)) continue;
                    launch = -1;
                    _ref16 = parent.branch.slice(3);
                    for (k = 0, _len14 = _ref16.length; k < _len14; k++) {
                      branch = _ref16[k];
                      if (!(branch[1][0] === getIdent(mod))) continue;
                      launch = k + 1;
                      break;
                    }
                    parent.colsout++;
                    res = "";
                    pre = "<tr id='tr--data--" + getIdent(mod) + "'><td>";
                    post = "</td></tr>";
                    if (launch !== -1) {
                      npos = getTarg(parent.ftree, parent.loc, "del", launch);
                      pre += "<div style='display:inline;background-color:" + parent.unbg + "'>" + getIdent(mod) + "</div>";
                      pre += "<div style='display:inline;background-color:" + parent.unbg + "'><a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
                      subcolcb = {
                        callback: function(n, prod) {
                          return parent.callback(n, prod);
                        }
                      };
                      uid = new uidraw(parent.rows + 1 + parent.adds + 1 + parent.colsout, subcolcb, pre, post, rootURI, [], [], parent.filters, loc.concat([launch]), !parent.even, parent.ftree, cmod);
                      _results2.push(uid.subRowIn());
                    } else {
                      newb = ["col", [getIdent(mod)], ["mod"]];
                      npos = getTarg(parent.ftree, parent.loc, "add", newb);
                      pre += getIdent(mod);
                      pre += " <a href='" + parent.rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
                      res += pre + post;
                      _results2.push(parent.callback(parent.rows + 1 + parent.adds + 1 + parent.colsout, res));
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
          _ref6 = this.branch[2].slice(1);
          for (_n = 0, _len6 = _ref6.length; _n < _len6; _n++) {
            branchType = _ref6[_n];
            if (!((_ref7 = branchType[0]) === "add" || _ref7 === "edit" || _ref7 === "del")) {
              continue;
            }
            actn = branchType[0];
            break;
          }
          switch (actn) {
            case "view":
              if (this.type === "Term") {
                this.targ = serverAPI(this.about, this.filters);
                return serverRequest("GET", this.targ, {}, null, function(statusCode, result, headers) {
                  var item, res;
                  res = "";
                  for (item in result.instances[0]) {
                    if (item !== "__clone") {
                      res += item + ": " + result.instances[0][item] + "<br/>";
                    }
                  }
                  return parent.callback(1, res);
                });
              } else if (this.type === "FactType") {
                this.targ = serverAPI(this.about, this.filters);
                return serverRequest("GET", this.targ, {}, null, function(statusCode, result, headers) {
                  var res, schema, _len7, _o, _ref8;
                  res = "id: " + result.instances[0].id + "<br/>";
                  _ref8 = parent.schema;
                  for (_o = 0, _len7 = _ref8.length; _o < _len7; _o++) {
                    schema = _ref8[_o];
                    if (schema[0] === "Term") {
                      res += result.instances[0][schema[1] + "_name"] + " ";
                    } else if (schema[0] === "Verb") {
                      res += schema[1] + " ";
                    }
                  }
                  return parent.callback(1, res);
                });
              }
              break;
            case "add":
              if (this.type === "Term") {
                schema = [['Text', '_name', 'Name', []]];
                res = "<div align='right'>";
                res += "<form class='action'>";
                res += createHiddenInputs('addterm', serverAPI(this.about, []), targ, this.about);
                console.log("addterm backURI=" + targ);
                for (_o = 0, _len7 = schema.length; _o < _len7; _o++) {
                  currSchema = schema[_o];
                  switch (currSchema[0]) {
                    case "Text":
                      res += currSchema[2] + ": " + widgets.inputText(currSchema[1]) + "<br />";
                      break;
                    case "ForeignKey":
                      alert(currSchema);
                  }
                }
                res += "<input type='submit' value='Submit This' onClick='processForm(this.parentNode);return false;'>";
                res += "</form>";
                res += "</div>";
                return this.callback(1, res);
              } else if (this.type === "FactType") {
                termResults = {};
                _ref8 = parent.schema;
                for (_p = 0, _len8 = _ref8.length; _p < _len8; _p++) {
                  schema = _ref8[_p];
                  if (schema[0] === "Term") termResults[schema[1]] = [];
                }
                resultsReceived = 0;
                resultsRequested = Object.keys(termResults).length;
                _results = [];
                for (termName in termResults) {
                  _results.push(serverRequest("GET", serverAPI(termName, parent.filters), {}, null, (function(termName) {
                    return function(statusCode, result, headers) {
                      termResults[termName] = result.instances;
                      resultsReceived++;
                      if (resultsReceived === resultsRequested) {
                        res = createFactTypeForm(parent.schema, termResults, 'addfctp', serverAPI(parent.about, []), posl, parent.about);
                        return parent.callback(1, res);
                      }
                    };
                  })(termName)));
                }
                return _results;
              }
              break;
            case "edit":
              if (this.type === "Term") {
                schema = [['Text', '_name', 'Name', []]];
                this.targ = serverAPI(this.about, this.filters);
                return serverRequest("GET", this.targ, {}, null, function(statusCode, result, headers) {
                  var currSchema, id, _len9, _q;
                  id = result.instances[0].id;
                  res = "<div align='left'>";
                  res += "<form class='action'>";
                  res += createHiddenInputs('editterm', serverAPI(parent.about, []) + "." + id, serverAPI(parent.about, []), parent.about, id);
                  res += "id: " + id + "<br/>";
                  for (_q = 0, _len9 = schema.length; _q < _len9; _q++) {
                    currSchema = schema[_q];
                    switch (currSchema[0]) {
                      case "Text":
                        res += currSchema[2] + ": " + widgets.inputText(currSchema[1], result.instances[0][currSchema[1]]) + "<br />";
                        break;
                      case "ForeignKey":
                        console.log(currSchema);
                    }
                  }
                  res += "<div align='right'>";
                  res += "<input type='submit' value='Submit This' onClick='processForm(this.parentNode.parentNode);return false;'>";
                  res += "</div>";
                  res += "</form>";
                  res += "</div>";
                  return parent.callback(1, res);
                });
              } else if (this.type === "FactType") {
                this.targ = serverAPI(this.about, this.filters);
                return serverRequest("GET", this.targ, {}, null, function(statusCode, result, headers) {
                  var currentFactType, schema, termName, _len9, _q, _ref9, _results2;
                  currentFactType = result.instances[0];
                  termResults = {};
                  _ref9 = parent.schema;
                  for (_q = 0, _len9 = _ref9.length; _q < _len9; _q++) {
                    schema = _ref9[_q];
                    if (schema[0] === "Term") termResults[schema[1]] = [];
                  }
                  resultsReceived = 0;
                  resultsRequested = Object.keys(termResults).length;
                  _results2 = [];
                  for (termName in termResults) {
                    _results2.push(serverRequest("GET", serverAPI(termName, parent.filters), {}, null, (function(termName) {
                      return function(statusCode, result, headers) {
                        termResults[termName] = result.instances;
                        resultsReceived++;
                        if (resultsReceived === resultsRequested) {
                          res = "<div align='left'>";
                          res += createFactTypeForm(parent.schema, termResults, 'editfctp', serverAPI(parent.about, []) + "." + currentFactType.id, serverAPI(parent.about, []), parent.about, currentFactType);
                          res += "</div>";
                          return parent.callback(1, res);
                        }
                      };
                    })(termName)));
                  }
                  return _results2;
                });
              }
              break;
            case "del":
              res = "<div align='left'>" + "marked for deletion" + "<div align='right'>" + "<form class='action'>" + createHiddenInputs('del', serverAPI(this.about, []) + "." + this.id, serverAPI(this.about, []), this.about, this.id) + "<input type='submit' value='Confirm' onClick='processForm(this.parentNode.parentNode);return false;'>" + "</form>" + "</div>" + "</div>";
              return this.callback(1, res);
          }
        }
      };
      return this;
    };
    createHiddenInputs = function(action, serverURI, backURI, type, id) {
      var res;
      if (id == null) id = false;
      res = "<input type='hidden' id='__actype' value='" + action + "'>";
      res += "<input type='hidden' id='__serverURI' value='" + serverURI + "'>";
      res += "<input type='hidden' id='__backURI' value='" + backURI + "'>";
      res += "<input type='hidden' id='__type' value='" + type + "'>";
      if (id !== false) {
        res += "<input type='hidden' id='__id' value='" + id + "'>";
      }
      return res;
    };
    createFactTypeForm = function(schemas, termResults, action, serverURI, backURI, type, currentFactType) {
      var res, schema, select, term, termName, termResult, termSelects, _i, _j, _len, _len2;
      if (currentFactType == null) currentFactType = false;
      termSelects = {};
      for (termName in termResults) {
        termResult = termResults[termName];
        select = "<select id='" + termName + "'>";
        for (_i = 0, _len = termResult.length; _i < _len; _i++) {
          term = termResult[_i];
          select += "<option value='" + term.id + "'";
          if (currentFactType !== false && currentFactType[termName + "_id"] === term.id) {
            select += " selected='selected'";
          }
          select += ">" + term.name + "</option>";
        }
        select += "</select>";
        termSelects[termName] = select;
      }
      res = "<form class='action'>";
      res += createHiddenInputs(action, serverURI, backURI, type, currentFactType === false ? false : currentFactType.id);
      for (_j = 0, _len2 = schemas.length; _j < _len2; _j++) {
        schema = schemas[_j];
        if (schema[0] === "Term") {
          res += termSelects[schema[1]] + " ";
        } else if (schema[0] === "Verb") {
          res += schema[1] + " ";
        }
      }
      res += "<div align='right'>";
      res += "<input type='submit' value='Submit This' onClick='processForm(this.parentNode.parentNode);return false;'>";
      res += "</div>";
      res += "</form>";
      return res;
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
      serverRequest("DELETE", uri, {}, null, function(statusCode, result, headers) {
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
      serverRequest("PUT", serverURI, {}, obj, function(statusCode, result, headers) {
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
      serverRequest("POST", uri, {}, obj, function(statusCode, result, headers) {
        return location.hash = "#!" + backURI;
      });
      return false;
    };
    filtmerge = function(branch, fltrs) {
      var filters, leaf, rootURI, _i, _len, _ref;
      filters = jQuery.extend(true, [], fltrs);
      rootURI = "/data/" + branch[1][0];
      _ref = branch[2].slice(1);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        leaf = _ref[_i];
        if (leaf[0] === "filt") {
          if (leaf[1][1][0] === void 0) leaf[1][1] = branch[1][0];
          filters.push(leaf[1]);
        }
      }
      return filters;
    };
    window.drawData = drawData;
    return window.processForm = processForm;
  });

}).call(this);
