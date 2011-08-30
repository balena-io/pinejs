({
    appDir: "../../intermediate/js",
    baseUrl: ".",
    dir: "../../publish/js",
    //Comment out the optimize line if you want
    //the code minified by UglifyJS
    optimize: "none",

    modules: [
        {
            name: "libs/require-0.26.0.min"
        },
        {
            name: "main"
        }
    ]
})
