coffeeTasks = jake.rmutils.coffeeCompileNamespace(__dirname)
copyTasks = jake.rmutils.createCopyNamespace(['coffee', 'ometa'])
jake.rmutils.boilerplate(coffeeTasks.concat(copyTasks))