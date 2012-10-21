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
        { },
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

    sign_on = function ( user_id, socket ) {
      crud.update(
        'users',
        { '_id' : user_id },
        { is_online : true },
        function () { emit_user_list( socket ); }
      );
    };

    sign_off = function ( user_id, socket ) {
      crud.update(
        'users',
        { '_id' : user_id },
        { is_online : false },
        function () { emit_user_list( socket ); }
      );
    };

    io
      .of( '/chat' )
      .on( 'connection', function ( socket ) {

        socket.on( 'updatechat', function ( arg_map ) {
          var
            dest_id    = arg_map.dest_id,
            dest_name  = arg_map.dest_name,
            sender_id  = arg_map.sender_id,
            msg_text   = arg_map.msg_text,
            response_map;

          response_map = {
            dest_name : dest_name,
            sender_id : sender_id
          };

          if ( chatter_map[ dest_id ] ) {
            response_map.dest_id   = dest_id;
            response_map.msg_text  = msg_text;
            chatter_map[ arg_map.dest_id ]
              .emit( 'updatechat', response_map );
          }
          else {
            response_map.msg_text = dest_name + ' is offline.';
            socket.emit( 'updatechat', response_map );
          }
        });

        socket.on( 'adduser', function ( user_map ) {
          var cid;
          crud.read(
            'users',
            { name: user_map.name },
            { },
            function ( result_list ) {
              var result_map;

              if ( result_list && result_list.length > 0 ) {
                result_map = result_list[ 0 ];
                socket.user_id = result_map._id;
                chatter_map[ result_map._id ] = socket;
                socket.emit( 'userupdate', result_map );
                sign_on( result_map._id, socket );
                console.warn( 'existing user: ', result_map );
              }
              else {
                cid = user_map.cid;
                delete user_map.cid;
                user_map.is_online = true;

                crud.make(
                  'users',
                  user_map,
                  function ( result_list ) {
                    result_map = result_list[ 0 ];
                    if ( cid ) { result_map.cid = cid; }
                    socket.user_id = result_map._id;
                    chatter_map[ result_map._id ] = socket;
                    socket.emit( 'userupdate', result_map );
                    emit_user_list( socket );
                    // debug - console.warn( 'new user: ', result_map );
                  }
                );
              }
            }
          );
        });

        socket.on( 'updateavtr', function ( arg_map ) {
          console.warn( 'updateavtr' , arg_map);
          crud.update(
            'users',
            { '_id'   : crud.ObjectID( arg_map.person_id ) },
            { css_map : arg_map.css_map },
            function () { emit_user_list( socket ); }
          );
        });

        socket.on( 'leavechat', function ( leave_text ) {
          if ( socket.user_id ) {
            sign_off( socket.user_id, socket );
            delete chatter_map[ socket.user_id ];
            emit_user_list( socket );
            // socket.disconnect() //?
          }
        });

        socket.on( 'disconnect', function ( leave_text ) {
          if ( socket.user_id ) {
            sign_off( socket.user_id, socket );
            delete chatter_map[ socket.user_id ];
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
          // console.log( 'socket.user_id:', socket.user_id );
          /* /DEBUG */

        });
    });
  }
};
