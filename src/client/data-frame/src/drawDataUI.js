(function() {
  var __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  define(['data-frame/ClientURIUnparser', 'utils/createAsyncQueueCallback', 'ejs'], function(ClientURIUnparser, createAsyncQueueCallback, ejs) {
    var addInst, createNavigableTree, delInst, drawData, editInst, getResolvedFactType, getTermResults, processForm, renderResource, serverAPI, templates;
    templates = {
      widgets: {},
      hiddenFormInput: ejs.compile('<input type="hidden" id="__actype" value="<%= action %>">\n<input type="hidden" id="__serverURI" value="<%= serverURI %>">\n<input type="hidden" id="__backURI" value="<%= backURI %>">\n<input type="hidden" id="__type" value="<%= type %>"><%\nif(id !== false) { %>\n	<input type="hidden" id="__id" value="<%= id %>"><%\n} %>'),
      factTypeForm: ejs.compile('<div class="panel" style="background-color:<%= backgroundColour %>;">\n	<form class="action">\n		<%- templates.hiddenFormInput(locals) %><%\n		for(var i = 0; i < factType.length; i++) {\n			var factTypePart = factType[i];\n			switch(factTypePart[0]) {\n				case "Term":\n					var termName = factTypePart[1],\n						termResult = termResults[termName]; %>\n					<select id="<%= termName %>"><%\n						for(var j = 0; j < termResult.length; j++) {\n							var term = termResult[j]; %>\n							<option value="<%= term.id %>"<%\n								if(currentFactType !== false && currentFactType[termName].id == term.id) { %>\n									selected="selected" <%\n								} %>\n							>\n								<%= term.value %>\n							</option><%\n						} %>\n					</select><%\n				break;\n				case "Verb":\n					%><%= factTypePart[1] %><%\n				break;\n			}\n		} %>\n		<div align="right">\n			<input type="submit" value="Submit This" onClick="processForm(this.parentNode.parentNode);return false;">\n		</div>\n	</form>\n</div>'),
      termForm: ejs.compile('<div class="panel" style="background-color:<%= backgroundColour %>;">\n	<div align="left">\n		<form class="action">\n			<%- templates.hiddenFormInput(locals) %><%\n			if(id !== false) { %>\n				id: <%= id %><br/><%\n			}\n\n			for(var i = 0; i < termFields.length; i++) {\n				var termField = termFields[i]; %>\n				<%= termField[2] %>: <%\n				switch(termField[0]) {\n					case "Text": %>\n						<%- templates.widgets.inputText(termField[1], term === false ? "" : term[termField[1]]) %><%\n					break;\n					case "ForeignKey":\n						console.error("Hit FK", termField);\n					break;\n					default:\n						console.error("Hit default, wtf?");\n				} %>\n				<br /><%\n			} %>\n			<div align="right">\n				<input type="submit" value="Submit This" onClick="processForm(this.parentNode.parentNode);return false;">\n			</div>\n		</form>\n	</div>\n</div>'),
      deleteForm: ejs.compile('<div class="panel" style="background-color:<%= backgroundColour %>;">\n	<div align="left">\n		marked for deletion\n		<div align="right">\n			<form class="action">\n				<%- templates.hiddenFormInput(locals) %>\n				<input type="submit" value="Confirm" onClick="processForm(this.parentNode.parentNode);return false;">\n			</form>\n		</div>\n	</div>\n</div>'),
      factTypeCollection: ejs.compile('<%\nfor(var i = 0; i < factTypeCollections.length; i++) {\n	var factTypeCollection = factTypeCollections[i]; %>\n	<tr id="tr--data--<%= factTypeCollection.resourceName %>">\n		<td><%\n			if(factTypeCollection.isExpanded) { %>\n				<div style="display:inline;background-color:<%= altBackgroundColour %>">\n					<%= factTypeCollection.resourceName %>\n					<a href="<%= factTypeCollection.closeURI %>" onClick="location.hash=\'<%= factTypeCollection.closeHash %>\';return false">\n						<span title="Close" class="ui-icon ui-icon-circle-close"></span>\n					</a>\n				</div>\n				<%- factTypeCollection.html %><%\n			}\n			else { %>\n				<%= factTypeCollection.resourceName %>\n				<a href="<%= factTypeCollection.expandURI %>" onClick="location.hash=\'<%= factTypeCollection.expandHash %>\';return false">\n					<span title="See all" class="ui-icon ui-icon-search"></span>\n				</a><%\n			} %>\n		</td>\n	</tr><%\n} %>'),
      resourceCollection: ejs.compile('<div class="panel" style="background-color:<%= backgroundColour %>;">\n	<table id="tbl--<%= pid %>">\n		<tbody><%\n			for(var i = 0; i < resourceCollections.length; i++) {\n				var resourceCollection = resourceCollections[i]; %>\n				<tr id="tr--<%= pid %>--<%= resourceCollection.id %>">\n					<td><%\n						if(resourceCollection.isExpanded) { %>\n							<div style="display:inline;background-color:<%= altBackgroundColour %>">\n								<%- resourceCollection.resourceName %>\n								<a href="<%= resourceCollection.closeURI %>" onClick="location.hash=\'<%= resourceCollection.closeHash %>\';return false"><%\n									switch(resourceCollection.action) {\n										case "view":\n										case "edit":\n											%><span title="Close" class="ui-icon ui-icon-circle-close"></span><%\n										break;\n										case "del":\n											%>[unmark]<%\n									} %>\n								</a>\n							</div>\n							<%- resourceCollection.html %><%\n						}\n						else { %>\n							<%- resourceCollection.resourceName %>\n							<a href="<%= resourceCollection.viewURI %>" onClick="location.hash=\'<%= resourceCollection.viewHash %>\';return false">\n								<span title="View" class="ui-icon ui-icon-search"></span>\n							</a>\n							<a href="<%= resourceCollection.editURI %>" onClick="location.hash=\'<%= resourceCollection.editHash %>\';return false">\n								<span title="Edit" class="ui-icon ui-icon-pencil"></span>\n							</a>\n							<a href="<%= resourceCollection.deleteURI %>" onClick="location.hash=\'<%= resourceCollection.deleteHash %>\';return false">\n								<span title="Delete" class="ui-icon ui-icon-trash"></span>\n							</a><%\n						} %>\n					</td>\n				</tr><%\n			} %>\n			<tr>\n				<td>\n					<hr style="border:0px; width:90%; background-color: #999; height:1px;">\n				</td>\n			</tr>\n			<tr>\n				<td>\n					<a href="<%= addURI %>" onClick="location.hash=\'<%= addHash %>\';return false;">[(+)add new]</a>\n				</td>\n			</tr><%\n			for(var i = 0; i < addsHTML.length; i++) { %>\n				<tr>\n					<td>\n						<%- addsHTML[i] %>\n					</td>\n				</tr><%\n			} %>\n			<tr>\n				<td>\n					<hr style="border:0px; width:90%; background-color: #999; height:1px;">\n				</td>\n			</tr>\n			<%- templates.factTypeCollection(locals) %>\n		</tbody>\n	</table>\n</div>'),
      termView: ejs.compile('<div class="panel" style="background-color:<%= backgroundColour %>;"><%\n	for(var field in termInstance) { %>\n		<%= termInstance %>: <%= termInstance[field] %><br/><%\n	} %>\n</div>'),
      factTypeView: ejs.compile('<div class="panel" style="background-color:<%= backgroundColour %>;">\n	id: <%= factTypeInstance.id %><br/><%\n	for(var i = 0; i < factType.length; i++) {\n		var factTypePart = factType[i];\n		if(factTypePart[0] == "Term") { %>\n			<%= factTypeInstance[factTypePart[1]].value %> <%\n		}\n		else if(factTypePart[0] == "Verb") { %>\n			<%= factTypePart[1] %><%\n		}\n	} %>\n</div>'),
      topLevelTemplate: ejs.compile('<table id="terms">\n	<tbody><%\n		for(var i = 0; i < terms.length; i++) {\n			var term = terms[i]; %>\n			<tr id="tr--data--"<%= term.id %>">\n				<td><%\n					if(term.isExpanded) { %>\n						<div style="display:inline; background-color:#FFFFFF;">\n							<%= term.name %>\n							<a href="<%= term.closeURI %>" onClick="location.hash=\'<%= term.closeHash %>\';return false">\n								<span title="Close" class="ui-icon ui-icon-circle-close"></span>\n							</a>\n						</div>\n						<%- term.html %><%\n					}\n					else { %>\n						<%= term.name %>\n						<a href="<%= term.expandURI %>" onClick="location.hash=\'<%= term.expandHash %>\';return false">\n							<span title="See all" class="ui-icon ui-icon-search"></span>\n						</a><%\n					} %>\n				</td>\n			</tr><%\n		} %>\n	</tbody>\n</table><br/>\n<div align="left">\n	<input type="button" value="Apply All Changes" onClick="runTrans($(\'#terms\'));return false;">\n</div>')
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
      return serverRequest("GET", "/data/", {}, null, function(statusCode, result, headers) {
        var asyncCallback, expandedTree, i, newb, term, _len, _ref, _results;
        asyncCallback = createAsyncQueueCallback(function(results) {
          var res, templateVars;
          templateVars = {
            terms: result.terms,
            templates: templates
          };
          res = templates.topLevelTemplate(templateVars);
          return $("#dataTab").html(res);
        }, null, function(i, html) {
          if (i !== false) result.terms[i].html = html;
          return null;
        });
        asyncCallback.addWork(result.terms.length);
        asyncCallback.endAdding();
        _ref = result.terms;
        _results = [];
        for (i = 0, _len = _ref.length; i < _len; i++) {
          term = _ref[i];
          term = result.terms[i];
          term.isExpanded = tree.isExpanded(term.id);
          if (term.isExpanded) {
            expandedTree = tree.clone().descend(term.id);
            term.deleteHash = '#!/' + expandedTree.getNewURI("del");
            term.deleteURI = rootURI + term.deleteHash;
            _results.push((function(i) {
              return serverRequest("GET", "/lfmodel/", {}, null, function(statusCode, result) {
                return renderResource(i, asyncCallback.successCallback, rootURI, true, expandedTree, result);
              });
            })(i));
          } else {
            newb = ['collection', [term.id], ["mod"]];
            term.expandHash = '#!/' + tree.getNewURI("add", newb);
            term.expandURI = rootURI + term.expandHash;
            _results.push(asyncCallback.successCallback(false));
          }
        }
        return _results;
      });
    };
    renderResource = function(idx, rowCallback, rootURI, even, ftree, cmod) {
      var about, actn, altBgColour, backURI, bgColour, branchType, currentLocation, getIdent, html, mod, resourceFactType, resourceType, targ, templateVars, termFields, _i, _j, _len, _len2, _ref, _ref2, _ref3;
      currentLocation = ftree.getCurrentLocation();
      about = ftree.getAbout();
      resourceType = "Term";
      resourceFactType = [];
      if (even) {
        bgColour = "#FFFFFF";
        altBgColour = "#EEEEEE";
      } else {
        bgColour = "#EEEEEE";
        altBgColour = "#FFFFFF";
      }
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
        resourceType = mod[0];
        if (resourceType === "FactType") resourceFactType = mod.slice(1);
      }
      if (currentLocation[0] === 'collection') {
        targ = serverAPI(about);
        return serverRequest("GET", targ, {}, null, function(statusCode, result, headers) {
          var addsCallback, addsHTML, currBranch, currBranchType, expandedTree, factTypeCollections, factTypeCollectionsCallback, i, instance, j, mod, newTree, newb, resourceCollections, resourceCollectionsCallback, resourceName, termVerb, _fn, _j, _k, _l, _len2, _len3, _len4, _len5, _len6, _ref2, _ref3, _ref4, _ref5, _ref6;
          resourceCollections = [];
          resourceCollectionsCallback = createAsyncQueueCallback(function() {
            var addHash, html, templateVars;
            addHash = '!#/' + ftree.getChangeURI('add', about);
            templateVars = {
              pid: ftree.getPid(),
              addHash: addHash,
              addURI: rootURI + addHash,
              addsHTML: addsHTML,
              factTypeCollections: factTypeCollections,
              resourceCollections: resourceCollections,
              backgroundColour: bgColour,
              altBackgroundColour: altBgColour,
              templates: templates
            };
            html = templates.resourceCollection(templateVars);
            return rowCallback(idx, html);
          }, function(errors) {
            console.error(errors);
            return rowCallback(idx, 'Resource Collections Errors: ' + errors);
          }, function(index, html, isResourceName) {
            if (index !== false) resourceCollections[index].html = html;
            return null;
          });
          _ref2 = result.instances;
          _fn = function(instance, i) {
            var expandedTree;
            resourceCollections[i] = {
              isExpanded: ftree.isExpanded(about, [instance.id, instance.value]),
              action: ftree.getAction(about, [instance.id, instance.value]),
              id: instance.id
            };
            if (resourceType === "Term") {
              resourceCollections[i].resourceName = instance.value;
            } else if (resourceType === "FactType") {
              resourceCollectionsCallback.addWork(1);
              getResolvedFactType(resourceFactType, instance, function(factTypeInstance) {
                var factTypePart, resourceName, _j, _len3;
                resourceName = '';
                for (_j = 0, _len3 = resourceFactType.length; _j < _len3; _j++) {
                  factTypePart = resourceFactType[_j];
                  if (factTypePart[0] === "Term") {
                    resourceName += factTypeInstance[factTypePart[1]].value + " ";
                  } else if (factTypePart[0] === "Verb") {
                    resourceName += "<em>" + factTypePart[1] + "</em> ";
                  }
                }
                resourceCollections[i].resourceName = resourceName;
                return resourceCollectionsCallback.successCallback(false);
              }, function(errors) {
                console.error(errors);
                return resourceCollectionsCallback.errorCallback(i, 'Errors: ' + errors, true);
              });
            }
            if (resourceCollections[i].isExpanded) {
              expandedTree = ftree.clone().descend(about, [instance.id, instance.value]);
              resourceCollections[i].closeHash = '#!/' + expandedTree.getNewURI("del");
              resourceCollections[i].closeURI = rootURI + resourceCollections[i].deleteHash;
              resourceCollectionsCallback.addWork(1);
              return renderResource(i, resourceCollectionsCallback.successCallback, rootURI, !even, expandedTree, cmod);
            } else {
              resourceCollections[i].viewHash = '#!/' + ftree.getChangeURI('view', about, instance.id);
              resourceCollections[i].viewURI = rootURI + resourceCollections[i].viewHash;
              resourceCollections[i].editHash = '#!/' + ftree.getChangeURI('edit', about, instance.id);
              resourceCollections[i].editURI = rootURI + resourceCollections[i].editHash;
              resourceCollections[i].deleteHash = '#!/' + ftree.getChangeURI('del', about, instance.id);
              return resourceCollections[i].deleteURI = rootURI + resourceCollections[i].deleteHash;
            }
          };
          for (i = 0, _len2 = _ref2.length; i < _len2; i++) {
            instance = _ref2[i];
            _fn(instance, i);
          }
          addsHTML = [];
          resourceCollectionsCallback.addWork(1);
          addsCallback = createAsyncQueueCallback(function(results) {
            var i, item, _len3;
            results.sort(function(a, b) {
              return a[0] - b[0];
            });
            for (i = 0, _len3 = results.length; i < _len3; i++) {
              item = results[i];
              addsHTML[i] = item[1];
            }
            return resourceCollectionsCallback.successCallback(false);
          }, function(errors) {
            console.error(errors);
            return resourceCollectionsCallback.errorCallback('Adds Errors: ' + errors);
          }, function(n, prod) {
            return [n, prod];
          });
          i = 0;
          _ref3 = currentLocation.slice(3);
          for (j = 0, _len3 = _ref3.length; j < _len3; j++) {
            currBranch = _ref3[j];
            if (currBranch[0] === 'instance' && currBranch[1][0] === about && currBranch[1][1] === void 0) {
              _ref4 = currBranch[2];
              for (_j = 0, _len4 = _ref4.length; _j < _len4; _j++) {
                currBranchType = _ref4[_j];
                if (!(currBranchType[0] === "add")) continue;
                newTree = ftree.clone().descendByIndex(j + 3);
                addsCallback.addWork(1);
                renderResource(i++, addsCallback.successCallback, rootURI, !even, newTree, cmod);
                break;
              }
            }
          }
          addsCallback.endAdding();
          factTypeCollections = [];
          resourceCollectionsCallback.addWork(1);
          factTypeCollectionsCallback = createAsyncQueueCallback(function() {
            return resourceCollectionsCallback.successCallback(false);
          }, function(errors) {
            console.error(errors);
            return resourceCollectionsCallback.errorCallback('Fact Type Collection Errors: ' + errors);
          }, function(index, html) {
            factTypeCollections[index].html = html;
            return null;
          });
          i = 0;
          _ref5 = cmod.slice(1);
          for (_k = 0, _len5 = _ref5.length; _k < _len5; _k++) {
            mod = _ref5[_k];
            if (mod[0] === "FactType") {
              _ref6 = mod.slice(1);
              for (_l = 0, _len6 = _ref6.length; _l < _len6; _l++) {
                termVerb = _ref6[_l];
                if (!(termVerb[1] === about)) continue;
                resourceName = getIdent(mod);
                factTypeCollections[i] = {
                  resourceName: resourceName,
                  isExpanded: ftree.isExpanded(resourceName)
                };
                if (factTypeCollections[i].isExpanded) {
                  expandedTree = ftree.clone().descend(resourceName);
                  factTypeCollections[i].closeHash = '#!/' + expandedTree.getNewURI("del");
                  factTypeCollections[i].closeURI = rootURI + factTypeCollections[i].closeHash;
                  factTypeCollectionsCallback.addWork(1);
                  renderResource(i, factTypeCollectionsCallback.successCallback, rootURI, !even, expandedTree, cmod);
                } else {
                  newb = ['collection', [resourceName], ["mod"]];
                  factTypeCollections[i].expandHash = '#!/' + ftree.getNewURI("add", newb);
                  factTypeCollections[i].expandURI = rootURI + factTypeCollections[i].expandHash;
                }
                i++;
              }
            }
          }
          factTypeCollectionsCallback.endAdding();
          return resourceCollectionsCallback.endAdding();
        });
      } else if (currentLocation[0] === 'instance') {
        backURI = '#!/' + ftree.getNewURI('del');
        actn = "view";
        _ref2 = currentLocation[2].slice(1);
        for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
          branchType = _ref2[_j];
          if (!((_ref3 = branchType[0]) === "add" || _ref3 === "edit" || _ref3 === "del")) {
            continue;
          }
          actn = branchType[0];
          break;
        }
        switch (actn) {
          case "view":
            if (resourceType === "Term") {
              targ = serverAPI(about);
              return serverRequest("GET", targ, {}, null, function(statusCode, result, headers) {
                var html, templateVars;
                templateVars = {
                  termInstance: result.instances[0],
                  backgroundColour: bgColour,
                  altBackgroundColour: altBgColour,
                  templates: templates
                };
                html = templates.termView(templateVars);
                return rowCallback(idx, html);
              });
            } else if (resourceType === "FactType") {
              targ = ftree.getServerURI();
              return serverRequest("GET", targ, {}, null, function(statusCode, result, headers) {
                return getResolvedFactType(resourceFactType, result.instances[0], function(factTypeInstance) {
                  var html, templateVars;
                  templateVars = {
                    factType: resourceFactType,
                    factTypeInstance: factTypeInstance,
                    backgroundColour: bgColour,
                    altBackgroundColour: altBgColour,
                    templates: templates
                  };
                  html = templates.factTypeView(templateVars);
                  return rowCallback(idx, html);
                }, function(errors) {
                  console.error(errors);
                  return rowCallback(idx, 'Errors: ' + errors);
                });
              });
            }
            break;
          case "add":
            if (resourceType === "Term") {
              termFields = [['Text', 'value', 'Name', []]];
              templateVars = {
                action: 'addterm',
                serverURI: serverAPI(about),
                backURI: backURI,
                type: about,
                id: false,
                term: false,
                termFields: termFields,
                backgroundColour: bgColour,
                altBackgroundColour: altBgColour,
                templates: templates
              };
              html = templates.termForm(templateVars);
              return rowCallback(idx, html);
            } else if (resourceType === "FactType") {
              return getTermResults(resourceFactType, function(termResults) {
                templateVars = {
                  factType: resourceFactType,
                  termResults: termResults,
                  action: 'addfctp',
                  serverURI: serverAPI(about),
                  backURI: backURI,
                  type: about,
                  currentFactType: false,
                  id: false,
                  backgroundColour: bgColour,
                  altBackgroundColour: altBgColour,
                  templates: templates
                };
                html = templates.factTypeForm(templateVars);
                return rowCallback(idx, html);
              });
            }
            break;
          case "edit":
            if (resourceType === "Term") {
              termFields = [['Text', 'value', 'Name', []]];
              targ = serverAPI(about);
              return serverRequest("GET", targ, {}, null, function(statusCode, result, headers) {
                var id;
                id = result.instances[0].id;
                templateVars = {
                  action: 'editterm',
                  serverURI: serverAPI(about, [['id', '=', id]]),
                  backURI: backURI,
                  type: about,
                  id: id,
                  term: result.instances[0],
                  termFields: termFields,
                  backgroundColour: bgColour,
                  altBackgroundColour: altBgColour,
                  templates: templates
                };
                html = templates.termForm(templateVars);
                return rowCallback(idx, html);
              });
            } else if (resourceType === "FactType") {
              targ = ftree.getServerURI();
              return serverRequest("GET", targ, {}, null, function(statusCode, result, headers) {
                return getResolvedFactType(resourceFactType, result.instances[0], function(factTypeInstance) {
                  return getTermResults(resourceFactType, function(termResults) {
                    templateVars = {
                      factType: resourceFactType,
                      termResults: termResults,
                      action: 'editfctp',
                      serverURI: serverAPI(about, [['id', '=', factTypeInstance.id]]),
                      backURI: backURI,
                      type: about,
                      currentFactType: factTypeInstance,
                      id: factTypeInstance.id,
                      backgroundColour: bgColour,
                      altBackgroundColour: altBgColour,
                      templates: templates
                    };
                    html = templates.factTypeForm(templateVars);
                    return rowCallback(idx, html);
                  });
                }, function(errors) {
                  console.error(errors);
                  return rowCallback(idx, 'Errors: ' + errors);
                });
              });
            }
            break;
          case "del":
            templateVars = {
              action: 'del',
              serverURI: serverAPI(about, [['id', '=', currentLocation[1][1]]]),
              backURI: backURI,
              type: about,
              id: currentLocation[1][1],
              backgroundColour: bgColour,
              altBackgroundColour: altBgColour,
              templates: templates
            };
            html = templates.deleteForm(templateVars);
            return rowCallback(idx, html);
        }
      }
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
      serverRequest("DELETE", uri, {}, null, function(statusCode, result, headers) {
        return location.hash = backURI;
      });
      return false;
    };
    editInst = function(forma, serverURI, backURI) {
      var inputs, obj;
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
        return location.hash = backURI;
      });
      return false;
    };
    addInst = function(forma, uri, backURI) {
      var inputs, obj;
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
        return location.hash = backURI;
      });
      return false;
    };
    window.drawData = drawData;
    return window.processForm = processForm;
  });

}).call(this);
