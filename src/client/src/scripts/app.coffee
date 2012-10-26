define([
	'cs!router'
	'cs!views/tabs/sbvr-editor/main'
	'cs!views/tabs/sbvr-lf/main'
	'cs!views/tabs/sbvr-graph/main'
], (router, modules...) ->
	###
	modules = [
	    'cs!skeleton'
	]

	modules = modules.map((module) ->
	    if module.indexOf('!') isnt -1
	        [plugin, module] = module.split('!')
	    return '#{plugin}!modules/#{module}/main'
	})

	###
	for module in modules
		module.init()
)
