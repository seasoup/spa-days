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

    // TODO: there must be a way to abstract this!
    socket = io.connect( 'http://192.168.1.4:3000/chat' );
    socket = io.connect( // 'http://localhost:3000/chat' );
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

