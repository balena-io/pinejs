import _ from 'lodash';

import type { Engines } from '@balena/abstract-sql-compiler';
import * as AbstractSQLCompiler from '@balena/abstract-sql-compiler';
import type { BindKey } from '@balena/odata-parser';
import {
	type ODataBinds,
	odataNameToSqlName,
	isBindReference,
} from '@balena/odata-to-abstract-sql';
import deepFreeze from 'deep-freeze';
import { BadRequestError, SqlCompilationError } from './errors.js';
import * as sbvrUtils from './sbvr-utils.js';
import type { CachedSqlQuery, ODataRequest } from './uri-parser.js';

const compileQuery = (
	engine: AbstractSQLCompiler.Engines,
	abstractSqlQuery: NonNullable<ODataRequest['abstractSqlQuery']>,
) => {
	if (!('sqlQuery' in abstractSqlQuery)) {
		const sqlQuery = AbstractSQLCompiler[engine].compileRule(abstractSqlQuery);
		const modifiedFields =
			AbstractSQLCompiler[engine].getModifiedFields(abstractSqlQuery);
		if (modifiedFields != null) {
			deepFreeze(modifiedFields);
		}
		abstractSqlQuery = abstractSqlQuery as any as CachedSqlQuery;
		abstractSqlQuery.length = 0;
		abstractSqlQuery.engine = engine;
		abstractSqlQuery.sqlQuery = sqlQuery;
		abstractSqlQuery.modifiedFields = modifiedFields;
	}
	if (engine !== abstractSqlQuery.engine) {
		throw new Error(
			'Trying to recompile a cached abstract sql query with a different engine than it was compiled with is not supported',
		);
	}
	return {
		sqlQuery: abstractSqlQuery.sqlQuery,
		modifiedFields: abstractSqlQuery.modifiedFields,
	};
};

export const compileRequest = (request: ODataRequest) => {
	if (request.abstractSqlQuery != null) {
		const { engine } = request;
		if (engine == null) {
			throw new SqlCompilationError('No database engine specified');
		}
		try {
			const { sqlQuery, modifiedFields } = compileQuery(
				engine,
				request.abstractSqlQuery,
			);
			request.sqlQuery = sqlQuery;
			request.modifiedFields = modifiedFields;
		} catch (err: any) {
			sbvrUtils.logger[request.vocabulary].error(
				'Failed to compile abstract sql: ',
				request.abstractSqlQuery,
				err,
			);
			throw new SqlCompilationError(err);
		}
	}
	return request;
};

export const resolveOdataBind = (odataBinds: ODataBinds, value: any) => {
	if (value != null && typeof value === 'object' && isBindReference(value)) {
		[, value] = odataBinds[value.bind];
	}
	return value;
};

