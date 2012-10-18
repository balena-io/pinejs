({
    appDir: "../src",
    dir: "../out",
    stubModules: ["cs"],
    mainConfigFile: "../src/main.js",
    paths: {
        "jquery": "../lib/require-jquery"
    },
    removeCombined: false,
    useSourceUrl: true,
    modules: [
        {
            name: "../main",
            exclude: ["coffee-script", "jquery"]
        }
    ]
})
