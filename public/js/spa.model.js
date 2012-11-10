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
  "use strict";
  var
    configMap = { anon_id : 0 },
    stateMap = {
      user           : null,
      people_db      : TAFFY(),
      people_cid_map : {},
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
      trigger_cb, set_baseline_cb_map, remove_cb,
      baseline_cb_map = {}, callback_map = {};


    add_cb = function ( cb_name, callback ){
      var i, callback_list = callback_map [ cb_name ];
      if ( ! callback_list ){ throw 'invalid cb_name:' + cb_name; }

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
      var cb_name;
      for ( cb_name in baseline_cb_map ){
        if ( baseline_cb_map.hasOwnProperty( cb_name ) ){
          callback_map[ cb_name ]
            = baseline_cb_map[ cb_name ].slice( 0 );
        }
      }
    };

    clear_cb_type = function ( cb_name ){
      var callback_list = callback_map[ cb_name ];
      if ( ! callback_list ){ throw 'invalid cb_name: ' + cb_name; }
      callback_map[ cb_name ] = baseline_cb_map[ cb_name ].slice( 0 );
    };

    debug_cb_map = function (){ console.log( callback_map ); };

    // Execute all the callbacks associated for the provided
    // cb_name in order using data as the callback argument.
    //
    trigger_cb = function ( cb_name, data ){
      var i, callback,
        callback_list = callback_map[ cb_name ];

      if ( ! callback_list ){ throw 'invalid cb_name: ' + cb_name; }

      for ( i = 0; i < callback_list.length; i++ ){
        callback = callback_list[ i ];
        callback( data );
      }
    };

    set_baseline_cb_map = function ( baseline_map ){
      baseline_cb_map = baseline_map;
    };

    remove_cb = function ( cb_name, callback ){
      var i, new_list = [],
        callback_list = callback_map [ cb_name ];

      if ( ! callback_list ){ throw 'invalid cb_name: ' + cb_name; }

      for ( i = 0; i < callback_list.length; i++ ){
        if ( callback_list[i] === callback ){ continue; }
        new_list.push( callback_list[ i ] );
      }
      callback_map[ cb_name ] = new_list;
      return true;
    };

    return {
      add              : add_cb,
      clear_map        : clear_cb_map,
      clear_type       : clear_cb_type,
      debug_map        : debug_cb_map,
      trigger          : trigger_cb,
      set_baseline_map : set_baseline_cb_map,
      remove           : remove_cb
    };
  }());

  people = (function () {
    var
      clear_db, get_by_cid, get_db, get_user, complete_signin,
      make_person, make_user, remove_person, remove_user;

    clear_db = function (){
      var user = stateMap.user;
      stateMap.people_db      = TAFFY();
      stateMap.people_cid_map = {};
      if ( user ){
        stateMap.people_db.insert( user );
        stateMap.people_cid_map[ user.cid ] = user;
      }
    };

    complete_signin = function ( user_list ){
      var user_map = user_list[ 0 ];
      delete stateMap.people_cid_map[ user_map.cid ];
      stateMap.user.cid     = user_map._id;
      stateMap.user.id      = user_map._id;
      stateMap.user.css_map = user_map.css_map;
      stateMap.people_cid_map[ user_map._id ] = stateMap.user;
      callBack.trigger( 'login', stateMap.user );
    };

    get_by_cid = function ( cid ){
      return stateMap.people_cid_map[ cid ];
    };

    get_db = function (){ return stateMap.people_db; };

    get_user = function (){ return stateMap.user; };

    make_person = function ( arg_map ){
      var person,
        cid     = arg_map.cid,
        css_map = arg_map.css_map,
        id      = arg_map.id,
        name    = arg_map.name;

      if ( ! cid || ! name ){ throw 'client id and name required'; }

      person         = Object.create( personProto );
      person.cid     = cid;
      person.name    = name;
      person.css_map = css_map;
      if ( id ){ person.id = id; }

      stateMap.people_cid_map[ cid ] = person;

      stateMap.people_db.insert( person );
      return person;
    };

    make_user = function ( name ){
      var sio = spa.data.getSio();
      stateMap.user = make_person({
        cid     : makeCid(),
        css_map : { top : 25, left : 25, 'background-color' : '#8f8' },
        name    : name
      });
      sio.emit( 'adduser', {
        cid     : stateMap.user.cid,
        css_map : stateMap.user.css_map,
        name    : stateMap.user.name
      });
      sio.on( 'userupdate', complete_signin );
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
      callBack.trigger( 'logout', user );
      is_removed = remove_person( user );
      if ( ! is_removed ){ return is_removed; }
      stateMap.user = stateMap.anon_user;
      return true;
    };

    return {
      clear_db       : clear_db,
      get_by_cid     : get_by_cid,
      get_db         : get_db,
      get_user       : get_user,
      make_person    : make_person,
      make_user      : make_user,
      remove_person  : remove_person,
      remove_user    : remove_user
    };
  }());

  chat = (function () {
    var
      chatee,

      trigger_listchange_cb, trigger_updatechat_cb,
      trigger_disconnect_cb,

      get_chatee, join_chat, leave_chat, send_msg,
      set_chatee, update_avatar, update_list
      ;

    update_list = function( arg_list ){
      var i, person_map, make_person_map,
        person_list      = arg_list[ 0 ],
        is_chatee_online = false;

      people.clear_db();

      PERSON:
      for ( i = 0; i < person_list.length; i++ ) {
        person_map = person_list[ i ];

        if ( ! person_map.name ) { continue PERSON; }

        // skip browser user but update css_map
        if ( stateMap.user && stateMap.user.id === person_map._id ){
          stateMap.user.css_map = person_map.css_map;
          continue PERSON;
        }

        make_person_map = {
          cid     : person_map._id,
          id      : person_map._id,
          name    : person_map.name,
          css_map : person_map.css_map
        };

        if ( chatee && chatee.id === make_person_map.id ){
          is_chatee_online = true;
        }
        people.make_person( make_person_map );
      }

      stateMap.people_db.sort( 'name' );

      // If chatee is no longer online, we unset the chatee
      // which triggers the 'spa-setchatee' global event
      if ( chatee && ! is_chatee_online ){ set_chatee(''); }
    };

    trigger_listchange_cb = function ( arg_list ){
      update_list( arg_list );
      $.event.trigger( 'spa-listchange', arg_list );
    };
    trigger_updatechat_cb = function ( arg_list ){
      callBack.trigger( 'updatechat', arg_list );
    };
    trigger_disconnect_cb =  function ( arg_list ){
      callBack.trigger( 'disconnect', arg_list );
    };

    get_chatee = function (){ return chatee; };

    join_chat  = function () {
      var sio;
      if ( stateMap.user.is_anon() ){
        console.warn( 'User must be defined before joining chat');
        return false;
      }

      sio = spa.data.getSio();
      sio.on( 'listchange', trigger_listchange_cb );
      sio.on( 'updatechat', trigger_updatechat_cb );
      sio.on( 'disconnect', trigger_disconnect_cb );
    };

    leave_chat = function (){
      var sio = spa.data.getSio();
      if ( sio ){
        sio.emit( 'leavechat' );
      }
      // spa.data.clearSio(); //?
    };

    send_msg = function ( msg_text ){
      var msg_map,
        sio = spa.data.getSio();

      if ( ! sio ){ return false; }
      if ( ! ( stateMap.user && chatee ) ){
        return false;
      }

      msg_map = {
        dest_id   : chatee.id,
        dest_name : chatee.name,
        sender_id : stateMap.user.id,
        msg_text  : msg_text
      };

      // the callback is triggered so we can show our outgoing messages
      trigger_updatechat_cb( [ msg_map] );
      sio.emit( 'updatechat', msg_map );
    };

    set_chatee = function ( chatee_id ){
      var new_chatee;
      new_chatee  = stateMap.people_cid_map[ chatee_id ];
      if ( new_chatee ){
        if ( chatee && chatee.id === new_chatee.id ){
          return false;
        }
      }
      else {
        new_chatee = null;
      }
      $.event.trigger( 'spa-setchatee',
        { old_chatee : chatee, new_chatee : new_chatee }
      );
      chatee = new_chatee;
      return true;
    };

    update_avatar = function ( arg_map ){
      var sio = spa.data.getSio();
      if ( sio ){
        sio.emit( 'updateavatar', arg_map );
      }
    };

    return {
      get_chatee    : get_chatee,
      join          : join_chat,
      leave         : leave_chat,
      send_msg      : send_msg,
      set_chatee    : set_chatee,
      update_avatar : update_avatar,
      update_list   : update_list
    };
  }());


  initModule = function (){
    callBack.set_baseline_map({
      disconnect : [ chat.leave ],
      login      : [ chat.join ],
      logout     : [ chat.leave ],
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

