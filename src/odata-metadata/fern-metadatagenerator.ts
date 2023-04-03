import type {
	AbstractSqlModel,
	AbstractSqlTable,
} from '@balena/abstract-sql-compiler';

import * as sbvrTypes from '@balena/sbvr-types';
import { PermissionLookup } from '../sbvr-api/permissions';
import { faker } from '@faker-js/faker';

// tslint:disable-next-line:no-var-requires
const { version }: { version: string } = require('../../package.json');

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

const capitalize = (str: string) => {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export const generateFernMetadata = (
	vocabulary: string,
	abstractSqlModel: AbstractSqlModel,
	permissionsLookup?: PermissionLookup,
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

	const prepPermissionsLookup = permissionsLookup
		? preparePermissionsLookup(permissionsLookup)
		: {};

	const model: PreparedAbstractModel = {
		vocabulary,
		abstractSqlModel,
		preparedPermissionLookup: prepPermissionsLookup,
	};

	const ODataQueryParameters = {
		$filter: 'optional<string>',
		$select: 'optional<string>',
		$expand: 'optional<string>',
		$top: 'optional<integer>',
		$count: 'optional<integer>',
	};

	// type FernEndpoint = {
	// 	path: string;
	// 	'path-parameters': { [key: string]: string };
	// 	method: string;
	// 	request: {
	// 		name: string;
	// 		'query-parameters': typeof ODataQueryParameters;
	// 		auth?: boolean;
	// 		docs?: string;
	// 	};
	// };

	const fernRootEndpoints: any = {};

	const fernRootTypes: any = {};
	// let fernRootErrors: any = {};

	const exampleFaker = (
		fieldName: string,
		dataType?: any,
		// referencedResource?: string,
	) => {
		if (fieldName === 'id' || dataType === 'long' || dataType === 'integer') {
			return faker.datatype.number(100000);
		} else if (dataType === 'datetime') {
			return faker.date.past();
			// return new Date().toISOString();
		} else if (dataType === 'string') {
			return faker.random.alpha(20);
		}
	};

	forEachUniqueTable(model, (_key, { name: resourceName, fields }) => {
		resourceName = getResourceName(resourceName);
		// no path nor entity when permissions not contain resource
		const permissions: PreparedPermissionsLookup[string][string] =
			model?.preparedPermissionLookup?.['resource']?.['all'] ??
			model?.preparedPermissionLookup?.[model.vocabulary]?.['all'] ??
			model?.preparedPermissionLookup?.[model.vocabulary]?.[resourceName];

		if (!permissions) {
			return;
		}

		const uniqueTable: any = {
			properties: {},
		};

		const selectableFields: any = [];
		const exampleForType: any = {};
		const exampleForEndpoint: any = {};

		fields
			.filter(({ dataType }) => dataType !== 'ForeignKey')
			.map(({ dataType, fieldName, required }) => {
				dataType = resolveDataType(dataType);
				fieldName = getResourceName(fieldName);

				selectableFields.push(fieldName);

				const lookup: any = { int64: 'long' };

				const dtName = dataType.replace('Edm.', '').toLowerCase();
				const dt = lookup[dtName] ? lookup[dtName] : dtName;

				if (fieldName !== 'id') {
					uniqueTable.properties[fieldName] = {
						type: required ? `optional<${dt}>` : dt,
					};
				} else {
					uniqueTable.properties[fieldName] = {
						type: `long`,
						docs: `The unique identifier for a ${capitalize(resourceName)}`,
					};
				}
				exampleForType[fieldName] = exampleForEndpoint[fieldName] =
					exampleFaker(fieldName, dt);
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

				selectableFields.push(fieldName);

				const referenceResourceName = capitalize(
					getResourceName(typeReference),
				);

				uniqueTable.properties[fieldName] = required
					? `optional<${referenceResourceName}>`
					: referenceResourceName;

				// exampleForType[fieldName] = exampleFaker(fieldName, 'id');
			});

		const capitalizedResourceName = capitalize(resourceName);

		uniqueTable.examples ??= [{ value: exampleForType }];

		fernRootTypes[capitalizedResourceName] = uniqueTable;
		fernRootTypes[capitalizedResourceName + 'Response'] = {
			properties: { d: `list<${capitalizedResourceName}>` },
		};

		for (const [resKey, resValue] of Object.entries(permissions) as Array<
			[keyof PreparedPermissionsLookup[string][string], boolean]
		>) {
			const httpLookup: any = {
				read: 'GET',
				create: 'POST',
				update: 'PATCH',
				delete: 'DELETE',
			};

			const compileResponse: any = {
				read: capitalizedResourceName + 'Response',
				create: capitalizedResourceName + 'Response',
				update: undefined,
				delete: undefined,
			};

			const multiEndpoint: any = {
				read: true,
				create: false,
				update: true,
				delete: true,
			};
			if (resValue) {
				if (multiEndpoint[resKey]) {
					fernRootEndpoints[
						capitalize(resKey) + 'All' + capitalizedResourceName
					] = {
						path: `/${resourceName}`,
						method: httpLookup[resKey],
						response: compileResponse[resKey],
						request: {
							name: capitalize(resKey) + 'all' + capitalizedResourceName,
							'query-parameters': ODataQueryParameters,
						},
						examples: [
							{
								'query-parameters': {
									$select: selectableFields.join(','),
								},
								response: compileResponse[resKey]
									? {
											body: {
												d: [exampleForEndpoint, exampleForEndpoint],
											},
									  }
									: undefined,
							},
						],
					};
				}

				fernRootEndpoints[capitalize(resKey) + capitalizedResourceName] = {
					path: `/${resourceName}(id)`,
					// 'path-parameters': {
					// 	[`${resourceName}Id`]: 'long',
					// },
					method: httpLookup[resKey],
					response: compileResponse[resKey],
					request: {
						name: capitalize(resKey) + capitalizedResourceName + 'ById',
					},
					examples: [
						{
							response: compileResponse[resKey]
								? {
										body: exampleForEndpoint,
								  }
								: undefined,
						},
					],
				};
			}
		}
	});

	const fernRootApi = {
		service: {
			auth: false,
			'base-path': `/${vocabulary}`,
			endpoints: fernRootEndpoints,
		},
		types: fernRootTypes,
		// errors: fernRootErrors,
	};

	return fernRootApi;
};

generateFernMetadata.version = version;
