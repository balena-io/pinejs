define(['underscore', 'cs!sbvr-compiler/types'], (_, sbvrTypes) ->

	return (vocabulary, sqlModel) ->
		complexTypes = {}
		resolveFieldType = (fieldType) ->
			switch fieldType
				when 'Interval'
					'Edm.Int64'
				else
					if sbvrTypes[fieldType]?
						if sbvrTypes[fieldType].types.odata.complexType?
							complexTypes[fieldType] = sbvrTypes[fieldType].types.odata.complexType
						sbvrTypes[fieldType].types.odata.name
					else
						console.error('Could not resolve type', fieldType)
						throw 'Could not resolve type' + fieldType


		model = sqlModel.tables
		# resourceNavigations = {}
		associations = []
		for key, {name: resourceName, fields, primitive} of model when !_.isString(model[key]) and !primitive
			for [fieldType, fieldName, required, indexes, references], i in fields when fieldType == 'ForeignKey'
				[referencedResource, referencedField] = references
				associations.push(
					name: resourceName + referencedResource
					ends: [
						{ resourceName, cardinality: if required then '1' else '0..1' }
						{ resourceName: referencedResource, cardinality:'*' }
					]
				)
				# resourceNavigations[resourceName] ?= []
				# resourceNavigations[resourceName].push(
					# name: fieldName
				# )
				# resourceNavigations[referencedResource] ?= []

		return """
			<?xml version="1.0" encoding="iso-8859-1" standalone="yes"?>
			<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">
				<edmx:DataServices xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" m:DataServiceVersion="2.0">
					<Schema Namespace="#{vocabulary}" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://schemas.microsoft.com/ado/2007/05/edm">
							
					""" + (
						for key, {idField, name: resourceName, fields, primitive} of model when !_.isString(model[key]) and !primitive
							"""
							<EntityType Name="#{resourceName}">
								<Key>
									<PropertyRef Name="#{idField}" />
								</Key>
								
								""" + (
								for [fieldType, fieldName, required, indexes, references] in fields when fieldType != 'ForeignKey'
									fieldType = resolveFieldType(fieldType)
									"""<Property Name="#{fieldName}" Type="#{fieldType}" Nullable="#{not required}" />"""
								).join('\n') + '\n' + (
								for [fieldType, fieldName, required, indexes, references] in fields when fieldType == 'ForeignKey'
									[referencedResource, referencedField] = references
									"""<NavigationProperty Name="#{fieldName}" Relationship="#{vocabulary}.#{resourceName + referencedResource}" FromRole="#{resourceName}" ToRole="#{referencedResource}" />"""
								).join('\n') + '\n' + """
							</EntityType>"""
					).join('\n\n') + (
						for {name, ends} in associations
							"""<Association Name="#{name}">""" + '\n\t' + (
								for {resourceName, cardinality} in ends
									"""<End Role="#{resourceName}" Type="#{vocabulary}.#{resourceName}" Multiplicity="#{cardinality}" />"""
								).join('\n\t') + '\n' +
							"""</Association>"""
					).join('\n') + """
						<EntityContainer Name="#{vocabulary}Service" m:IsDefaultEntityContainer="true">
						
						""" + (
							for key, {name: resourceName} of model when !_.isString(model[key]) and !primitive
								"""<EntitySet Name="#{resourceName}" EntityType="#{vocabulary}.#{resourceName}" />"""
							).join('\n') + '\n' + (
								for {name, ends} in associations
									"""<AssociationSet Name="#{name}" Association="#{vocabulary}.#{name}">""" + '\n\t' + (
										for {resourceName, cardinality} in ends
											"""<End Role="#{resourceName}" EntitySet="#{vocabulary}.#{resourceName}" />"""
										).join('\n\t') + """
									</AssociationSet>"""
								).join('\n') +
							# <FunctionImport Name="GetProductsByRating" EntitySet="Products" ReturnType="Collection(ODataDemo.Product)" m:HttpMethod="GET">
								# <Parameter Name="rating" Type="Edm.Int32" Mode="In" />
							# </FunctionImport>
						"""
						</EntityContainer>""" + (
							for typeName, complexType of complexTypes
								complexType
						).join('\n') + """
					</Schema>
				</edmx:DataServices>
			</edmx:Edmx>"""
)