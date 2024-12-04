import _ from 'lodash';
import type {
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
import type { Dictionary } from './common-types';

export type AliasValidNodeType =
	| ReferencedFieldNode
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
	const fromFieldNames = translationAbstractSqlModel.tables[
		fromResourceName
	].fields.map(({ fieldName }) => fieldName);
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
	const relationships = _.cloneDeep(toAbstractSqlModel.relationships);
	namespaceRelationships(relationships, toVersion);
	for (let [key, relationship] of Object.entries(relationships)) {
		// Don't double alias
		if (!key.includes('$')) {
			key = `${key}${toVersionSuffix}`;
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
			key = `${key}${toVersionSuffix}`;
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

			const unaliasedToResource = hasToResource
				? $toResource.endsWith(toVersionSuffix)
					? // Ideally we want to rename to the unaliased resource of the next version
						// so when the alias matches the next version we can just strip it
						$toResource.slice(0, -toVersionSuffix.length)
					: // But if we can't safely strip the suffix then we'll use as-is, at least until the next major
						$toResource
				: key;
			let aliasedToResource;
			if (hasToResource) {
				resourceRenames[key] = unaliasedToResource;
				if ($toResource.includes('$')) {
					// TODO-MAJOR: Change this to an error
					console.warn(
						`'$toResource' should be the unaliased name of the resource in the subsequent model and not be targeting a specific model, got '${$toResource}'`,
						$toResource,
					);
					aliasedToResource = $toResource;
				} else {
					aliasedToResource = `${$toResource}${toVersionSuffix}`;
				}
			} else {
				aliasedToResource = `${key}${toVersionSuffix}`;
			}
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
				table.definition = definition;
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
