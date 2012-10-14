/*
 *   spa.data.js
 *   data module
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global $, spa, io */

spa.data = (function (){
  var
    stateMap = { sio : null },
    makeSio, getSio, clearSio, initModule
    ;

  makeSio = function (){
    var emit, on, socket;

    socket = io.connect( 'http://localhost:3000/chat' );
    return {
      emit : function ( namespace, data ) {
        socket.emit( namespace, data );
      },
      on : function ( namespace, callback ) {
        socket.on( namespace, function (){
          callback( arguments );
        });
      }
    };
  };

  getSio = function (){
    if ( ! stateMap.sio ) {
      stateMap.sio = makeSio();
    }
    return stateMap.sio;
  };

  clearSio = function (){
    if ( stateMap.sio ){
      stateMap.sio.disconnect();
      stateMap.sio = null;
      return true;
    }
    return false;
  };

  initModule = function (){};

  return {
    getSio     : getSio,
    clearSio   : clearSio,
    initModule : initModule
  };
}());

// Example create user crud call
//   createUser = function ( name, callback ) {
//     $.ajax({
//       url  : '/users/create',
//       type : 'post',
//       data : { name : name },
//       success : callback
//     });
//   };


