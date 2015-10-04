var playperModel = new ( Backbone.Model.extend( {
  defaults: {
    name: null,
    type: null,
    isChatMode: false
  },
  initialize: function ( attrs, options ) {

  },
  validate: function ( attrs ) {

  }
} ) );

var socket = io( 'http://localhost:3002', { transports: [ 'websocket' ] } );
// var socket = io( 'http://***.azurewebsites.net', { transports: [ 'websocket' ] } );

////////////////////////////////
//
// 1. 名前入力、アバタータイプ選択
//
////////////////////////////////

var flow_select = function( val ) {

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

      playperModel.set( {
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


var flow_startgame = function () {

  return new Promise( function( onFulfilled, onRejected ) {

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
	      '<div class="game-chat__logItem game-chat__logItem--<%= data.type %>">',
	        '<%= _.escape( data.name ) %> : <%= _.escape( data.text ) %>',
	      '</div>'
	    ].join( '' ) );

	    return function ( data ) {

	      var html = template( { data: data } );
	      $log.append( $( html ) );

	      $log.scrollTop( 1e10 );

      }

    } )();

    //
    // when press the Enter key
    //
    var onEnterPress = function ( e ) {

      if( e.keyCode !== 13 ) { // !Enter key

        return;

      }

      e.preventDefault();
      playperModel.set( { 'isChatMode': !playperModel.get( 'isChatMode' ) } );

      if ( playperModel.get( 'isChatMode' ) ) {
        
        $input.focus();
        return;

      } else {

        $input.blur();

        if ( $input.val() !== '' ) {

          var data = {
            name: playperModel.get( 'name' ),
            text: $input.val(),
            position: null,
            type: 'say'
          }

          console.log( data );

          socket.emit( 'msg', data );
          $input.val( '' );

        }

      }

    }

    $( window ).on( 'keypress', onEnterPress );
    socket.on( 'msg', function( data ) { addLine( data ); } );

  } );

}




////////////////////////////////
//
// 全体まとめ
//
////////////////////////////////


$( function () {

  Promise.resolve()
  .then( flow_select )
  .then( flow_startgame )

} )



