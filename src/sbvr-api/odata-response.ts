import type {
	AbstractSqlModel,
	AbstractSqlTable,
} from '@balena/abstract-sql-compiler';

// Augment express.js with pinejs-specific attributes via declaration merging.
declare module '@balena/abstract-sql-compiler' {
	export interface AbstractSqlTable {
		fetchProcessingFields?: {
			[field: string]: NonNullable<SbvrType['fetchProcessing']>;
		};
		localFields?: Set<string>;
		webresourceFields?: Set<string>;
	}
}

import type { Result, Row } from '../database-layer/db.js';

import { sqlNameToODataName } from '@balena/odata-to-abstract-sql';
import type { SbvrType } from '@balena/sbvr-types';
import _ from 'lodash';
import {
	sbvrTypes,
	resolveNavigationResource,
	resolveSynonym,
} from './sbvr-utils.js';
import { getWebresourceHandler } from '../webresource-handler/index.js';

const checkForExpansion = async (
	vocab: string,
	abstractSqlModel: AbstractSqlModel,
	parentResourceName: string,
	fieldName: string,
	row: Row,
	opts: { includeMetadata: boolean },
) => {
	let field = row[fieldName];
	if (field == null) {
		return;
	}

	if (typeof field === 'string') {
		try {
			field = JSON.parse(field);
		} catch {
			// If we can't JSON.parse the field then we use it directly.
		}
	}

	const mappingResourceName = resolveNavigationResource(
		{
			abstractSqlModel,
			vocabulary: vocab,
			resourceName: parentResourceName,
		},
		fieldName,
	);
	if (Array.isArray(field)) {
		row[fieldName] = await process(
			vocab,
			abstractSqlModel,
			mappingResourceName,
			field,
			opts,
		);
	} else {
		row[fieldName] = {
			__id: field,
		};
		if (opts.includeMetadata) {
			row[fieldName].__deferred = {
				uri: resourceURI(vocab, mappingResourceName, field),
			};
		}
	}
};

export function resourceURI(
	vocab: string,
	resourceName: string,
	id: string | number,
): string;
export function resourceURI(
	vocab: string,
	resourceName: string,
	id: string | number | null | undefined,
): string | undefined;
export function resourceURI(
	vocab: string,
	resourceName: string,
	id: string | number | null | undefined,
): string | undefined {
	if (id == null) {
		return;
	}
	if (typeof id === 'string') {
		id = "'" + encodeURIComponent(id) + "'";
	}
	return `/${vocab}/${resourceName}(@id)?@id=${id}`;
}

const getLocalFields = (table: AbstractSqlTable) => {
	if (table.localFields == null) {
		table.localFields = new Set<string>();
		for (const { fieldName, dataType } of table.fields) {
			if (!['ForeignKey', 'ConceptType'].includes(dataType)) {
				table.localFields.add(sqlNameToODataName(fieldName));
			}
		}
	}
	return table.localFields;
};

const getWebResourceFields = (table: AbstractSqlTable) => {
	if (table.webresourceFields == null) {
		table.webresourceFields = new Set<string>();
		for (const { fieldName, dataType } of table.fields) {
			if (dataType === 'WebResource') {
				table.webresourceFields.add(sqlNameToODataName(fieldName));
			}
		}
	}
	return table.webresourceFields;
};

const getFetchProcessingFields = (table: AbstractSqlTable) => {
	return (table.fetchProcessingFields ??= Object.fromEntries(
		table.fields
			.filter(
				({ dataType }) =>
					(sbvrTypes[dataType as keyof typeof sbvrTypes] as SbvrType)
						?.fetchProcessing != null,
			)
			.map(({ fieldName, dataType }) => {
				return [
					sqlNameToODataName(fieldName),
					(sbvrTypes[dataType as keyof typeof sbvrTypes] as SbvrType)
						.fetchProcessing!,
				] as const;
			}),
	));
};

export const process = async (
	vocab: string,
	abstractSqlModel: AbstractSqlModel,
	resourceName: string,
	rows: Result['rows'],
	{ includeMetadata }: { includeMetadata: boolean },
): Promise<number | Row[]> => {
	if (rows.length === 0) {
		return [];
	}

	if (rows.length === 1) {
		if (rows[0].$count != null) {
			return parseInt(rows[0].$count, 10);
		}
	}

	const sqlResourceName = resolveSynonym({
		abstractSqlModel,
		vocabulary: vocab,
		resourceName,
	});
	const configuredWebResourceHandler = getWebresourceHandler();
	const table = abstractSqlModel.tables[sqlResourceName];

	const fieldNames = Object.keys(rows[0]);

	const fetchProcessingFields = getFetchProcessingFields(table);
	const processedFields = fieldNames.filter((fieldName) =>
		Object.hasOwn(fetchProcessingFields, fieldName),
	);

	const localFields = getLocalFields(table);
	// We check that it's not a local field, rather than that it is a foreign key because of the case where the foreign key is on the other resource
	// and hence not known to this resource
	const expandableFields = fieldNames.filter(
		(fieldName) => !localFields.has(fieldName),
	);

	const webresourceFields = getWebResourceFields(table);
	const requiredSigningFields =
		webresourceFields.size > 0
			? fieldNames.filter((fieldName) => webresourceFields.has(fieldName))
			: [];

	const odataIdField = sqlNameToODataName(table.idField);
	for (const row of rows) {
		for (const fieldName of processedFields) {
			row[fieldName] = fetchProcessingFields[fieldName](row[fieldName]);
		}
		if (includeMetadata) {
			row.__metadata = {
				uri: resourceURI(vocab, resourceName, row[odataIdField]),
			};
		}
	}

	if (
		requiredSigningFields.length > 0 &&
		configuredWebResourceHandler != null
	) {
		await Promise.all(
			rows.map(async (row) => {
				await Promise.all(
					requiredSigningFields.map(async (fieldName) => {
						if (row[fieldName] != null) {
							row[fieldName] = await configuredWebResourceHandler.onPreRespond(
								row[fieldName],
							);
						}
					}),
				);
			}),
		);
	}

	if (expandableFields.length > 0) {
		await Promise.all(
			rows.map(async (row) => {
				await Promise.all(
					expandableFields.map(async (fieldName) => {
						await checkForExpansion(
							vocab,
							abstractSqlModel,
							sqlResourceName,
							fieldName,
							row,
							{ includeMetadata },
						);
					}),
				);
			}),
		);
	}

	return rows;
};

export const prepareModel = (abstractSqlModel: AbstractSqlModel) => {
	_.forEach(abstractSqlModel.tables, (table) => {
		getLocalFields(table);
		getFetchProcessingFields(table);
		getWebResourceFields(table);
	});
};
