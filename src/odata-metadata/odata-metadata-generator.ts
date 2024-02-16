import type {
	AbstractSqlModel,
	AbstractSqlTable,
} from '@balena/abstract-sql-compiler';

import type { SbvrType } from '@balena/sbvr-types';
import { sbvrTypes } from '../sbvr-api/sbvr-utils.js';
import { version } from '../config-loader/env.js';
import type { PermissionLookup } from '../sbvr-api/permissions.js';

// OData JSON v4 CSDL Vocabulary constants
// http://docs.oasis-open.org/odata/odata-vocabularies/v4.0/odata-vocabularies-v4.0.html
const odataVocabularyReferences: ODataCsdlV4References = {
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
					$Namespace: 'Org.OData.Aggregation.V1',
					$Alias: 'Aggregation',
				},
			],
		},
	'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.json':
		{
			$Include: [
				{
					$Namespace: 'Org.OData.Capabilities.V1',
					$Alias: 'Capabilities',
				},
			],
		},
};

/**
 * Odata Common Schema Definition Language JSON format
 * http://docs.oasis-open.org/odata/odata-json-format/v4.0/odata-json-format-v4.0.html
 */

type ODataCsdlV4References = {
	[URI: string]: {
		$Include: Array<{
			$Namespace: string;
			$Alias: string;
			[annotation: string]: string | boolean;
		}>;
	};
};

type ODataCsdlV4BaseProperty = {
	[annotation: string]: string | boolean | undefined;
	$Type?: string;
	$Nullable?: boolean;
};

type ODataCsdlV4StructuralProperty = ODataCsdlV4BaseProperty & {
	$Kind?: 'Property'; // This member SHOULD be omitted to reduce document size.
};

type ODataCsdlV4NavigationProperty = ODataCsdlV4BaseProperty & {
	$Kind: 'NavigationProperty';
	$Partner?: string;
};

type ODataCsdlV4Property =
	| ODataCsdlV4BaseProperty
	| ODataCsdlV4StructuralProperty
	| ODataCsdlV4NavigationProperty;

type ODataCsdlV4EntityType = {
	$Kind: 'EntityType';
	$Key: string[];
	[property: string]:
		| true
		| string[]
		| string
		| 'EntityType'
		| ODataCsdlV4Property;
};

type ODataCsdlV4EntityContainerEntries = {
	// $Collection: true;
	$Type: string;
	[property: string]: true | string | ODataCapabilitiesUDIRRestrictionsMethod;
};

type ODataCsdlV4Entities = {
	[resource: string]: ODataCsdlV4EntityType;
};

type ODataCsdlV4EntityContainer = {
	$Kind: 'EntityContainer';
	'@Capabilities.BatchSupported'?: boolean;
	[resourceOrAnnotation: string]:
		| 'EntityContainer'
		| boolean
		| string
		| ODataCsdlV4EntityContainerEntries
		| undefined;
};

type ODataCsdlV4Schema = {
	$Alias: string;
	'@Core.DefaultNamespace': true;
	[resource: string]:
		| string
		| boolean
		| ODataCsdlV4EntityContainer
		| ODataCsdlV4EntityType;
};

type OdataCsdlV4 = {
	$Version: string;
	$Reference: ODataCsdlV4References;
	$EntityContainer: string;
	[schema: string]: string | ODataCsdlV4References | ODataCsdlV4Schema;
};

type PreparedPermissionsLookup = {
	[vocabulary: string]: {
		[resource: string]: {
			read: boolean;
			create: boolean;
			update: boolean;
			delete: boolean;
		};
	};
};

type PreparedAbstractModel = {
	vocabulary: string;
	abstractSqlModel: AbstractSqlModel;
	preparedPermissionLookup: PreparedPermissionsLookup;
};

type ODataCapabilitiesUDIRRestrictionsMethod =
	| { Updatable: boolean }
	| { Deletable: boolean }
	| { Insertable: boolean }
	| { Readable: boolean }
	| { Filterable: boolean };

const restrictionsLookup = (
	method: keyof PreparedPermissionsLookup[string][string] | 'all',
	value: boolean,
) => {
	const lookup = {
		update: {
			'@Capabilities.UpdateRestrictions': {
				Updatable: value,
			},
			'@Capabilities.FilterRestrictions': {
				Filterable: true,
			},
		},
		delete: {
			'@Capabilities.DeleteRestrictions': {
				Deletable: value,
			},
			'@Capabilities.FilterRestrictions': {
				Filterable: true,
			},
		},
		create: {
			'@Capabilities.InsertRestrictions': {
				Insertable: value,
			},
		},
		read: {
			'@Capabilities.ReadRestrictions': {
				Readable: value,
			},
			'@Capabilities.FilterRestrictions': {
				Filterable: true,
			},
		},
	};

	if (method === 'all') {
		return {
			...lookup['update'],
			...lookup['delete'],
			...lookup['create'],
			...lookup['read'],
		};
	} else {
		return lookup[method] ?? {};
	}
};

const getResourceName = (resourceName: string): string =>
	resourceName
		.split('-')
		.map((namePart) => namePart.split(' ').join('_'))
		.join('__');

const forEachUniqueTable = <T>(
	model: PreparedAbstractModel,
	callback: (
		tableName: string,
		table: AbstractSqlTable & { referenceScheme: string },
	) => T,
): T[] => {
	const usedTableNames: { [tableName: string]: true } = {};

	const result = [];

	for (const key of Object.keys(model.abstractSqlModel.tables).sort()) {
		const table = model.abstractSqlModel.tables[key] as AbstractSqlTable & {
			referenceScheme: string;
		};
		if (
			typeof table !== 'string' &&
			!table.primitive &&
			!usedTableNames[table.name] &&
			model.preparedPermissionLookup
		) {
			usedTableNames[table.name] = true;
			result.push(callback(key, table));
		}
	}
	return result;
};

