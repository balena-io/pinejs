(function() {
  var __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  requireCSS('codemirror');

  requirejs(['codemirror', 'ometa/ometa-base', 'js-beautify', 'jquery.hotkeys'], function() {
    return requirejs(['codemirror-modes/javascript/javascript', 'ometa/lib', 'ometa/bs-js-compiler', 'ometa/parser', 'ometa/bs-js-compiler', 'ometa/bs-ometa-compiler', 'ometa/bs-ometa-optimizer', 'ometa/bs-ometa-js-compiler'], function() {
      var cmFormatted, cmRaw, ometacodeArea, outputArea, translateCode;
      translateCode = function(s) {
        var parsingError, translationError, tree;
        translationError = function(m, i) {
          alert("Translation error - please tell Alex about this!");
          throw fail;
        };
        parsingError = function(m, i) {
          var start;
          console.log(m);
          start = Math.max(0, i - 20);
          console.log('Error around: ' + s.substring(start, Math.min(s.length, start + 40)));
          console.log('Error around: ' + s.substring(i - 2, Math.min(s.length, i + 2)));
          throw m;
        };
        tree = BSOMetaJSParser.matchAll(s, "topLevel", void 0, parsingError);
        return BSOMetaJSTranslator.match(tree, "trans", void 0, translationError);
      };
      window.compile = function(ometacode) {
        var jscode;
        jscode = translateCode(ometacode + '\n');
        cmRaw.setValue(jscode);
        cmFormatted.setValue(js_beautify(jscode));
        alert('Compilation complete!');
        return jscode;
      };
      window.compileAndRun = function(ometacode) {
        var evaloutput, jscode;
        jscode = compile(ometacode);
        evaloutput = "" + eval(jscode);
        // console.log(evaloutput);
        outputArea.setValue(evaloutput);
        // console.log(jscode);
        return alert('Run complete!');
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
          if ((__indexOf.call(this.dataset, "disabled") >= 0)) return false;
          return cleanUp(this);
        };
      };
      $(function() {
        var bindings;
        $("#tabs").tabs({
          show: function(event, ui) {
            cmFormatted.refresh();
            return cmRaw.refresh();
          }
        });
        bindings = function() {
          return $(document).bind('keydown', 'ctrl+y,', function() {
            return compileAndRun(ometacodeArea.getValue());
          });
        };
        $(bindings);
        return $("#bldb").file().choose(function(e, input) {
          return handleFiles(input[0].files);
        });
      });
      window.ometacodeArea = ometacodeArea = CodeMirror.fromTextArea(document.getElementById("ometacodeArea"), {
        lineNumbers: true,
        matchBrackets: true
      });
      outputArea = CodeMirror.fromTextArea(document.getElementById("outputArea"), {
        lineNumbers: true,
        matchBrackets: true,
        readOnly: true
      });
      cmRaw = CodeMirror.fromTextArea(document.getElementById("jsrawArea"), {
        lineNumbers: true,
        matchBrackets: true,
        readOnly: true
      });
      return cmFormatted = CodeMirror.fromTextArea(document.getElementById("jsformattedArea"), {
        lineNumbers: true,
        matchBrackets: true,
        readOnly: true
      });
    });
  });

  window.onbeforeunload = function() {
    return "You have attempted to leave the OMeta editor. Any unsaved changes will be lost.";
  };

}).call(this);
