coffeeTasks = jake.rmutils.coffeeCompileNamespace(__dirname)
ometaTasks = jake.rmutils.ometaCompileNamespace(__dirname)
copyTasks = jake.rmutils.createCopyNamespace()
jake.rmutils.boilerplate(coffeeTasks.concat(ometaTasks, copyTasks))