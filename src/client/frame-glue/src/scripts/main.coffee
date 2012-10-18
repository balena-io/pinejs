require(["cs!modules/sbvr-editor/main"], (modules...) ->
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
