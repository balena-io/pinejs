requirejs.config({
    baseUrl: "scripts",
    paths: {
        "cs": "../lib/cs",
        "codemirror": "../node_modules/codemirror/lib/codemirror",
        "text": "../lib/text",
        "coffee-script": "../lib/coffee-script",
        "modules": "../modules",
        "bootstrap": "../lib/bootstrap/bootstrap"
    },
    shim: {
        "bootstrap": ["jquery"],
        "codemirror": {
            exports: "CodeMirror"
        }
    }
});
require(['cs!main']);
