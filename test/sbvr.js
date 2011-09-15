
// documentation on writing tests here: http://docs.jquery.com/QUnit


var testModel = [
	[
		'T: person',
		[ "term", "person", [] ],
		[ "term", "person", [] ],
	], [
		'T: student',
		[ "term", "student", [] ],
		[ "term", "student", [] ],
	], [
		'	Definition: An invalid definition',
		'match failed',
		'tried to apply undefined rule "m"',
	], [
		'	Definition: person',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ] ] ],
	], [
		'	Source: A source',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ] ] ],
	], [
		'	Dictionary Basis: A dictionary basis',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ] ] ],
	], [
		'	General Concept: A general concept',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ] ] ],
	], [
		'	Concept Type: person',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ] ] ],
	], [
		'	Necessity: A necessity',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ] ] ],
	], [
		'	Possibility: A possibility',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ] ] ],
	], [
		'	Reference Scheme: A reference scheme',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ] ] ],
	], [
		'	Note: A note',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ] ] ],
	], [
		'	Example: An example',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ] ] ],
	], [
		'	Synonym: A synonym',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ] ] ],
	], [
		'	Synonymous Form: A synonymous form',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ] ] ],
	], [
		'	See: Something to see',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ] ] ],
	], [
		'	Subject Field: A subject field',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ] ] ],
	], [
		'	Namespace URI: A namespace URI',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ] ] ],
	], [
		'	Database Table Name: student_table',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ] ] ],
	], [
		'	Database ID Field: id_field',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ], [ "DatabaseIDField", "id_field" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ], [ "DatabaseIDField", "id_field" ] ] ],
	], [
		'	Database Name Field: name_field',
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ], [ "DatabaseIDField", "id_field" ], [ "DatabaseNameField", "name_field" ] ] ],
		[ "term", "student", [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ], [ "DatabaseIDField", "id_field" ], [ "DatabaseNameField", "name_field" ] ] ],
	], [
		'T:\r\n	lecturer\r\n	Concept Type: An ignored attribute', // Check if multiline terms correctly end upon encountering an attribute.
		[ "term", "lecturer", [] ],
		[ "term", "lecturer", [] ],
	], [
		'	Concept Type: person',
		[ "term", "lecturer", [ [ "ConceptType", "person" ] ] ],
		[ "term", "lecturer", [ [ "ConceptType", "person" ] ] ],
	],[
		'	See: A\r multiline\n\r	attribute		Subject Field: An ignored attribute',
		[ "term", "lecturer", [ [ "ConceptType", "person" ], [ "See", "A\r multiline\n\r	attribute" ] ] ],
		[ "term", "lecturer", [ [ "ConceptType", "person" ], [ "See", "A\r multiline\n\r	attribute" ] ] ],
	], [
		'T: module ',
		[ "term", "module", [] ],
		[ "term", "module", [] ],
	],

	/* Fact Types */
	[
		'F: student is school president ',						/* term verb */
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [] ],
	], [
		'	Definition: An invalid definition',
		'match failed',
		'tried to apply undefined rule "m"',
	], [
		'	Definition: person',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ] ] ],
	], [
		'	Source: A source',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ] ] ],
	], [
		'	Dictionary Basis: A dictionary basis',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ] ] ],
	], [
		'	General Concept: A general concept',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ] ] ],
	], [
		'	Concept Type: person',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ] ] ],
	], [
		'	Necessity: A necessity',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ] ] ],
	], [
		'	Possibility: A possibility',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ] ] ],
	], [
		'	Reference Scheme: A reference scheme',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ] ] ],
	], [
		'	Note: A note',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ] ] ],
	], [
		'	Example: An example',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ] ] ],
	], [
		'	Synonym: A synonym',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ] ] ],
	], [
		'	Synonymous Form: A synonymous form',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ] ] ],
	], [
		'	See: Something to see',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ] ] ],
	], [
		'	Subject Field: A subject field',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ] ] ],
	], [
		'	Namespace URI: A namespace URI',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ] ] ],
	], [
		'	Database Table Name: student_table',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ] ] ],
	], [
		'	Database ID Field: id_field',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ], [ "DatabaseIDField", "id_field" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ], [ "DatabaseIDField", "id_field" ] ] ],
	], [
		'	Database Name Field: name_field',
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ], [ "DatabaseIDField", "id_field" ], [ "DatabaseNameField", "name_field" ] ] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ], [ [ "Definition", [ "term", "person" ] ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ], [ "DatabaseIDField", "id_field" ], [ "DatabaseNameField", "name_field" ] ] ],
	], [
		'F: student is registered for module',					/* term verb term */ 
		[ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [] ],
	], [
		'F: student is registered for module to catchup',		/* term verb term verb */ 
		[ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [ "verb", "to catchup" ], [] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [ "verb", "to catchup" ], [] ],
	], [
		'F: student is registered for module with lecturer',	/* term verb term verb term */ 
		[ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [ "verb", "with" ], [ "term", "lecturer" ], [] ],
		[ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [ "verb", "with" ], [ "term", "lecturer" ], [] ],
	], [
		'F: person is swimming',								/* for inflection */
		[ "fcTp", [ "term", "person" ], [ "verb", "is swimming" ], [] ],
		[ "fcTp", [ "term", "person" ], [ "verb", "is swimming" ], [] ],
	], [
		'F: lecturer is\n teacher\r of module \r\nR: An ignored rule',
		[ "fcTp", [ "term", "lecturer" ], [ "verb", "is teacher of" ], [ "term", "module" ], [] ],
		[ "fcTp", [ "term", "lecturer" ], [ "verb", "is teacher of" ], [ "term", "module" ], [] ],
	],

	/* Mod rules */
	[
		'R: It is obligatory that	a student is school president',			/* It is obligatory */ 
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is obligatory that	a student is school president" ] ],
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is obligatory that	a student is school president" ] ],
	], [
		'R: It is necessary that	a student is school president',			/* It is necessary */ 
		[ "rule", [ "nec", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is necessary that	a student is school president" ] ],
		[ "rule", [ "nec", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is necessary that	a student is school president" ] ],
	], [
		'R: It is possible that		a student is school president',			/* It is possible */ 
		[ "rule", [ "pos", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is possible that		a student is school president" ] ],
		[ "rule", [ "pos", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is possible that		a student is school president" ] ],
	], [
		'R: It is permissible that	a student is school president',			/* It is permissible */ 
		[ "rule", [ "prm", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is permissible that	a student is school president" ] ],
		[ "rule", [ "prm", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is permissible that	a student is school president" ] ],
	], [
		'R: It is prohibited that	some students are school president',	/* It is prohibited */ 
		[ "rule", [ "obl", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ] ], [ "text", "It is prohibited that	some students are school president" ] ],
		[ "rule", [ "obl", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ] ], [ "text", "It is prohibited that	some students are school president" ] ],
	], [
		'R: It is impossible that	some students are school president',	/* It is impossible */ 
		[ "rule", [ "nec", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ] ], [ "text", "It is impossible that	some students are school president" ] ],
		[ "rule", [ "nec", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ] ], [ "text", "It is impossible that	some students are school president" ] ],
	], [
		'R: It is not possible that	some students are school president',	/* It is not possible */
		[ "rule", [ "nec", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ] ], [ "text", "It is not possible that	some students are school president" ] ],
		[ "rule", [ "nec", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ] ], [ "text", "It is not possible that	some students are school president" ] ],
	],
	
	/* Quantifiers */
	[
		'R: It is obligatory that each	student		is registered for at least one module',		/* each */ 
		[ "rule", [ "obl", [ "univQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that each	student		is registered for at least one module" ] ],
		[ "rule", [ "obl", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "neg", [ "existQ", [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ] ] ], [ "text", "It is obligatory that each	student		is registered for at least one module" ] ],
	], [
		'R: It is obligatory that a		student		is registered for at least one module',	/* a */ 
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that a		student		is registered for at least one module" ] ],
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "existQ", [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that a		student		is registered for at least one module" ] ],
	], [
		'R: It is obligatory that an	student		is registered for at least one module',	/* an */ 
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that an	student		is registered for at least one module" ] ],
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "existQ", [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that an	student		is registered for at least one module" ] ],
	], [
		'R: It is obligatory that some	students	are registered for at least one module',	/* some */
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that some	students	are registered for at least one module" ] ],
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "existQ", [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that some	students	are registered for at least one module" ] ],
	],
	
	/* Quantifiers with cardinality */
	[
		'R: It is obligatory that at most 50	students are registered for at least one module',	/* at most */ 
		[ "rule", [ "obl", [ "atMostQ", [ "maxCard", [ "num", 50 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that at most 50	students are registered for at least one module" ] ],
		[ "rule", [ "obl", [ "neg", [ "atLeastQ", [ "minCard", [ "num", 51 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "existQ", [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ] ], [ "text", "It is obligatory that at most 50	students are registered for at least one module" ] ],
	], [
		'R: It is obligatory that at least one	student is registered for at least one module',		/* at least */ 
		[ "rule", [ "obl", [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that at least one	student is registered for at least one module" ] ],
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "existQ", [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that at least one	student is registered for at least one module" ] ],
	], [
		'R: It is obligatory that more than 0	students are registered for at least one module',	/* more than */ 
		[ "rule", [ "obl", [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that more than 0	students are registered for at least one module" ] ],
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "existQ", [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that more than 0	students are registered for at least one module" ] ],
	], [
		'R: It is obligatory that exactly one	student is school president',						/* exactly */
		[ "rule", [ "obl", [ "exactQ", [ "card", [ "num", 1 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is obligatory that exactly one	student is school president" ] ],
		[ "rule", [ "obl", [ "exactQ", [ "card", [ "num", 1 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is obligatory that exactly one	student is school president" ] ],
	],
	
	/* Quantifiers with dual cardinality */
	[
		'R: It is obligatory that at least one and at most 50	students are registered for at least one module',	/* at least */
		[ "rule", [ "obl", [ "numRngQ", [ "minCard", [ "num", 1 ] ], [ "maxCard", [ "num", 50 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that at least one and at most 50	students are registered for at least one module" ] ],
		[ "rule", [ "obl", [ "numRngQ", [ "minCard", [ "num", 1 ] ], [ "maxCard", [ "num", 50 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "existQ", [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that at least one and at most 50	students are registered for at least one module" ] ],
	],
	
	/* Rule with n-ary fact type */
	[
		'R: It is obligatory that a student is registered for a module with a lecturer',
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "existQ", [ "var", [ "num", 2 ], [ "term", "module" ] ], [ "existQ", [ "var", [ "num", 4 ], [ "term", "lecturer" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [ "verb", "with" ], [ "term", "lecturer" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 2 ], [ "bind", [ "term", "lecturer" ], 4 ] ] ] ] ] ], [ "text", "It is obligatory that a student is registered for a module with a lecturer" ] ],
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "existQ", [ "var", [ "num", 2 ], [ "term", "module" ] ], [ "existQ", [ "var", [ "num", 4 ], [ "term", "lecturer" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [ "verb", "with" ], [ "term", "lecturer" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 2 ], [ "bind", [ "term", "lecturer" ], 4 ] ] ] ] ] ], [ "text", "It is obligatory that a student is registered for a module with a lecturer" ] ],
	],
	/* Inflection */
	[
		'R: It is obligatory that exactly 0 people are swimming',
		[ "rule", [ "obl", [ "exactQ", [ "card", [ "num", 0 ] ], [ "var", [ "num", 1 ], [ "term", "person" ] ], [ "aFrm", [ "fcTp", [ "term", "person" ], [ "verb", "is swimming" ] ], [ "bind", [ "term", "person" ], 1 ] ] ] ], [ "text", "It is obligatory that exactly 0 people are swimming" ] ],
		[ "rule", [ "obl", [ "exactQ", [ "card", [ "num", 0 ] ], [ "var", [ "num", 1 ], [ "term", "person" ] ], [ "aFrm", [ "fcTp", [ "term", "person" ], [ "verb", "is swimming" ] ], [ "bind", [ "term", "person" ], 1 ] ] ] ], [ "text", "It is obligatory that exactly 0 people are swimming" ] ],
	],
	
	/* Term-Verb Linking */
	[
		'R: It is obligatory that exactly 0 students  are swimming',
		'match failed',
		'tried to apply undefined rule "m"',
	],
	
	/* New lines */
	[
		'R:	\rIt\r\n is	 \robligatory \nthat\n each\r	student	\n\r	is\n registered\r\n for \n at\r least\n\r one\r module\r\n	R: An ignored rule',
		[ "rule", [ "obl", [ "univQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It\r\n is	 \robligatory \nthat\n each\r	student	\n\r	is\n registered\r\n for \n at\r least\n\r one\r module" ] ],
		[ "rule", [ "obl", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "neg", [ "existQ", [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ] ] ], [ "text", "It\r\n is	 \robligatory \nthat\n each\r	student	\n\r	is\n registered\r\n for \n at\r least\n\r one\r module" ] ],
	]
],

prepLF = ["model",["term","person",[]],["term","student",[["Definition",[ "term", "person" ]],["Source","A source"],["DictionaryBasis","A dictionary basis"],["GeneralConcept","A general concept"],["ConceptType","person"],["Necessity","A necessity"],["Possibility","A possibility"],["ReferenceScheme","A reference scheme"],["Note","A note"],["Example","An example"],["Synonym","A synonym"],["SynonymousForm","A synonymous form"],["See","Something to see"],["SubjectField","A subject field"],["NamespaceURI","A namespace URI"],["DatabaseTableName","student_table"],["DatabaseIDField","id_field"],["DatabaseNameField","name_field"]]],["term","lecturer",[["ConceptType","person"],["See","A\r multiline\n\r	attribute"]]],["term","module",[]],["fcTp",["term","student"],["verb","is school president"]],["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["fcTp",["term","student"],["verb","is registered for"],["term","module"],["verb","to catchup"]],["fcTp",["term","student"],["verb","is registered for"],["term","module"],["verb","with"],["term","lecturer"]],["fcTp",["term","person"],["verb","is swimming"]],["fcTp",["term","lecturer"],["verb","is teacher of"],["term","module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]],["text","It is obligatory that\ta student is school president"]],["rule",["nec",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]],["text","It is necessary that\ta student is school president"]],["rule",["pos",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]],["text","It is possible that\t\ta student is school president"]],["rule",["prm",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]],["text","It is permissible that\ta student is school president"]],["rule",["obl",["neg",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]]],["text","It is prohibited that\tsome students are school president"]],["rule",["nec",["neg",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]]],["text","It is impossible that\tsome students are school president"]],["rule",["nec",["neg",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]]],["text","It is not possible that\tsome students are school president"]],["rule",["obl",["neg",["existQ",["var",["num",1],["term","student"]],["neg",["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]]]],["text","It is obligatory that each\tstudent\t\tis registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that a\t\tstudent\t\tis registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that an\tstudent\t\tis registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that some\tstudents\tare registered for at least one module"]],["rule",["obl",["neg",["atLeastQ",["minCard",["num",51]],["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]]],["text","It is obligatory that at most 50\tstudents are registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that at least one\tstudent is registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that more than 0\tstudents are registered for at least one module"]],["rule",["obl",["exactQ",["card",["num",1]],["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]],["text","It is obligatory that exactly one\tstudent is school president"]],["rule",["obl",["numRngQ",["minCard",["num",1]],["maxCard",["num",50]],["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that at least one and at most 50\tstudents are registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",2],["term","module"]],["existQ",["var",["num",4],["term","lecturer"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"],["verb","with"],["term","lecturer"]],["bind",["term","student"],1],["bind",["term","module"],2],["bind",["term","lecturer"],4]]]]]],["text","It is obligatory that a student is registered for a module with a lecturer"]],["rule",["obl",["exactQ",["card",["num",0]],["var",["num",1],["term","person"]],["aFrm",["fcTp",["term","person"],["verb","is swimming"]],["bind",["term","person"],1]]]],["text","It is obligatory that exactly 0 people are swimming"]],["rule",["obl",["neg",["existQ",["var",["num",1],["term","student"]],["neg",["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]]]],["text","It\r\n is	 \robligatory \nthat\n each\r	student	\n\r	is\n registered\r\n for \n at\r least\n\r one\r module" ]]]

module("SBVR tests");

test("SBVRParser",function() {
	expect(testModel.length);
	var parser = SBVRParser.createInstance();
	for(var i=0,l=testModel.length;i<l;i++) {
		try {
			deepEqual(parser.matchAll(testModel[i][0],'line'), testModel[i][1], testModel[i][0]);
		}
		catch(e) {
			console.log(e);
			equal(e.toString(), testModel[i][1], testModel[i][0]);
		}
	}
//	var generatedLF = parser.matchAll('','expr');
//	console.log(JSON.stringify(SBVR_PreProc.match(generatedLF,'optimizeTree')));
//		deepEqual(SBVR_PreProc.match(generatedLF,'optimizeTree'), prepLF, 'SBVR_PreProc');
})

test("SBVR_PreProc",function() {
	expect(testModel.length);
	var parser = SBVRParser.createInstance();
	for(var i=0,l=testModel.length;i<l;i++) {
		try {
			deepEqual(SBVR_PreProc.match(['model',testModel[i][1]],'optimizeTree'), ['model',testModel[i][2]], testModel[i][0]);
		}
		catch(e) {
			console.log(e);
			equal(e.toString(), testModel[i][2], testModel[i][0]);
		}
	}
})

/*test("SBVR_PreProc",function() {
	expect(1+testModel.length);
	var parser = SBVRParser.createInstance();
	for(var i=0,l=testModel.length;i<l;i++)
	{
		deepEqual(parser.matchAll(testModel[i][0],'line'), testModel[i][1], testModel[i][0]);
	}
	var generatedLF = parser.matchAll('','expr');
	console.log(JSON.stringify(SBVR_PreProc.match(generatedLF,'optimizeTree')));
		deepEqual(SBVR_PreProc.match(generatedLF,'optimizeTree'), prepLF, 'SBVR_PreProc');
	
	
})*/
