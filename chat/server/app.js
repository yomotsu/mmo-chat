var server = require( 'http' ).createServer();
var io     = require( 'socket.io' )( server );
var port   = process.env.PORT || 3002;

server.listen( port );

io.set( 'transports', [ 'websocket' ] );
io.set( 'origins', '*:*' );

io.on( 'connection', function ( socket ) {

  // console.log( 'connected' );

  socket.on( 'msg', function( data ) {
    io.emit( 'msg', data );
  } );

  socket.on( 'disconnect', function () {
    // console.log( 'disconnected' );
  } );

});
