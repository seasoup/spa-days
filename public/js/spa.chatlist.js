/*
* spa.chatlist.js
 * Chat feature module for SPA
 *
 * Michael S. Mikowski - mike.mikowski@gmail.com
 * Copyright (c) 2011-2012 Manning Publications Co.
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global $, spa, getComputedStyle */

spa.chatlist = (function () {
  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = {
      main_html    : String()
        + '<div class="spa-chatlist">'
          + '<div class="spa-chatlist-head">'
            + '<div class="spa-chatlist-head-toggle">'
              + '<img src="/images/head.gif">'
            + '</div>'
            + '<div class="spa-chatlist-head-title">'
              + 'Chatlist'
            + '</div>'
          + '</div>'
          + '<div class="spa-chatlist-closer">x</div>'
          + '<div class="spa-chatlist-people">'
            + '<div class="spa-chatlist-names"></div>'
          + '</div>'
        + '</div>',

      settable_map : {
        set_chat_anchor : true
      },

      set_chat_anchor : null
    },
    stateMap  = { sio : null },
    jqueryMap = {},
    personList = [],

    announceUserLeft, configModule, initModule, me, onBeforeunload,
    onNameClick, redrawPersonList, setJqueryMap, update, // saveMe,
    socketOnUserChange
    ;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------
//  saveMe = function ( callback ) {
//    $.ajax({
//      url: '/users/create',
//      type: 'post',
//      data: {
//        name: spa.chatlist.me
//      },
//      success: callback
//    });
//  };

  //-------------------- END UTILITY METHODS -------------------

  //--------------------- BEGIN DOM METHODS --------------------
  // Begin DOM method /setJqueryMap/
  setJqueryMap = function () {
    var
      $append_target = stateMap.$append_target,
      $slider        = $append_target.find( '.spa-chatlist' )
      ;

    jqueryMap = {
      $slider : $slider,
      $head   : $slider.find( '.spa-chatlist-head' ),
      $names  : $slider.find( '.spa-chatlist-names' )
    };

  };
  // End DOM method /setJqueryMap/

  update = function ( newPersonList ) {
    personList = newPersonList;
    redrawPersonList();
  };

  redrawPersonList = function () {
    var listHtml='',
      a, alphabetical_sort;

    alphabetical_sort = function ( a, b ) {
      var first = a.toLowerCase(),
          last  = b.toLowerCase();
      return first < last ? -1 : 1;
    };

    personList.sort( alphabetical_sort );

    for ( a = 0; a < personList.length; a++ ) {
      listHtml += String()
        + '<div class="spa-chatlist-name">'
          + personList[ a ]
        + '</div>';
    }
    if ( personList.length === 0 ) {
      listHtml = String()
        + 'To chat alone is the fate of all great souls<br><br>'
        + 'No one is online';
    }
    jqueryMap.$names.html( listHtml );
  };
  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  socketOnUserChange = function ( response ) {
    var a, people_list = [];
    for ( a = 0; a < response[0].length; a++ ) {
      if (response[ 0 ][ a ].name ) {
        people_list.push( response[0][ a ].name );
      }
    }
    people_list.splice( people_list.indexOf( spa.chatlist.me ), 1 ); // remove 'me'
    spa.chatlist.update( people_list );
  };

  announceUserLeft = function ( name_list ) {
    spa.chat.comment( name_list[ 0 ] + ' has left the building.' );
  };

  onNameClick = function () {
    var set_chat_anchor = configMap.set_chat_anchor,
      chatee = $(this).text();
    spa.chat.clear();
    set_chat_anchor( 'opened' );
    spa.chat.setSliderPosition( 'opened' ); // set focus in text input
    spa.chat.setChatee( chatee );
    spa.chat.comment( 'You are chatting with ' + chatee + '.');
  };

  onBeforeunload = function () {
    stateMap.sio.emit( 'leavechat', spa.chatlist.me );
  };
  //-------------------- END EVENT HANDLERS --------------------

  //------------------- BEGIN PUBLIC METHODS -------------------
  configModule = function ( input_map ) {
    spa.util.setConfigMap({
      input_map    : input_map,
      settable_map : configMap.settable_map,
      config_map   : configMap
    });
    return true;
  };

  initModule = function ( $append_target, sio ) {
    stateMap.$append_target = $append_target;
    stateMap.sio = sio;

    $append_target.append( configMap.main_html );
    setJqueryMap();

    stateMap.sio.on( 'userchange', socketOnUserChange );
    stateMap.sio.on( 'userleft',   announceUserLeft );

    spa.chatlist.me = prompt( "What's your name?" );

    spa.data.createUser(
      spa.chatlist.me,
      function ( response ) { console.log( response );
    });

    spa.chat.setMe( spa.chatlist.me );
    stateMap.sio.emit( 'adduser',  spa.chatlist.me );

    jqueryMap.$names.on( 'click', '.spa-chatlist-name', onNameClick);
    $( window ).bind( 'beforeunload', onBeforeunload );

    return true;
  };

  // return public methods
  return {
    configModule      : configModule,
    initModule        : initModule,
    update            : update,
    me                : me
  };
  //------------------- END PUBLIC METHODS ---------------------
}());
