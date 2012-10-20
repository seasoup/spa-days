/*
* spa.avtr.js
 * Avatar feature module for SPA
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
  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = {
      block_html   : '<div class="spa-avtr-"></div>',
      avtr_model   : null,
      cb_model     : null,
      chat_model   : null,
      people_model : null,

      settable_map : {
        avtr_model   : true,
        cb_model     : true,
        chat_model   : true,
        people_model : true
      }
    },

    stateMap  = {
      $container : null,
      px_per_em  : 0
    },

    jqueryMap = {},

    setJqueryMap,     setPxSizes,     onClickAvatar,
    onDragstartAvatar, onDragAvatar,  onDragendAvatar,
    setChateeCb,      updateAvatarCb, listChangeCb,
    loginCb,          logoutCb,
    configModule,     initModule;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------
  function getEmSize(el) {
    return Number(getComputedStyle(el, '').fontSize.match(/(\d.+)px/)[1]);
  }
  //-------------------- END UTILITY METHODS -------------------

  //--------------------- BEGIN DOM METHODS --------------------
  // Begin DOM method /setJqueryMap/
  setJqueryMap = function ( $container ) {
    jqueryMap = { $container : $container };
  };
  // End DOM method /setJqueryMap/

  // Begin DOM method /setPxSizes/
  setPxSizes = function ( $container ) {
    var px_per_em, window_height_em, opened_height;

    px_per_em = getEmSize(jqueryMap.$container.get(0));
    stateMap.px_per_em = px_per_em;
  };
  // End DOM method /setPxSizes/

  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  onDragstartAvatar = function ( event ){
    return false;
  };

  onDragAvatar = function ( event ){
    return false;
  };

  onDragendAvatar = function ( event ) {
    configMap.avatar_model.sendCoord({ x: 25, y: 15 });
    return false;
  };
  //-------------------- END EVENT HANDLERS --------------------

  //--------------------- BEGIN CALLBACKS ----------------------
  setChateeCb = function ( arg_map ) {
    var
      new_chatee = arg_map.new_chatee,
      old_chatee = arg_map.old_chatee;

    // Use this to highlight avatar of user in nav area
    // See new_chatee.name, old_chatee.name, etc.

    // remove highlight from old_chatee avatar here
    if ( old_chatee ){
      jqueryMap.$container
        .find('.spa-avtr-avatar')
        .find('[rel=' + old_chatee.cid + ']')
        .removeClass('spa-x-hilite');
    }

    // add highlight to new_chatee avatar here
    if ( new_chatee ){
      jqueryMap.$container
        .find('.spa-avtr-avatar')
        .find('[rel=' + new_chatee.cid + ']')
        .removeClass('spa-x-hilite');
    }
  };

  // TODO use namespace '/avatar'
  // Actions: updateavtr,
  // { person_id : '...', person_name : '...', css_map : { top : 25, left : 0 } };
  updateAvatarCb = function ( update_map ) {
    var
      person,
      person_name = update_map.person_name,
      person_id   = update_map.person_id,
      coord_map   = update_map.coord_map,
      user        = configMap.people_model.get_user(),
      chatee      = configMap.chat_model.get_chatee() || {},
      is_user     = false;

    person = configMap.people_model.getById( person_id );

    is_user = person_name === user.name;

    if ( is_user ){ return false; }

    jqueryMap.$container
      .find('.spa-avtr-avatar')
      .find('[rel=' + person.cid + ']')
      .css( update_map.css_map )
      ;

  };

  listChangeCb = function (){
    var
      people_db = configMap.people_model.get_db(),
      chatee    = configMap.chat_model.get_chatee();

    //people_db().each( function (person, idx ){
    //  // Only add or subtract avatars here; their position should be
    //  // updated in the updateAvatarCb updated above
    //  if ( person.is_anon() || person.is_user() ){ return true;}
    //  if ( chatee && chatee.cid === person.cid ){
    //    select_class=' spa-x-select';
    //  }
    //  list_html
    //    += '<div class="spa-chat-list-name'
    //    +  select_class + '" rel="' + person.cid + '">'
    //    +  person.name + '</div>';
    //});
  };

  loginCb  = function (){
    // add my avatar
    // draw avatars for all users?
  };
  logoutCb = function (){
    // remove my avatar
    // clear all avatars?
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
    setPxSizes( $container );

    // configure model callbacks
    configMap.cb_model.add( 'setchatee',  setChateeCb  );
    // similar to 'updatechat'
    configMap.cb_model.add( 'updateavtr', updateAvatarCb );
    // similar to 'listchange'
    configMap.cb_model.add( 'listchange', listChangeCb );
    configMap.cb_model.add( 'login',      loginCb      );
    configMap.cb_model.add( 'logout',     logoutCb     );

    // bind actions
    jqueryMap.$container
      .on( 'click',     '.spa-avtr-block', onClickAvatar )
      .on( 'dragstart', '.spa-avtr-block', onDragstartAvatar )
      .on( 'drag',      '.spa-avtr-block', onDragAvatar )
      .on( 'dragend',   '.spa-avtr-block', onDragendAvatar )
      ;

    return true;
  };
  // End public method /initModule/

  // return public methods
  return {
    configModule      : configModule,
    initModule        : initModule
  };
  //------------------- END PUBLIC METHODS ---------------------
}());

