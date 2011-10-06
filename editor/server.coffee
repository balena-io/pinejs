staticServer = new(require('node-static').Server)('./');
http = require('http')
http.createServer((request, response) ->
	request.on('end', () ->
		console.log('End', request.method, request.url)
		staticServer.serve(request, response)
	)
).listen(process.env.PORT or 1337, () ->
	console.log('Server started')
)