requirejs.config({
    baseUrl: "scripts",
    paths: {
        "frame-glue": "../scripts",
        "cs": "../lib/cs",
        "codemirror": "../node_modules/codemirror/lib/codemirror",
        "text": "../lib/text",
        "coffee-script": "../node_modules/coffee-script/extras/coffee-script",
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
