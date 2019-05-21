declare module '@resin/abstract-sql-compiler' {
	interface AbstractSqlTable {
		fetchProcessingFields?: {
			[field: string]: (field: any) => Promise<any>;
		};
		localFields?: {
			[odataName: string]: true;
		};
	}
}

import * as _ from 'lodash';
import * as Promise from 'bluebird';
import { Row, Result } from '../database-layer/db';
import { resolveNavigationResource, resolveSynonym } from './sbvr-utils';
import { sqlNameToODataName } from '@resin/odata-to-abstract-sql';
import * as sbvrTypes from '@resin/sbvr-types';
import {
	AbstractSqlModel,
	AbstractSqlTable,
} from '@resin/abstract-sql-compiler';

const checkForExpansion = Promise.method(
	(
		vocab: string,
		abstractSqlModel: AbstractSqlModel,
		parentResourceName: string,
		fieldName: string,
		instance: Row,
	) => {
		let field = instance[fieldName];
		if (field == null) {
			return;
		}

		if (_.isString(field)) {
			try {
				field = JSON.parse(field);
			} catch (_e) {
				// If we can't JSON.parse the field then we use it directly.
			}
		}

		if (_.isArray(field)) {
			const mappingResourceName = resolveNavigationResource(
				{
					abstractSqlModel,
					vocabulary: vocab,
					resourceName: parentResourceName,
				},
				fieldName,
			);
			return process(vocab, abstractSqlModel, mappingResourceName, field).then(
				expandedField => {
					instance[fieldName] = expandedField;
				},
			);
		} else {
			const mappingResourceName = resolveNavigationResource(
				{
					abstractSqlModel,
					vocabulary: vocab,
					resourceName: parentResourceName,
				},
				fieldName,
			);
			instance[fieldName] = {
				__deferred: {
					uri: '/' + vocab + '/' + mappingResourceName + '(' + field + ')',
				},
				__id: field,
			};
		}
	},
);

export const resourceURI = (
	vocab: string,
	resourceName: string,
	id: string | number,
) => {
	if (_.isString(id)) {
		id = "'" + encodeURIComponent(id) + "'";
	}
	return '/' + vocab + '/' + resourceName + '(' + id + ')';
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

export const process = (
	vocab: string,
	abstractSqlModel: AbstractSqlModel,
	resourceName: string,
	rows: Result['rows'],
): Promise<number | Row[]> => {
	if (rows.length === 0) {
		return Promise.resolve([]);
	}

	if (rows.length === 1) {
		if (rows[0].$count != null) {
			const count = parseInt(rows[0].$count, 10);
			return Promise.resolve(count);
		}
	}

	const sqlResourceName = resolveSynonym({
		abstractSqlModel,
		vocabulary: vocab,
		resourceName,
	});
	const table = abstractSqlModel.tables[sqlResourceName];

	const odataIdField = sqlNameToODataName(table.idField);
	const instances = rows.map(instance => {
		instance.__metadata = {
			uri: resourceURI(vocab, resourceName, instance[odataIdField]),
			type: '',
		};
		return instance;
	});

	let instancesPromise = Promise.resolve();

	const localFields = getLocalFields(table);
	// We check that it's not a local field, rather than that it is a foreign key because of the case where the foreign key is on the other resource
	// and hence not known to this resource
	const expandableFields = _.filter(
		_.keys(instances[0]),
		fieldName =>
			!_.startsWith(fieldName, '__') && !localFields.hasOwnProperty(fieldName),
	);
	if (expandableFields.length > 0) {
		instancesPromise = Promise.map(instances, instance =>
			Promise.map(expandableFields, fieldName =>
				checkForExpansion(
					vocab,
					abstractSqlModel,
					sqlResourceName,
					fieldName,
					instance,
				),
			),
		).return();
	}

	const fetchProcessingFields = getFetchProcessingFields(table);
	const processedFields = _.filter(
		_.keys(instances[0]),
		fieldName =>
			!_.startsWith(fieldName, '__') &&
			fetchProcessingFields.hasOwnProperty(fieldName),
	);
	if (processedFields.length > 0) {
		instancesPromise = instancesPromise
			.then(() =>
				Promise.map(instances, instance =>
					Promise.map(processedFields, resourceName =>
						fetchProcessingFields[resourceName](instance[resourceName]).then(
							result => {
								instance[resourceName] = result;
							},
						),
					),
				),
			)
			.return();
	}

	return instancesPromise.return(instances);
};

export const prepareModel = (abstractSqlModel: AbstractSqlModel) => {
	_.each(abstractSqlModel.tables, table => {
		getLocalFields(table);
		getFetchProcessingFields(table);
	});
};
