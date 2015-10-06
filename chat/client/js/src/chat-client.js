MOC.playperModel = new ( Backbone.Model.extend( {
  defaults: {
    chatID: null,
    // mapID : null,
    name  : null,
    type  : null,
    lastChatTimeStamp: null,
    isChatMode: false
  },
  initialize: function ( attrs, options ) {

  }
} ) );

MOC.OtherPlayperModel = Backbone.Model.extend( {

  defaults: {
    chatID: null,
    // mapID : null,
    name  : null,
    type  : null,
    lastChatTimeStamp: null,
  },

  initialize: function ( attrs, options ) {

  }

} );

MOC.otherPlayperList = new ( Backbone.Collection.extend( {

    model: MOC.OtherPlayperModel,

    fetchPlayers: function ( players ) {

      for ( var i in players ) {

        this.add( {
          chatID: players[ i ].chatID,
          mapID : players[ i ].mapID,
          name  : players[ i ].name,
          type  : players[ i ].type
        } );

      }

    },

    removeById: function ( id ) {

      // this.remove()
      console.log( this.models );
      console.log( id );

    }

} ) );


////////////////////////////////
//
// 1. 名前入力、アバタータイプ選択
//
////////////////////////////////

MOC.flow_select = function( val ) {

  return new Promise( function( onFulfilled, onRejected ) {

    var template = [
      '<div class="game-overlay" data-game-select>',
        '<div class="game-overlay__inner">',
          '<div class="game-overlay__main">',

            '<div class="game-uiFrame">',
              '<div class="game-uiFrame__inner">',

                '<form data-game-selectform>',

                  '<div class="game-select">',
                      '<div class="game-select__text">',
                        'Input your name and select your charactor type.',
                      '</div>',
                      '<input class="game-select__nameInput" data-game-nameinput maxlength="16" autofocus>',
                      '<select class="game-select__typeInput" data-game-typeinput>',
                        '<option>type1</option>',
                        '<option>type2</option>',
                      '</select>',
                  '</div>',

                  '<div class="game-buttonContainer">',
                    '<ul>',
                      '<li>',
                        '<button class="game-button game-button--disabled" disabled data-game-selectsubmit type="submit">',
                          '<span class="game-button__inner">New Game</span>',
                        '</button>',
                      '</li>',
                    '</ul>',
                  '</div>',

                '</form>',

              '</div>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="game-overlay__bg"></div>',
      '</div>'
    ].join( '' );

    $( document.body ).append( template );

    var $el     = $( '[data-game-select]' );
    var $form   = $el.find( '[data-game-selectform]' );
    var $name   = $el.find( '[data-game-nameinput]' );
    var $type   = $el.find( '[data-game-typeinput]' );
    var $submit = $( '[data-game-selectsubmit]' );
    var modifier = 'game-button--disabled';

    var isValid = function () {

      var pattern = new RegExp( '^[a-z0-9].+' );
      return pattern.test( $name.val() );

    }

    var toggleDisabled = function () {

      if ( isValid() ) {

        $submit.removeClass( modifier );
        $submit.prop( 'disabled', false );

      } else {

        $submit.addClass( modifier );
        $submit.prop( 'disabled', true );

      }

    }

    var done = function () {

      $name.off( 'keyup'  );
      $name.off( 'blur'   );
      $name.off( 'change' );
      $form.off( 'submit' );
      $el.remove();
      onFulfilled();

    }

    $name.on( 'keyup',  toggleDisabled );
    $name.on( 'blur',   toggleDisabled );
    $name.on( 'change', toggleDisabled );

    $form.on( 'submit', function ( e ) {

      e.preventDefault();

      if ( !isValid() ) {

        toggleDisabled();
        return;

      }

      MOC.playperModel.set( {
        name: $name.val(),
        type: $type.val()
      } );
      done();

    } );

  } );

};


////////////////////////////////
//
// 2. チャット開始
//
////////////////////////////////


