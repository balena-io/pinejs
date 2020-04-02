import * as Bluebird from 'bluebird';
import * as _ from 'lodash';

import * as AbstractSQLCompiler from '@resin/abstract-sql-compiler';
import { ODataBinds, odataNameToSqlName } from '@resin/odata-to-abstract-sql';
import deepFreeze = require('deep-freeze');
import * as memoize from 'memoizee';
import memoizeWeak = require('memoizee/weak');
import * as env from '../config-loader/env';
import { SqlCompilationError } from './errors';
import * as sbvrUtils from './sbvr-utils';
import { ODataRequest } from './uri-parser';

const getMemoizedCompileRule = memoize(
	(engine: AbstractSQLCompiler.Engines) =>
		memoizeWeak(
			(abstractSqlQuery: AbstractSQLCompiler.AbstractSqlQuery) => {
				const sqlQuery = AbstractSQLCompiler[engine].compileRule(
					abstractSqlQuery,
				);
				const modifiedFields = AbstractSQLCompiler[engine].getModifiedFields(
					abstractSqlQuery,
				);
				if (modifiedFields != null) {
					deepFreeze(modifiedFields);
				}
				return {
					sqlQuery,
					modifiedFields,
				};
			},
			{ max: env.cache.abstractSqlCompiler.max },
		),
	{ primitive: true },
);

export const compileRequest = (request: ODataRequest) => {
	if (request.abstractSqlQuery != null) {
		const { engine } = request;
		if (engine == null) {
			throw new SqlCompilationError('No database engine specified');
		}
		try {
			const { sqlQuery, modifiedFields } = getMemoizedCompileRule(engine)(
				request.abstractSqlQuery,
			);
			request.sqlQuery = sqlQuery;
			request.modifiedFields = modifiedFields;
		} catch (err) {
			sbvrUtils.api[request.vocabulary].logger.error(
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
	if (typeof value === 'object' && value != null && value.bind != null) {
		[, value] = odataBinds[value.bind];
	}
	return value;
};

export const getAndCheckBindValues = (
	request: Required<
		Pick<ODataRequest, 'vocabulary' | 'odataBinds' | 'values' | 'engine'>
	>,
	bindings: AbstractSQLCompiler.Binding[],
) => {
	const { odataBinds, values, engine } = request;
	const sqlModelTables = sbvrUtils.getAbstractSqlModel(request).tables;
	return Bluebird.map(bindings, binding => {
		let fieldName: string;
		let field: { dataType: string };
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
				const maybeField = _.find(sqlModelTables[sqlTableName].fields, {
					fieldName: sqlFieldName,
				});
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
				if (!odataBinds.hasOwnProperty(bindValue)) {
					console.error(
						`Invalid binding '${bindValue}' for binds: `,
						odataBinds,
					);
					throw new Error('Invalid binding');
				}
				let dataType;
				[dataType, value] = odataBinds[bindValue];
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

		return AbstractSQLCompiler[engine]
			.dataTypeValidate(value, field)
			.tapCatch((e: Error) => {
				e.message = '"' + fieldName + '" ' + e.message;
			});
	});
};

const checkModifiedFields = (
	referencedFields: AbstractSQLCompiler.ReferencedFields,
	modifiedFields: AbstractSQLCompiler.ModifiedFields,
) => {
	const refs = referencedFields[modifiedFields.table];
	// If there are no referenced fields of the modified table then the rule is not affected
	if (refs == null) {
		return false;
	}
	// If there are no specific fields listed then that means they were all modified (ie insert/delete) and so the rule can be affected
	if (modifiedFields.fields == null) {
		return true;
	}
	// Otherwise check if there are any matching fields to see if the rule is affected
	return _.intersection(refs, modifiedFields.fields).length > 0;
};
export const isRuleAffected = (
	rule: AbstractSQLCompiler.SqlRule,
	request?: ODataRequest,
) => {
	// If there is no abstract sql query then nothing was modified
	if (request == null || request.abstractSqlQuery == null) {
		return false;
	}
	// If for some reason there are no referenced fields known for the rule then we just assume it may have been modified
	if (rule.referencedFields == null) {
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
		return _.some(
			modifiedFields,
			_.partial(checkModifiedFields, rule.referencedFields),
		);
	}
	return checkModifiedFields(rule.referencedFields, modifiedFields);
};