/**
 * parsing dictionary of vocabulary.resource.operation permissions string
 * into dictionary of resource to operation for later lookup
 */

const preparePermissionsLookup = (
	permissionLookup: PermissionLookup,
): PreparedPermissionsLookup => {
	const resourcesAndOps: PreparedPermissionsLookup = {};

	for (const resourceOpsAuths of Object.keys(permissionLookup)) {
		const [vocabulary, resource, rule] = resourceOpsAuths.split('.');
		resourcesAndOps[vocabulary] ??= {};
		resourcesAndOps[vocabulary][resource] ??= {
			['read']: false,
			['create']: false,
			['update']: false,
			['delete']: false,
		};

		if (rule === 'all' || (resource === 'all' && rule === undefined)) {
			resourcesAndOps[vocabulary][resource] = {
				['read']: true,
				['create']: true,
				['update']: true,
				['delete']: true,
			};
		} else if (
			rule === 'read' ||
			rule === 'create' ||
			rule === 'update' ||
			rule === 'delete'
		) {
			resourcesAndOps[vocabulary][resource][rule] = true;
		}
	}
	return resourcesAndOps;
};

export const generateODataMetadata = (
	vocabulary: string,
	abstractSqlModel: AbstractSqlModel,
	permissionsLookup?: PermissionLookup,
) => {
	const complexTypes: { [fieldType: string]: string } = {};
	const resolveDataType = (fieldType: keyof typeof sbvrTypes): string => {
		if (sbvrTypes[fieldType] == null) {
			console.error('Could not resolve type', fieldType);
			throw new Error('Could not resolve type' + fieldType);
		}
		const { complexType } = (sbvrTypes[fieldType] as SbvrType).types.odata;
		if (complexType != null) {
			complexTypes[fieldType] = complexType;
		}
		return sbvrTypes[fieldType].types.odata.name;
	};

	const prepPermissionsLookup = permissionsLookup
		? preparePermissionsLookup(permissionsLookup)
		: {};

	const model: PreparedAbstractModel = {
		vocabulary,
		abstractSqlModel,
		preparedPermissionLookup: prepPermissionsLookup,
	};

	const metaBalenaEntries: ODataCsdlV4Entities = {};
	const entityContainer: ODataCsdlV4EntityContainer = {
		$Kind: 'EntityContainer',
		'@Capabilities.KeyAsSegmentSupported': false,
	};

	forEachUniqueTable(model, (_key, { idField, name: resourceName, fields }) => {
		resourceName = getResourceName(resourceName);
		// no path nor entity when permissions not contain resource
		const permissions: PreparedPermissionsLookup[string][string] =
			model?.preparedPermissionLookup?.['resource']?.['all'] ??
			model?.preparedPermissionLookup?.[model.vocabulary]?.['all'] ??
			model?.preparedPermissionLookup?.[model.vocabulary]?.[resourceName];

		if (!permissions) {
			return;
		}

		const uniqueTable: ODataCsdlV4EntityType = {
			$Kind: 'EntityType',
			$Key: [idField],
		};

		fields
			.filter(({ dataType }) => dataType !== 'ForeignKey')
			.map(({ dataType, fieldName, required }) => {
				dataType = resolveDataType(dataType as keyof typeof sbvrTypes);
				fieldName = getResourceName(fieldName);

				uniqueTable[fieldName] = {
					$Type: dataType,
					$Nullable: !required,
					'@Core.Computed':
						fieldName === 'created_at' || fieldName === 'modified_at'
							? true
							: false,
				};
			});

		fields
			.filter(
				({ dataType, references }) =>
					dataType === 'ForeignKey' && references != null,
			)
			.map(({ fieldName, references, required }) => {
				const { resourceName: referencedResource } = references!;
				const referencedResourceName =
					model.abstractSqlModel.tables[referencedResource]?.name;
				const typeReference = referencedResourceName || referencedResource;

				fieldName = getResourceName(fieldName);
				uniqueTable[fieldName] = {
					$Kind: 'NavigationProperty',
					$Partner: resourceName,
					$Nullable: !required,
					$Type: vocabulary + '.' + getResourceName(typeReference),
				};
			});

		metaBalenaEntries[resourceName] = uniqueTable;

		let entityCon: ODataCsdlV4EntityContainerEntries = {
			$Collection: true,
			$Type: vocabulary + '.' + resourceName,
		};
		for (const [resKey, resValue] of Object.entries(permissions) as Array<
			[keyof PreparedPermissionsLookup[string][string], boolean]
		>) {
			entityCon = { ...entityCon, ...restrictionsLookup(resKey, resValue) };
		}

		entityContainer[resourceName] = entityCon;
	});

	const odataCsdl: OdataCsdlV4 = {
		// needs to be === '4.0' as > '4.0' in csdl2openapi will switch to drop the `$` query parameter prefix for eg $top, $skip as it became optional in OData V4.01
		$Version: '3.0',
		$EntityContainer: vocabulary + '.ODataApi',
		$Reference: odataVocabularyReferences,
		[vocabulary]: {
			// schema
			$Alias: vocabulary,
			'@Core.DefaultNamespace': true,
			'@Core.Description': `OpenAPI specification for PineJS served SBVR datamodel: ${vocabulary}`,
			'@Core.LongDescription':
				'Auto-Genrated OpenAPI specification by utilizing OData CSDL to OpenAPI spec transformer.',
			'@Core.SchemaVersion': version,
			...metaBalenaEntries,
			['ODataApi']: entityContainer,
		},
	};

	return odataCsdl;
};

generateODataMetadata.version = version;
