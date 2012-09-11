coffeeTasks = jake.rmutils.coffeeCompileNamespace(__dirname)
copyTasks = jake.rmutils.createCopyNamespace(['coffee', 'ometa'])
copyTasks.push(jake.rmutils.createCopyTask('.htaccess'))
jake.rmutils.boilerplate(coffeeTasks.concat(copyTasks))