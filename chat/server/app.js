var server = require( 'http' ).createServer();
var io     = require( 'socket.io' )( server );
var port   = process.env.PORT || 3002;

server.listen( port );

io.set( 'transports', [ 'websocket' ] );
io.set( 'origins', '*:*' );

var players = {};

io.on( 'connection', function ( socket ) {

  // console.log( 'connected' );

  socket.on( 'addnewplayer', function ( arraivalAvatarData ) {

    // 自分だけに [自分のID] と [既に接続している他のプレイヤー情報] を送信
    io.to( socket.id ).emit( 'myChatID', {
      chatID : socket.id,
      players : players
    } );

    players[ socket.id ] = {
      chatID: socket.id,
      name  : arraivalAvatarData.name,
      type  : arraivalAvatarData.type
    }

  } );

  socket.on( 'msg', function( data ) {

    data.timeStamp = Date.now();
    
    io.emit( 'msg', data );

  } );

  socket.on( 'disconnect', function () {

    // console.log( 'disconnected' );
    socket.broadcast.emit( 'playerleft', socket.id );
    delete players[ socket.id ];

  } );

} );
