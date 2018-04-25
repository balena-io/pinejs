_ = require 'lodash'
sbvrTypes = require '@resin/sbvr-types'

getResourceName = (resourceName) ->
	idParts = resourceName.split('-')
	(
		for idPart in idParts
			idPart.split(/[ -]/).join('_')
	).join('__')

forEachUniqueTable = (model, callback) ->
	usedTableNames = {}
	for key, table of model when !_.isString(model[key]) and !table.primitive and !usedTableNames[table.name]
		usedTableNames[table.name] = true
		callback(key, table)

module.exports = (vocabulary, sqlModel) ->
	complexTypes = {}
	resolveDataType = (fieldType) ->
		if sbvrTypes[fieldType]?
			if sbvrTypes[fieldType].types.odata.complexType?
				complexTypes[fieldType] = sbvrTypes[fieldType].types.odata.complexType
			sbvrTypes[fieldType].types.odata.name
		else
			console.error('Could not resolve type', fieldType)
			throw new Error('Could not resolve type' + fieldType)


	model = sqlModel.tables
	associations = []
	forEachUniqueTable model, (key, { name: resourceName, fields }) ->
		resourceName = getResourceName(resourceName)
		for { dataType, required, references } in fields when dataType == 'ForeignKey'
			{ resourceName: referencedResource } = references
			associations.push(
				name: resourceName + referencedResource
				ends: [
					{ resourceName, cardinality: if required then '1' else '0..1' }
					{ resourceName: referencedResource, cardinality: '*' }
				]
			)

	return """
		<?xml version="1.0" encoding="iso-8859-1" standalone="yes"?>
		<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">
			<edmx:DataServices xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" m:DataServiceVersion="2.0">
				<Schema Namespace="#{vocabulary}"
					xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices"
					xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"
					xmlns="http://schemas.microsoft.com/ado/2008/09/edm">

				""" +
				forEachUniqueTable(model, (key, { idField, name: resourceName, fields }) ->
					resourceName = getResourceName(resourceName)
					"""
					<EntityType Name="#{resourceName}">
						<Key>
							<PropertyRef Name="#{idField}" />
						</Key>

						""" + (
						for { dataType, fieldName, required } in fields when dataType != 'ForeignKey'
							dataType = resolveDataType(dataType)
							fieldName = getResourceName(fieldName)
							"""<Property Name="#{fieldName}" Type="#{dataType}" Nullable="#{not required}" />"""
						).join('\n') + '\n' + (
							for { dataType, fieldName, references } in fields when dataType == 'ForeignKey'
								{ tableName: referencedResource } = references
								fieldName = getResourceName(fieldName)
								"""<NavigationProperty Name="#{fieldName}" Relationship="#{vocabulary}.#{resourceName + referencedResource}" FromRole="#{resourceName}" ToRole="#{referencedResource}" />"""
						).join('\n') + '\n' + '''
					</EntityType>'''
				).join('\n\n') + (
					for { name, ends } in associations
						name = getResourceName(name)
						"""<Association Name="#{name}">""" + '\n\t' + (
							for { resourceName, cardinality } in ends
								"""<End Role="#{resourceName}" Type="#{vocabulary}.#{resourceName}" Multiplicity="#{cardinality}" />"""
							).join('\n\t') + '\n' +
						'''</Association>'''
				).join('\n') + """
					<EntityContainer Name="#{vocabulary}Service" m:IsDefaultEntityContainer="true">

					""" +
						forEachUniqueTable(model, (key, { name: resourceName }) ->
							resourceName = getResourceName(resourceName)
							"""<EntitySet Name="#{resourceName}" EntityType="#{vocabulary}.#{resourceName}" />"""
						).join('\n') + '\n' + (
							for { name, ends } in associations
								name = getResourceName(name)
								"""<AssociationSet Name="#{name}" Association="#{vocabulary}.#{name}">""" + '\n\t' + (
									for { resourceName, cardinality } in ends
										"""<End Role="#{resourceName}" EntitySet="#{vocabulary}.#{resourceName}" />"""
									).join('\n\t') + '''
								</AssociationSet>'''
							).join('\n') +
						# <FunctionImport Name="GetProductsByRating" EntitySet="Products" ReturnType="Collection(ODataDemo.Product)" m:HttpMethod="GET">
							# <Parameter Name="rating" Type="Edm.Int32" Mode="In" />
						# </FunctionImport>
					'''
					</EntityContainer>''' +
					(
						for typeName, complexType of complexTypes
							complexType
					).join('\n') + '''
				</Schema>
			</edmx:DataServices>
		</edmx:Edmx>'''
