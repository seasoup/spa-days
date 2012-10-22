/*
* spa.avtr.js
 * Nav feature module for SPA
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

spa.avtr = (function () {
  "use strict";
  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = {
      avtr_model   : null,
      cb_model     : null,
      chat_model   : null,
      people_model : null,

      settable_map : {
        cb_model     : true,
        chat_model   : true,
        people_model : true
      }
    },

    stateMap  = {
      drag_map     : null,
      $drag_target : null,
      px_per_em    : 0
    },

    jqueryMap = {},

    getRandRgb,
    setJqueryMap,
    updateAvatar,
    onClickNav,       onDragstartNav,
    onDragNav,        onDragendNav,
    setChateeCb,      listChangeCb,
    loginCb,          logoutCb,
    configModule,     initModule;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------
  getRandRgb = function (){
    var i, rgb_list = [];
    for ( i = 0; i < 3; i++ ){
      rgb_list.push( Math.floor( Math.random() * 128 ) + 128 );
    }
    return 'rgb(' + rgb_list.join(',') + ')';
  };
  //--------------------- BEGIN DOM METHODS --------------------
  // Begin DOM method /setJqueryMap/
  setJqueryMap = function ( $container ) {
    jqueryMap = { $container : $container };
  };
  // End DOM method /setJqueryMap/

  updateAvatar = function ( $target ){
    var css_map, person_id;

    css_map = {
      top  : parseInt( $target.css( 'top' ), 10 ),
      left : parseInt( $target.css( 'left' ), 10 ),
      'background-color' : $target.css('background-color')
    };
    person_id = $target.attr( 'rel' );

    configMap.chat_model.update_avatar({
      person_id : person_id, css_map : css_map
    });
  };
  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  onClickNav = function ( event ){
    var  css_map, $target = $(event.target);
    if ( ! $target.hasClass( 'spa-avtr-box') ){ return false; }
    $target.css({ 'background-color' : getRandRgb() });
    updateAvatar( $target );
  };

  onDragstartNav = function ( event, drag_event ){
    var offset_target_map, offset_nav_map,
      $target = $(event.target);

    if ( ! $target.hasClass('spa-avtr-box') ){ return false; }

    stateMap.$drag_target = $target;
    offset_target_map = $target.offset();
    offset_nav_map    = jqueryMap.$container.offset();

    offset_target_map.top  -= offset_nav_map.top;
    offset_target_map.left -= offset_nav_map.left;

    stateMap.drag_map = offset_target_map;

    $target.addClass('spa-x-is-drag');
  };

  onDragNav = function ( event, drag_event ){
    var drag_map = stateMap.drag_map;
    stateMap.$drag_target.css({
      top  : drag_map.top  + drag_event.deltaY,
      left : drag_map.left + drag_event.deltaX
    });
  };

  onDragendNav = function ( event, drag_event ) {
    var $drag_target = stateMap.$drag_target;

    updateAvatar( $drag_target );
    stateMap.$drag_target = null;
    stateMap.drag_map     = null;

    $drag_target.removeClass('spa-x-is-drag');
  };
  //-------------------- END EVENT HANDLERS --------------------

  //--------------------- BEGIN CALLBACKS ----------------------
  setChateeCb = function ( arg_map ) {
    var new_chatee = arg_map.new_chatee,
      old_chatee = arg_map.old_chatee;

    // Use this to highlight avatar of user in nav area
    // See new_chatee.name, old_chatee.name, etc.

    // remove highlight from old_chatee avatar here
    if ( old_chatee ){
      jqueryMap.$container
        .find( '.spa-avtr-box[rel=' + old_chatee.cid + ']' )
        .removeClass( 'spa-x-is-chatee' );
    }

    // add highlight to new_chatee avatar here
    if ( new_chatee ){
      jqueryMap.$container
        .find( '.spa-avtr-box[rel=' + new_chatee.cid + ']' )
        .addClass('spa-x-is-chatee');
    }
  };

  listChangeCb = function (){
    var
      people_db = configMap.people_model.get_db(),
      user      = configMap.people_model.get_user(),
      chatee    = configMap.chat_model.get_chatee() || {},
      $nav      = jqueryMap.$container,
      $box
      ;

    $nav.empty();
    // if the user is logged out, do not render
    if ( user.is_anon() ){ return false;}

    people_db().each( function ( person, idx ){
      var class_list;
      if ( person.is_anon() ){ return true; }
      class_list = [ 'spa-avtr-box' ];

      if ( person.id === chatee.id ){
        class_list.push( 'spa-x-is-chatee' );
      }
      if ( person.is_user() ){
        class_list.push( 'spa-x-is-user');
      }

      $box = $('<div/>')
        .addClass( class_list.join(' '))
        .css( person.css_map )
        .attr( 'rel', String( person.id ) )
        .prop( 'title', spa.util_b.encodeHtml( person.name ))
        .text( person.name )
        .appendTo( $nav )
        ;
    });
  };

  loginCb  = function (){};

  logoutCb = function (){
    jqueryMap.$container.empty();
  };

  //---------------------- END CALLBACKS -----------------------

  //------------------- BEGIN PUBLIC METHODS -------------------
  // Begin public method /configModule/
  // Example  : spa.chat.configModule({...});
  // Purpose  : Configure the module prior to initialization,
  //   values we do not expect to change during a user session.
  // Action   :
  //   The internal configuration data structure (configMap) is updated
  //   with provided arguments.  No other actions are taken.
  // Returns  : none
  // Throws   : JavaScript error object and stack trace on
  //            unacceptable or missing arguments
  //
  configModule = function ( input_map ) {
    spa.util.setConfigMap({
      input_map    : input_map,
      settable_map : configMap.settable_map,
      config_map   : configMap
    });
    return true;
  };
  // End public method /configModule/

  // Begin public method /initModule/
  // Example    : spa.avtr.initModule( $container );
  // Purpose    : Directs the module to begin offering its feature
  // Arguments  : $container - container to use
  // Action     : Provides avatar interface for chat users
  // Returns    : none
  // Throws     : none
  //
  initModule = function ( $container ) {
    setJqueryMap( $container );

    // configure model callbacks
    configMap.cb_model.add( 'setchatee',  setChateeCb  );
    configMap.cb_model.add( 'listchange', listChangeCb );
    configMap.cb_model.add( 'login',      loginCb      );
    configMap.cb_model.add( 'logout',     logoutCb     );

    // bind actions
    jqueryMap.$container
      .on( 'click',     '.spa-avtr-box', onClickNav )
      .on( 'dragstart', onDragstartNav )
      .on( 'drag',      onDragNav )
      .on( 'dragend',   onDragendNav )
      ;

    return true;
  };
  // End public method /initModule/

  // return public methods
  return {
    configModule : configModule,
    initModule   : initModule
  };
  //------------------- END PUBLIC METHODS ---------------------
}());

