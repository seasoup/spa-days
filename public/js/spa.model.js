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

    make_user : function ( uname ){
      var sio = spa.data.getSio();
      stateMap.user = this.make_person({
        uname : uname,
        cid   : makeCid()
      });

      sio.emit( 'adduser', uname );
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
    var clear_callback_map, on_userchange,
      sio, chatee, callback_map, process_event,
      process_event_userchange, process_event_updatechat;

    on_userchange = function( response ){
      var i, id, make_map;

      people.clear_db();

      for ( i = 0; i < response[0].length; i++ ) {
        if (response[ 0 ][ i ].name ) {
          id  = response[ 0 ][ i ]._id;
          make_map = { uname : response[ 0 ][ i ].name };

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
      stateMap.people_db.sort('name');
    };

    clear_callback_map = function (){
      callback_map = {
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
      // if we just call startChat, it will comment you are now chatting with yourself
      // if ( response[ 0 ] !== my name ) { spa.chat.startChat( response[ 0 ] );
      process_event( 'updatechat', response );
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
        if ( stateMap.user.is_anon() ){
          console.warn( 'User must be defined before joining chat');
          return false;
        }

        sio = spa.data.getSio();
        sio.on( 'userchange', process_event_userchange );
        sio.on( 'updatechat', process_event_updatechat );
      },

      set_chatee : function ( chatee_name ){
        var people_db, chatee_list, new_chatee;
        if ( ! chatee_name ){ return false; }

        people_db = people.get_db();
        chatee_list = people_db({ name : chatee_name }).get();
        if ( chatee_list.length > 0 ){
          new_chatee = chatee_list[ 0 ];
          if ( chatee && chatee.name === new_chatee.name ){
            return false;
          }
          chatee = new_chatee;
          process_event( 'setchatee', chatee );
          return true;
        }
      },

      get_chatee : function (){ return chatee; },

      send_msg : function ( msg_text ){
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

      leave : function (){
        if ( sio ){
          sio.emit( 'leavechat', stateMap.user.name );
          spa.data.clearSio();
        }
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

