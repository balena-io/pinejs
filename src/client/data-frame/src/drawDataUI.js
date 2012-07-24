(function() {
  var __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  define(['data-frame/ClientURIUnparser', 'utils/createAsyncQueueCallback', 'ejs'], function(ClientURIUnparser, createAsyncQueueCallback, ejs) {
    var addInst, createNavigableTree, delInst, drawData, editInst, getResolvedFactType, getTermResults, processForm, serverAPI, templates, uidraw;
    templates = {
      widgets: {},
      hiddenFormInput: ejs.compile('<input type="hidden" id="__actype" value="<%= action %>">\n<input type="hidden" id="__serverURI" value="<%= serverURI %>">\n<input type="hidden" id="__backURI" value="<%= backURI %>">\n<input type="hidden" id="__type" value="<%= type %>">\n<% if(id !== false) { %>\n	<input type="hidden" id="__id" value="<%= id %>">\n<% } %>'),
      factTypeForm: ejs.compile('<form class="action">\n	<%- templates.hiddenFormInput(locals) %><%\n	for(var i = 0; i < factType.length; i++) {\n		var factTypePart = factType[i];\n		switch(factTypePart[0]) {\n			case "Term":\n				var termName = factTypePart[1],\n					termResult = termResults[termName]; %>\n				<select id="<%= termName %>"><%\n					for(var j = 0; j < termResult.length; j++) {\n						var term = termResult[j]; %>\n						<option value="<%= term.id %>"<%\n							if(currentFactType !== false && currentFactType[termName].id == term.id) { %>\n								selected="selected" <%\n							} %>\n						>\n							<%= term.value %>\n						</option><%\n					} %>\n				</select><%\n			break;\n			case "Verb":\n				%><%= factTypePart[1] %><%\n			break;\n		}\n	} %>\n	<div align="right">\n		<input type="submit" value="Submit This" onClick="processForm(this.parentNode.parentNode);return false;">\n	</div>\n</form>'),
      termForm: ejs.compile('<div align="left">\n	<form class="action">\n		<%- templates.hiddenFormInput(locals) %>\n		id: <%= id %><br/><%\n\n		for(var i = 0; i < termFields.length; i++) {\n			var termField = termFields[i]; %>\n			<%= termField[2] %>: <%\n			switch(termField[0]) {\n				case "Text": %>\n					<%- templates.widgets.inputText(termField[1], term === false ? "" : term[termField[1]]) %><%\n				break;\n				case "ForeignKey":\n					console.error("Hit FK", termField);\n				break;\n				default:\n					console.error("Hit default, wtf?");\n			} %>\n			<br /><%\n		} %>\n		<div align="right">\n			<input type="submit" value="Submit This" onClick="processForm(this.parentNode.parentNode);return false;">\n		</div>\n	</form>\n</div>'),
      deleteForm: ejs.compile('<div align="left">\n	marked for deletion\n	<div align="right">\n		<form class="action">\n			<%- templates.hiddenFormInput(locals) %>\n			<input type="submit" value="Confirm" onClick="processForm(this.parentNode.parentNode);return false;">\n		</form>\n	</div>\n</div>'),
      factTypeCollection: ejs.compile('<%\nfor(var i = 0; i < factTypeCollections.length; i++) {\n	var factTypeCollection = factTypeCollections[i]; %>\n	<tr id="tr--data--<%= factTypeCollection.resourceName %>">\n		<td><%\n			if(factTypeCollection.isExpanded) { %>\n				<div style="display:inline;background-color:"<%= altBackground %>"><%= factTypeCollection.resourceName %></div>\n				<div style="display:inline;background-color:"<%= altBackground %>">\n					<a href="<%= factTypeCollection.uri %>" onClick="location.hash=\'<%= factTypeCollection.hash %>\';return false">\n						<span title="Close" class="ui-icon ui-icon-circle-close"></span>\n					</a>\n				</div>\n				<%- factTypeCollection.html %><%\n			}\n			else { %>\n				<%= factTypeCollection.resourceName %>\n				<a href="<%= factTypeCollection.uri %>" onClick="location.hash=\'<%= factTypeCollection.hash %>\';return false">\n					<span title="See all" class="ui-icon ui-icon-search"></span>\n				</a><%\n			} %>\n		</td>\n	</tr><%\n} %>')
    };
    requirejs(['data-frame/widgets/inputText'], function(inputText) {
      return templates.widgets.inputText = inputText;
    });
    createNavigableTree = function(tree, descendTree) {
      var ascend, currentLocation, descendByIndex, getIndexForResource, index, previousLocations, _i, _len;
      if (descendTree == null) descendTree = [];
      tree = jQuery.extend(true, [], tree);
      descendTree = jQuery.extend(true, [], descendTree);
      previousLocations = [];
      currentLocation = tree;
      getIndexForResource = function(resourceName, resourceID) {
        var j, leaf, _len, _ref, _ref2, _ref3;
        for (j = 0, _len = currentLocation.length; j < _len; j++) {
          leaf = currentLocation[j];
          if (((_ref = leaf[0]) === 'collection' || _ref === 'instance') && ((_ref2 = leaf[1]) != null ? _ref2[0] : void 0) === resourceName && (!(resourceID != null) || (leaf[1][1] !== void 0 && (_ref3 = leaf[1][1], __indexOf.call(resourceID, _ref3) >= 0)))) {
            return j;
          }
        }
        return false;
      };
      ascend = function() {
        currentLocation = previousLocations.pop();
        return descendTree.pop();
      };
      descendByIndex = function(index) {
        descendTree.push(index);
        previousLocations.push(currentLocation);
        return currentLocation = currentLocation[index];
      };
      for (_i = 0, _len = descendTree.length; _i < _len; _i++) {
        index = descendTree[_i];
        previousLocations.push(currentLocation);
        currentLocation = currentLocation[index];
      }
      return {
        getCurrentLocation: function() {
          return currentLocation;
        },
        getCurrentIndex: function() {
          return descendTree[descendTree.length - 1];
        },
        descendByIndex: function(index) {
          descendByIndex(index);
          return this;
        },
        getAbout: function() {
          var _ref;
          if (((_ref = currentLocation[1]) != null ? _ref[0] : void 0) != null) {
            return currentLocation[1][0];
          } else {
            return currentLocation[0];
          }
        },
        getAction: function(resourceName, resourceID) {
          var currBranch, currBranchType, _j, _len2, _ref, _ref2;
          index = getIndexForResource(resourceName, resourceID);
          if (index !== false) {
            currBranch = currentLocation[index];
            _ref = currBranch[2].slice(1);
            for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
              currBranchType = _ref[_j];
              if ((_ref2 = currBranchType[0]) === 'view' || _ref2 === 'edit' || _ref2 === 'del') {
                return currBranchType[0];
              }
            }
          }
          return 'view';
        },
        getPid: function() {
          var index, pid, pidTree, _j, _len2;
          pidTree = tree;
          pid = pidTree[1][0];
          for (_j = 0, _len2 = descendTree.length; _j < _len2; _j++) {
            index = descendTree[_j];
            pidTree = pidTree[index];
            if (pidTree[0] === 'collection') {
              pid += "--" + pidTree[1][0];
            } else {
              pid += "--" + pidTree[1][1];
            }
          }
          return pid;
        },
        getServerURI: function() {
          var filters, leaf, op, _j, _len2, _ref;
          op = {
            eq: "=",
            ne: "!=",
            lk: "~"
          };
          filters = [];
          _ref = currentLocation[2];
          for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
            leaf = _ref[_j];
            if (!(leaf[0] === "filt")) continue;
            leaf = leaf[1];
            if (leaf[1][0] === void 0) leaf[1] = this.getAbout();
            filters.push([leaf[2], op[leaf[0]], leaf[3]]);
          }
          return serverAPI(this.getAbout(), filters);
        },
        isExpanded: function(resourceName, resourceID) {
          return getIndexForResource(resourceName, resourceID) !== false;
        },
        descend: function(resourceName, resourceID) {
          index = getIndexForResource(resourceName, resourceID);
          descendByIndex(index);
          return this;
        },
        modify: function(action, change) {
          var oldIndex;
          switch (action) {
            case "add":
              currentLocation.push(change);
              break;
            case "del":
              oldIndex = ascend();
              currentLocation.splice(oldIndex, 1);
          }
          return this;
        },
        getURI: function() {
          return ClientURIUnparser.match(tree, "trans");
        },
        clone: function() {
          return createNavigableTree(tree, descendTree);
        },
        getChangeURI: function(action, resourceName, resourceID) {
          var resource;
          resource = [resourceName];
          if (resourceID != null) resource.push(resourceID);
          return this.getNewURI("add", ['instance', resource, ["mod", [action]]]);
        },
        getNewURI: function(action, change) {
          return this.clone().modify(action, change).getURI();
        }
      };
    };
    getResolvedFactType = function(factType, factTypeInstance, successCallback, errorCallback) {
      var asyncCallback, factTypePart, i, idField, isBooleanFactType, uri, valueField, _len;
      factTypeInstance = $.extend(true, {}, factTypeInstance);
      asyncCallback = createAsyncQueueCallback(function() {
        return successCallback(factTypeInstance);
      }, errorCallback);
      isBooleanFactType = factType.length === 3;
      for (i = 0, _len = factType.length; i < _len; i++) {
        factTypePart = factType[i];
        if (factTypePart[0] === "Term") {
          asyncCallback.addWork(1);
          idField = isBooleanFactType ? 'id' : factTypePart[1];
          valueField = factTypePart[1];
          uri = serverAPI(factTypePart[1], [['id', '=', factTypeInstance[idField]]]);
          serverRequest("GET", uri, {}, null, (function(valueField) {
            return function(statusCode, result, headers) {
              factTypeInstance[valueField] = result.instances[0];
              return asyncCallback.successCallback();
            };
          })(valueField), asyncCallback.errorCallback);
        }
      }
      return asyncCallback.endAdding();
    };
    getTermResults = function(factType, successCallback) {
      var factTypePart, resultsReceived, resultsRequested, termName, termResults, _i, _len, _results;
      termResults = {};
      for (_i = 0, _len = factType.length; _i < _len; _i++) {
        factTypePart = factType[_i];
        if (factTypePart[0] === "Term") termResults[factTypePart[1]] = [];
      }
      resultsReceived = 0;
      resultsRequested = Object.keys(termResults).length;
      _results = [];
      for (termName in termResults) {
        _results.push(serverRequest("GET", serverAPI(termName), {}, null, (function(termName) {
          return function(statusCode, result, headers) {
            termResults[termName] = result.instances;
            resultsReceived++;
            if (resultsReceived === resultsRequested) {
              return successCallback(termResults);
            }
          };
        })(termName)));
      }
      return _results;
    };
    serverAPI = function(about, filters) {
      var filter, filterString, _i, _len;
      if (filters == null) filters = [];
      filterString = '';
      for (_i = 0, _len = filters.length; _i < _len; _i++) {
        filter = filters[_i];
        filterString += filter[0] + filter[1] + filter[2] + ";";
      }
      if (filterString !== '') filterString = "*filt:" + filterString;
      return "/data/" + about + filterString;
    };
    drawData = function(tree) {
      var rootURI;
      tree = createNavigableTree(tree);
      rootURI = location.pathname;
      $("#dataTab").html("<table id='terms'><tbody><tr><td></td></tr></tbody></table><div align='left'><br/><input type='button' value='Apply All Changes' onClick='runTrans($(\"#terms\"));return false;'></div>");
      return serverRequest("GET", "/data/", {}, null, function(statusCode, result, headers) {
        var asyncCallback, expandedTree, i, newb, npos, post, pre, term, _len, _ref, _results;
        asyncCallback = createAsyncQueueCallback(function(results) {
          var item, _i, _len, _results;
          results.sort(function(a, b) {
            return a[0] - b[0];
          });
          _results = [];
          for (_i = 0, _len = results.length; _i < _len; _i++) {
            item = results[_i];
            _results.push($("#terms").append(item[1]));
          }
          return _results;
        }, function(errors) {
          console.error(errors);
          return rowCallback(idx, 'Error: ' + errors);
        }, function(n, prod) {
          return [n, prod];
        });
        asyncCallback.addWork(result.terms.length);
        asyncCallback.endAdding();
        _ref = result.terms;
        _results = [];
        for (i = 0, _len = _ref.length; i < _len; i++) {
          term = _ref[i];
          term = result.terms[i];
          pre = "<tr id='tr--data--" + term.id + "'><td>";
          post = "</td></tr>";
          if (tree.isExpanded(term.id)) {
            expandedTree = tree.clone().descend(term.id);
            npos = expandedTree.getNewURI("del");
            pre += "<div style='display:inline; background-color:#FFFFFF;'>" + term.name + "</div>";
            pre += "<div style='display:inline;background-color:#FFFFFF'><a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
            _results.push((function(i, pre, post) {
              return serverRequest("GET", "/lfmodel/", {}, null, function(statusCode, result) {
                var uid;
                uid = new uidraw(i, asyncCallback.successCallback, pre, post, rootURI, true, expandedTree, result);
                return uid.subRowIn();
              });
            })(i, pre, post));
          } else {
            newb = ['collection', [term.id], ["mod"]];
            npos = tree.getNewURI("add", newb);
            pre += term.name;
            pre += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
            _results.push(asyncCallback.successCallback(i, pre + post));
          }
        }
        return _results;
      });
    };
    uidraw = function(idx, rowCallback, pre, post, rootURI, even, ftree, cmod) {
      var about, asyncCallback, currentLocation, getIdent, mod, parent, _i, _len, _ref;
      currentLocation = ftree.getCurrentLocation();
      about = ftree.getAbout();
      this.pre = pre;
      this.post = post;
      this.adds = 0;
      this.addsout = 0;
      this.cols = 0;
      this.colsout = 0;
      this.type = "Term";
      this.schema = [];
      if (even) {
        this.bg = "#FFFFFF";
        this.unbg = "#EEEEEE";
      } else {
        this.bg = "#EEEEEE";
        this.unbg = "#FFFFFF";
      }
      parent = this;
      asyncCallback = createAsyncQueueCallback(function(results) {
        var html, item, _i, _len;
        results.sort(function(a, b) {
          return a[0] - b[0];
        });
        html = parent.pre;
        for (_i = 0, _len = results.length; _i < _len; _i++) {
          item = results[_i];
          html += item[1];
        }
        html += parent.post;
        return rowCallback(idx, html);
      }, function(errors) {
        console.error(errors);
        return rowCallback(idx, 'Error: ' + errors);
      }, function(n, prod) {
        return [n, prod];
      });
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
        if (!(getIdent(mod) === about)) continue;
        this.type = mod[0];
        if (this.type === "FactType") this.schema = mod.slice(1);
      }
      this.subRowIn = function() {
        var actn, backURI, branchType, collection, currBranch, currBranchType, mod, res, targ, templateVars, termFields, _j, _k, _l, _len2, _len3, _len4, _len5, _len6, _m, _n, _ref2, _ref3, _ref4, _ref5, _ref6;
        if (currentLocation[0] === 'collection') {
          this.pre += "<div class='panel' style='background-color:" + this.bg + ";'><table id='tbl--" + ftree.getPid() + "'><tbody>";
          this.post += "</tbody></table></div>";
          for (_j = 0, _len2 = currentLocation.length; _j < _len2; _j++) {
            currBranch = currentLocation[_j];
            if (currBranch[0] === 'instance' && currBranch[1][0] === about && currBranch[1][1] === void 0) {
              _ref2 = currBranch[2].slice(1);
              for (_k = 0, _len3 = _ref2.length; _k < _len3; _k++) {
                currBranchType = _ref2[_k];
                if (currBranchType[0] === "add") this.adds++;
              }
            }
          }
          _ref3 = cmod.slice(1);
          for (_l = 0, _len4 = _ref3.length; _l < _len4; _l++) {
            mod = _ref3[_l];
            if (mod[0] === "FactType") {
              _ref4 = mod.slice(1);
              for (_m = 0, _len5 = _ref4.length; _m < _len5; _m++) {
                collection = _ref4[_m];
                if (getIdent(collection) === about) this.cols++;
              }
            }
          }
          targ = serverAPI(about);
          return serverRequest("GET", targ, {}, null, function(statusCode, result, headers) {
            var currBranch, currBranchType, expandedTree, factTypeCollections, factTypeCollectionsCallback, i, instance, j, mod, newTree, newb, npos, posl, resl, resourceName, rows, termVerb, uid, _fn, _len10, _len6, _len7, _len8, _len9, _n, _o, _p, _ref5, _ref6, _ref7, _ref8, _ref9;
            resl = "";
            rows = result.instances.length;
            asyncCallback.addWork(rows + 2 + parent.adds + 1 + 1);
            asyncCallback.endAdding();
            npos = ftree.getChangeURI('add', about);
            asyncCallback.successCallback(rows + 1, "<tr><td><a href = '" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false;'>[(+)add new]</a></td></tr>");
            _ref5 = result.instances;
            _fn = function(instance, i) {
              var processInstance;
              processInstance = function() {
                var action, expandedTree, isExpanded, posl, postl, prel, schema, uid, _len7, _n, _ref6;
                isExpanded = ftree.isExpanded(about, [instance.id, instance.value]);
                action = ftree.getAction(about, [instance.id, instance.value]);
                posl = targ + "/" + about + "*filt:id=" + instance.id;
                prel = "<tr id='tr--" + ftree.getPid() + "--" + instance.id + "'><td>";
                if (isExpanded) {
                  expandedTree = ftree.clone().descend(about, [instance.id, instance.value]);
                  prel += "<div style='display:inline;background-color:" + parent.unbg + "'>";
                }
                if (parent.type === "Term") {
                  prel += instance.value;
                } else if (parent.type === "FactType") {
                  _ref6 = parent.schema;
                  for (_n = 0, _len7 = _ref6.length; _n < _len7; _n++) {
                    schema = _ref6[_n];
                    if (schema[0] === "Term") {
                      prel += instance[schema[1]].value + " ";
                    } else if (schema[0] === "Verb") {
                      prel += "<em>" + schema[1] + "</em> ";
                    }
                  }
                }
                if (isExpanded) prel += "</div>";
                if (!isExpanded) {
                  npos = ftree.getChangeURI('view', about, instance.id);
                  prel += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='View' class='ui-icon ui-icon-search'></span></a>";
                } else if (action === "view") {
                  npos = expandedTree.getNewURI("del");
                  prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
                }
                if (!isExpanded) {
                  npos = ftree.getChangeURI('edit', about, instance.id);
                  prel += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Edit' class='ui-icon ui-icon-pencil'></span></a>";
                } else if (action === "edit") {
                  npos = expandedTree.getNewURI("del");
                  prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
                }
                if (!isExpanded) {
                  npos = ftree.getChangeURI('del', about, instance.id);
                  prel += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Delete' class='ui-icon ui-icon-trash'></span></a>";
                } else if (action === "del") {
                  npos = expandedTree.getNewURI("del");
                  prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'>[unmark]</a></div>";
                }
                postl = "</td></tr>";
                if (isExpanded) {
                  uid = new uidraw(i, asyncCallback.successCallback, prel, postl, rootURI, !even, expandedTree, cmod);
                  return uid.subRowIn();
                } else {
                  return asyncCallback.successCallback(i, prel + postl);
                }
              };
              if (parent.type === "FactType") {
                return getResolvedFactType(parent.schema, instance, function(factTypeInstance) {
                  instance = factTypeInstance;
                  return processInstance();
                }, function(errors) {
                  console.error(errors);
                  return asyncCallback.successCallback(i, 'Errors: ' + errors);
                });
              } else {
                return processInstance();
              }
            };
            for (i = 0, _len6 = _ref5.length; i < _len6; i++) {
              instance = _ref5[i];
              _fn(instance, i);
            }
            asyncCallback.successCallback(rows, "<tr><td><hr style='border:0px; width:90%; background-color: #999; height:1px;'></td></tr>");
            posl = targ + "/" + about;
            _ref6 = currentLocation.slice(3);
            for (j = 0, _len7 = _ref6.length; j < _len7; j++) {
              currBranch = _ref6[j];
              if (currBranch[0] === 'instance' && currBranch[1][0] === about && currBranch[1][1] === void 0) {
                _ref7 = currBranch[2];
                for (_n = 0, _len8 = _ref7.length; _n < _len8; _n++) {
                  currBranchType = _ref7[_n];
                  if (!(currBranchType[0] === "add")) continue;
                  newTree = ftree.clone().descendByIndex(j + 3);
                  uid = new uidraw(rows + 1 + ++parent.addsout, asyncCallback.successCallback, "<tr><td>", "</td></tr>", rootURI, !even, newTree, cmod);
                  uid.subRowIn();
                  break;
                }
              }
            }
            asyncCallback.successCallback(rows + 1 + parent.adds + 1, "<tr><td><hr style='border:0px; width:90%; background-color: #999; height:1px;'></td></tr>");
            factTypeCollections = [];
            factTypeCollectionsCallback = createAsyncQueueCallback(function() {
              var res, templateVars;
              templateVars = {
                factTypeCollections: factTypeCollections,
                templates: templates,
                altBackground: parent.unbg
              };
              res = templates.factTypeCollection(templateVars);
              return asyncCallback.successCallback(rows + 1 + parent.adds + 1, res);
            }, function(errors) {
              console.error(errors);
              return asyncCallback.successCallback(rows + 1 + parent.adds + 1, 'Error: ' + errors);
            }, function(index, html) {
              factTypeCollections[index].html = html;
              return null;
            });
            i = 0;
            _ref8 = cmod.slice(1);
            for (_o = 0, _len9 = _ref8.length; _o < _len9; _o++) {
              mod = _ref8[_o];
              if (mod[0] === "FactType") {
                _ref9 = mod.slice(1);
                for (_p = 0, _len10 = _ref9.length; _p < _len10; _p++) {
                  termVerb = _ref9[_p];
                  if (!(termVerb[1] === about)) continue;
                  resourceName = getIdent(mod);
                  factTypeCollections[i] = {
                    resourceName: resourceName,
                    isExpanded: ftree.isExpanded(resourceName)
                  };
                  if (factTypeCollections[i].isExpanded) {
                    expandedTree = ftree.clone().descend(resourceName);
                    factTypeCollections[i].hash = '#!/' + expandedTree.getNewURI("del");
                    factTypeCollections[i].uri = rootURI + factTypeCollections[i].hash;
                    factTypeCollectionsCallback.addWork(1);
                    uid = new uidraw(i, factTypeCollectionsCallback.successCallback, pre, post, rootURI, !even, expandedTree, cmod);
                    uid.subRowIn();
                  } else {
                    newb = ['collection', [resourceName], ["mod"]];
                    factTypeCollections[i].hash = '#!/' + ftree.getNewURI("add", newb);
                    factTypeCollections[i].uri = rootURI + factTypeCollections[i].hash;
                  }
                  i++;
                }
              }
            }
            return factTypeCollectionsCallback.endAdding();
          });
        } else if (currentLocation[0] === 'instance') {
          asyncCallback.addWork(1);
          asyncCallback.endAdding();
          this.pre += "<div class='panel' style='background-color:" + this.bg + ";'>";
          this.post += "</div>";
          backURI = ftree.getNewURI('del');
          this.id = currentLocation[1][1];
          actn = "view";
          _ref5 = currentLocation[2].slice(1);
          for (_n = 0, _len6 = _ref5.length; _n < _len6; _n++) {
            branchType = _ref5[_n];
            if (!((_ref6 = branchType[0]) === "add" || _ref6 === "edit" || _ref6 === "del")) {
              continue;
            }
            actn = branchType[0];
            break;
          }
          switch (actn) {
            case "view":
              if (this.type === "Term") {
                targ = serverAPI(about);
                return serverRequest("GET", targ, {}, null, function(statusCode, result, headers) {
                  var item, res;
                  res = "";
                  for (item in result.instances[0]) {
                    if (item !== "__clone") {
                      res += item + ": " + result.instances[0][item] + "<br/>";
                    }
                  }
                  return asyncCallback.successCallback(1, res);
                });
              } else if (this.type === "FactType") {
                targ = serverAPI(about);
                return serverRequest("GET", targ, {}, null, function(statusCode, result, headers) {
                  var res;
                  res = "id: " + result.instances[0].id + "<br/>";
                  return getResolvedFactType(parent.schema, result.instances[0], function(factTypeInstance) {
                    var schema, _len7, _o, _ref7;
                    _ref7 = parent.schema;
                    for (_o = 0, _len7 = _ref7.length; _o < _len7; _o++) {
                      schema = _ref7[_o];
                      if (schema[0] === "Term") {
                        res += factTypeInstance[schema[1]].value + " ";
                      } else if (schema[0] === "Verb") {
                        res += schema[1] + " ";
                      }
                    }
                    return asyncCallback.successCallback(1, res);
                  }, function(errors) {
                    console.error(errors);
                    return asyncCallback.successCallback(1, 'Errors: ' + errors);
                  });
                });
              }
              break;
            case "add":
              if (this.type === "Term") {
                termFields = [['Text', 'value', 'Name', []]];
                templateVars = {
                  action: 'addterm',
                  serverURI: serverAPI(about),
                  backURI: backURI,
                  type: about,
                  id: false,
                  term: false,
                  termFields: termFields,
                  templates: templates
                };
                res = templates.termForm(templateVars);
                return asyncCallback.successCallback(1, res);
              } else if (this.type === "FactType") {
                return getTermResults(parent.schema, function(termResults) {
                  templateVars = {
                    factType: parent.schema,
                    termResults: termResults,
                    action: 'addfctp',
                    serverURI: serverAPI(about),
                    backURI: backURI,
                    type: about,
                    currentFactType: false,
                    id: false,
                    templates: templates
                  };
                  res = templates.factTypeForm(templateVars);
                  return asyncCallback.successCallback(1, res);
                });
              }
              break;
            case "edit":
              if (this.type === "Term") {
                termFields = [['Text', 'value', 'Name', []]];
                targ = serverAPI(about);
                return serverRequest("GET", targ, {}, null, function(statusCode, result, headers) {
                  var id;
                  id = result.instances[0].id;
                  templateVars = {
                    action: 'editterm',
                    serverURI: serverAPI(about, [['id', '=', id]]),
                    backURI: serverAPI(about),
                    type: about,
                    id: id,
                    term: result.instances[0],
                    termFields: termFields,
                    templates: templates
                  };
                  res = templates.termForm(templateVars);
                  return asyncCallback.successCallback(1, res);
                });
              } else if (this.type === "FactType") {
                targ = ftree.getServerURI();
                return serverRequest("GET", targ, {}, null, function(statusCode, result, headers) {
                  return getResolvedFactType(parent.schema, result.instances[0], function(factTypeInstance) {
                    return getTermResults(parent.schema, function(termResults) {
                      templateVars = {
                        factType: parent.schema,
                        termResults: termResults,
                        action: 'editfctp',
                        serverURI: serverAPI(about, [['id', '=', factTypeInstance.id]]),
                        backURI: serverAPI(about),
                        type: about,
                        currentFactType: factTypeInstance,
                        id: factTypeInstance.id,
                        templates: templates
                      };
                      res = templates.factTypeForm(templateVars);
                      return asyncCallback.successCallback(1, res);
                    });
                  }, function(errors) {
                    console.error(errors);
                    return asyncCallback.successCallback(1, 'Errors: ' + errors);
                  });
                });
              }
              break;
            case "del":
              templateVars = {
                action: 'del',
                serverURI: serverAPI(about, [['id', '=', this.id]]),
                backURI: serverAPI(about),
                type: about,
                id: this.id,
                templates: templates
              };
              res = templates.deleteForm(templateVars);
              return asyncCallback.successCallback(1, res);
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
    window.drawData = drawData;
    return window.processForm = processForm;
  });

}).call(this);
