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

/*global $, spa */

spa.model = (function (){
  var
    configMap = { id_anon : 0 },
    stateMap = {
      user         : null,
      user_map_cid : [], // TODO use taffy here
      user_map_id  : [], // TODO use taffy here
      anon_user    : null,
      cid_serial   : 0
    },

    makeCid, people, chat,
    initModule
    ;

  makeCid = function () { return 'c' + String(stateMap.cid++); };

  people = {
    makePerson : function ( arg_map ){
      var person,
        cid  = arg_map.cid,
        id   = arg_map.id,
        name = arg_map.name;

      if ( ! cid || ! name ){ throw 'client id and name required'; }

      person = {
        cid  : arg_map.cid,
        id   : arg_map.id,
        name : arg_map.name,
        is_user : function (){ return cid === stateMap.user.cid; },
        is_anon : function (){ return cid === configMap.id_anon; }
      };

      stateMap.user_map_cid[cid] = person; // TODO use taffy here
      stateMap.user_map_id[id]   = person; // TODO use taffy here
    },

    createUser : function ( uname ){
      stateMap.user = this.makePerson({
        uname : uname,
        cid   : makeCid()
      });
      spa.data.createUser(
        uname,
        function ( response ){
          stateMap.user.id  = response._id;
        }
      );
    },

    getUser : function (){ return stateMap.user; },

    clearUser : function (){
      stateMap.user = stateMap.anon_user;
      return true;
    }
  };

  chat = (function (){
    var sio, chatee, callback_map, clear_callback_map, process_event;

    clear_callback_map = function (){
      callback_map = {
        'userchange' : [],
        'userleft'   : [],
        'updatechat' : []
      };
    };
    clear_callback_map();

    process_event = function ( event ){
      console.warn( event );
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
        chatee = people.makePerson( chatee_name );
      },

      leave : function (){
        if ( sio ){
          if ( ! stateMap.user.is_anon ){
            sio.emit( 'leavechat', stateMap.user.name );
          }
          spa.data.clearSio();
          clear_callback_map();
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
    stateMap.anon_user = people.makePerson( {
      uname : 'anonymous',
      cid   : makeCid(),
      id    : stateMap.id_anon
    });
  };

  return {
    people     : people,
    chat       : chat,
    initModule : initModule
  };
}());

