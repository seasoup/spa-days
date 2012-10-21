/*
* spa.chat.js
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

spa.chat = (function () {
  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = {
      main_html    : String()
        + '<div class="spa-chat">'
          + '<div class="spa-chat-head">'
            + '<div class="spa-chat-head-toggle">+</div>'
            + '<div class="spa-chat-head-title">'
              + 'Chat'
            + '</div>'
          + '</div>'
          + '<div class="spa-chat-closer">x</div>'
          + '<div class="spa-chat-sizer">'
            + '<div class="spa-chat-list">'
              + '<div class="spa-chat-list-box"></div>'
            + '</div>'
            + '<div class="spa-chat-msg">'
              + '<div class="spa-chat-msg-log"></div>'
              + '<div class="spa-chat-msg-in">'
                + '<form class="spa-chat-msg-form">'
                  + '<input type="text"/>'
                  + '<input type="submit" style="display:none"/>'
                  + '<div class="spa-chat-msg-send" value="send">send</div>'
                + '</form>'
              + '</div>'
            + '</div>'
          + '</div>'
        + '</div>',

      settable_map : {
        slider_open_time    : true,
        slider_close_time   : true,
        slider_opened_em    : true,
        slider_closed_em    : true,
        slider_opened_title : true,
        slider_closed_title : true,

        cb_model        : true,
        chat_model      : true,
        people_model    : true,
        set_chat_anchor : true
      },

      slider_open_time     : 250,
      slider_close_time    : 250,
      slider_opened_em     : 18,
      slider_closed_em     : 2,
      slider_opened_title  : 'Click to close',
      slider_closed_title  : 'Click to open',
      slider_opened_min_em : 10,
      window_height_min_em : 20,

      chat_model      : null,
      people_model    : null,
      set_chat_anchor : null
    },
    stateMap  = {
      $append_target   : null,
      position_type    : 'closed',
      px_per_em        : 0,
      slider_hidden_px : 0,
      slider_closed_px : 0,
      slider_opened_px : 0
    },
    jqueryMap = {},

    setJqueryMap,  setPxSizes,   scrollChat,
    writeChat,     writeAlert,   clearChat,
    setSliderPosition,
    onClickToggle, onSubmitMsg,  onClickChatee,
    setChateeCb,   updateChatCb, listChangeCb,
    loginCb,       logoutCb,
    configModule,  initModule,
    removeSlider,  handleResize
    ;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------
  function getEmSize(el) {
    return Number(getComputedStyle(el, '').fontSize.match(/(\d.+)px/)[1]);
  }
  //-------------------- END UTILITY METHODS -------------------

  //--------------------- BEGIN DOM METHODS --------------------
  // Begin DOM method /setJqueryMap/
  setJqueryMap = function () {
    var
      $append_target = stateMap.$append_target,
      $slider        = $append_target.find( '.spa-chat' )
      ;

    jqueryMap = {
      $slider   : $slider,
      $head     : $slider.find( '.spa-chat-head' ),
      $toggle   : $slider.find( '.spa-chat-head-toggle' ),
      $title    : $slider.find( '.spa-chat-head-title' ),
      $sizer    : $slider.find( '.spa-chat-sizer' ),
      $list_box : $slider.find( '.spa-chat-list-box' ),
      $msg_log  : $slider.find( '.spa-chat-msg-log' ),
      $msg_in   : $slider.find( '.spa-chat-msg-in' ),
      $input    : $slider.find( '.spa-chat-msg-in input[type=text]'),
      $send     : $slider.find( '.spa-chat-msg-send' ),
      $form     : $slider.find( '.spa-chat-msg-form' ),
      $window   : $(window)
    };
  };
  // End DOM method /setJqueryMap/

  // Begin DOM method /setPxSizes/
  setPxSizes = function () {
    var px_per_em, window_height_em, opened_height;

    px_per_em = getEmSize(jqueryMap.$slider.get(0));
    window_height_em = Math.floor(
      ( jqueryMap.$window.height() / px_per_em ) + 0.5
    );

    opened_height = window_height_em > configMap.window_height_min_em
      ? configMap.slider_opened_em
      : configMap.slider_opened_min_em;

    stateMap.px_per_em        = px_per_em;
    stateMap.slider_closed_px = configMap.slider_closed_em * px_per_em;
    stateMap.slider_opened_px = opened_height * px_per_em;
    jqueryMap.$sizer.css({ height : stateMap.slider_opened_px });
  };
  // End DOM method /setPxSizes/

  // Begin public method /setSliderPosition/
  // Example  : spa.chat.setSliderPosition( 'closed' );
  //
  // Purpose  : Ensure the chat slider is in the requested state
  // Arguments:
  //   * position_type - may be 'closed', 'opened', or 'hidden'
  //   * callback - optional callback at completion of animation.
  //    Receives slider DOM element as argument.
  //
  // Action   :
  //   Leaves slider in current state if it matches requested,
  //   otherwise animate to requested state.
  //
  // Returns  :
  //   * true  - requested state achieved
  //   * false - requested state not achieved
  //
  // Throws   : none
  //
  setSliderPosition = function ( position_type, callback ) {
    var
      height_px, animate_time, slider_title, toggle_text;

    // position type of 'opened' is not allowed for anon user;
    // therefore we simply return false; the shell will fix the
    // uri and try again.
    if ( position_type === 'opened'
      && configMap.people_model.get_user().is_anon()
    ){ return false; }

    // return true if slider already in requested position
    if ( stateMap.position_type === position_type ){
      if ( position_type === 'opened' ) {
        jqueryMap.$input.focus();
      }
      return true;
    }

    // prepare animate parameters
    switch ( position_type ){
      case 'opened' :
        height_px    = stateMap.slider_opened_px;
        animate_time = configMap.slider_open_time;
        slider_title = configMap.slider_opened_title;
        toggle_text  = '=';
        jqueryMap.$input.focus();
      break;

      case 'hidden' :
        height_px    = 0;
        animate_time = configMap.slider_open_time;
        slider_title = '';
        toggle_text  = '+';
      break;

      case 'closed' :
        height_px    = stateMap.slider_closed_px;
        animate_time = configMap.slider_close_time;
        slider_title = configMap.slider_closed_title;
        toggle_text  = '+';
      break;

      // bail for unknown position_type
      default : return false;
    }

     // animate slider position change
    stateMap.position_type = '';
    jqueryMap.$slider.animate(
      { height : height_px },
      animate_time,
      function () {
        jqueryMap.$toggle.prop( 'title', slider_title );
        jqueryMap.$toggle.text( toggle_text );
        stateMap.position_type = position_type;
        if ( callback ) { callback( jqueryMap.$slider ); }
      }
    );
    return true;
  };
  // End public DOM method /setSliderPosition/

  // Begin private DOM methods to manage chat message
  scrollChat = function() {
    var $msg_log = jqueryMap.$msg_log;
    $msg_log.animate(
      { scrollTop : $msg_log.prop( 'scrollHeight' ) - $msg_log.height() },
      150
    );
  };

  writeChat = function ( person_name, text, is_user ) {
    var msg_class = is_user ? "spa-chat-msg-log-me" : "spa-chat-msg-log-msg";
    jqueryMap.$msg_log.append(
      '<div class="' + msg_class + '">'
      + person_name + ': ' + text + '</div>'
    );
    scrollChat();
  };

  writeAlert = function ( alert_text ) {
    jqueryMap.$msg_log.append(
      '<div class="spa-chat-msg-log-alert">' + alert_text + '</div>'
    );
    scrollChat();
  };

  clearChat = function () { jqueryMap.$msg_log.empty(); };
  // End private DOM methods to manage chat message
  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  onClickToggle = function ( event ){
    var
      set_chat_anchor = configMap.set_chat_anchor;
    if ( stateMap.position_type === 'opened' ) {
      set_chat_anchor( 'closed' );
    }
    else if ( stateMap.position_type === 'closed' ){
      set_chat_anchor( 'opened' );
    }
    return false;
  };

  onSubmitMsg = function ( event ) {
    var msg_text = jqueryMap.$input.val();
    if ( msg_text.trim() === '' ){ return false; }
    configMap.chat_model.send_msg( msg_text );
    jqueryMap.$input.focus();
    jqueryMap.$send.addClass( 'spa-x-select' );
    setTimeout(
      function (){ jqueryMap.$send.removeClass( 'spa-x-select' ); },
      250
    );
    return false;
  };

  onClickChatee = function () {
    var $this = $(this), chatee_name = $this.text();
    configMap.chat_model.set_chatee( chatee_name );
  };
  //-------------------- END EVENT HANDLERS --------------------

  //--------------------- BEGIN CALLBACKS ----------------------
  setChateeCb = function ( arg_map ){
    var
      new_chatee = arg_map.new_chatee,
      old_chatee = arg_map.old_chatee;
    jqueryMap.$input.focus();
    if ( ! new_chatee ){
      if ( old_chatee ){
        writeAlert( old_chatee.name + ' has left the chat' );
      }
      else {
        writeAlert( 'Your friend has left the chat' );
      }
      jqueryMap.$title.text( 'Chat' );
      return false;
    }

    jqueryMap.$list_box
      .find( '.spa-chat-list-name' )
      .removeClass( 'spa-x-select' )
      .end()
      .find( '[rel=' + arg_map.new_chatee.cid + ']' )
      .addClass( 'spa-x-select' );

    writeAlert( 'Now chatting with ' + arg_map.new_chatee.name );
    jqueryMap.$title.text( 'Chat with ' + arg_map.new_chatee.name );
    return true;
  };

  updateChatCb = function ( data ){
    var
      sender_name = data[ 0 ],
      msg_text    = data[ 1 ],
      user        = configMap.people_model.get_user(),
      chatee      = configMap.chat_model.get_chatee() || {},
      is_user     = false;

    jqueryMap.$input.val( '' );
    jqueryMap.$input.focus();

    is_user = sender_name === user.name;

    if ( ! ( is_user || sender_name === chatee.name ) ){
      configMap.chat_model.set_chatee( sender_name );
    }
    writeChat( sender_name, msg_text, is_user );
  };

  listChangeCb = function ( ){
    var
      list_html = String(),
      people_db = configMap.people_model.get_db(),
      chatee    = configMap.chat_model.get_chatee();

    people_db().each( function ( person, idx ){
      var select_class = '';
      if ( person.is_anon() || person.is_user() ){ return true;}
      if ( chatee && chatee.cid === person.cid ){
        select_class=' spa-x-select';
      }
      list_html
        += '<div class="spa-chat-list-name'
        +  select_class + '" rel="' + person.cid + '">'
        +  person.name + '</div>';
    });

    if ( ! list_html ) {
      list_html = String()
        + '<div class="spa-chat-list-note">'
          + 'To chat alone is the fate of all great souls...<br><br>'
          + 'No one is online'
        + '</div>';
    }
    jqueryMap.$list_box.html( list_html );
  };

  loginCb  = function (){
    configMap.set_chat_anchor( 'opened' );
  };

  logoutCb = function (){
    configMap.set_chat_anchor( 'closed' );
    jqueryMap.$title.text( 'Chat' );
  };

  //---------------------- END CALLBACKS -----------------------

  //------------------- BEGIN PUBLIC METHODS -------------------
  // Begin public method /configModule/
  //
  // Example  : spa.chat.configModule({...});
  //
  // Purpose  : Configure the module prior to initialization,
  //   typically with values we do not expect to change during
  //   a user session.
  //
  // Arguments:
  //   * slider_* settings.  All these are are optional scalars.
  //       See mapConfig.mapSettable for a full list.
  //       Example: slider_open_em is the open height in em's.
  //   * set_chat_anchor - A callback used by spa.chat to update
  //       the URI anchor.  Must accept a single string argument
  //       with the value 'opened' or 'closed', and return true
  //       when able to update the URI anchor and false when unable.
  //   * person_user - an object model for the browser user
  //       Expected to provide the following:
  //         ** getPersonName() - returns string
  //         ** getPersonId()   - returns integer
  //         ** isUser()        - boolean, true
  //         ** isAnon()        - boolean, true if user anonymous
  //   * chat_model - an object model for chat communication.
  //       Expected to provide the following:
  //         ** getPersonChat() - return person object of chat guest
  //         ** sendMsg(string) - Send specified message
  //
  // Action   :
  //   The internal configuration data structure (configMap) is updated
  //   with provided arguments.  No other actions are taken.
  //
  // Returns  : none
  //
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
  //
  // Example    : spa.chat.initModule( $( 'spa' ) );
  //
  // Purpose    :
  //   Directs the module to begin offering its feature to the user.
  //
  // Arguments  :
  //   * $append_target - the jquery DOM element where we
  //     will append the slider div
  //
  // Action     :
  //   Appends a slider div to the provided container and fills
  //   it with the chat HTML content.  It then initializes elements,
  //   events, and handlers to provide the user with a chat-room
  //   interface.
  //
  // Returns    : true on success
  //
  // Throws     : none
  //
  initModule = function ( $append_target ) {
    var name;

    stateMap.$append_target = $append_target;

    $append_target.append( configMap.main_html );
    setJqueryMap();
    setPxSizes();

    // initialize chat slider to default title and state
    jqueryMap.$toggle.prop( 'title', configMap.slider_closed_title );
    jqueryMap.$head.click( onClickToggle );
    stateMap.position_type = 'closed';

    // configure model callbacks
    configMap.cb_model.add( 'setchatee',  setChateeCb  );
    configMap.cb_model.add( 'updatechat', updateChatCb );
    configMap.cb_model.add( 'listchange', listChangeCb );
    configMap.cb_model.add( 'login',      loginCb      );
    configMap.cb_model.add( 'logout',     logoutCb     );

    // bind actions
    jqueryMap.$list_box.on( 'click', '.spa-chat-list-name', onClickChatee);
    jqueryMap.$form.submit( onSubmitMsg );
    jqueryMap.$send.click(  onSubmitMsg );


    return true;
  };
  // End public method /initModule/

  // Begin public method /removeSlider/
  // Purpose    :
  //   * Removes chatSlider DOM element
  //   * Reverts to initial state
  //   * Removes pointers to callbacks and other data
  // Arguments  : none
  // Returns    : true
  // Throws     : none
  //
  removeSlider = function () {
    // unwind initialization and state
    // remove DOM container; this removes event bindings too
    if ( jqueryMap.$slider ) {
      jqueryMap.$slider.remove();
      jqueryMap = {};
    }
    stateMap.$append_target = null;
    stateMap.position_type  = 'closed';

    // unwind key configurations
    configMap.chat_model      = null;
    configMap.people_model    = null;
    configMap.set_chat_anchor = null;

    return true;
  };
  // End public method /removeSlider/

  // Begin public method /handleResize/
  // Purpose    :
  //   Given a window resize event, adjust the presentation
  //   provided by this module if needed
  // Arguments  :
  //   * window_width  - the new window width
  //   * window_height - then new window height
  // Actions    :
  //   If the window height or width falls below
  //   a given threshold, resize the chat slider for the
  //   reduced window size.
  // Returns    : true
  // Throws     : none
  //
  handleResize = function () {
    // don't do anything if we don't have a slider container
    if ( ! jqueryMap.$slider ) { return false; }
    setPxSizes();
    if ( stateMap.position_type === 'opened' ){
      jqueryMap.$slider.css({ height : stateMap.slider_opened_px });
    }
    return true;
  };
  // End public method /handleResize/

  // return public methods
  return {
    setSliderPosition : setSliderPosition,
    configModule      : configModule,
    initModule        : initModule,
    removeSlider      : removeSlider,
    handleResize      : handleResize
  };
  //------------------- END PUBLIC METHODS ---------------------
}());

