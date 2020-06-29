declare module '@balena/abstract-sql-compiler' {
	interface AbstractSqlTable {
		fetchProcessingFields?: {
			[field: string]: NonNullable<typeof sbvrTypes[string]['fetchProcessing']>;
		};
		localFields?: {
			[odataName: string]: true;
		};
	}
}

import type {
	AbstractSqlModel,
	AbstractSqlTable,
} from '@balena/abstract-sql-compiler';
import type { Result, Row } from '../database-layer/db';

import { sqlNameToODataName } from '@balena/odata-to-abstract-sql';
import * as sbvrTypes from '@balena/sbvr-types';
import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { resolveNavigationResource, resolveSynonym } from './sbvr-utils';

const checkForExpansion = async (
	vocab: string,
	abstractSqlModel: AbstractSqlModel,
	parentResourceName: string,
	fieldName: string,
	row: Row,
) => {
	let field = row[fieldName];
	if (field == null) {
		return;
	}

	if (typeof field === 'string') {
		try {
			field = JSON.parse(field);
		} catch (_e) {
			// If we can't JSON.parse the field then we use it directly.
		}
	}

	if (Array.isArray(field)) {
		const mappingResourceName = resolveNavigationResource(
			{
				abstractSqlModel,
				vocabulary: vocab,
				resourceName: parentResourceName,
			},
			fieldName,
		);
		const expandedField = await process(
			vocab,
			abstractSqlModel,
			mappingResourceName,
			field,
		);
		row[fieldName] = expandedField;
	} else {
		const mappingResourceName = resolveNavigationResource(
			{
				abstractSqlModel,
				vocabulary: vocab,
				resourceName: parentResourceName,
			},
			fieldName,
		);
		row[fieldName] = {
			__deferred: {
				uri: '/' + vocab + '/' + mappingResourceName + '(' + field + ')',
			},
			__id: field,
		};
	}
};

export const resourceURI = (
	vocab: string,
	resourceName: string,
	id: string | number,
): string | undefined => {
	if (id == null) {
		return;
	}
	if (typeof id === 'string') {
		id = "'" + encodeURIComponent(id) + "'";
	}
	return `/${vocab}/${resourceName}(@id)?@id=${id}`;
};

const getLocalFields = (table: AbstractSqlTable) => {
	if (table.localFields == null) {
		table.localFields = {};
		for (const { fieldName, dataType } of table.fields) {
			if (dataType !== 'ForeignKey') {
				const odataName = sqlNameToODataName(fieldName);
				table.localFields[odataName] = true;
			}
		}
	}
	return table.localFields;
};
const getFetchProcessingFields = (table: AbstractSqlTable) => {
	if (table.fetchProcessingFields == null) {
		table.fetchProcessingFields = _(table.fields)
			.filter(
				({ dataType }) =>
					sbvrTypes[dataType] != null &&
					sbvrTypes[dataType].fetchProcessing != null,
			)
			.map(({ fieldName, dataType }) => {
				const odataName = sqlNameToODataName(fieldName);
				return [odataName, sbvrTypes[dataType].fetchProcessing];
			})
			.fromPairs()
			.value();
	}
	return table.fetchProcessingFields!;
};

export const process = async (
	vocab: string,
	abstractSqlModel: AbstractSqlModel,
	resourceName: string,
	rows: Result['rows'],
): Promise<number | Row[]> => {
	if (rows.length === 0) {
		return [];
	}

	if (rows.length === 1) {
		if (rows[0].$count != null) {
			const count = parseInt(rows[0].$count, 10);
			return count;
		}
	}

	const sqlResourceName = resolveSynonym({
		abstractSqlModel,
		vocabulary: vocab,
		resourceName,
	});
	const table = abstractSqlModel.tables[sqlResourceName];

	const fieldNames = Object.keys(rows[0]);

	const fetchProcessingFields = getFetchProcessingFields(table);
	const processedFields = fieldNames.filter((fieldName) =>
		fetchProcessingFields.hasOwnProperty(fieldName),
	);

	const localFields = getLocalFields(table);
	// We check that it's not a local field, rather than that it is a foreign key because of the case where the foreign key is on the other resource
	// and hence not known to this resource
	const expandableFields = fieldNames.filter(
		(fieldName) => !localFields.hasOwnProperty(fieldName),
	);

	const odataIdField = sqlNameToODataName(table.idField);
	rows.forEach((row) => {
		row.__metadata = {
			uri: resourceURI(vocab, resourceName, row[odataIdField]),
		};
	});

	if (expandableFields.length > 0) {
		await Bluebird.map(rows, (row) =>
			Bluebird.map(expandableFields, (fieldName) =>
				checkForExpansion(
					vocab,
					abstractSqlModel,
					sqlResourceName,
					fieldName,
					row,
				),
			),
		);
	}

	if (processedFields.length > 0) {
		rows.forEach((row) => {
			processedFields.forEach((fieldName) => {
				row[fieldName] = fetchProcessingFields[fieldName](row[fieldName]);
			});
		});
	}

	return rows;
};

export const prepareModel = (abstractSqlModel: AbstractSqlModel) => {
	_.forEach(abstractSqlModel.tables, (table) => {
		getLocalFields(table);
		getFetchProcessingFields(table);
	});
};
