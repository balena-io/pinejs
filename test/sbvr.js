
// documentation on writing tests here: http://docs.jquery.com/QUnit


var testModel = [
	[
		'T: person',
		[ "term", "person", [] ]
	], [
		'T: student',
		[ "term", "student", [] ]
	], [
		'	Definition: A definition',
		[ "term", "student", [ [ "Definition", "A definition" ] ] ],
	], [
		'	Source: A source',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ] ] ],
	], [
		'	Dictionary Basis: A dictionary basis',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ] ] ],
	], [
		'	General Concept: A general concept',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ] ] ],
	], [
		'	Concept Type: person',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ] ] ],
	], [
		'	Necessity: A necessity',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ] ] ],
	], [
		'	Possibility: A possibility',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ] ] ],
	], [
		'	Reference Scheme: A reference scheme',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ] ] ],
	], [
		'	Note: A note',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ] ] ],
	], [
		'	Example: An example',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ] ] ],
	], [
		'	Synonym: A synonym',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ] ] ],
	], [
		'	Synonymous Form: A synonymous form',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ] ] ],
	], [
		'	See: Something to see',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ] ] ],
	], [
		'	Subject Field: A subject field',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ] ] ],
	], [
		'	Namespace URI: A namespace URI',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ] ] ],
	], [
		'	Database Table Name: student_table',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ] ] ],
	], [
		'	Database ID Field: id_field',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ], [ "DatabaseIDField", "id_field" ] ] ],
	], [
		'	Database Name Field: name_field',
		[ "term", "student", [ [ "Definition", "A definition" ], [ "Source", "A source" ], [ "DictionaryBasis", "A dictionary basis" ], [ "GeneralConcept", "A general concept" ], [ "ConceptType", "person" ], [ "Necessity", "A necessity" ], [ "Possibility", "A possibility" ], [ "ReferenceScheme", "A reference scheme" ], [ "Note", "A note" ], [ "Example", "An example" ], [ "Synonym", "A synonym" ], [ "SynonymousForm", "A synonymous form" ], [ "See", "Something to see" ], [ "SubjectField", "A subject field" ], [ "NamespaceURI", "A namespace URI" ], [ "DatabaseTableName", "student_table" ], [ "DatabaseIDField", "id_field" ], [ "DatabaseNameField", "name_field" ] ] ],
	], [
		'T: lecturer',
		[ "term", "lecturer", [] ],
	], [
		'	Concept Type: person',
		[ "term", "lecturer", [ [ "ConceptType", "person" ] ] ],
	], [
		'T: module ',
		[ "term", "module", [] ],
	],

	/* Fact Types */
	[
		'F: student is school president ',						/* term verb */
		[ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ],
	], [
		'F: student is registered for module',					/* term verb term */ 
		[ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ],
	], [
		'F: student is registered for module to catchup',		/* term verb term verb */ 
		[ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [ "verb", "to catchup" ] ],
	], [
		'F: student is registered for module with lecturer',	/* term verb term verb term */ 
		[ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [ "verb", "with" ], [ "term", "lecturer" ] ],
	], [
		'F: person is swimming',								/* for inflection */
		[ "fcTp", [ "term", "person" ], [ "verb", "is swimming" ] ],
	],

	/* Mod rules */
	[
		'R: It is obligatory that	a student is school president',			/* It is obligatory */ 
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is obligatory that	a student is school president" ] ],
	], [
		'R: It is necessary that	a student is school president',			/* It is necessary */ 
		[ "rule", [ "nec", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is necessary that	a student is school president" ] ],
	], [
		'R: It is possible that		a student is school president',			/* It is possible */ 
		[ "rule", [ "pos", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is possible that		a student is school president" ] ],
	], [
		'R: It is permissible that	a student is school president',			/* It is permissible */ 
		[ "rule", [ "prm", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is permissible that	a student is school president" ] ],
	], [
		'R: It is prohibited that	some students are school president',	/* It is prohibited */ 
		[ "rule", [ "obl", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ] ], [ "text", "It is prohibited that	some students are school president" ] ],
	], [
		'R: It is impossible that	some students are school president',	/* It is impossible */ 
		[ "rule", [ "nec", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ] ], [ "text", "It is impossible that	some students are school president" ] ],
	], [
		'R: It is not possible that	some students are school president',	/* It is not possible */
		[ "rule", [ "nec", [ "neg", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ] ], [ "text", "It is not possible that	some students are school president" ] ],
	],
	
	/* Quantifiers */
	[
		'R: It is obligatory that each	student		is registered for at least one module',		/* each */ 
		[ "rule", [ "obl", [ "univQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that each	student		is registered for at least one module" ] ],
	], [
		'R: It is obligatory that a		student		is registered for at least one module',	/* a */ 
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that a		student		is registered for at least one module" ] ],
	], [
		'R: It is obligatory that an	student		is registered for at least one module',	/* an */ 
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that an	student		is registered for at least one module" ] ],
	], [
		'R: It is obligatory that some	students	are registered for at least one module',	/* some */
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that some	students	are registered for at least one module" ] ],
	],
	
	/* Quantifiers with cardinality */
	[
		'R: It is obligatory that at most 50	students are registered for at least one module',	/* at most */ 
		[ "rule", [ "obl", [ "atMostQ", [ "maxCard", [ "num", 50 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that at most 50	students are registered for at least one module" ] ],
	], [
		'R: It is obligatory that at least one	student is registered for at least one module',		/* at least */ 
		[ "rule", [ "obl", [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that at least one	student is registered for at least one module" ] ],
	], [
		'R: It is obligatory that more than 0	students are registered for at least one module',	/* more than */ 
		[ "rule", [ "obl", [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that more than 0	students are registered for at least one module" ] ],
	], [
		'R: It is obligatory that exactly one	student is school president',						/* exactly */
		[ "rule", [ "obl", [ "exactQ", [ "card", [ "num", 1 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is school president" ] ], [ "bind", [ "term", "student" ], 1 ] ] ] ], [ "text", "It is obligatory that exactly one	student is school president" ] ],
	],
	
	/* Quantifiers with dual cardinality */
	[
		'R: It is obligatory that at least one and at most 50	students are registered for at least one module',	/* at least */
		[ "rule", [ "obl", [ "numRngQ", [ "minCard", [ "num", 1 ] ], [ "maxCard", [ "num", 50 ] ], [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "atLeastQ", [ "minCard", [ "num", 1 ] ], [ "var", [ "num", 3 ], [ "term", "module" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 3 ] ] ] ] ], [ "text", "It is obligatory that at least one and at most 50	students are registered for at least one module" ] ],
	],
	
	/* Rule with n-ary fact type */
	[
		'R: It is obligatory that a student is registered for a module with a lecturer',
		[ "rule", [ "obl", [ "existQ", [ "var", [ "num", 1 ], [ "term", "student" ] ], [ "existQ", [ "var", [ "num", 2 ], [ "term", "module" ] ], [ "existQ", [ "var", [ "num", 4 ], [ "term", "lecturer" ] ], [ "aFrm", [ "fcTp", [ "term", "student" ], [ "verb", "is registered for" ], [ "term", "module" ], [ "verb", "with" ], [ "term", "lecturer" ] ], [ "bind", [ "term", "student" ], 1 ], [ "bind", [ "term", "module" ], 2 ], [ "bind", [ "term", "lecturer" ], 4 ] ] ] ] ] ], [ "text", "It is obligatory that a student is registered for a module with a lecturer" ] ],
	],
	
	/* Inflection */
	[
		'R: It is obligatory that exactly 0 people are swimming',
		[ "rule", [ "obl", [ "exactQ", [ "card", [ "num", 0 ] ], [ "var", [ "num", 1 ], [ "term", "person" ] ], [ "aFrm", [ "fcTp", [ "term", "person" ], [ "verb", "is swimming" ] ], [ "bind", [ "term", "person" ], 1 ] ] ] ], [ "text", "It is obligatory that exactly 0 people are swimming" ] ]
	],
	
	/* Term-Verb Linking */
	[
		'R: It is obligatory that exactly 0 students  are swimming',
		'match failed'
	]
],

prepLF = ["model",["term","person",[]],["term","student",[["Definition","A definition"],["Source","A source"],["DictionaryBasis","A dictionary basis"],["GeneralConcept","A general concept"],["ConceptType","person"],["Necessity","A necessity"],["Possibility","A possibility"],["ReferenceScheme","A reference scheme"],["Note","A note"],["Example","An example"],["Synonym","A synonym"],["SynonymousForm","A synonymous form"],["See","Something to see"],["SubjectField","A subject field"],["NamespaceURI","A namespace URI"],["DatabaseTableName","student_table"],["DatabaseIDField","id_field"],["DatabaseNameField","name_field"]]],["term","lecturer",[["ConceptType","person"]]],["term","module",[]],["fcTp",["term","student"],["verb","is school president"]],["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["fcTp",["term","student"],["verb","is registered for"],["term","module"],["verb","to catchup"]],["fcTp",["term","student"],["verb","is registered for"],["term","module"],["verb","with"],["term","lecturer"]],["fcTp",["term","person"],["verb","is swimming"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]],["text","It is obligatory that\ta student is school president"]],["rule",["nec",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]],["text","It is necessary that\ta student is school president"]],["rule",["pos",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]],["text","It is possible that\t\ta student is school president"]],["rule",["prm",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]],["text","It is permissible that\ta student is school president"]],["rule",["obl",["neg",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]]],["text","It is prohibited that\tsome students are school president"]],["rule",["nec",["neg",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]]],["text","It is impossible that\tsome students are school president"]],["rule",["nec",["neg",["existQ",["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]]],["text","It is not possible that\tsome students are school president"]],["rule",["obl",["neg",["existQ",["var",["num",1],["term","student"]],["neg",["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]]]],["text","It is obligatory that each\tstudent\t\tis registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that a\t\tstudent\t\tis registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that an\tstudent\t\tis registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that some\tstudents\tare registered for at least one module"]],["rule",["obl",["neg",["atLeastQ",["minCard",["num",51]],["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]]],["text","It is obligatory that at most 50\tstudents are registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that at least one\tstudent is registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that more than 0\tstudents are registered for at least one module"]],["rule",["obl",["exactQ",["card",["num",1]],["var",["num",1],["term","student"]],["aFrm",["fcTp",["term","student"],["verb","is school president"]],["bind",["term","student"],1]]]],["text","It is obligatory that exactly one\tstudent is school president"]],["rule",["obl",["numRngQ",["minCard",["num",1]],["maxCard",["num",50]],["var",["num",1],["term","student"]],["existQ",["var",["num",3],["term","module"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"]],["bind",["term","student"],1],["bind",["term","module"],3]]]]],["text","It is obligatory that at least one and at most 50\tstudents are registered for at least one module"]],["rule",["obl",["existQ",["var",["num",1],["term","student"]],["existQ",["var",["num",2],["term","module"]],["existQ",["var",["num",4],["term","lecturer"]],["aFrm",["fcTp",["term","student"],["verb","is registered for"],["term","module"],["verb","with"],["term","lecturer"]],["bind",["term","student"],1],["bind",["term","module"],2],["bind",["term","lecturer"],4]]]]]],["text","It is obligatory that a student is registered for a module with a lecturer"]],["rule",["obl",["exactQ",["card",["num",0]],["var",["num",1],["term","person"]],["aFrm",["fcTp",["term","person"],["verb","is swimming"]],["bind",["term","person"],1]]]],["text","It is obligatory that exactly 0 people are swimming"]]]

module("SBVR tests");

test("SBVRParser",function() {
	expect(1+testModel.length);
	var parser = SBVRParser.createInstance();
	for(var i=0,l=testModel.length;i<l;i++)
	{
		try {
			deepEqual(parser.matchAll(testModel[i][0],'line'), testModel[i][1], testModel[i][0]);
		}
		catch(e) {
			equal(e.toString(), testModel[i][1], testModel[i][0]);
		}
	}
	var generatedLF = parser.matchAll('','expr');
	console.log(JSON.stringify(SBVR_PreProc.match(generatedLF,'optimizeTree')));
		deepEqual(SBVR_PreProc.match(generatedLF,'optimizeTree'), prepLF, 'SBVR_PreProc');
	
	
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
