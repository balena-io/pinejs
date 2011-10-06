(function() {
  var http, staticServer;
  staticServer = new (require('node-static').Server)('./');
  http = require('http');
  http.createServer(function(request, response) {
    return request.on('end', function() {
      console.log('End', request.method, request.url);
      return staticServer.serve(request, response);
    });
  }).listen(process.env.PORT || 1337, function() {
    return console.log('Server started');
  });
}).call(this);
