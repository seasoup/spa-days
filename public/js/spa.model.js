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
      people_cid_map : {},
      people_id_map  : {},
      anon_user      : null,
      cid_serial     : 0
    },

    personProto,makeCid, people, chat,
    initModule
    ;

  personProto = {
    is_user : function (){ return this.cid === stateMap.user.cid; },
    is_anon : function (){ return this.cid === stateMap.anon_user.cid; }
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
        name : name,
        cid  : makeCid()
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
    var
      process_event,
      process_event_listchange, process_event_updatechat,
      process_event_disconnect,

      chatee, set_chatee, leave_chat,
      on_listchange, clear_callback_map,
      callback_map;

    process_event = function ( event_type, data ){
      // We execute all the callbacks associated for the provided
      // event_type in order using data as the callback argument.
      var i, callback,
        callback_list = callback_map[ event_type ];

      if ( ! callback_list ){ throw 'invalid event_type: ' + event_type; }

      for ( i = 0; i < callback_list.length; i++ ){
        callback = callback_list[ i ];
        callback( data );
      }
    };

    process_event_listchange = function ( data ){
      process_event( 'listchange', data );
    };
    process_event_updatechat = function ( data ){
      process_event( 'updatechat', data );
    };
    process_event_disconnect =  function ( data ){
      process_event( 'disconnect', data );
    };

    set_chatee = function ( chatee_name ){
      var people_db, chatee_list, new_chatee;
      people_db = people.get_db();
      chatee_list = people_db({ name : chatee_name || '' }).get();
      if ( chatee_list.length > 0 ){
        new_chatee = chatee_list[ 0 ];
        if ( chatee && chatee.name === new_chatee.name ){
          return false;
        }
      }
      else {
        new_chatee = null;
      }
      process_event(
        'setchatee',
        { old_chatee : chatee, new_chatee : new_chatee }
      );
      chatee = new_chatee;
      return true;
    };

    leave_chat = function (){
      var sio = spa.data.getSio();
      if ( sio ){ sio.emit('disconnet'); }
      spa.data.clearSio();
    };

    on_listchange = function( data ){
      var i, id, person_map, name, is_chatee_online = false;

      people.clear_db();

      for ( i = 0; i < data[0].length; i++ ) {
        if ( data[ 0 ][ i ].name ) {
          id   = data[ 0 ][ i ]._id;
          name = data[ 0 ][ i ].name;
          person_map = { name : name };

          // skip creating user because we already got one
          if ( stateMap.user && stateMap.user.name === name ){ continue; }
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
      if ( chatee && ! is_chatee_online ){ set_chatee(''); }
    };

    // on_disconnect = function ( data ){ leave_chat(); };
    clear_callback_map = function (){
      callback_map = {
        // 'disconnect' : [ on_disconnect ],
        'disconnect' : [ leave_chat ],
        'setchatee'  : [],
        'updatechat' : [],
        'listchange' : [ on_listchange ]
      };
    };

    clear_callback_map();

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

      join : function (){
        var sio;
        if ( stateMap.user.is_anon() ){
          console.warn( 'User must be defined before joining chat');
          return false;
        }

        sio = spa.data.getSio();
        sio.on( 'listchange', process_event_listchange );
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

          process_event(
            'updatechat',
            [ stateMap.user.name, msg_text ]
          );
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
    stateMap.user = stateMap.anon_user;
  };

  return {
    initModule : initModule,
    people     : people,
    chat       : chat
  };
}());

