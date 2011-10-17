var addInst, delInst, drawData, editInst, filtmerge, getBranch, getPid, getTarg, processForm, serverAPI, uidraw;
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
    branch = branch[childIndex(+2)];
    if (branch[0] === "col") {
      pid += "--" + branch[1][0];
    } else {
      pid += "--" + branch[1][1];
    }
  }
  return pid;
};
getTarg = function(tree, loc, actn, newb) {
  var childIndex, i, parr, ptree, _i, _len;
  ptree = jQuery.extend(true, [], tree);
  parr = ptree;
  i = 0;
  for (_i = 0, _len = parr.length; _i < _len; _i++) {
    childIndex = parr[_i];
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
  var flts, i, op;
  op = {
    eq: "=",
    ne: "!=",
    lk: "~"
  };
  flts = "";
  i = 1;
  while (i < filters.length) {
    if (about === filters[i][1]) {
      flts = flts + filters[i][1] + "." + filters[i][2] + op[filters[i][0]] + filters[i][3] + ";";
    }
    i++;
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
    var i, j, launch, newb, npos, objcb, post, pre, _results;
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
    i = 0;
    _results = [];
    while (i < result.terms.length) {
      launch = -1;
      j = 3;
      while (j < tree.length) {
        if (tree[j][1][0] === result.terms[i].id) {
          launch = j;
        }
        j++;
      }
      pre = "<tr id='tr--data--" + result.terms[i].id + "'><td>";
      if (launch === -1) {
        pre += result.terms[i].name;
      } else {
        pre += "<div style='display:inline; background-color:#FFFFFF; " + "'>" + result.terms[i].name + "</div>";
      }
      post = "</td></tr>";
      if (launch !== -1) {
        npos = getTarg(tree, [], "del", launch - 2);
        pre += "<div style='display:inline;background-color:#FFFFFF" + "'> " + "<a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
        serverRequest("GET", "/model/", [], "", function(statusCode, result) {
          var model, uid;
          model = SBVRParser.matchAll(result, "expr");
          model = SBVR_PreProc.match(model, "optimizeTree");
          model = SBVR2SQL.match(model, "trans");
          uid = new uidraw(i, objcb, pre, post, rootURI, [], [], filters, [launch - 2], true, tree, model);
          return uid.subRowIn();
        });
      } else {
        newb = ["col", [result.terms[i].id], ["mod"]];
        npos = getTarg(tree, [], "add", newb);
        pre += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
        objcb.callback(i, pre + post);
      }
      _results.push(i++);
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
    var actn, addftcb, i, k, parent, posl, res, schm, tar, targ, trmres, trms, trmsel, _results;
    parent = this;
    if (this.branch[0] === "col") {
      this.pre += "<div class='panel' style='background-color:" + this.bg + ";'>" + "<table id='tbl--" + pid + "'><tbody>";
      this.post += "</tbody></table></div>";
      this.targ = serverAPI(this.about, this.filters);
      j = 3;
      while (j < this.branch.length) {
        if (this.branch[j][0] === "ins" && this.branch[j][1][0] === this.about && this.branch[j][1][1] === void 0) {
          k = 1;
          while (k < this.branch[j][2].length) {
            if (this.branch[j][2][k][0] === "add") {
              this.adds++;
            }
            k++;
          }
        }
        j++;
      }
      i = 1;
      while (i < cmod.length) {
        if (cmod[i][0] === "fcTp") {
          j = 0;
          while (j < cmod[i][6].length) {
            if (cmod[i][6][j][1] === this.about) {
              this.cols++;
            }
            j++;
          }
        }
        i++;
      }
      return serverRequest("GET", this.targ, [], "", function(statusCode, result, headers) {
        var actn, isadd, launch, locn, newb, npos, posl, postl, prel, res, resl, subcolcb, uid, _results;
        resl = "";
        parent.rows = result.instances.length;
        parent.items = parent.rows + 2 + parent.adds + 1 + parent.cols;
        newb = ["ins", [parent.about], ["mod", ["add"]]];
        npos = getTarg(parent.ftree, parent.loc, "add", newb);
        parent.data.push([parent.rows + 1, "<tr><td><a href = '" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false;'>" + "[(+)add new]</a></td></tr>"]);
        i = 0;
        while (i < result.instances.length) {
          launch = -1;
          actn = "view";
          j = 3;
          while (j < parent.branch.length) {
            if (parent.branch[j][0] === "ins" && parent.branch[j][1][0] === parent.about && (parent.branch[j][1][1] === result.instances[i].id || parent.branch[j][1][1] === result.instances[i].name) && parent.branch[j][1][1] !== void 0) {
              launch = j;
              k = 1;
              while (k < parent.branch[j][2].length) {
                if (parent.branch[j][2][k][0] === "edit") {
                  actn = "edit";
                  break;
                }
                if (parent.branch[j][2][k][0] === "del") {
                  actn = "del";
                  break;
                }
                k++;
              }
            }
            j++;
          }
          posl = parent.targ + "/" + parent.about + "." + result.instances[i].id;
          prel = "<tr id='tr--" + pid + "--" + result.instances[i].id + "'><td>";
          if (launch !== -1) {
            prel += "<div style='display:inline;background-color:" + parent.unbg + "'>";
          }
          if (parent.type === "term") {
            prel += result.instances[i].name;
          } else if (parent.type === "fcTp") {
            j = 0;
            while (j < parent.schema.length) {
              if (parent.schema[j][0] === "term") {
                prel += result.instances[i][parent.schema[j][1] + "_name"] + " ";
              } else {
                if (parent.schema[j][0] === "verb") {
                  prel += "<em>" + parent.schema[j][1] + "</em> ";
                }
              }
              j++;
            }
          }
          if (launch !== -1) {
            prel += "</div>";
          }
          if (launch !== -1 && actn === "view") {
            npos = getTarg(parent.ftree, parent.loc, "del", launch - 2);
            prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
          } else if (launch === -1) {
            newb = ["ins", [parent.about, result.instances[i].id], ["mod"]];
            npos = getTarg(parent.ftree, parent.loc, "add", newb);
            prel += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='View' class='ui-icon ui-icon-search'></span></a>";
          }
          if (launch !== -1 && actn === "edit") {
            npos = getTarg(parent.ftree, parent.loc, "del", launch - 2);
            prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
          } else if (launch === -1) {
            newb = ["ins", [parent.about, result.instances[i].id], ["mod", ["edit"]]];
            npos = getTarg(parent.ftree, parent.loc, "add", newb);
            prel += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Edit' class='ui-icon ui-icon-pencil'></span></a>";
          }
          if (launch !== -1 && actn === "del") {
            npos = getTarg(parent.ftree, parent.loc, "del", launch - 2);
            prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'>[unmark]</a></div>";
          } else if (launch === -1) {
            newb = ["ins", [parent.about, result.instances[i].id], ["mod", ["del"]]];
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
          i++;
        }
        parent.callback(parent.rows, "<tr><td>" + "<hr style='border:0px; width:90%; background-color: #999; height:1px;'>" + "</td></tr>");
        posl = parent.targ + "/" + parent.about;
        j = 3;
        while (j < parent.branch.length) {
          if (parent.branch[j][0] === "ins" && parent.branch[j][1][0] === parent.about && parent.branch[j][1][1] === void 0) {
            isadd = false;
            k = 1;
            while (k < parent.branch[j][2].length) {
              if (parent.branch[j][2][k][0] === "add") {
                isadd = true;
              }
              k++;
            }
            if (isadd) {
              locn = parent.loc.concat([j - 2]);
              uid = new uidraw(parent.rows + 1 + ++parent.addsout, parent, "<tr><td>", "</td></tr>", rootURI, [], [], parent.filters, locn, !parent.even, parent.ftree, cmod);
              uid.subRowIn();
            }
          }
          j++;
        }
        parent.callback(parent.rows + 1 + parent.adds + 1, "<tr><td>" + "<hr style='border:0px; width:90%; background-color: #999; height:1px;'>" + "</td></tr>");
        i = 1;
        _results = [];
        while (i < cmod.length) {
          if (cmod[i][0] === "fcTp") {
            j = 0;
            while (j < cmod[i][6].length) {
              if (cmod[i][6][j][1] === parent.about) {
                launch = -1;
                j = 3;
                while (j < parent.branch.length) {
                  if (parent.branch[j][1][0] === cmod[i][1]) {
                    launch = j - 2;
                    break;
                  }
                  j++;
                }
                parent.colsout++;
                res = "";
                pre = "<tr id='tr--data--" + cmod[i][1] + "'><td>";
                if (launch === -1) {
                  pre += cmod[i][2];
                } else {
                  pre += "<div style='display:inline;background-color:" + parent.unbg + "'>" + cmod[i][2] + "</div>";
                }
                post = "</td></tr>";
                if (launch !== -1) {
                  npos = getTarg(parent.ftree, parent.loc, "del", launch);
                  pre += "<div style='display:inline;background-color:" + parent.unbg + "'>" + " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a>" + "</div>";
                  subcolcb = {
                    callback: function(n, prod) {
                      return parent.callback(n, prod);
                    }
                  };
                  uid = new uidraw(parent.rows + 1 + parent.adds + 1 + parent.colsout, subcolcb, pre, post, rootURI, [], [], parent.filters, loc.concat([launch]), !parent.even, parent.ftree, cmod);
                  uid.subRowIn();
                } else {
                  newb = ["col", [cmod[i][1]], ["mod"]];
                  npos = getTarg(parent.ftree, parent.loc, "add", newb);
                  pre += " <a href='" + parent.rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
                  res += pre + post;
                  parent.callback(parent.rows + 1 + parent.adds + 1 + parent.colsout, res);
                }
              }
              j++;
            }
          }
          _results.push(i++);
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
      i = 1;
      while (i < this.branch[2].length) {
        if (this.branch[2][i][0] === "add") {
          actn = "add";
          break;
        } else if (this.branch[2][i][0] === "edit") {
          actn = "edit";
          break;
        } else if (this.branch[2][i][0] === "del") {
          actn = "del";
          break;
        }
        i++;
      }
      switch (actn) {
        case "view":
          if (this.type === "term") {
            this.targ = serverAPI(this.about, this.filters);
            return serverRequest("GET", this.targ, [], "", function(statusCode, result, headers) {
              var item, res;
              res = "";
              for (item in result.instances[0]) {
                if (item !== "__clone") {
                  res += item + ": " + result.instances[0][item] + "<br/>";
                }
              }
              return parent.callback(1, res);
            });
          } else if (this.type === "fcTp") {
            this.targ = serverAPI(this.about, this.filters);
            return serverRequest("GET", this.targ, [], "", function(statusCode, result, headers) {
              var res;
              res = "";
              res += "id: " + result.instances[0].id + "<br/>";
              j = 0;
              while (j < parent.schema.length) {
                if (parent.schema[j][0] === "term") {
                  res += result.instances[0][parent.schema[j][1] + "_name"] + " ";
                } else {
                  if (parent.schema[j][0] === "verb") {
                    res += parent.schema[j][1] + " ";
                  }
                }
                j++;
              }
              return parent.callback(1, res);
            });
          }
          break;
        case "add":
          if (this.type === "term") {
            schm = "";
            j = 1;
            while (j < cmod.length) {
              if (cmod[j][1] === this.about) {
                schm = cmod[j][3];
              }
              j++;
            }
            res = "<div align='right'>";
            res += "<form class = 'action' >";
            res += "<input type='hidden' id='__actype' value='addterm'>";
            res += "<input type='hidden' id='__serverURI' value='" + serverAPI(this.about, []) + "'>";
            res += "<input type='hidden' id='__backURI' value='" + targ + "'>";
            console.log("addterm backURI=" + targ);
            res += "<input type='hidden' id='__type' value='" + this.about + "'>";
            j = 0;
            while (j < schm.length) {
              switch (schm[j][0]) {
                case "Text":
                  res += schm[j][2] + ": <input type='text' id='" + schm[j][1] + "' /><br />";
                  break;
                case "ForeignKey":
                  alert(schm[j]);
              }
              j++;
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
              res = "";
              trmres.push(result.instances);
              if (trms.length === trmres.length) {
                j = 0;
                while (j < trms.length) {
                  res = "<select id='" + trms[j] + "_id'>";
                  k = 0;
                  while (k < trmres[j].length) {
                    res += "<option value='" + trmres[j][k].id + "'>" + trmres[j][k].name + "</option>";
                    k++;
                  }
                  res += "</select>";
                  trmsel[trms[j]] = res;
                  j++;
                }
                res = "";
                res += "<form class = 'action' >";
                res += "<input type='hidden' id='__actype' value='addfctp'>";
                res += "<input type='hidden' id='__serverURI' value='" + serverAPI(parent.about, []) + "'>";
                res += "<input type='hidden' id='__backURI' value='" + posl + "'>";
                res += "<input type='hidden' id='__type' value='" + parent.about + "'>";
                j = 0;
                while (j < parent.schema.length) {
                  if (parent.schema[j][0] === "term") {
                    res += trmsel[parent.schema[j][1]] + " ";
                  } else {
                    if (parent.schema[j][0] === "verb") {
                      res += parent.schema[j][1] + " ";
                    }
                  }
                  j++;
                }
                res += "<div align='right'>";
                res += "<input type='submit' value='Submit This'" + " onClick='processForm(this.parentNode.parentNode);return false;'>";
                res += "</div>";
                res += "</form>";
                return parent.callback(1, res);
              }
            };
            j = 0;
            while (j < this.schema.length) {
              if (this.schema[j][0] === "term") {
                trms.push(this.schema[j][1]);
              }
              j++;
            }
            j = 0;
            _results = [];
            while (j < this.schema.length) {
              if (this.schema[j][0] === "term") {
                tar = serverAPI(this.schema[j][1], this.filters);
                serverRequest("GET", tar, [], "", addftcb);
              } else if (this.schema[j][0] === "verb") {
                null;
              }
              _results.push(j++);
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
                var respo, respr;
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