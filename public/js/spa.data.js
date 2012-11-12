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
    makeSio, getSio, initModule
    ;

  makeSio = function (){
    var socket;

    socket = io.connect( '/chat' );

    return {
      socket : socket,
      emit   : function ( event, data ) {
        socket.emit( event, data );
      },
      on     : function ( event, callback ) {
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

  initModule = function (){};

  return {
    getSio     : getSio,
    initModule : initModule
  };
}());

