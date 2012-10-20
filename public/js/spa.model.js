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

    personProto, makeCid, people, chat, callBack,
    initModule
    ;

  personProto = {
    is_user : function (){ return this.cid === stateMap.user.cid; },
    is_anon : function (){ return this.cid === stateMap.anon_user.cid; }
  };

  makeCid = function () { return 'c' + String(stateMap.cid_serial++); };

  callBack = (function (){
    var
      add_cb, clear_cb_map, clear_cb_type, debug_cb_map,
      execute_cb, set_baseline_cb_map, remove_cb,
      baseline_cb_map = {}, callback_map = {};


    add_cb = function ( event_name, callback ){
      var i, callback_list = callback_map [ event_name ];
      if ( ! callback_list ){ throw 'invalid event_name:' + event_name; }

      for ( i = 0; i < callback_list.length; i++ ){
        if ( callback_list[i] === callback ){
          return false;
        }
      }
      callback_list.push( callback );
      return true;
    };

    clear_cb_map = function (){
      callback_map = {};
      var key;
      for ( key in baseline_cb_map ){
        if ( baseline_cb_map.hasOwnProperty( key ) ){
          callback_map[ key ] = baseline_cb_map[key].slice(0);
        }
      }
    };

    clear_cb_type = function ( event_name ){
      var callback_list = callback_map[ event_name ];
      if ( ! callback_list ){ throw 'invalid event_name: ' + event_name; }
      callback_map[ event_name ] = [];
    };

    debug_cb_map = function (){ console.log( callback_map ); };

    execute_cb = function ( event_name, data ){
    // We execute all the callbacks associated for the provided
    // event_name in order using data as the callback argument.
      var i, callback,
        callback_list = callback_map[ event_name ];

      if ( ! callback_list ){ throw 'invalid event_name: ' + event_name; }

      for ( i = 0; i < callback_list.length; i++ ){
        callback = callback_list[ i ];
        callback( data );
      }
    };

    set_baseline_cb_map = function ( baseline_map ){
      baseline_cb_map = baseline_map;
    };

    remove_cb = function ( event_name, callback ){
      var i, new_list = [],
        callback_list = callback_map [ event_name ];

      if ( ! callback_list ){ throw 'invalid event_name: ' + event_name; }

      for ( i = 0; i < callback_list.length; i++ ){
        if ( callback_list[i] === callback ){ continue; }
        new_list.push( callback_list[ i ] );
      }
      callback_map[ event_name ] = new_list;
      return true;
    };

    return {
      add              : add_cb,
      clear_map        : clear_cb_map,
      clear_type       : clear_cb_type,
      debug_map        : debug_cb_map,
      execute          : execute_cb,
      set_baseline_map : set_baseline_cb_map,
      remove           : remove_cb
    };

  }());

  people = (function (){
    var
      clear_db, get_cid_person, get_db, get_user,
      make_person, make_user, remove_person, remove_user;

    clear_db = function (){
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
    };

    get_cid_person = function ( cid ){
      return stateMap.people_cid_map[ cid ];
    };

    get_db = function (){ return stateMap.people_db; };

    get_user = function (){ return stateMap.user; };

    make_person = function ( arg_map ){
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
    };

    make_user = function ( name ){
      var sio = spa.data.getSio();
      stateMap.user = make_person({
        name : name,
        cid  : makeCid()
      });
      sio.emit( 'adduser', name );
      callBack.execute( 'login', stateMap.user );
    };

    remove_person = function ( person ){
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
    };

    remove_user = function (){
      var is_removed, user = stateMap.user;
      callBack.execute( 'logout', user );
      is_removed = remove_person( user );
      if ( ! is_removed ){ return is_removed; }
      stateMap.user = stateMap.anon_user;
      return true;
    };

    return {
      clear_db       : clear_db,
      get_cid_person : get_cid_person,
      get_db         : get_db,
      get_user       : get_user,
      make_person    : make_person,
      make_user      : make_user,
      remove_person  : remove_person,
      remove_user    : remove_user
    };
  }());

  chat = (function (){
    var
      chatee,

      execute_listchange_cb, execute_updatechat_cb,
      execute_disconnect_cb,

      get_chatee, join_chat, leave_chat, send_msg,
      set_chatee, update_list
      ;


    execute_listchange_cb = function ( data ){
      callBack.execute( 'listchange', data );
    };
    execute_updatechat_cb = function ( data ){
      callBack.execute( 'updatechat', data );
    };
    execute_disconnect_cb =  function ( data ){
      callBack.execute( 'disconnect', data );
    };

    get_chatee = function (){ return chatee; };

    join_chat  = function (){
      var sio;
      if ( stateMap.user.is_anon() ){
        console.warn( 'User must be defined before joining chat');
        return false;
      }

      sio = spa.data.getSio();
      sio.on( 'listchange', execute_listchange_cb );
      sio.on( 'updatechat', execute_updatechat_cb );
      sio.on( 'disconnect', execute_disconnect_cb );
    };

    leave_chat = function (){
      var sio = spa.data.getSio();
      if ( sio ){
        sio.emit( 'leavechat' );
      }
      // spa.data.clearSio();
    };

    send_msg = function ( msg_text ){
      var sio = spa.data.getSio();

      if ( ! sio ){ return false; }

      if ( stateMap.user && chatee ){
        sio.emit( 'updatechat', {
          chatee  : chatee.name,
          user    : stateMap.user.name,
          message : msg_text
        });

        callBack.execute(
          'updatechat',
          [ stateMap.user.name, msg_text ]
        );
      }
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
      callBack.execute(
        'setchatee',
        { old_chatee : chatee, new_chatee : new_chatee }
      );
      chatee = new_chatee;
      return true;
    };

    update_list = function( data ){
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

    return {
      get_chatee  : get_chatee,
      join        : join_chat,
      leave       : leave_chat,
      send_msg    : send_msg,
      set_chatee  : set_chatee,
      update_list : update_list
    };
  }());


  initModule = function (){
    callBack.set_baseline_map({
      listchange : [ chat.update_list ],
      login      : [ chat.join ],
      logout     : [ chat.leave ],
      disconnect : [ chat.leave ],
      setchatee  : [],
      updateavtr : [],
      updatechat : []
    });
    callBack.clear_map();

    stateMap.anon_user = people.make_person({
      name  : 'anonymous',
      cid   : makeCid(),
      id    : stateMap.anon_id
    });
    stateMap.user = stateMap.anon_user;
  };

  return {
    initModule : initModule,
    callBack   : callBack,
    chat       : chat,
    people     : people
  };
}());

