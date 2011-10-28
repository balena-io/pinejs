function resetState() {
	remoteServerRequest('DELETE', '/', {}, '');
}

module("Server tests");

test("DELETE /",function() {
	expect(8);
	var testName = 'DELETE /';
	remoteServerRequest('DELETE', '/', {}, '', function(statusCode, result, headers){
		equal(statusCode, 200, testName);
	}, function(statusCode, error) {
		ok(false, testName);
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

test("execute model /",function() {

	remoteServerRequest ("PUT", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {"Content-Type": "application/json"}, JSON.stringify({value: true}), function(statusCode, result, headers) {
		equal(statusCode, 200, "PUT model_area");
		remoteServerRequest ("PUT", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {"Content-Type": "application/json"}, JSON.stringify({value: true}), function(statusCode, result, headers) {
			equal(statusCode, 200, "GET model_area");
			deepEqual(result, {value: true}, "GET model_area");
		}, function(statusCode, error) {
			ok(false, "GET model_area");
		})
		remoteServerRequest ("PUT", "/ui/textarea*filt:name=model_area/", {"Content-Type": "application/json"}, JSON.stringify({value: model1}), function(statusCode, result, headers) {
			remoteServerRequest ("POST", "/execute/", {"Content-Type": "application/json"}, "", function (statusCode, result, headers) {
				setClientOnAir(true);
			})
		})
	})
})
