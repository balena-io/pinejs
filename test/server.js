function resetState() {
	remoteServerRequest('DELETE', '/', {}, '');
}

module("Server tests");

test("Server",function() {
	expect(1);
	testName = 'DELETE /';
	remoteServerRequest('DELETE', '/', {}, '', function(statusCode, result, headers){
		equal(statusCode, 200, testName);
	}, function(statusCode, error) {
		ok(false, testName);
	})
})