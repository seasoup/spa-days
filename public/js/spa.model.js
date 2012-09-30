/*
 *   spa.model.js
 *   business logic model
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global TAFFY, $, spa */

spa.model = (function (){
  var
    configMap = { anon_id : 0 },
    stateMap = {
      user           : null,
      people_db      : TAFFY(),
      people_cid_map : {}, // TODO use taffy here
      people_id_map  : {}, // TODO use taffy here
      anon_user      : null,
      cid_serial     : 0
    },

    personProto,makeCid, people, chat,
    initModule
    ;

  personProto = {
    is_user : function (){ return this.cid === stateMap.user.cid; },
    is_anon : function (){ return this.cid === configMap.anon_id; }
  };

  makeCid = function () { return 'c' + String(stateMap.cid_serial++); };

  people = {
    getPeopleDb : function (){ return stateMap.people_db; },
    getPersonByCid : function ( cid ){
      return stateMap.people_cid_map[ cid ];
    },
    getUser : function (){ return stateMap.user; },

    make_person : function ( arg_map ){
      var person,
        cid  = arg_map.cid,
        id   = arg_map.id,
        uname = arg_map.uname;

      if ( ! cid || ! uname ){ throw 'client id and name required'; }

      person      = Object.create( personProto );
      person.cid  = cid;
      person.name = uname;

      stateMap.people_cid_map[ cid ] = person;
      if ( id ){
        person.id = id;
        stateMap.people_id_map[ id ] = person;
      }

      stateMap.people_db.insert( person );
      return person;
    },

    create_user : function ( uname ){
      stateMap.user = this.make_person({
        uname : uname,
        cid   : makeCid()
      });

      spa.data.createUser(
        uname,
        function ( response ){
          stateMap.user.id  = response[0]._id;
          stateMap.people_id_map[ stateMap.user.id ] = stateMap.user;
        }
      );

      return stateMap.user;
    },

    removePerson : function ( person ){
      if ( ! person ){ return false; }
      // can't remove anonymous user
      if ( person.id === configMap.anon_id ){
        return false;
      }

      stateMap.people_db({ cid : person.cid }).remove();
      delete stateMap.people_cid_map[ person.cid ];
      if ( person.id ){
        delete stateMap.people_cid_map[ person.id ];
      }
      return true;
    },

    removeUser : function (){
      var is_removed, user = stateMap.user;
      is_removed = this.removePerson( user );
      if ( ! is_removed ){ return is_removed; }
      stateMap.user = stateMap.anon_user;
      return true;
    }
  };

  chat = (function (){
    var clear_callback_map, on_userchange, on_userleft,
      sio, chatee, callback_map, process_event
      ;

    clear_callback_map = function (){
      callback_map = {
        'userchange' : [ on_userchange ],
        'userleft'   : [ on_userleft ],
        'updatechat' : []
      };
    };
    clear_callback_map();

    on_userchange = function( response ){
      var i, id, cid, make_map;

      for ( i = 0; i < response[0].length; i++ ) {
        if (response[ 0 ][ i ].name ) {
          id  = response[ 0 ]._id;
          make_map = { uname : response[ 0 ][ i ] };

          if ( id ){
            make_map.id  = id;
            make_map.cid = id;
          }
          else {
            make_map.cid = makeCid();
          }
          people.make_person(make_map);
        }
      }
    };

    on_userleft = function ( response ){
      console.warn( 'on_userleft', response);
      return true;
    };

    process_event = function ( event ){
      console.warn( 'process_event', event );
      // we get the event type here and then
      // loop through and execute all the callbacks with event data
      // as the argument. We might consider cleaning up some of the
      // event data before passing it back to the callbacks.
      // not sure if the names are right, but like so:

       var i, callback,
         event_type = event.type || '',
         callback_list = callback_map[ event_type ];

      if ( ! callback_list ){ throw 'invalid event_type'; }

       for ( i = 0; i < callback_list.length; i++ ){
         callback_list[i]( event );
       }
    };

    return {
      join  : function (){
        if ( stateMap.user.is_anon() ){
          console.warn( 'User must be defined before joining chat');
          return false;
        }

        sio = spa.data.getSio();
        sio.emit( 'adduser', stateMap.user.name);

        sio.on( 'userchange', process_event );
        sio.on( 'userleft',   process_event );
        sio.on( 'updatechat', process_event );
      },

      set_chatee : function ( chatee_id, chatee_name ){
        chatee = people.make_person({
          uname : chatee_name,
          cid   : makeCid()
        });
      },

      leave : function (){
        console.warn( sio, stateMap.user, stateMap.user.is_anon() );
        if ( sio ){
          if ( ! stateMap.user.is_anon() ){
            sio.emit( 'leavechat', stateMap.user.name );
          }
          spa.data.clearSio();
          // clear_callback_map(); // this may not be needed?
        }
      },

      send : function ( msg_text ){
        if ( stateMap.user && chatee ){
          // TODO adjust these names to chatee_id, user_id, msg_text
          sio.emit( 'chat', {
            chatee  : chatee.name,
            user    : stateMap.user.name,
            message : msg_text
          });
        }
      },

      add_callback : function ( event_type, callback ){
        var i, callback_list = callback_map [ event_type ];

        if ( ! callback_list ){ throw 'invalid event_type'; }

        for ( i = 0; i < callback_list.length; i++ ){
          if ( callback_list[i] === callback ){
            return false;
          }
        }
        callback_list.push( callback );
        return true;
      },

      remove_callback : function ( event_type, callback ){
        var i, new_list = [],
          callback_list = callback_map [ event_type ];

        if ( ! callback_list ){ throw 'invalid event_type'; }

        for ( i = 0; i < callback_list.length; i++ ){
          if ( callback_list[i] === callback ){ continue; }
          new_list.push( callback_list[i] );
        }
        callback_map[ event_type ] = new_list;
        return true;
      },

      clear_callback_type : function ( event_type ){
        var callback_list = callback_map[ event_type ];
        if ( ! callback_list ){ throw 'invalid event_type'; }
        callback_map[ event_type ] = [];
      }
    };
  }());

  initModule = function (){
    stateMap.anon_user = people.make_person({
      uname : 'anonymous',
      cid   : makeCid(),
      id    : stateMap.anon_id
    });
  };

  return {
    people     : people,
    chat       : chat,
    initModule : initModule
  };
}());