export const getAndCheckBindValues = async (
	request: Required<
		Pick<ODataRequest, 'vocabulary' | 'odataBinds' | 'values' | 'engine'>
	>,
	bindings: AbstractSQLCompiler.Binding[],
) => {
	const { odataBinds, values, engine } = request;
	const sqlModelTables = sbvrUtils.getAbstractSqlModel(request).tables;
	return await Promise.all(
		bindings.map(async (binding) => {
			let fieldName = '';
			let field: { dataType: string; required?: boolean };
			let value: any;
			if (binding[0] === 'Bind') {
				const bindValue = binding[1];
				if (Array.isArray(bindValue)) {
					let tableName;
					[tableName, fieldName] = bindValue;

					const referencedName = tableName + '.' + fieldName;
					value = values[referencedName];
					if (value === undefined) {
						value = values[fieldName];
					}

					value = resolveOdataBind(odataBinds, value);

					const sqlTableName = odataNameToSqlName(tableName);
					const sqlFieldName = odataNameToSqlName(fieldName);
					const table = sqlModelTables[sqlTableName];
					const maybeField = (table.modifyFields ?? table.fields).find(
						(f) => f.fieldName === sqlFieldName,
					);
					if (maybeField == null) {
						throw new Error(`Could not find field '${fieldName}'`);
					}
					field = maybeField;
				} else if (Number.isInteger(bindValue)) {
					if (bindValue >= odataBinds.length) {
						console.error(
							`Invalid binding number '${bindValue}' for binds: `,
							odataBinds,
						);
						throw new Error('Invalid binding');
					}
					let dataType;
					[dataType, value] = odataBinds[bindValue];
					field = { dataType };
				} else if (typeof bindValue === 'string') {
					if (!Object.hasOwn(odataBinds, bindValue)) {
						console.error(
							`Invalid binding '${bindValue}' for binds: `,
							odataBinds,
						);
						throw new Error('Invalid binding');
					}
					let dataType;
					[dataType, value] = odataBinds[bindValue as BindKey];
					field = { dataType };
				} else {
					throw new Error(`Unknown binding: ${binding}`);
				}
			} else {
				let dataType;
				[dataType, value] = binding;
				field = { dataType };
			}

			if (value === undefined) {
				throw new Error(`Bind value cannot be undefined: ${binding}`);
			}

			try {
				return await validateBindingType(engine, value, field);
			} catch (err: any) {
				throw new BadRequestError(`"${fieldName}" ${err.message}`);
			}
		}),
	);
};

const validateBindingType = async (
	engine: Engines,
	$value: any,
	field: { dataType: string; required?: boolean },
): Promise<any> => {
	if (field.dataType === 'List') {
		if (!Array.isArray($value)) {
			throw new Error('List value binding must be an array');
		}
		return await Promise.all(
			$value.map(async ([dataType, value]: [string, any]) => {
				// Null is a special case for list values
				if (dataType === 'Null') {
					return null;
				}
				return await validateBindingType(engine, value, { dataType });
			}),
		);
	}
	return await AbstractSQLCompiler[engine].dataTypeValidate($value, field);
};

const checkModifiedFields = (
	ruleReferencedFields: AbstractSQLCompiler.RuleReferencedFields,
	modifiedFields: AbstractSQLCompiler.ModifiedFields,
) => {
	const refs = ruleReferencedFields[modifiedFields.table];
	// If there are no referenced fields of the modified table then the rule is not affected
	if (refs == null) {
		return false;
	}
	// If there are no referenced fields for the given action type then the rule is not affected
	if (refs[modifiedFields.action].length === 0) {
		return false;
	}

	// If there are no specific fields listed then that means they were all modified (ie insert/delete) and so the rule can be affected
	if (modifiedFields.fields == null) {
		return true;
	}

	// Otherwise check if there are any matching fields to see if the rule is affected
	return (
		_.intersection(refs[modifiedFields.action], modifiedFields.fields).length >
		0
	);
};
export const isRuleAffected = (
	rule: AbstractSQLCompiler.SqlRule,
	request?: Pick<
		ODataRequest,
		'abstractSqlQuery' | 'modifiedFields' | 'method' | 'vocabulary'
	>,
) => {
	// If there is no abstract sql query then nothing was modified
	if (request?.abstractSqlQuery == null) {
		return false;
	}
	// If for some reason there are no referenced fields known for the rule then we just assume it may have been modified
	if (rule.ruleReferencedFields == null) {
		return true;
	}
	const { modifiedFields } = request;
	// If we can't get any modified fields we assume the rule may have been modified
	if (modifiedFields == null) {
		console.warn(
			`Could not determine the modified table/fields info for '${request.method}' to ${request.vocabulary}`,
			request.abstractSqlQuery,
		);
		return true;
	}
	if (Array.isArray(modifiedFields)) {
		return modifiedFields.some(
			_.partial(checkModifiedFields, rule.ruleReferencedFields),
		);
	}
	return checkModifiedFields(rule.ruleReferencedFields, modifiedFields);
};
