var socket = require( 'socket.io' ),
    crud   = require( './crud.js' );

module.exports = {
  connect: function ( app, crud ) {
    var io = socket.listen( app ),
      chatters = {},
      chatter_list = [];

    io
      .of( '/chat' )
      .on( 'connection', function ( socket ) {

        socket.on( 'chat', function ( data ) {
          if ( chatters[ data.chatee ] ) {
            chatters[ data.chatee ].emit( 'updatechat', data.user, data.message);
          } else {
            socket.emit( 'updatechat', 'SPA', data.user + " is offline.");
          }
        });

        socket.on( 'adduser', function ( name ) {
          var find_map = { 'name' : name };

          crud.read( 'user', find_map, function ( result, foo ) {
            var user;
            
            if ( result && result.length > 0 ) {
              user = result[ 0 ];
              socket.username = user.name;
              chatters[ user.name ] = socket;
              emit_user_list( socket );
            } else {
              crud.create( 'user', { 'name' : name }, function ( result ) {
                user = result[ 0 ];
                socket.username = user.name;
                chatters[ user.name ] = socket;
                emit_user_list();
              });
            }
          });
        });

        function emit_user_list () {
          crud.read( 'user', {}, function ( result ) {
            socket.broadcast.emit( 'userchange', result );
            socket.emit( 'userchange', result );
          });
        }

        socket.on( 'leavechat', function ( name ) {
          crud.delete( 'user', { 'name': name }, function ( result ) {
            emit_user_list();
          });
        });
    });
  }
};