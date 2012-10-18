define(['data-frame/ClientURIParser'], function(ClientURIParser) {
	var testModel = [
		[
			'',
			[]
		],
		[
			'#!/',
			[]
		],
		[
			'#!/data/',
			[ "uri", [ "col", [ "data" ], [ "mod" ] ] ]
		],
		[
			'#!/data/course',
			[ "uri", [ "col", [ "data" ], [ "mod" ], [ "col", [ "course" ], [ "mod" ] ] ] ]
		],
		[
			'#!/data/course/course*add/',
			[ "uri", [ "col", [ "data" ], [ "mod" ], [ "col", [ "course" ], [ "mod" ], [ "ins", [ "course" ], [ "mod", [ "add" ] ] ] ] ] ]
		],
		[
			'#!/data/student.John',
			[ "uri", [ "col", [ "data" ], [ "mod" ], [ "ins", [ "student", "John" ], [ "mod", [ "filt", [ "eq", [], "name", "John" ] ] ] ] ] ]
		],
		[
			'#!/data/student.134',
			[ "uri", [ "col", [ "data" ], [ "mod" ], [ "ins", [ "student", 134 ], [ "mod", [ "filt", [ "eq", [], "id", 134 ] ] ] ] ] ]
		],
		[
			'#!/data/course/(course.1*del,course.math*del)',
			[ "uri", [ "col", [ "data" ], [ "mod" ], [ "col", [ "course" ], [ "mod" ], [ "ins", [ "course", 1 ], [ "mod", [ "filt", [ "eq", [], "id", 1 ] ], [ "del" ] ] ], [ "ins", [ "course", "math" ], [ "mod", [ "filt", [ "eq", [], "name", "math" ] ], [ "del" ] ] ] ] ] ]
		],
		[
			'#!/data/student.134*del',
			[ "uri", [ "col", [ "data" ], [ "mod" ], [ "ins", [ "student", 134 ], [ "mod", [ "filt", [ "eq", [], "id", 134 ] ], [ "del" ] ] ] ] ]
		],
		[
			'#!/data/(course/(course.1*del,course.math*del),student)',
			[ "uri", [ "col", [ "data" ], [ "mod" ], [ "col", [ "course" ], [ "mod" ], [ "ins", [ "course", 1 ], [ "mod", [ "filt", [ "eq", [], "id", 1 ] ], [ "del" ] ] ], [ "ins", [ "course", "math" ], [ "mod", [ "filt", [ "eq", [], "name", "math" ] ], [ "del" ] ] ] ], [ "col", [ "student" ], [ "mod" ] ] ] ]
		],
		[
			'#!/data/(course/(course.provID1*del,course.math*del),student)',
			[ "uri", [ "col", [ "data" ], [ "mod" ], [ "col", [ "course" ], [ "mod" ], [ "ins", [ "course", "provID" ], [ "mod", [ "filt", [ "eq", [], "name", "provID" ] ] ], [ "col", [ "1" ], [ "mod", [ "del" ] ] ] ], [ "ins", [ "course", "math" ], [ "mod", [ "filt", [ "eq", [], "name", "math" ] ], [ "del" ] ] ] ], [ "col", [ "student" ], [ "mod" ] ] ] ]
		]
	];

	module("ClientURI Parser Test");

	test("ClientURIParser",function() {
		expect(testModel.length);
		for(var i=0,l=testModel.length;i<l;i++) {
			try {
				deepEqual(ClientURIParser.matchAll(testModel[i][0], "expr"), testModel[i][1], "This expression works: \"" + testModel[i][0] + "\"");
			}
			catch(e) {
				console.log(e);
				equal(e.toString(), testModel[i][0], testModel[i][1]);
			}
		}
	})
});