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

    personProto, makeCid, people, chat, initModule;

  personProto = {
    is_user : function (){ return this.cid === stateMap.user.cid; },
    is_anon : function (){ return this.cid === stateMap.anon_user.cid; }
  };

  makeCid = function () { return 'c' + String( stateMap.cid_serial++ ); };

  people = (function () {
    var
      clear_db, get_by_cid, get_db, get_user, complete_login,
      make_person, login, remove_person, logout;

    clear_db = function (){
      var user = stateMap.user;
      stateMap.people_db      = TAFFY();
      stateMap.people_cid_map = {};
      if ( user ){
        stateMap.people_db.insert( user );
        stateMap.people_cid_map[ user.cid ] = user;
      }
    };

    complete_login = function ( user_list ){
      var user_map = user_list[ 0 ];
      delete stateMap.people_cid_map[ user_map.cid ];
      stateMap.user.cid     = user_map._id;
      stateMap.user.id      = user_map._id;
      stateMap.user.css_map = user_map.css_map;
      stateMap.people_cid_map[ user_map._id ] = stateMap.user;
      chat.join();
      $.event.trigger( 'spa-login', [ stateMap.user ] );
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

    login = function ( name ){
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
      sio.on( 'userupdate', complete_login );
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

    logout = function (){
      var is_removed, user = stateMap.user;
      chat._leave();

      is_removed    = remove_person( user );
      stateMap.user = stateMap.anon_user;

      $.event.trigger( 'spa-logout', [ user ] );
      spa.data.clearSio();
      return is_removed;
    };

    return {
      clear_db       : clear_db,
      get_by_cid     : get_by_cid,
      get_db         : get_db,
      get_user       : get_user,
      make_person    : make_person,
      remove_person  : remove_person,
      login          : login,
      logout         : logout
    };
  }());

  chat = (function () {
    var
      chatee,

      trigger_listchange, trigger_updatechat,
      trigger_disconnect,

      get_chatee, join_chat, _leave_chat, send_msg,
      set_chatee, update_avatar, update_list;

    update_list = function( arg_list ){
      var i, person_map, make_person_map,
        person_list      = arg_list[ 0 ],
        is_chatee_online = false;

      people.clear_db();

      PERSON:
      for ( i = 0; i < person_list.length; i++ ) {
        person_map = person_list[ i ];

        if ( ! person_map.name ) { continue PERSON; }

        // if user, update css_map and skip remainder
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

    get_chatee = function (){ return chatee; };

    _leave_chat = function (){
      var sio = spa.data.getSio();
      if ( sio ){
        sio.emit( 'leavechat' );
      }
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

      // we triggered updatechat so we can show our outgoing messages
      trigger_updatechat( [ msg_map ] );
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

    trigger_listchange = function ( arg_list ){
      update_list( arg_list );
      $.event.trigger( 'spa-listchange', [ arg_list ] );
    };

    trigger_updatechat = function ( arg_list ){
      var msg_map = arg_list[ 0 ];
      $.event.trigger( 'spa-updatechat', [ msg_map ] );
    };

//    trigger_disconnect = function ( arg_list ){
//      spa.data.clearSio();
//    };

    join_chat  = function () {
      var sio;
      if ( stateMap.user.is_anon() ){
        console.warn( 'User must be defined before joining chat');
        return false;
      }

      sio = spa.data.getSio();
      sio.on( 'listchange', trigger_listchange );
      sio.on( 'updatechat', trigger_updatechat );
//      sio.on( 'disconnect', trigger_disconnect );
    };

    return {
      get_chatee    : get_chatee,
      join          : join_chat,
      _leave        : _leave_chat,
      send_msg      : send_msg,
      set_chatee    : set_chatee,
      update_avatar : update_avatar,
      update_list   : update_list
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
    chat       : chat,
    people     : people
  };
}());

