coffeeTasks = jake.rmutils.coffeeCompileNamespace(__dirname)
copyTasks = jake.rmutils.createCopyNamespace()
jake.rmutils.boilerplate(coffeeTasks.concat(copyTasks))