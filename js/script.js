(function() {
  var cleanUp, clientOnAir, defaultFailureCallback, defaultSuccessCallback, loadState, loadUI, processHash, setClientOnAir, sqlEditor;
  sqlEditor = null;
  clientOnAir = false;
  defaultFailureCallback = function(statusCode, error) {
    var exc;
    if (error != null) {
      console.log(error);
      if (error.constructor.name === 'Array') {
        if (error["status-line"]) {
          error = error["status-line"];
        } else {
          error = error.join("<br/>");
        }
      }
    } else {
      error = statusCode;
    }
    exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
    $("#dialog-message").html(exc + error);
    return $("#dialog-message").dialog("open");
  };
  defaultSuccessCallback = function(statusCode, result, headers) {};
  loadState = function() {
    return serverRequest("GET", "/onAir/", [], "", function(statusCode, result) {
      return setClientOnAir(result);
    });
  };
  processHash = function() {
    var URItree, switchVal, theHash, uri;
    theHash = location.hash;
    if (theHash === "") {
      theHash = "#!/model";
    }
    if (theHash.slice(1, 9) === "!/server") {
      URItree = [[], [[], ["server"]]];
    } else {
      URItree = ClientURIParser.matchAll(theHash, "expr");
    }
    try {
      switchVal = URItree[1][1][0];
    } catch ($e) {
      switchVal = "";
    }
    switch (switchVal) {
      case "server":
        uri = location.hash.slice(9);
        return serverRequest("GET", uri, "", {}, function(statusCode, result) {
          return alert(result);
        });
      case "sql":
        $("#tabs").tabs("select", 3);
        return sqlEditor.refresh();
      case "data":
        $("#tabs").tabs("select", 4);
        return drawData(URItree[1]);
      case "http":
        return $("#tabs").tabs("select", 5);
      case "export":
        importExportEditor.refresh();
        return $("#tabs").tabs("select", 6);
      case "preplf":
        break;
      case "lf":
        return lfEditor.refresh();
      default:
        sbvrEditor.refresh();
        return $("#tabs").tabs("select", 0);
    }
  };
  setClientOnAir = function(bool) {
    clientOnAir = bool;
    if (clientOnAir === true) {
      serverRequest("GET", "/lfmodel/", [], "", function(statusCode, result) {
        return lfEditor.setValue(Prettify.match(result, "elem"));
      });
      serverRequest("GET", "/prepmodel/", [], "", function(statusCode, result) {
        return $("#prepArea").val(Prettify.match(result, "elem"));
      });
      serverRequest("GET", "/sqlmodel/", [], "", function(statusCode, result) {
        return sqlEditor.setValue(Prettify.match(result, "elem"));
      });
      $("#bem").attr("disabled", "disabled");
      $("#bum").removeAttr("disabled");
      return $("#br").removeAttr("disabled");
    } else {
      $("#bem").removeAttr("disabled");
      $("#bum").attr("disabled", "disabled");
      return $("#br").attr("disabled", "disabled");
    }
  };
  loadUI = function() {
    window.sbvrEditor = CodeMirror.fromTextArea(document.getElementById("modelArea"), {
      mode: "sbvr",
      onKeyEvent: sbvrAutoComplete
    });
    window.lfEditor = CodeMirror.fromTextArea(document.getElementById("lfArea"));
    if (CodeMirror.listModes().indexOf("plsql") > -1) {
      sqlEditor = CodeMirror.fromTextArea(document.getElementById("sqlArea"), {
        mode: "text/x-plsql"
      });
      window.importExportEditor = CodeMirror.fromTextArea(document.getElementById("importExportArea"), {
        mode: "text/x-plsql"
      });
    }
    window.onhashchange = processHash;
    serverRequest("GET", "/ui/textarea*filt:name=model_area/", [], "", function(statusCode, result) {
      return sbvrEditor.setValue(result.value);
    });
    serverRequest("GET", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", [], "", function(statusCode, result) {
      return $("#modelArea").attr("disabled", result.value);
    });
    $("#modelArea").change(function() {
      return serverRequest("PUT", "/ui/textarea*filt:name=model_area/", {
        "Content-Type": "application/json"
      }, JSON.stringify({
        value: sbvrEditor.getValue()
      }));
    });
    return $("#dialog-message").dialog({
      modal: true,
      resizable: false,
      autoOpen: false,
      buttons: {
        "Revise Request": function() {
          return $(this).dialog("close");
        },
        "Revise Model": function() {
          return $(this).dialog("close");
        }
      }
    });
  };
  cleanUp = function(a) {
    a.textContent = "Downloaded";
    a.dataset.disabled = true;
    return setTimeout((function() {
      return window.URL.revokeObjectURL(a.href);
    }), 1500);
  };
  window.serverRequest = function(method, uri, headers, body, successCallback, failureCallback) {
    if (headers == null) {
      headers = {};
    }
    if (body == null) {
      body = null;
    }
    successCallback = (typeof successCallback !== "function" ? defaultSuccessCallback : successCallback);
    failureCallback = (typeof failureCallback !== "function" ? defaultFailureCallback : failureCallback);
    $("#httpTable").append("<tr class=\"server_row\"><td><strong>" + method + "</strong></td><td>" + uri + "</td><td>" + (headers.length === 0 ? "" : headers) + "</td><td>" + body + "</td></tr>");
    if (typeof remoteServerRequest === "function") {
      return remoteServerRequest(method, uri, headers, body, successCallback, failureCallback);
    } else {
      return $.ajax("/node" + uri, {
        headers: headers,
        data: body,
        error: function(jqXHR, textStatus, errorThrown) {
          return failureCallback(jqXHR.status, JSON.parse(jqXHR.responseText));
        },
        success: function(data, textStatus, jqXHR) {
          var match, responseHeaders, responseHeadersString, rheaders;
          rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg;
          responseHeaders = {};
          responseHeadersString = jqXHR.getAllResponseHeaders();
          while (match = rheaders.exec(responseHeadersString)) {
            responseHeaders[match[1].toLowerCase()] = match[2];
          }
          return successCallback(jqXHR.status, JSON.parse(data), responseHeaders);
        },
        type: method
      });
    }
  };
  window.transformClient = function(model) {
    $("#modelArea").attr("disabled", true);
    return serverRequest("PUT", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {
      "Content-Type": "application/json"
    }, JSON.stringify({
      value: true
    }), function() {
      return serverRequest("PUT", "/ui/textarea*filt:name=model_area/", {
        "Content-Type": "application/json"
      }, JSON.stringify({
        value: model
      }), function() {
        return serverRequest("POST", "/execute/", {
          "Content-Type": "application/json"
        }, "", function() {
          return setClientOnAir(true);
        });
      });
    });
  };
  window.resetClient = function() {
    return serverRequest("DELETE", "/", [], "", function() {
      $("#modelArea").attr("disabled", false);
      sbvrEditor.setValue("");
      lfEditor.setValue("");
      $("#prepArea").val("");
      sqlEditor.setValue("");
      return setClientOnAir(false);
    });
  };
  window.loadmod = function(model) {
    return sbvrEditor.setValue(model);
  };
  window.downloadFile = function(filename, text) {
    var MIME_TYPE, a, bb, output, prevLink;
    MIME_TYPE = "text/plain";
    output = document.querySelector("output");
    window.URL = window.webkitURL || window.URL;
    window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
    prevLink = output.querySelector("a");
    if (prevLink) {
      window.URL.revokeObjectURL(prevLink.href);
      output.innerHTML = "";
    }
    bb = new BlobBuilder();
    bb.append(text);
    a = document.createElement("a");
    a.download = filename;
    a.href = window.URL.createObjectURL(bb.getBlob(MIME_TYPE));
    a.textContent = "Download ready";
    a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(":");
    a.draggable = true;
    a.classList.add("dragout");
    output.appendChild(a);
    return a.onclick = function(e) {
      if ("disabled" in this.dataset) {
        return false;
      }
      return cleanUp(this);
    };
  };
  $(function() {
    $("#tabs").tabs({
      select: function(event, ui) {
        var exc, msg, _ref;
        if (((_ref = ui.panel.id) !== "modelTab" && _ref !== "httpTab") && clientOnAir === false) {
          exc = "<span class=\"ui-icon ui-icon-alert\" style=\"float:left; margin:0 7px 50px 0;\"></span>";
          msg = "This tab is only accessible after a model is executed<br/>";
          $("#dialog-message").html(exc + msg);
          $("#dialog-message").dialog("open");
          return false;
        } else {
          switch (ui.panel.id) {
            case "prepTab":
              location.hash = "!/preplf/";
              break;
            case "sqlTab":
              location.hash = "!/sql/";
              break;
            case "dataTab":
              location.hash = "!/data/";
              break;
            case "httpTab":
              location.hash = "!/http/";
              break;
            case "importExportTab":
              location.hash = "!/export/";
              break;
            case "lfTab":
              location.hash = "!/lf/";
              break;
            default:
              location.hash = "!/model/";
          }
          return true;
        }
      }
    });
    loadUI();
    loadState();
    processHash();
    return $("#bldb").file().choose(function(e, input) {
      return handleFiles(input[0].files);
    });
  });
}).call(this);
