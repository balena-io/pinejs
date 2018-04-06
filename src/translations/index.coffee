_ = require 'lodash'
Promise = require 'bluebird'
sbvrUtils = require '../sbvr-api/sbvr-utils'

exports.createNamespace = (tx, vocab) ->
	tx.executeSql("CREATE SCHEMA IF NOT EXISTS #{vocab};")

exports.createView = (tx, table, model) ->
	name = table.name
	mappings = model.mappings[name]
	# console.log('mappings', mappings)
	vocab = model.apiRoot
	target = if model.target then "\"#{model.target}\"." else ''
	return if _.isString(table)
	if _.isString(mappings)
		# console.error('executing mappings')
		return tx.executeSql(mappings)
	else
		createSQL = "CREATE OR REPLACE VIEW #{vocab}.\"#{name}\" AS (\n\t"
		if _.isEmpty(mappings)
			createSQL += 'SELECT * \n\t'
		else
			createSQL += 'SELECT '
			for field in table.fields
				fieldName = field.fieldName
				alias = mappings[fieldName] || fieldName
				createSQL += "\"#{alias}\" AS \"#{fieldName}\" \n,\t"
		createSQL = createSQL.slice(0, -2) + "FROM #{target}\"#{name}\" );"
		# console.error('About to execute ', createSQL)
		return tx.executeSql(createSQL)
