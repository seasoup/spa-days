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
    makeSio, getSio, initModule
    ;

  makeSio = function (){
    var emit, initModule, my_name, on, socket;

    socket = io.connect( 'http://localhost:3000/chat' );

    emit = function ( namespace, data ) {
      socket.emit( namespace, data );
    };
    
    on = function ( namespace, callback ) {
      socket.on( namespace, function ( ){
        callback( arguments );
      });
    };

    return {
      emit      : emit,
      on        : on,
      socket    : socket
    };
  };

  getSio = function (){
    if ( ! stateMap.io ) {
      stateMap.sio = makeSio;
    }
    return stateMap.sio;
  };

  initModule = function (){};

  return {
    getSio      : getSio,
    initModule : initModule
  };
}());

