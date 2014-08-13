
if( process.argv.length < 2 ) {
	console.log(
		'Usage: \n' +
		'node stream-server.js [<stream-port> <websocket-port>]'
	);
	process.exit();
}


var STREAM_PORT = process.argv[2] || 8082;
var WEBSOCKET_PORT = process.argv[3] || 8084;
var STREAM_MAGIC_BYTES = 'jsmp'; // Must be 4 bytes
var height = [];
var width = [];

var httpServer = require('http').createServer(function (req, req) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Not Implemented');
});
httpServer.listen(WEBSOCKET_PORT);

var socketServer= {};

function createWebSocketServer(width, height, identifier) {
    // Websocket Server
    if(!socketServer[identifier]) {
	socketServer[identifier] = new (require('ws').Server)({server: httpServer, path: '/'+identifier});
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
	socket.send(streamHeader, {binary:true});

	console.log( 'New WebSocket Connection ' + identifier + ' ('+socketServer[identifier].clients.length+' total)' );
	
	socket.on('close', function(code, message){
	    console.log( 'Disconnected WebSocket ' + identifier + ' ('+socketServer[identifier].clients.length+' total)' );
	});
    });

    socketServer[identifier].broadcast = function(data, opts) {
	for( var j in this.clients ) {
	    if (this.clients[j].readyState == 1) {
		this.clients[j].send(data, opts);
	    }
	    else {
		console.log( 'Error: Client ('+j+') not connected.' );
	    }
	}
    };
    console.log('Awaiting WebSocket connections on ws://127.0.0.1:'+WEBSOCKET_PORT+'/'+identifier);
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
    createWebSocketServer(width, height, identifier);
    request.on('data', function(data){
	socketServer[identifier].broadcast(data, {binary:true});
    });
}).listen(STREAM_PORT);
console.log('Listening for MPEG Stream on http://127.0.0.1:'+STREAM_PORT+'/<width>/<height>/<identifier>');
