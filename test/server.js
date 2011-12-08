function resetState() {
	remoteServerRequest('DELETE', '/', {}, '');
}

module("Server tests");

test("DELETE /",function() {
	expect(8);
	var testName = 'DELETE /';
	remoteServerRequest('DELETE', '/', {}, '', function(statusCode, result, headers){
		ok(false, testName);
	}, function(statusCode, error) {
		//Server is off air so command should fail
		equal(statusCode, 404, testName);
	})

	testName = 'GET /onair';
	remoteServerRequest('GET', '/onair', {}, '', function(statusCode, result, headers){
		equal(statusCode, 200, testName);
		equal(result, false, testName);
	}, function(statusCode, error) {
		ok(false, testName);
	})

	testName = 'GET /model';
	remoteServerRequest('GET', '/model', {}, '', function(statusCode, result, headers){
		ok(false, testName);	
	}, function(statusCode, error) {
		equal(statusCode, 404, testName);
	})

	testName = 'GET /lfmodel';
	remoteServerRequest('GET', '/lfmodel', {}, '', function(statusCode, result, headers){
		ok(false, testName);	
	}, function(statusCode, error) {
		equal(statusCode, 404, testName);
	})

	testName = 'GET /prepmodel';
	remoteServerRequest('GET', '/prepmodel', {}, '', function(statusCode, result, headers){
		ok(false, testName);	
	}, function(statusCode, error) {
		equal(statusCode, 404, testName);
	})

	testName = 'GET /sqlmodel';
	remoteServerRequest('GET', '/sqlmodel', {}, '', function(statusCode, result, headers){
		ok(false, testName);	
	}, function(statusCode, error) {
		equal(statusCode, 404, testName);
	})
	
	testName = 'POST /update';
	remoteServerRequest('POST', '/update', {}, '', function(statusCode, result, headers){
		ok(false, testName);	
	}, function(statusCode, error) {
		equal(statusCode, 404, testName);
	})
})

test("Execute model /",function() {
	testName = "textarea-is_disabled model_area"
	remoteServerRequest ("PUT", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {}, {value: true}, function(statusCode, result, headers) {
		equal(statusCode, 200, "PUT " + testName);
		remoteServerRequest ("GET", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {}, null, function(statusCode, result, headers) {
			equal(statusCode, 200, "GET " + testName);
			deepEqual(result, {value: true}, "GET " + testName);
		}, function(statusCode, error) {
			ok(false, "GET " + testName);
		})
		testName = "textarea model_area"
		remoteServerRequest ("PUT", "/ui/textarea*filt:name=model_area/", {}, {value: model1}, function(statusCode, result, headers) {
			equal(statusCode, 200, "PUT " + testName);
			remoteServerRequest ("GET", "/ui/textarea*filt:name=model_area/", {}, null, function(statusCode, result, headers) {
				equal(statusCode, 200, "GET " + testName);
				deepEqual(result, {value: model1}, "GET " + testName);
			}, function(statusCode, error) {
				ok(false, "GET " + testName);
			})
			testName = "/execute/"
			remoteServerRequest ("POST", "/execute/", {}, null, function (statusCode, result, headers) {
				equal(statusCode, 200, "POST " + testName);
			})
		})
	})
})
