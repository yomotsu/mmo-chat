
MOC.PlayerCharacter3D = function ( params ) {

  this.id   = params.id; // socket.io 側で発行
  this.name = params.name;
  this.mesh = new THREE.Mesh(
    new THREE.SphereGeometry( MOC.PlayerCharacter3D.PLAYER_RADIUS, 16, 16 ),
    new THREE.MeshBasicMaterial( { color: 0xff0000,  wireframe: true} )
  );
  this.mesh.position.set( 0, 30, 0 );
  this.characterController = new MW.CharacterController( this.mesh, MOC.PlayerCharacter3D.PLAYER_RADIUS );

  this.DOMBlock = document.createElement( 'div' );
  this.DOMBlock.classList.add( 'MOC-view3d__playerDOMBlock' );
  this.DOMBlock.innerHTML = [
    '<div class="MOC-view3d__playerChat" id="' + this.id + '">ああああいいいううう</div>',
  ].join( '' );

  this.nameSprite = MOC.PlayerCharacter3D.generateNameSprite( this.name );
  this.nameSprite.position.set( 0, 1.5, 0 );
  this.mesh.add( this.nameSprite );

}

MOC.PlayerCharacter3D.prototype = {

  updatePosition: function () {
  // vent.addEventListener( 'beforerender', function () {

  //   animationController.mesh.position.set(
  //     playerController.center.x,
  //     playerController.center.y - playerController.radius,
  //     playerController.center.z
  //   );

  //   animationController.mesh.rotation.y = playerController.direction + Math.PI;

  // } );
  }
}

MOC.PlayerCharacter3D.PLAYER_RADIUS = 1;

MOC.PlayerCharacter3D.generateNameSprite = function ( text ) {

  var width    = 512;
  var height   = 64;
  var fontSize = 46;
  var linePosV = fontSize * 0.5 + height * 0.5 - 5;
  var canvas = document.createElement( 'canvas' );
  var ctx = canvas.getContext( '2d' );
  var texture, material, sprite;
  canvas.width  = width;
  canvas.height = height;
  ctx.font = fontSize + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.strokeText( text, width / 2, linePosV, width );
  ctx.fillStyle = '#fff';
  ctx.fillText( text, width / 2, linePosV, width );

  texture = new THREE.Texture( canvas );
  texture.needsUpdate = true;

  material = new THREE.SpriteMaterial( {
    map: texture,
    transparent: false,
    fog: true
  } );

  var sprite = new THREE.Sprite( material );
  sprite.scale.set( 4, 0.5, 0 );

  return sprite;

}












