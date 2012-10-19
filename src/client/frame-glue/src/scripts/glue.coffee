require(["cs!modules/sbvr-editor/main", "cs!sbvr-lf/lfviz"], (modules...) ->
    ###
    modules = [
        "cs!skeleton"
    ]

    modules = modules.map((module) ->
        if module.indexOf("!") isnt -1
            [plugin, module] = module.split("!")
        return "#{plugin}!modules/#{module}/main"
    })

    ###

    module.init() for module in modules
)
