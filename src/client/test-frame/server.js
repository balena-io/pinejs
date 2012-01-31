function resetState(callback) {
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
		})

		testName = 'GET /onair';
		remoteServerRequest('GET', '/onair', {}, null, function(statusCode, result, headers){
			equal(statusCode, 200, testName);
			equal(result, false, testName);
		}, function(statusCode, error) {
			ok(false, testName);
		})

		testName = 'GET /model';
		remoteServerRequest('GET', '/model', {}, null, function(statusCode, result, headers){
			ok(false, testName);	
		}, function(statusCode, error) {
			equal(statusCode, 404, testName);
		})

		testName = 'GET /lfmodel';
		remoteServerRequest('GET', '/lfmodel', {}, null, function(statusCode, result, headers){
			ok(false, testName);	
		}, function(statusCode, error) {
			equal(statusCode, 404, testName);
		})

		testName = 'GET /prepmodel';
		remoteServerRequest('GET', '/prepmodel', {}, null, function(statusCode, result, headers){
			ok(false, testName);	
		}, function(statusCode, error) {
			equal(statusCode, 404, testName);
		})

		testName = 'GET /sqlmodel';
		remoteServerRequest('GET', '/sqlmodel', {}, null, function(statusCode, result, headers){
			ok(false, testName);	
		}, function(statusCode, error) {
			equal(statusCode, 404, testName);
		})
		
		testName = 'POST /update';
		remoteServerRequest('POST', '/update', {}, null, function(statusCode, result, headers){
			ok(false, testName);	
		}, function(statusCode, error) {
			equal(statusCode, 404, testName);
		})
	})
})

test("Execute model /",function() {
	resetState(function(){
		testName = "PUT textarea-is_disabled model_area"
		remoteServerRequest ("PUT", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {}, {value: true}, function(statusCode, result, headers) {
			equal(statusCode, 200, testName);
			testName = "GET textarea-is_disabled model_area"
			remoteServerRequest ("GET", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {}, null, function(statusCode, result, headers) {
				equal(statusCode, 200, testName);
				deepEqual(result, {value: true}, testName);
			}, function(statusCode, error) {
				ok(false, testName);
			})
			testName = "PUT textarea model_area"
			remoteServerRequest ("PUT", "/ui/textarea*filt:name=model_area/", {}, {value: model1}, function(statusCode, result, headers) {
				equal(statusCode, 200, testName);
				testName = "GET textarea model_area"
				remoteServerRequest ("GET", "/ui/textarea*filt:name=model_area/", {}, null, function(statusCode, result, headers) {
					equal(statusCode, 200, testName);
					deepEqual(result, {value: model1}, testName);
				}, function(statusCode, error) {
					ok(false, testName);
				})
				testName = "POST /execute/"
				remoteServerRequest ("POST", "/execute/", {}, null, function (statusCode, result, headers) {
					equal(statusCode, 200, testName);
				}, function(statusCode, error) {
					ok(false, testName);
				})
			}, function(statusCode, error) {
				ok(false, testName);
			})
		}, function(statusCode, error) {
			ok(false, testName);
		})
	})
})
