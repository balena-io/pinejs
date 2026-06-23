import type {
	AbstractSqlModel,
	AbstractSqlTable,
} from '@balena/abstract-sql-compiler';
import { sqlNameToODataName } from '@balena/odata-to-abstract-sql';
import z from 'zod';
import $sbvrTypes from '@balena/sbvr-types';
const { default: sbvrTypes } = $sbvrTypes;

// Augment express.js with pinejs-specific attributes via declaration merging.
declare module '@balena/abstract-sql-compiler' {
	export interface AbstractSqlTable {
		validator?: z.ZodObject;
	}
}

export const getValidator = (table: AbstractSqlTable) => {
	if (table.validator == null) {
		const zObject: Record<string, z.ZodType> = {};
		for (const { fieldName, dataType, required } of table.fields) {
			zObject[sqlNameToODataName(fieldName)] =
				sbvrTypes[dataType as keyof typeof sbvrTypes].schema[
					required ? 'optional' : 'nullish'
				]();
		}
		table.validator = z.looseObject(zObject);
	}
	return table.validator;
};

export const prepareModel = (abstractSqlModel: AbstractSqlModel) => {
	for (const table of Object.values(abstractSqlModel.tables)) {
		getValidator(table);
	}
};

/**
 * The validator we add to the AbstractSqlTable is a ZodObject, which is not serializable to JSON. This function is used to ignore these validators whilst stringifying, allowing it to work.
 */
export const stringifyIgnoreValidator = (key: string, value: any) => {
	if (key === 'validator' && value instanceof z.ZodObject) {
		return undefined;
	}
	return value;
};
