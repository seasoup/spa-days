spa.socket = (function () {
  var emit, initModule, my_name, on, socket;
  
  emit = function ( namespace, emit ) {
    socket.emit( namespace, emit );
  };
  
  initModule = function () {
    socket = io.connect( 'http://localhost:3000/chat' );
  };
  
  on = function ( namespace, callback ) {
    socket.on( namespace, function ( ) {
      callback( arguments );
    });
  };
  
  return {
    emit      : emit,
    initModule: initModule,
    on        : on,
    socket    : socket
  };
})();