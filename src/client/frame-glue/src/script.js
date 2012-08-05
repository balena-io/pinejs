(function() {

  define(['sbvr-parser/SBVRParser', 'data-frame/ClientURIParser', 'Prettify'], function(SBVRParser, ClientURIParser, Prettify) {
    var cleanUp, clientOnAir, defaultFailureCallback, defaultSuccessCallback, fileApiDetect, loadState, loadUI, locate, processHash, relocate, setClientOnAir, setupDownloadify, setupLoadfile, showErrorMessage, showSimpleError, showUrlMessage, sqlEditor;
    sqlEditor = null;
    clientOnAir = false;
    showErrorMessage = function(errorMessage) {
      $("#dialog-message").html('<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>' + errorMessage);
      return $("#dialog-message").dialog("open");
    };
    showSimpleError = function(errorMessage) {
      $("#dialog-simple-error").html('<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>' + errorMessage);
      return $("#dialog-simple-error").dialog("open");
    };
    showUrlMessage = function(url) {
      var anchor, qIndex, uiIcon;
      uiIcon = "ui-icon-check";
      qIndex = window.location.href.indexOf("?");
      if (url === "Error parsing model") {
        uiIcon = "ui-icon-alert";
        anchor = url;
      } else {
        if (qIndex === -1) {
          url = window.location.href + "?" + url;
        } else {
          url = window.location.href.slice(0, qIndex) + "?" + url;
        }
        anchor = '<a href=\"' + url + '\">' + url + '</a>';
      }
      $("#dialog-url-message").html('<span class="ui-icon ' + uiIcon + '" style="float:left; margin:0 7px 50px 0;"></span>' + anchor);
      return $("#dialog-url-message").dialog("open");
    };
    defaultFailureCallback = function(statusCode, error) {
      if (error != null) {
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
      console.log(error);
      try {
        ___STACK_TRACE___.please;
      } catch (stackTrace) {
        console.error(stackTrace.stack);
      }
      return showErrorMessage(error);
    };
    defaultSuccessCallback = function(statusCode, result, headers) {};
    loadState = function(callback) {
      return serverRequest("GET", "/onAir/", {}, null, function(statusCode, result) {
        setClientOnAir(result);
        return callback();
      });
    };
    processHash = function() {
      var URItree, switchVal, uri;
      if (location.hash.slice(1, 9) === "!/server") {
        URItree = [[], [[], ["server"]]];
      } else {
        URItree = ClientURIParser.matchAll(location.hash, "expr");
      }
      try {
        switchVal = URItree[1][1][0];
      } catch ($e) {
        switchVal = "";
      }
      switch (switchVal) {
        case "lf":
          $("#tabs").tabs("select", 1);
          return lfEditor.refresh();
        case "preplf":
          return $("#tabs").tabs("select", 2);
        case "server":
          uri = location.hash.slice(9);
          return serverRequest("GET", uri, {}, null, function(statusCode, result) {
            return alert(result);
          });
        case "sql":
          $("#tabs").tabs("select", 3);
          return sqlEditor.refresh();
        case "data":
          $("#tabs").tabs("select", 4);
          return drawData(URItree[1]);
        case "export":
          $("#tabs").tabs("select", 6);
          return importExportEditor.refresh();
        case "http":
          return $("#tabs").tabs("select", 5);
        default:
          $("#tabs").tabs("select", 0);
          return sbvrEditor.refresh();
      }
    };
    setClientOnAir = function(bool) {
      clientOnAir = bool;
      if (clientOnAir === true) {
        serverRequest("GET", "/lfmodel/", {}, null, function(statusCode, result) {
          return lfEditor.setValue(Prettify.match(result, "Process"));
        });
        serverRequest("GET", "/prepmodel/", {}, null, function(statusCode, result) {
          return $("#prepArea").val(JSON.stringify(result));
        });
        serverRequest("GET", "/sqlmodel/", {}, null, function(statusCode, result) {
          return sqlEditor.setValue(JSON.stringify(result));
        });
        $("#bem").button("disable");
        return $("#bum, #br").button("enable");
      } else {
        $("#bem").button("enable");
        return $("#bum, #br").button("disable");
      }
    };
    loadUI = function() {
      window.sbvrEditor = CodeMirror.fromTextArea(document.getElementById("modelArea"), {
        mode: "sbvr",
        onKeyEvent: sbvrAutoComplete,
        lineWrapping: true
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
      serverRequest("GET", "/ui/textarea*filt:name=model_area/", {}, null, function(statusCode, result) {
        return sbvrEditor.setValue(result.instances[0].text);
      }, function() {});
      serverRequest("GET", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {}, null, function(statusCode, result) {
        return $("#modelArea").attr("disabled", result.value);
      }, function() {});
      window.onhashchange = processHash;
      $("#modelArea").change(function() {
        return serverRequest("PUT", "/ui/textarea*filt:name=model_area/", {}, [
          {
            'textarea.text': sbvrEditor.getValue()
          }
        ]);
      });
      $("#dialog-message").dialog({
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
      $("#dialog-simple-error").dialog({
        modal: true,
        resizable: false,
        autoOpen: false,
        buttons: {
          "OK": function() {
            return $(this).dialog("close");
          }
        }
      });
      $("#dialog-url-message").dialog({
        modal: true,
        resizable: false,
        autoOpen: false,
        buttons: {
          "OK": function() {
            return $(this).dialog("close");
          }
        }
      });
      return $("input[class!='hidden-input']").button();
    };
    cleanUp = function(a) {
      a.textContent = "Downloaded";
      a.dataset.disabled = true;
      return setTimeout((function() {
        return window.URL.revokeObjectURL(a.href);
      }), 1500);
    };
    window.serverRequest = function(method, uri, headers, body, successCallback, failureCallback) {
      if (headers == null) headers = {};
      if (body == null) body = null;
      successCallback = (typeof successCallback !== "function" ? defaultSuccessCallback : successCallback);
      failureCallback = (typeof failureCallback !== "function" ? defaultFailureCallback : failureCallback);
      if (!(headers["Content-Type"] != null) && (body != null)) {
        headers["Content-Type"] = "application/json";
      }
      $("#httpTable").append("<tr class=\"server_row\"><td><strong>" + method + "</strong></td><td>" + uri + "</td><td>" + (headers.length === 0 ? "" : JSON.stringify(headers)) + "</td><td>" + JSON.stringify(body) + "</td></tr>");
      if (typeof remoteServerRequest === "function") {
        return remoteServerRequest(method, uri, headers, body, successCallback, failureCallback);
      } else {
        if (body !== null) body = JSON.stringify(body);
        return $.ajax(uri, {
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
            return successCallback(jqXHR.status, data, responseHeaders);
          },
          type: method
        });
      }
    };
    window.transformClient = function(model) {
      $("#modelArea").attr("disabled", true);
      return serverRequest("PUT", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {}, null, function() {
        return serverRequest("PUT", "/ui/textarea*filt:name=model_area/", {}, [
          {
            'textarea.text': sbvrEditor.getValue()
          }
        ], function() {
          return serverRequest("POST", "/execute/", {}, null, function() {
            return setClientOnAir(true);
          });
        });
      });
    };
    window.resetClient = function() {
      return serverRequest("DELETE", "/", {}, null, function() {
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
        if ("disabled" in this.dataset) return false;
        return cleanUp(this);
      };
    };
    setupDownloadify = function() {
      Downloadify.create("downloadify", {
        filename: "editor.txt",
        data: function() {
          return sbvrEditor.getValue();
        },
        onError: function() {
          return showSimpleError("Content Is Empty");
        },
        transparent: false,
        swf: "../../../external/downloadify/Downloadify.swf",
        downloadImage: "../../../external/downloadify/download.png",
        width: 62,
        height: 22,
        transparent: true,
        append: false
      });
      return locate("#write_file", "downloadify");
    };
    setupLoadfile = function() {
      var attributes, flashvars, params;
      if (!fileApiDetect()) {
        flashvars = {};
        params = {
          wmode: "transparent",
          allowScriptAccess: "always"
        };
        attributes = {
          id: "fileloader"
        };
        swfobject.embedSWF("FileLoader/FileLoader.swf", "TheFileLoader", 63, 22, "10", null, flashvars, params, attributes);
        return locate("#load_file", "fileloader");
      }
    };
    fileApiDetect = function() {
      if (!!window.FileReader && ($.browser.chrome || $.browser.mozilla)) {
        return true;
      } else {
        return false;
      }
    };
    locate = function(htmlBotton, flashImage) {
      var el, pos;
      pos = $(htmlBotton).offset();
      el = document.getElementById(flashImage).style;
      el.position = 'absolute';
      el.zIndex = 1;
      if (!$.browser.msie || flashImage !== "fileloader") {
        el.left = pos.left + 'px';
        return el.top = pos.top + 'px';
      } else {
        pos = $("#write_file").offset();
        el.left = pos.left + 64 + 'px';
        return el.top = pos.top + 'px';
      }
    };
    relocate = function() {
      locate("#write_file", "downloadify");
      if (!fileApiDetect()) return locate("#load_file", "fileloader");
    };
    window.toReadFile = function() {
      if (fileApiDetect()) return $('#read_file').click();
    };
    window.readFile = function(files) {
      var file, reader;
      if (files.length) {
        file = files[0];
        reader = new FileReader();
        if (/text/.test(file.type)) {
          reader.onload = function() {
            return sbvrEditor.setValue(this.result);
          };
          return reader.readAsText(file);
        } else {
          return showSimpleError("Only text file is acceptable.");
        }
      }
    };
    window.mouseEventHandle = function(id, event) {
      switch (event) {
        case "e":
          $(id).addClass("ui-state-hover");
          break;
        case "l":
          $(id).removeClass("ui-state-hover ui-state-active");
          break;
        case "d":
          $(id).addClass("ui-state-active");
          break;
        default:
          $(id).removeClass("ui-state-active ui-state-hover");
      }
      return false;
    };
    window.saveModel = function() {
      return serverRequest("POST", "/publish", {
        "Content-Type": "application/json"
      }, sbvrEditor.getValue(), function(statusCode, result) {
        return showUrlMessage(result);
      }, function(statusCode, error) {
        return showSimpleError('Error: ' + error);
      });
    };
    window.getModel = function() {
      var key, qIndex;
      qIndex = window.location.href.indexOf("?");
      if (qIndex !== -1) {
        key = window.location.href.slice(qIndex + 1);
        serverRequest("GET", "/publish/" + key, {}, null, function(statusCode, result) {
          return sbvrEditor.setValue(result);
        });
        return function(statusCode, error) {
          return showSimpleError('Error: ' + error);
        };
      }
    };
    window.parseModel = function() {
      try {
        lfEditor.setValue(Prettify.match(SBVRParser.matchAll(sbvrEditor.getValue(), 'expr'), 'Process'));
      } catch (e) {
        console.log('Error parsing model', e);
        showSimpleError('Error parsing model');
        return;
      }
      return $('#tabs').tabs('select', 1);
    };
    return $(function() {
      loadUI();
      return loadState(function() {
        $.browser.chrome = $.browser.webkit && !!window.chrome;
        $("#tabs").tabs({
          select: function(event, ui) {
            var newHash, _ref;
            if (((_ref = ui.panel.id) !== "modelTab" && _ref !== "httpTab") && clientOnAir === false) {
              showErrorMessage("This tab is only accessible after a model is executed<br/>");
              return false;
            } else {
              switch (ui.panel.id) {
                case "prepTab":
                  newHash = "!/preplf/";
                  break;
                case "sqlTab":
                  newHash = "!/sql/";
                  break;
                case "dataTab":
                  newHash = "!/data/";
                  break;
                case "httpTab":
                  newHash = "!/http/";
                  break;
                case "importExportTab":
                  newHash = "!/export/";
                  break;
                case "lfTab":
                  newHash = "!/lf/";
                  break;
                default:
                  newHash = "!/model/";
              }
              if (location.hash.indexOf(newHash) !== 1) location.hash = newHash;
              return true;
            }
          }
        });
        $('#tabs').show();
        getModel();
        setupDownloadify();
        setupLoadfile();
        $(window).on("resize", relocate);
        processHash();
        return $("#bldb").file().choose(function(e, input) {
          return handleFiles(input[0].files);
        });
      });
    });
  });

}).call(this);
