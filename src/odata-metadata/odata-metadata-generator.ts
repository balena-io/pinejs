import type {
	AbstractSqlModel,
	AbstractSqlTable,
} from '@balena/abstract-sql-compiler';

import * as sbvrTypes from '@balena/sbvr-types';

type dict = { [key: string]: any };
interface OdataCsdl {
	$Version: string;
	$EntityContainer: string;
	[key: string]: any;
}

interface ODataNameSpaceType {
	$Alias: string;
	'@Core.DefaultNamespace': boolean;
	[key: string]: any;
}
interface ODataEntityContainerType {
	$Kind: 'EntityContainer';
	[key: string]: any;
}

interface ODataEntityContainerEntryType {
	$Kind: 'EntityType' | 'ComplexType' | 'NavigationProperty';
	[key: string]: any;
}

interface AbstractSqlModelWhitelist {
	abstractSqlModel: AbstractSqlModel;
	whitelist: dict;
}

// tslint:disable-next-line:no-var-requires
const { version }: { version: string } = require('../../package.json');

const getResourceName = (resourceName: string): string =>
	resourceName
		.split('-')
		.map((namePart) => namePart.split(' ').join('_'))
		.join('__');

const forEachUniqueTable = <T>(
	model: AbstractSqlModelWhitelist,
	callback: (tableName: string, table: AbstractSqlTable) => T,
): T[] => {
	const usedTableNames: { [tableName: string]: true } = {};

	const result = [];

	for (const key in model.abstractSqlModel.tables) {
		if (model.abstractSqlModel.tables.hasOwnProperty(key)) {
			const table = model.abstractSqlModel.tables[key];
			if (
				typeof table !== 'string' &&
				!table.primitive &&
				!usedTableNames[table.name] &&
				model.whitelist.hasOwnProperty(getResourceName(table.name))
			) {
				usedTableNames[table.name] = true;
				result.push(callback(key, table));
			}
		}
	}
	return result;
};

export const generateODataMetadata = (
	vocabulary: string,
	abstractSqlModel: AbstractSqlModel,
	whitelist?: { [key: string]: any },
) => {
	const complexTypes: { [fieldType: string]: string } = {};
	const resolveDataType = (fieldType: string): string => {
		if (sbvrTypes[fieldType] == null) {
			console.error('Could not resolve type', fieldType);
			throw new Error('Could not resolve type' + fieldType);
		}
		const { complexType } = sbvrTypes[fieldType].types.odata;
		if (complexType != null) {
			complexTypes[fieldType] = complexType;
		}
		return sbvrTypes[fieldType].types.odata.name;
	};
	const model: AbstractSqlModelWhitelist = {
		abstractSqlModel,
		whitelist: whitelist as dict,
	};

	const associations: Array<{
		name: string;
		ends: Array<{
			resourceName: string;
			cardinality: '1' | '0..1' | '*';
		}>;
	}> = [];

	forEachUniqueTable(model, (_key, { name: resourceName, fields }) => {
		resourceName = getResourceName(resourceName);
		for (const { dataType, required, references } of fields) {
			if (dataType === 'ForeignKey' && references != null) {
				const { resourceName: referencedResource } = references;
				associations.push({
					name: resourceName + referencedResource,
					ends: [
						{ resourceName, cardinality: required ? '1' : '0..1' },
						{ resourceName: referencedResource, cardinality: '*' },
					],
				});
			}
		}
	});

	const odataCsdl: OdataCsdl = {
		$Version: '4.0',
		$EntityContainer: vocabulary + '.ODataApi',
		$Reference: {
			'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json':
				{
					$Include: [
						{
							$Namespace: 'Org.OData.Core.V1',
							$Alias: 'Core',
							'@Core.DefaultNamespace': true,
						},
					],
				},
			'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Measures.V1.json':
				{
					$Include: [
						{
							$Namespace: 'Org.OData.Measures.V1',
							$Alias: 'Measures',
						},
					],
				},
			'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.json':
				{
					$Include: [
						{
							$Namespace: 'Org.OData.Aggregation.V1.json',
							$Alias: 'Aggregation',
						},
					],
				},
			'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.json':
				{
					$Include: [
						{
							$Namespace: 'Org.OData.Capabilities.V1.json',
							$Alias: 'Capabilities',
						},
					],
				},
		},
	};

	let metaBalena: ODataNameSpaceType = {
		$Alias: vocabulary,
		'@Core.DefaultNamespace': true,
	};

	let metaBalenaEntries: dict = {};
	forEachUniqueTable(model, (_key, { idField, name: resourceName, fields }) => {
		resourceName = getResourceName(resourceName);

		const uniqueTable: ODataEntityContainerEntryType = {
			$Kind: 'EntityType',
			$Key: [idField],
		};

		fields
			.filter(({ dataType }) => dataType !== 'ForeignKey')
			.map(({ dataType, fieldName, required }) => {
				dataType = resolveDataType(dataType);
				fieldName = getResourceName(fieldName);
				uniqueTable[fieldName] = {
					$Type: dataType,
					$Nullable: !required,
				};
			});

		fields
			.filter(
				({ dataType, references }) =>
					dataType === 'ForeignKey' && references != null,
			)
			.map(({ fieldName, references, required }) => {
				const { resourceName: referencedResource } = references!;
				fieldName = getResourceName(fieldName);
				uniqueTable[fieldName] = {
					$Kind: 'NavigationProperty',
					$Partner: resourceName,
					$Nullable: !required,
					$Type: vocabulary + '.' + getResourceName(referencedResource),
				};
			});

		metaBalenaEntries[resourceName] = uniqueTable;
	});

	metaBalenaEntries = Object.keys(metaBalenaEntries)
		.sort()
		.reduce((r, k) => ((r[k] = metaBalenaEntries[k]), r), {} as dict);

	metaBalena = { ...metaBalena, ...metaBalenaEntries };

	let oDataApi: ODataEntityContainerType = {
		$Kind: 'EntityContainer',
	};

	let entityContainerEntries: dict = {};
	forEachUniqueTable(model, (_key, { name: resourceName }) => {
		resourceName = getResourceName(resourceName);

		entityContainerEntries[resourceName] = {
			$Collection: true,
			$Type: vocabulary + '.' + resourceName,
		};
	});

	entityContainerEntries = Object.keys(entityContainerEntries)
		.sort()
		.reduce((r, k) => ((r[k] = entityContainerEntries[k]), r), {} as dict);
	oDataApi = { ...oDataApi, ...entityContainerEntries };

	metaBalena['ODataApi'] = oDataApi;

	odataCsdl[vocabulary] = metaBalena;

	return JSON.stringify(odataCsdl, null, 2);
};

generateODataMetadata.version = version;
