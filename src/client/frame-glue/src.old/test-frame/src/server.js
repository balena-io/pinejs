define(['server-glue/server', 'sbvr-frame/SBVRModels'], function() {
	var resetState = function (callback) {
		remoteServerRequest('DELETE', '/', {}, null, callback, callback);
	}

	module("Server tests");

	test("DELETE /",function() {
		expect(8);
		resetState(function(){
			var testName = 'DELETE /';
			remoteServerRequest('DELETE', '/', {}, null, function(statusCode, result, headers){
				ok(false, testName);
			}, function(statusCode, error) {
				//Server is off air so command should fail
				equal(statusCode, 404, testName);
			});

			testName = 'GET /onair';
			remoteServerRequest('GET', '/onair', {}, null, function(statusCode, result, headers){
				equal(statusCode, 200, testName);
				equal(result, false, testName);
			}, function(statusCode, error) {
				ok(false, testName);
			});

			testName = 'GET /dev/model?filter=model_type:se;vocabulary:data';
			remoteServerRequest('GET', '/dev/model?filter=model_type:se;vocabulary:data', {}, null, function(statusCode, result, headers){
				ok(false, testName);	
			}, function(statusCode, error) {
				equal(statusCode, 404, testName);
			});

			testName = 'GET /dev/model?filter=model_type:lf;vocabulary:data';
			remoteServerRequest('GET', '/dev/model?filter=model_type:lf;vocabulary:data', {}, null, function(statusCode, result, headers){
				ok(false, testName);	
			}, function(statusCode, error) {
				equal(statusCode, 404, testName);
			});

			testName = 'GET /dev/model?filter=model_type:abstractsql;vocabulary:data';
			remoteServerRequest('GET', '/dev/model?filter=model_type:abstractsql;vocabulary:data', {}, null, function(statusCode, result, headers){
				ok(false, testName);	
			}, function(statusCode, error) {
				equal(statusCode, 404, testName);
			});

			testName = 'GET /dev/model?filter=model_type:sql;vocabulary:data';
			remoteServerRequest('GET', '/dev/model?filter=model_type:sql;vocabulary:data', {}, null, function(statusCode, result, headers){
				ok(false, testName);	
			}, function(statusCode, error) {
				equal(statusCode, 404, testName);
			});
			
			testName = 'POST /update';
			remoteServerRequest('POST', '/update', {}, null, function(statusCode, result, headers){
				ok(false, testName);	
			}, function(statusCode, error) {
				equal(statusCode, 404, testName);
			});
		});
	});

	test("Execute model /",function() {
		resetState(function(){
			testName = "PUT textarea-is_disabled model_area"
			remoteServerRequest("PUT", "/ui/textarea-is_disabled?filter=textarea.name:model_area/", {}, {value: true}, function(statusCode, result, headers) {
				equal(statusCode, 200, testName);
				testName = "GET textarea-is_disabled model_area"
				remoteServerRequest("GET", "/ui/textarea-is_disabled?filter=textarea.name:model_area/", {}, null, function(statusCode, result, headers) {
					equal(statusCode, 200, testName);
					deepEqual(result, {value: true}, testName);
				}, function(statusCode, error) {
					ok(false, testName);
				});
				testName = "PUT textarea model_area"
				remoteServerRequest("PUT", "/ui/textarea?filter=name:model_area/", {}, {value: model1}, function(statusCode, result, headers) {
					equal(statusCode, 200, testName);
					testName = "GET textarea model_area"
					remoteServerRequest ("GET", "/ui/textarea?filter=name:model_area/", {}, null, function(statusCode, result, headers) {
						equal(statusCode, 200, testName);
						deepEqual(result, {value: model1}, testName);
					}, function(statusCode, error) {
						ok(false, testName);
					});
					testName = "POST /execute/"
					remoteServerRequest("POST", "/execute/", {}, null, function (statusCode, result, headers) {
						equal(statusCode, 200, testName);
					}, function(statusCode, error) {
						ok(false, testName);
					});
				}, function(statusCode, error) {
					ok(false, testName);
				});
			}, function(statusCode, error) {
				ok(false, testName);
			});
		});
	});
});