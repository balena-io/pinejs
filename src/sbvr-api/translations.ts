import _ from 'lodash';
import {
	AbstractSqlModel,
	Relationship,
	ReferencedFieldNode,
	SelectNode,
	AliasNode,
	Definition,
	RelationshipInternalNode,
	RelationshipLeafNode,
	SelectQueryNode,
	NumberTypeNodes,
	BooleanTypeNodes,
	UnknownTypeNodes,
	NullNode,
} from '@balena/abstract-sql-compiler';
import { Dictionary } from './common-types';

export type AliasValidNodeType =
	| ReferencedFieldNode
	| SelectQueryNode
	| NumberTypeNodes
	| BooleanTypeNodes
	| UnknownTypeNodes
	| NullNode;
const aliasFields = (
	fromAbstractSqlModel: AbstractSqlModel,
	toAbstractSqlModel: AbstractSqlModel,
	fromResourceName: string,
	toResource: string,
	aliases: Dictionary<string | AliasValidNodeType>,
): SelectNode[1] => {
	const fromFieldNames = fromAbstractSqlModel.tables[
		fromResourceName
	].fields.map(({ fieldName }) => fieldName);
	const nonexistentFields = _.difference(Object.keys(aliases), fromFieldNames);
	if (nonexistentFields.length > 0) {
		throw new Error(
			`Tried to alias non-existent fields: '${nonexistentFields.join(', ')}'`,
		);
	}
	const toFieldNames = toAbstractSqlModel.tables[toResource].fields.map(
		({ fieldName }) => fieldName,
	);
	const checkToFieldExists = (fromFieldName: string, toFieldName: string) => {
		if (!toFieldNames.includes(toFieldName)) {
			throw new Error(
				`Tried to alias '${fromFieldName}' to the non-existent target field: '${toFieldName}'`,
			);
		}
	};
	return fromFieldNames.map(
		(fieldName): AliasNode<AliasValidNodeType> | ReferencedFieldNode => {
			const alias = aliases[fieldName];
			if (alias) {
				if (typeof alias === 'string') {
					checkToFieldExists(fieldName, alias);
					return [
						'Alias',
						['ReferencedField', fromResourceName, alias],
						fieldName,
					];
				}
				return ['Alias', alias, fieldName];
			}
			checkToFieldExists(fieldName, fieldName);
			return ['ReferencedField', fromResourceName, fieldName];
		},
	);
};

const aliasResource = (
	fromAbstractSqlModel: AbstractSqlModel,
	toAbstractSqlModel: AbstractSqlModel,
	fromResourceName: string,
	toResource: string,
	aliases: Dictionary<string | AliasValidNodeType>,
): Definition => {
	if (!toAbstractSqlModel.tables[toResource]) {
		throw new Error(`Tried to alias to a non-existent resource: ${toResource}`);
	}
	return {
		abstractSql: [
			'SelectQuery',
			[
				'Select',
				aliasFields(
					fromAbstractSqlModel,
					toAbstractSqlModel,
					fromResourceName,
					toResource,
					aliases,
				),
			],
			['From', ['Alias', ['Resource', toResource], fromResourceName]],
		],
	};
};

const namespaceRelationships = (
	relationships: Relationship,
	alias: string,
): void => {
	for (const [key, relationship] of Object.entries(
		relationships as RelationshipInternalNode,
	)) {
		if (key === '$') {
			return;
		}

		let mapping = (relationship as RelationshipLeafNode).$;
		if (mapping != null && mapping.length === 2) {
			if (!key.includes('$')) {
				mapping = _.cloneDeep(mapping);
				mapping[1]![0] = `${mapping[1]![0]}$${alias}`;
				(relationships as RelationshipInternalNode)[`${key}$${alias}`] = {
					$: mapping,
				};
				delete (relationships as RelationshipInternalNode)[key];
			}
		}
		namespaceRelationships(relationship, alias);
	}
};

