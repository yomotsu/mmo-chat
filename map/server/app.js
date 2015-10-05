var server = require( 'http' ).createServer();
var io     = require( 'socket.io' )( server );
var port   = process.env.PORT || 3004;

server.listen( port );

io.set( 'transports', [ 'websocket' ] );
io.set( 'origins', '*:*' );

var players = {};
var isRunning = false;

io.on( 'connection', function ( socket ) {

  socket.on( 'addnewplayer', function ( arraivalAvatarData ) {

    if ( Object.keys( players ).length >= 8 ) {

      // 接続プレイヤーが多い場合は入れないようにする
      io.to( socket.id ).emit( 'toomany', {
        myID : socket.id,
        players : players
      } );

      return;

    }

    // 自分だけに [自分のID] と [既に接続している他のプレイヤー情報] を送信
    io.to( socket.id ).emit( 'myid', {
      myID : socket.id,
      players : players
    } );

    players[ socket.id ] = {
      id           : socket.id,
      name         : arraivalAvatarData.name,
      type         : arraivalAvatarData.type,
      position     : arraivalAvatarData.position,
      velocity     : arraivalAvatarData.velocity,
      direction    : arraivalAvatarData.direction,
      isGrounded   : arraivalAvatarData.isGrounded,
      isIdling     : arraivalAvatarData.isIdling,
      isJumping    : arraivalAvatarData.isJumping,
      isOnSlope    : arraivalAvatarData.isOnSlope,
      isRunning    : arraivalAvatarData.isRunning,
      jumpStartTime: arraivalAvatarData.jumpStartTime,
      inputTimeout : arraivalAvatarData.inputTimeout,
      lastupdate   : Date.now()
    };

    // 送信元を含まない、既に接続済みのプレイヤーに通知
    socket.broadcast.emit( 'addnewplayer', players[ socket.id ] );

    if ( !isRunning ) {

      run();
      isRunning = true;

    }

  } );

  socket.on( 'upload', function ( data ) {

    players[ socket.id ].position      = data.position;
    players[ socket.id ].position      = data.position;
    players[ socket.id ].velocity      = data.velocity;
    players[ socket.id ].direction     = data.direction;
    players[ socket.id ].isGrounded    = data.isGrounded;
    players[ socket.id ].isIdling      = data.isIdling;
    players[ socket.id ].isJumping     = data.isJumping;
    players[ socket.id ].isOnSlope     = data.isOnSlope;
    players[ socket.id ].isRunning     = data.isRunning;
    players[ socket.id ].jumpStartTime = data.jumpStartTime;
    players[ socket.id ].inputTimeout  = data.inputTimeout;
    players[ socket.id ].lastupdate    = Date.now();

  } );

  socket.on( 'disconnect', function () {

    console.log( 'dc', players[ socket.id ].lastupdate );
    // 接続が切れた人のIDをすべての人に通知
    socket.broadcast.emit( 'playerleft', socket.id );
    delete players[ socket.id ];

  } );
} );

function run () {
  
  // console.log( Object.keys( players ).length );
  if ( Object.keys( players ).length === 0 ) {

    isRunning = false;
    return;

  }

  setTimeout( run, 50 );
  io.sockets.emit( 'sync', players );

};
