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
    get_db : function (){ return stateMap.people_db; },
    get_cid_person : function ( cid ){
      return stateMap.people_cid_map[ cid ];
    },
    get_user : function (){ return stateMap.user; },

    clear_db : function (){
      var user = stateMap.user;
      stateMap.people_db      = TAFFY();
      stateMap.people_cid_map = {};
      stateMap.people_id_map  = {};
      if ( user ){
        stateMap.people_db.insert( user );
        stateMap.people_cid_map[ user.cid ] = user;
        if ( user.id ){
          stateMap.people_id_map[ user.id ] = user;
        }
      }
    },

    make_person : function ( arg_map ){
      var person,
        cid   = arg_map.cid,
        id    = arg_map.id,
        name  = arg_map.name;

      if ( ! cid || ! name ){ throw 'client id and name required'; }

      person      = Object.create( personProto );
      person.cid  = cid;
      person.name = name;

      stateMap.people_cid_map[ cid ] = person;
      if ( id ){
        person.id = id;
        stateMap.people_id_map[ id ] = person;
      }

      stateMap.people_db.insert( person );
      return person;
    },

    make_user : function ( name ){
      var sio = spa.data.getSio();
      stateMap.user = this.make_person({
        name   : name,
        cid    : makeCid()
      });

      sio.emit( 'adduser', name );
    },

    remove_person : function ( person ){
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

    remove_user : function (){
      var is_removed, user = stateMap.user;
      is_removed = this.remove_person( user );
      if ( ! is_removed ){ return is_removed; }
      stateMap.user = stateMap.anon_user;
      return true;
    }
  };

  chat = (function (){
    var chatee, set_chatee, leave_chat,
      on_userchange, on_disconnect, clear_callback_map,
      callback_map, process_event,
      process_event_userchange, process_event_updatechat,
      process_event_disconnect;

    set_chatee = function ( chatee_name ){
      var people_db, chatee_list, new_chatee;
      people_db = people.get_db();
      chatee_list = people_db({ name : chatee_name || '' }).get();
      if ( chatee_list.length > 0 ){
        new_chatee = chatee_list[ 0 ];
        if ( chatee && chatee.name === new_chatee.name ){
          return false;
        }
        chatee = new_chatee;
      }
      else {
        chatee = null;
      }
      process_event( 'setchatee', chatee );
      return true;
    };

    leave_chat = function (){
      var sio = spa.data.getSio();
      if ( sio ){ sio.emit('disconnect'); }
      // sio.emit( 'leavechat', stateMap.user.name );
    };

    on_userchange = function( response ){
      var i, id, person_map, name, is_chatee_online = false;

      people.clear_db();

      for ( i = 0; i < response[0].length; i++ ) {
        if (response[ 0 ][ i ].name ) {
          id   = response[ 0 ][ i ]._id;
          name = response[ 0 ][ i ].name;
          person_map = { name : name };

          if ( id ){
            person_map.id  = id;
            person_map.cid = id;
          }
          else {
            person_map.cid = makeCid();
          }
          people.make_person( person_map );
          if ( chatee && chatee.name === name ){
            is_chatee_online = true;
          }
        }
      }
      stateMap.people_db.sort( 'name' );
      // if chatee is no longer online, we unset the chatee
      // and trigger a set_chatee event
      if ( chatee && ! is_chatee_online ){
        set_chatee('');
      }
    };

    on_disconnect = function ( data ){
      console.warn( 'disconnecting ...' );
      leave_chat();
    };

    clear_callback_map = function (){
      callback_map = {
        'disconnect' : [ on_disconnect ],
        'setchatee'  : [],
        'updatechat' : [],
        'userchange' : [ on_userchange ]
      };
    };

    clear_callback_map();

    process_event = function ( event_type, response ){
    // console.warn( event_type, response );
    // we get the event type here and then
    // loop through and execute all the callbacks with event data
    // as the argument. We might consider cleaning up some of the
    // response data before passing it back to the callbacks.
      var i, callback,
        callback_list = callback_map[ event_type ];

      if ( ! callback_list ){ throw 'invalid event_type: ' + event_type; }

       for ( i = 0; i < callback_list.length; i++ ){
         callback = callback_list[i];
         callback( response );
       }
    };

    process_event_userchange = function ( response ){
      process_event( 'userchange', response );
    };
    process_event_updatechat = function ( response ){
      // TODO 2012-10-06 mmikowski - the following comments from Josh are
      // a really bad idea as it breaks our calling convention:
      // "  if we just call startChat, it will comment you are now chatting with yourself
      //    if ( response[ 0 ] !== my name ) { spa.chat.startChat( response[ 0 ] );
      // "
      process_event( 'updatechat', response );
    };
    process_event_disconnect =  function ( response ){
      process_event( 'disconnect', response );
    };

    return {
      add_callback : function ( event_type, callback ){
        var i, callback_list = callback_map [ event_type ];
        if ( ! callback_list ){ throw 'invalid event_type' + event_type; }

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
          new_list.push( callback_list[ i ] );
        }
        callback_map[ event_type ] = new_list;
        return true;
      },

      clear_callback_type : function ( event_type ){
        var callback_list = callback_map[ event_type ];
        if ( ! callback_list ){ throw 'invalid event_type'; }
        callback_map[ event_type ] = [];
      },

      debug_callbacks : function (){
        console.log( callback_map );
      },

      join  : function (){
        var sio;
        if ( stateMap.user.is_anon() ){
          console.warn( 'User must be defined before joining chat');
          return false;
        }

        sio = spa.data.getSio();
        sio.on( 'userchange', process_event_userchange );
        sio.on( 'updatechat', process_event_updatechat );
        sio.on( 'disconnect', process_event_disconnect );
      },

      set_chatee : set_chatee,

      get_chatee : function (){ return chatee; },

      send_msg : function ( msg_text ){
        var sio = spa.data.getSio();

        if ( ! sio ){ return false; }

        if ( stateMap.user && chatee ){
          sio.emit( 'updatechat', {
            chatee  : chatee.name,
            user    : stateMap.user.name,
            message : msg_text
          });

          process_event( 'updatechat', [
            stateMap.user.name,
            msg_text
          ]);
        }
      },

      leave : leave_chat
    };
  }());

  initModule = function (){
    stateMap.anon_user = people.make_person({
      name  : 'anonymous',
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