MOC.view3d = {

  init: function ( containerElement ) {

    this.width  = window.innerWidth,
    this.height = window.innerHeight,
    this.clock  = new THREE.Clock(),
    this.scene  = new THREE.Scene(),
    this.camera = new THREE.PerspectiveCamera( 40, this.width / this.height, 1, 1000 );
    this.camera.position.set( 0, 5, 30 );
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize( this.width, this.height );
    containerElement.appendChild( this.renderer.domElement );

    // 30m * 3 world
    this.world = new MW.World();
    var min = new THREE.Vector3( -15, -15, -15 );
    var max = new THREE.Vector3(  15,  15,  15 );
    var partition = 5;
    this.octree = new MW.Octree( min, max, partition );
    this.world.add( this.octree );

    this.DOMContainer = document.createElement( 'div' );
    this.DOMContainer.style.width  = this.width  + 'px';
    this.DOMContainer.style.height = this.height + 'px';
    this.DOMContainer.classList.add( 'MOC-view3d__DOMContainer' );
    containerElement.appendChild( this.DOMContainer );

    this.playerPool = [];

    this.addMe();
    this.loadLevel();

  },

  addMe: function () {

    var that = this;
    this.playerCharacter = new MOC.PlayerCharacter3D( {
      // id は、自キャラでは後でsocketでかえってきた情報を使う
      name: 'yomotsu',
      type: 1
    } );
    this.scene.add( this.playerCharacter.mesh );
    this.world.add( this.playerCharacter.characterController );
    this.DOMContainer.appendChild( this.playerCharacter.DOMBlock );

    this.keyInputControl  = new MW.KeyInputControl();
    this.tpsCameraControl = new MW.TPSCameraControl(
      this.camera, // three.js camera
      this.playerCharacter.mesh, // tracking object
      {
        el: this.renderer.domElement,
        offset: new THREE.Vector3( 0, 1.8, 0 ), // eye height
        // radius: 1, // default distance of the character to the camera
        // minRadius: 1,
        // maxRadius: 80,
        rigidObjects: []
      }
    );

    // bind events
    this.playerCharacter.characterController.inputTimeout = null;
    this.keyInputControl.addEventListener( 'movekeyhold',    function () {

      that.playerCharacter.characterController.inputTimeout = null;
      that.playerCharacter.characterController.isRunning = true;

    } );

    this.keyInputControl.addEventListener( 'movekeyrelease', function () {

      that.playerCharacter.characterController.inputTimeout = Date.now() + 300;

      setTimeout( function () {

        if ( that.keyInputControl.isMoveKeyHolded ) { return; }
        that.playerCharacter.characterController.isRunning = false;

      }, 300 );

    } );

    this.keyInputControl.addEventListener( 'jumpkeypress', function () {

      that.playerCharacter.characterController.jump();

    } );

    // synk with keybord input and camera control input
    this.keyInputControl.addEventListener( 'movekeychange', syncRotation );
    // the 'updated' event is fired by `tpsCameraControl.update()`
    this.tpsCameraControl.addEventListener( 'updated', syncRotation );

    function syncRotation () {

      if ( that.playerCharacter.characterController.isIdling ) { return; }
      var cameraFrontAngle = that.tpsCameraControl.getFrontAngle();
      var characterFrontAngle = that.keyInputControl.getFrontAngle();
      that.playerCharacter.characterController.direction = THREE.Math.degToRad( 360 ) - cameraFrontAngle + characterFrontAngle;

    }

  },

  addOtherPlayer: function ( data ) {

    var otherPlayerCharacter = new MOC.PlayerCharacter3D( {
      id:   data.id,
      name: data.name,
      type: data.type
    } );
    this.scene.add( otherPlayerCharacter.mesh );
    this.world.add( otherPlayerCharacter.characterController );
    this.playerPool.push( otherPlayerCharacter );
    this.DOMContainer.appendChild( otherPlayerCharacter.DOMBlock );

  },

  loadLevel: function () {

    var that   = this;
    var loader = new THREE.JSONLoader();
    var box, terrain;

    loader.load( 'terrain.json', function( geo, mat ) {

      box = new THREE.Mesh(
        new THREE.BoxGeometry( 14, 1, 5 ),
        new THREE.MeshNormalMaterial()
      );
      box.position.set( -3, 7.5, -13 );
      that.scene.add( box );
      that.scene.add( new THREE.WireframeHelper( box ) );
      that.octree.importThreeMesh( box );


      terrain = new THREE.Mesh(
        geo,
        new THREE.MeshNormalMaterial()
        // new THREE.MeshFaceMaterial( mat )
      );
      terrain.scale.set( 2, 2, 2 );
      that.scene.add( terrain );
      that.scene.add( new THREE.WireframeHelper( terrain ) );
      that.octree.importThreeMesh( terrain );
      that.tpsCameraControl.rigidObjects.push( terrain );

    } );

  },

  allOtherPlayersControler: function () {

    this.playerPool.forEach( function ( pc ) {

      // TODO アニメーション管理

    } );

  },

  update: function () {

    this.allOtherPlayersControler();

  },

  renderDOM: function () {

    var position   = new THREE.Vector3();
    var nameSpriteHeight = 0.25;
    var y = MOC.PlayerCharacter3D.PLAYER_RADIUS + nameSpriteHeight;
    var width, height, widthHarf, heightHarf;

    var updateChatPosition = function ( playerCharacter, camera ) {

      position.addVectors(
        playerCharacter.characterController.center,
        playerCharacter.nameSprite.position
      );
      // position.copy( playerCharacter.nameSprite.position );
      position.y += nameSpriteHeight;

      var position2d = MOC.util.getScreenPosition(
        position,
        camera,
        widthHarf,
        heightHarf
      );

      MOC.util.cssTransform(
        playerCharacter.DOMBlock,
        'translate( ' + position2d.x + 'px, ' + ( position2d.y - height ) + 'px )'
      );

      // TODO カメラからの距離でチャットにCSSのz-indexをつける

    };

    return function () {

      var camera = this.camera;
      width      = this.width;
      height     = this.height;
      widthHarf  = this.width  * 0.5;
      heightHarf = this.height * 0.5;

      updateChatPosition( this.playerCharacter, camera );

      this.playerPool.forEach( function ( pc ) {

        updateChatPosition( pc, camera );

      } );
    }

  }(),

  render: function ( delta ) {

    this.world.step( delta );
    this.tpsCameraControl.update();
    this.renderer.render( this.scene, this.camera );

  },

  connect: function () {

    var that = this;
    var socket = io( 'http://localhost:3004', { transports: [ 'websocket' ] } );

    // 接続完了時
    socket.on('connect', function() {

      //自分の状態をサーバに送る
      socket.emit( 'addnewplayer', {
        name     : that.playerCharacter.name,
        type     : that.playerCharacter.type,
        position : [
          that.playerCharacter.characterController.center.x,
          that.playerCharacter.characterController.center.y,
          that.playerCharacter.characterController.center.z
        ],
        velocity : [
          that.playerCharacter.characterController.velocity.x,
          that.playerCharacter.characterController.velocity.y,
          that.playerCharacter.characterController.velocity.z
        ],
        direction    : that.playerCharacter.characterController.direction,
        isGrounded   : that.playerCharacter.characterController.isGrounded,
        isIdling     : that.playerCharacter.characterController.isIdling,
        isJumping    : that.playerCharacter.characterController.isJumping,
        isOnSlope    : that.playerCharacter.characterController.isOnSlope,
        isRunning    : that.playerCharacter.characterController.isRunning,
        jumpStartTime: that.playerCharacter.characterController.jumpStartTime,
        inputTimeout : that.playerCharacter.characterController.inputTimeout
      } );

    } );

    // 接続成功時、[myid] と [接続済みの他のプレイヤー情報] が返ってくる
    socket.on( 'myid', function ( data ) {

      that.playerCharacter.id = data.myID;

      // 接続済みの他プレイヤーをクライアント側でも反映
      for ( var i in data.players ) {

        that.addOtherPlayer( data.players[ i ] );

      }

    } );

    // 途中で新たにプレイヤーが追加で接続した場合
    socket.on( 'addnewplayer', function ( data ) {

      that.addOtherPlayer( data );

    } );

    socket.on( 'sync', function ( allPlayersData ) {

      that.playerPool.forEach( function ( item ) {

        var playerData = allPlayersData[ item.id ];

        item.characterController.center.set(
          playerData.position[ 0 ],
          playerData.position[ 1 ],
          playerData.position[ 2 ]
        );
        item.characterController.velocity.set(
          playerData.velocity[ 0 ],
          playerData.velocity[ 1 ],
          playerData.velocity[ 2 ]
        );
        item.characterController.direction     = playerData.direction;
        item.characterController.isGrounded    = playerData.isGrounded;
        item.characterController.isIdling      = playerData.isIdling;
        item.characterController.isJumping     = playerData.isJumping;
        item.characterController.isOnSlope     = playerData.isOnSlope;
        item.characterController.isRunning     = playerData.isRunning;
        item.characterController.jumpStartTime = playerData.jumpStartTime;
        item.characterController.inputTimeout  = playerData.inputTimeout;

      } );
      // app.playersData.watchAndSync();

      var myData = {
        position : [
          that.playerCharacter.characterController.center.x,
          that.playerCharacter.characterController.center.y,
          that.playerCharacter.characterController.center.z
        ],
        velocity : [
          that.playerCharacter.characterController.velocity.x,
          that.playerCharacter.characterController.velocity.y,
          that.playerCharacter.characterController.velocity.z
        ],
        direction    : that.playerCharacter.characterController.direction,
        isGrounded   : that.playerCharacter.characterController.isGrounded,
        isIdling     : that.playerCharacter.characterController.isIdling,
        isJumping    : that.playerCharacter.characterController.isJumping,
        isOnSlope    : that.playerCharacter.characterController.isOnSlope,
        isRunning    : that.playerCharacter.characterController.isRunning,
        jumpStartTime: that.playerCharacter.characterController.jumpStartTime,
        inputTimeout : that.playerCharacter.characterController.inputTimeout
      };

      socket.emit( 'upload', myData );

    } );

    socket.on( 'playerleft', function ( id ) {

      // TODO idから要素を取り除く仕組みを作る
      that.dispose( id );
      // app.playersData.remove( id );

    } );

  },

  dispose: function ( id ) {

    var playerPool  = this.playerPool;
    var world       = this.world.characterPool;
    var scene       = this.scene
    var playerIndex = _.findIndex( playerPool, { id: id } );
    var player      = playerPool[ playerIndex ];
    var nameSprite  = player.nameSprite;
    var nameTexture = player.nameSprite.material.map

    player.mesh.remove( nameTexture );
    nameTexture.dispose();

    player.mesh.remove( player.nameSprite );
    playerPool.splice( playerPool.indexOf( player ), 1 );
    world.splice( world.indexOf( player.controller ), 1 );
    scene.remove( player.mesh );

  }

}
