var app = require('express')();



var STREAM_PORT = process.argv[2] || 8082;
var SOCKETIO_PORT = process.argv[3] || 8084;
var STREAM_MAGIC_BYTES = 'jsmp'; // Must be 4 bytes
var height = [];
var width = [];

var httpServer = require('http').createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Not Implemented');
});
var io = require('socket.io');

httpServer.listen(SOCKETIO_PORT);

var baseServer = io(httpServer);
var socketServer= {};

function createSocketIO(width, height, identifier) {
    // Websocket Server
    if(!socketServer[identifier]) {
		socketServer[identifier] = baseServer.of('/'+identifier);
    }
    socketServer[identifier].width = width;
    socketServer[identifier].height = height;
    
    socketServer[identifier].on('connection', function(socket) {
		// Send magic bytes and video size to the newly connected socket
		// struct { char magic[4]; unsigned short width, height;}
		var streamHeader = new Buffer(8);
		streamHeader.write(STREAM_MAGIC_BYTES);
		streamHeader.writeUInt16BE(width, 4);
		streamHeader.writeUInt16BE(height, 6);
		socket.emit('mpeg', streamHeader);

		console.log( 'New Socket.IO Connection ' + identifier + ' ('+Object.keys(socketServer[identifier].connected).length+' total)' );
	
		socket.on('disconnect', function(code, message){
	    	console.log( 'Disconnected Socket.IO ' + identifier + ' ('+Object.keys(socketServer[identifier].connected).length+' total)' );
		});
    });

    console.log('Awaiting Socket.IO connections on 127.0.0.1:'+SOCKETIO_PORT+'/'+identifier);
}

// HTTP Server to accept incomming MPEG Stream
var streamServer = require('http').createServer( function(request, response) {
    var params = request.url.substr(1).split('/');
    var identifier = params[2];
    var width = (params[0]||320)|0;
    var height = (params[1]||240)|0;

    console.log(
	'Stream Connected: ' + request.socket.remoteAddress + 
	    ':' + request.socket.remotePort + ' size: ' + width + 'x' + height + ' identifier:' + identifier
    );	
    createSocketIO(width, height, identifier);
    request.on('data', function(data){
    	for(var key in socketServer[identifier].connected) {
			socketServer[identifier].connected[key].volatile.emit('mpeg', data);
		}
    });
}).listen(STREAM_PORT);
console.log('Listening for MPEG Stream on http://127.0.0.1:'+STREAM_PORT+'/<width>/<height>/<identifier>');