MOC.flow_startgame = function () {

  return new Promise( function( onFulfilled, onRejected ) {

    var socket = io( 'http://localhost:3002', { transports: [ 'websocket' ] } );
    // var socket = io( 'http://***.azurewebsites.net', { transports: [ 'websocket' ] } );

    var template = [
      '<div class="game-chat">',
        '<div class="game-chat__log"></div>',
        '<form class="game-chat__form">',
          '<input id="input">',
        '</form>',
      '</div>'
    ].join( '' );

    $( document.body ).append( template );

    var $el    = $( '.game-chat' );
    var $log   = $el.find( '.game-chat__log' );
    var $item  = $el.find( '.game-chat__logItem' );
    var $form  = $el.find( '.game-chat__form' );
    var $input = $form.find( 'input' );

    $form.on( 'submit', function ( e ) {

      e.preventDefault();

    } );

    var addLine = ( function () {

      var template = _.template( [
        '<div class="game-chat__logItem game-chat__logItem--<%= data.chatType %>">',
          '<%= _.escape( data.name ) %> : <%= _.escape( data.text ) %>',
        '</div>'
      ].join( '' ) );

      return function ( data ) {

        var html = template( { data: data } );
        $log.append( $( html ) );

        $log.scrollTop( 1e10 );

      }

    } )();

    var putPlayerChat = function ( data ) {

      var expire = 2500; // in ms
      var $chatBallon = $( '#playerchat-' + data.chatID );
      $chatBallon.html( _.escape( data.text ) );

      setTimeout( function () {

        if ( pcModel.get( 'lastChatTimeStamp' ) + expire <= Date.now() ) {

          $chatBallon.empty();

        }

      }, expire );
      
    }

    //
    // when press the Enter key
    //
    var onEnterPress = function ( e ) {

      if( e.keyCode !== 13 ) { // !Enter key

        return;

      }

      e.preventDefault();
      MOC.playperModel.set( { 'isChatMode': !MOC.playperModel.get( 'isChatMode' ) } );

      if ( MOC.playperModel.get( 'isChatMode' ) ) {
        
        $input.focus();
        return;

      } else {

        $input.blur();

        if ( $input.val() !== '' ) {

          var data = {
            chatID  : MOC.playperModel.get( 'chatID' ),
            name    : MOC.playperModel.get( 'name' ),
            text    : $input.val(),
            position: null,
            chatType: 'say'
          }

          socket.emit( 'msg', data );
          $input.val( '' );

        }

      }

    }

    $( window ).on( 'keypress', onEnterPress );
    $input.on( 'focus', function () {

      MOC.playperModel.set( { 'isChatMode': true } );
      // console.log( MOC.playperModel.get( 'isChatMode' ) );

    } );
    $input.on( 'blur', function () {

      MOC.playperModel.set( { 'isChatMode': false } );
      // console.log( MOC.playperModel.get( 'isChatMode' ) );

    } );

    socket.on('connect', function() {

      var data = {
        name : MOC.playperModel.get( 'name' ),
        type : MOC.playperModel.get( 'type' )
      };

      socket.emit( 'addnewplayer', data );

    } );

    socket.on( 'myChatID', function( data ) {
      
      // 自分のchatIDと、接続済みの他のプレイやーの全データが返ってくる
      MOC.playperModel.set( { chatID: data.chatID } );
      MOC.otherPlayperList.fetchPlayers( data.players );
      onFulfilled();

    } );

    socket.on( 'msg', function( data ) {

      // console.log( data.timeStamp, data );

      if ( MOC.playperModel.get( 'chatID' ) === data.chatID ) {

        pcModel = MOC.playperModel;

      } else {

        pcModel = MOC.otherPlayperList.findWhere( { chatID: data.chatID } );

      }

      pcModel.set( { 'lastChatTimeStamp': Date.now() } );
      
      addLine( data );
      putPlayerChat( data );

    } );

    // TODO 途中で他プレイヤーがきた時の処理として、MOC.otherPlayperListに追加する

    socket.on( 'playerleft', function ( id ) {

      MOC.otherPlayperList.removeById( id );

    } );

  } );

}


