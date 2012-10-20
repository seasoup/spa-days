/*jslint         node    : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global require, process, module */

var
  socket = require( 'socket.io' ),
  crud   = require( './crud.js' );

module.exports = {
  connect : function ( app, crud ) {
    var io = socket.listen( app ),
      chatter_map = {},
      emit_user_list, sign_on, sign_off;

    // For some reason, socket.io blacklists 'disconnect'
    // because it is apparently open to spoofing, but then
    // so is everything else.  Enabling it gives us excellent
    // disconnection response and uses the built-in heartbeat
    // capability.
    //
    io.set( 'blacklist' , [] );

    emit_user_list = function ( socket ) {
      if ( ! socket ) { return false; }
      crud.read(
        'users',
        { is_online : true },
        function ( result_list ) {
          socket.broadcast.emit( 'listchange', result_list );
          socket.emit( 'listchange', result_list );
        }
      );
    };

    // Future referenece:
    // In Socket.IO 0.7+ we have a clients method on the namespaces,
    // which returns a array of all connected sockets.  API for a namespace:
    // var client_list = io.of('/chat').clients(); // all clients
    // var red_list    = io.of('/chat').clients('red'); // all clients from room 'red'
    // See http://stackoverflow.com/questions/6563885

    sign_on = function ( name ) {
      crud.update(
        'users',
        { 'name' : name },
        { is_online: true },
        function () {
          emit_user_list();
        }
      );
    };

    sign_off = function ( name ) {
      crud.update(
        'users',
        { 'name' : name },
        { is_online: false },
        function () { emit_user_list(); }
      );
    };

    io
      .of( '/chat' )
      .on( 'connection', function ( socket ) {

        socket.on( 'updatechat', function ( data ) {
          if ( chatter_map[ data.chatee ] ) {
            chatter_map[ data.chatee ]
              .emit( 'updatechat', data.user, data.message);
          }
          else {
            socket.emit( 'updatechat', 'SPA', data.user + ' is offline.');
          }
        });

        socket.on( 'adduser', function ( name ) {
          crud.read(
            'users',
            { 'name' : name },
            function ( result_list, foo ) {
              var user;

              if ( result_list && result_list.length > 0 ){
                user = result_list[ 0 ];
                socket.username = user.name;
                chatter_map[ user.name ] = socket;
                emit_user_list( socket );
                sign_on( user.name );
              }
              else {
                crud.make(
                  'users',
                  { 'name' : name },
                  function ( result_list ) {
                    user = result_list[ 0 ];
                    socket.username = user.name;
                    chatter_map[ user.name ] = socket;
                    emit_user_list( socket );
                    sign_on( user.name );
                  }
                );
              }
            }
          );
        });

        socket.on( 'leavechat', function ( leave_text ){
          if ( socket.username ){
            sign_off( socket.username );
            delete chatter_map[ socket.username ];
            emit_user_list( socket );
            // socket.disconnect() //?
          }
        });

        socket.on( 'disconnect', function ( leave_text ){
          if ( socket.username ){
            sign_off( socket.username );
            delete chatter_map[ socket.username ];
            emit_user_list( socket );
            // socket.disconnect() //?
          }

          /* DEBUG */
          // console.log( 'leave_text: ', leave_text );
          // console.log( 'socket.manager.settings.blacklist: ',
          //   socket.manager.settings.blacklist
          // );
          // console.log( 'sockets: ', io.sockets.sockets );
          // console.log( 'socket.id:', socket.id );
          // console.log( 'socket.username:', socket.username );
          /* /DEBUG */

        });
    });

    io.of( '/avtr' ).on( 'connection', function ( socket ) {
      socket.on( 'move', function ( data ){
        crud.update(
          'users',
          { 'name'   : data.name },
          { coord_map: data.coord_map },
          function () {
            socket.broadcast.emit( 'coordchange', {
              name      : data.name,
              coord_map : data.coord_map
            });
          }
        );
      });
    });
  }
};
