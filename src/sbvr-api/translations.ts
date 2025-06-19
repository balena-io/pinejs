import _ from 'lodash';
import type {
	AbstractSqlModel,
	Relationship,
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
	FieldNode,
	ResourceNode,
} from '@balena/abstract-sql-compiler';
import type { Dictionary } from './common-types.js';

export type AliasValidNodeType =
	| SelectQueryNode
	| NumberTypeNodes
	| BooleanTypeNodes
	| UnknownTypeNodes
	| NullNode;
const aliasFields = (
	translationAbstractSqlModel: AbstractSqlModel,
	fromResourceName: string,
	toResource: string,
	aliases: Dictionary<string | AliasValidNodeType>,
): SelectNode[1] => {
	const fromFields =
		translationAbstractSqlModel.tables[fromResourceName].fields;
	const fromFieldNames = fromFields.map(({ fieldName }) => fieldName);
	const nonexistentFields = _.difference(Object.keys(aliases), fromFieldNames);
	if (nonexistentFields.length > 0) {
		throw new Error(
			`Tried to alias non-existent fields: '${nonexistentFields.join(', ')}'`,
		);
	}
	const toFieldNames = translationAbstractSqlModel.tables[
		toResource
	].fields.map(({ fieldName }) => fieldName);
	const checkToFieldExists = (fromFieldName: string, toFieldName: string) => {
		if (!toFieldNames.includes(toFieldName)) {
			throw new Error(
				`Tried to alias '${fromFieldName}' to the non-existent target field: '${toFieldName}'`,
			);
		}
	};
	return fromFields.map(
		({ fieldName, computed }): AliasNode<AliasValidNodeType> | FieldNode => {
			const alias = aliases[fieldName];
			if (alias) {
				if (computed != null) {
					throw new Error(
						`Cannot use a translation definition with a computed field for '${fromResourceName}'/'${fieldName}'. Please choose one or the other.`,
					);
				}
				if (typeof alias === 'string') {
					checkToFieldExists(fieldName, alias);
					return ['Alias', ['Field', alias], fieldName];
				}
				return ['Alias', alias, fieldName];
			}
			checkToFieldExists(fieldName, fieldName);
			if (computed != null) {
				// TODO: The computed field typing should be better so we don't need to cast
				return ['Alias', computed as AliasValidNodeType, fieldName];
			}
			return ['Field', fieldName];
		},
	);
};