export const translateAbstractSqlModel = (
	fromAbstractSqlModel: AbstractSqlModel,
	toAbstractSqlModel: AbstractSqlModel,
	fromVersion: string,
	toVersion: string,
	translationDefinitions: Dictionary<
		| (Definition & { $toResource?: string })
		| Dictionary<string | AliasValidNodeType>
	> = {},
): Dictionary<string> => {
	const isDefinition = (
		d: (typeof translationDefinitions)[string],
	): d is Definition => 'abstractSql' in d;

	const resourceRenames: Dictionary<string> = {};

	fromAbstractSqlModel.rules = toAbstractSqlModel.rules;

	const fromResourceKeys = Object.keys(fromAbstractSqlModel.tables);
	const nonexistentTables = _.difference(
		Object.keys(translationDefinitions),
		fromResourceKeys,
	);
	if (nonexistentTables.length > 0) {
		throw new Error(
			`Tried to define non-existent resources: '${nonexistentTables.join(
				', ',
			)}'`,
		);
	}
	for (const [synonym, canonicalForm] of Object.entries(
		toAbstractSqlModel.synonyms,
	)) {
		// Don't double alias
		if (synonym.includes('$')) {
			fromAbstractSqlModel.synonyms[synonym] = canonicalForm;
		} else {
			fromAbstractSqlModel.synonyms[`${synonym}$${toVersion}`] =
				`${canonicalForm}$${toVersion}`;
		}
	}
	const relationships = _.cloneDeep(toAbstractSqlModel.relationships);
	namespaceRelationships(relationships, toVersion);
	for (let [key, relationship] of Object.entries(relationships)) {
		// Don't double alias
		if (!key.includes('$')) {
			key = `${key}$${toVersion}`;
		}
		fromAbstractSqlModel.relationships[key] = relationship;
	}

	// TODO: We also need to keep the original relationship refs to non $version resources

	// Also alias for ourselves to allow explicit referencing
	const aliasedFromRelationships = _.cloneDeep(
		fromAbstractSqlModel.relationships,
	);
	namespaceRelationships(aliasedFromRelationships, fromVersion);
	for (let [key, relationship] of Object.entries(aliasedFromRelationships)) {
		// Don't double alias
		if (!key.includes('$')) {
			key = `${key}$${fromVersion}`;
			fromAbstractSqlModel.relationships[key] = relationship;
		}
	}

	for (let [key, table] of Object.entries(toAbstractSqlModel.tables)) {
		// Don't double alias
		if (!key.includes('$')) {
			key = `${key}$${toVersion}`;
		}
		fromAbstractSqlModel.tables[key] = _.cloneDeep(table);
	}

	for (const key of fromResourceKeys) {
		if (key.includes('$')) {
			// Skip translated resources, eg `resource$v2`
			continue;
		}
		const translationDefinition = translationDefinitions[key];
		const table = fromAbstractSqlModel.tables[key];
		if (translationDefinition) {
			const { $toResource, ...definition } = translationDefinition;
			const hasToResource = typeof $toResource === 'string';
			if (hasToResource) {
				resourceRenames[key] = `${$toResource}`;
			}
			const toResource = hasToResource ? $toResource : `${key}$${toVersion}`;
			// TODO: Should this use the toAbstractSqlModel?
			const toTable = fromAbstractSqlModel.tables[toResource];
			if (!toTable) {
				if (hasToResource) {
					throw new Error(`Unknown $toResource: '${toResource}'`);
				} else {
					throw new Error(`Missing $toResource: '${toResource}'`);
				}
			}
			table.modifyFields = _.cloneDeep(toTable.modifyFields ?? toTable.fields);
			table.modifyName = toTable.modifyName ?? toTable.name;
			if (isDefinition(definition)) {
				table.definition = definition;
			} else {
				table.definition = aliasResource(
					fromAbstractSqlModel,
					toAbstractSqlModel,
					key,
					toResource,
					definition,
				);
			}
		} else {
			const toTable = fromAbstractSqlModel.tables[`${key}$${toVersion}`];
			if (!toTable) {
				throw new Error(`Missing translation for: '${key}'`);
			}
			table.modifyFields = _.cloneDeep(toTable.modifyFields ?? toTable.fields);
			table.definition = {
				abstractSql: ['Resource', `${key}$${toVersion}`],
			};
		}
		// Also alias the current version so it can be explicitly referenced
		fromAbstractSqlModel.tables[`${key}$${fromVersion}`] = table;
	}

	return resourceRenames;
};
