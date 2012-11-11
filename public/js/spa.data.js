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
  "use strict";
  var
    stateMap = { sio : null },
    makeSio, getSio, clearSio, initModule
    ;

  makeSio = function (){
    var emit, on, socket;

    socket = io.connect( '/chat' );
    return {
      emit : function ( event, data ) {
        socket.emit( event, data );
      },
      on : function ( event, callback ) {
        socket.on( event, function (){
          callback( arguments );
        });
      }
    };
  };

  getSio = function (){
    if ( ! stateMap.sio ) { stateMap.sio = makeSio(); }
    return stateMap.sio;
  };

  clearSio = function (){
    if ( stateMap.sio ){
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