const aliasResource = (
	translationAbstractSqlModel: AbstractSqlModel,
	fromResourceName: string,
	toResource: string,
	aliases: Dictionary<string | AliasValidNodeType>,
): Definition => {
	if (!translationAbstractSqlModel.tables[toResource]) {
		throw new Error(`Tried to alias to a non-existent resource: ${toResource}`);
	}
	return {
		abstractSql: [
			'SelectQuery',
			[
				'Select',
				aliasFields(
					translationAbstractSqlModel,
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
): undefined | Relationship => {
	let ret = relationships;
	for (const [key, relationship] of Object.entries(
		relationships as RelationshipInternalNode,
	)) {
		if (key === '$') {
			continue;
		}

		const changedEntry = namespaceRelationships(relationship, alias);
		if (changedEntry) {
			ret = { ...ret };
			(ret as RelationshipInternalNode)[key] = changedEntry;
		}

		let mapping = (relationship as RelationshipLeafNode).$;
		if (mapping != null && mapping.length === 2) {
			if (!key.includes('$')) {
				mapping = _.cloneDeep(mapping);
				mapping[1]![0] = `${mapping[1]![0]}$${alias}`;

				ret = { ...ret };
				(ret as RelationshipInternalNode)[`${key}$${alias}`] = {
					$: mapping,
				};
				delete (ret as RelationshipInternalNode)[key];
			}
		}
		namespaceRelationships(relationship, alias);
	}
	if (ret !== relationships) {
		return ret;
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
	const toVersionSuffix = `$${toVersion}`;

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
			fromAbstractSqlModel.synonyms[`${synonym}${toVersionSuffix}`] =
				`${canonicalForm}${toVersionSuffix}`;
		}
	}
	const relationships = namespaceRelationships(
		toAbstractSqlModel.relationships,
		toVersion,
	) ?? { ...toAbstractSqlModel.relationships };
	for (let [key, relationship] of Object.entries(relationships)) {
		// Don't double alias
		if (!key.includes('$')) {
			key = `${key}${toVersionSuffix}`;
		}
		fromAbstractSqlModel.relationships[key] = relationship;
	}

	// TODO: We also need to keep the original relationship refs to non $version resources

	// Also alias for ourselves to allow explicit referencing
	const aliasedFromRelationships = namespaceRelationships(
		fromAbstractSqlModel.relationships,
		fromVersion,
	) ?? { ...fromAbstractSqlModel.relationships };
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
			key = `${key}${toVersionSuffix}`;
		}
		fromAbstractSqlModel.tables[key] = _.cloneDeep(table);
	}

	for (const key of fromResourceKeys) {
		if (key.includes('$')) {
			// Skip translated resources, eg `resource$v2`
			continue;
		}
		let translationDefinition = translationDefinitions[key];
		const table = fromAbstractSqlModel.tables[key];
		const hasComputedFields = table.fields.some(
			(field) => field.computed != null,
		);
		if (hasComputedFields) {
			// If there are computed fields then make sure we generate a definition even if there is no explicit translation definition
			translationDefinition ??= {};
		}
		if (translationDefinition) {
			const { $toResource, ...definition } = translationDefinition;
			const hasToResource = typeof $toResource === 'string';

			const unaliasedToResource = hasToResource ? $toResource : key;
			if (hasToResource) {
				if ($toResource.includes('$')) {
					throw new Error(
						`'$toResource' should be the unaliased name of the resource in the subsequent model and not be targeting a specific model, got '${$toResource}'`,
					);
				}
				resourceRenames[key] = unaliasedToResource;
			}
			const aliasedToResource = `${unaliasedToResource}${toVersionSuffix}`;

			const toTable = toAbstractSqlModel.tables[unaliasedToResource];
			if (!toTable) {
				if (hasToResource) {
					throw new Error(`Unknown $toResource: '${unaliasedToResource}'`);
				} else {
					throw new Error(`Missing $toResource: '${unaliasedToResource}'`);
				}
			}
			table.modifyFields = _.cloneDeep(toTable.modifyFields ?? toTable.fields);
			table.modifyName = toTable.modifyName ?? toTable.name;
			if (isDefinition(definition)) {
				if (hasComputedFields) {
					throw new Error(
						`Cannot use a manual definition with computed fields for '${key}'. Please include the computed fields in the definition if they are needed.`,
					);
				}
				table.definition = definition;
			} else if (Object.keys(definition).length === 0) {
				// If there are no translation definitions, we can just target the `$toResource`, including computed fields if necessary
				let abstractSql: ResourceNode | SelectQueryNode = [
					'Resource',
					aliasedToResource,
				];
				if (hasComputedFields) {
					abstractSql = [
						'SelectQuery',
						[
							'Select',
							aliasFields(fromAbstractSqlModel, key, aliasedToResource, {}),
						],
						['From', ['Alias', abstractSql, aliasedToResource]],
					];
				}
				table.definition = {
					abstractSql,
				};
			} else {
				table.definition = aliasResource(
					// fromAbstractSqlModel is the translation model as it contains
					// both the unaliased fromResource and the aliased toResource
					fromAbstractSqlModel,
					key,
					aliasedToResource,
					definition,
				);
			}
		} else {
			const toTable = toAbstractSqlModel.tables[key];
			if (!toTable) {
				throw new Error(`Missing translation for: '${key}'`);
			}
			table.modifyFields = _.cloneDeep(toTable.modifyFields ?? toTable.fields);
			table.definition = {
				abstractSql: ['Resource', `${key}${toVersionSuffix}`],
			};
		}
		// Also alias the current version so it can be explicitly referenced
		fromAbstractSqlModel.tables[`${key}$${fromVersion}`] = table;
	}

	return resourceRenames;
};
