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
        chat_model      : true,
        people_model    : true,
        set_chat_anchor : true
      },

      set_chat_anchor : null
    },
    stateMap  = {
      chat_model   : null,
      people_model : null
    },
    jqueryMap = {},

    configModule, initModule, onClickName,
    setJqueryMap, onUserchange
    ;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------
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
  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  onUserchange = function ( response ){
    var name_list = [],
      list_html   = String(),
      people_db   = configMap.people_model.get_db(),
      user        = configMap.people_model.get_user(),
      i;

    people_db().each( function ( person, idx ){
      if ( person.is_anon() || person.name === user.name ){ return true;}
      list_html
        += '<div class="spa-chatlist-name">'
          + person.name
        + '</div>';
    });

    if ( list_html === '' ) {
      list_html = String()
        + 'To chat alone is the fate of all great souls...<br><br>'
        + 'No one is online';
    }
    jqueryMap.$names.html( list_html );
  };

  onClickName = function () {
    var chatee_name = $(this).text();
    configMap.chat_model.set_chatee( chatee_name );
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

  initModule = function ( $append_target ) {
    var uname;
    stateMap.$append_target = $append_target;

    $append_target.append( configMap.main_html );
    setJqueryMap();

    uname = prompt( "What's your name?" );

    configMap.chat_model.add_callback( 'userchange', onUserchange );
    configMap.people_model.make_user( uname );
    configMap.chat_model.join();
    jqueryMap.$names.on( 'click', '.spa-chatlist-name', onClickName);

    return true;
  };

  // return public methods
  return {
    configModule      : configModule,
    initModule        : initModule
  };
  //------------------- END PUBLIC METHODS ---------------------
}());
