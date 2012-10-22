/*
 * spa.util.js
 * General JavaScript utilities
 *
 * Michael S. Mikowski - mmikowski@gmail.com
 * These are routines I have created, compiled, and updated
 * since 1998, with inspiration from around the web.
 *
 * MIT License
 *
*/

/*jslint         browser : true,  continue : true,
 devel  : true,  indent  : 2,     maxerr   : 50,
 newcap : true,  nomen   : true,  plusplus : true,
 regexp : true,  sloppy  : true,  vars     : false,
 white  : true
 */

/*global $, spa */

spa.util = (function () {
  var
    checkMatchVal, removeListVal, pushUniqVal, makeListPlus,
    makeError, setConfigMap;

  // Begin utiltity /makeListPlus/
  // Returns an array with much desired methods:
  //   * remove_val(value) : remove element that matches
  //     the provided value. Returns number of elements
  //     removed.
  //   * match_val(value)  : shows if a value exists
  //   * push_uniq(value)  : pushes a value onto the stack
  //     iff it does not already exist there
  // Note: the reason I need this is to compare objects to
  //   objects (perhaps jQuery has something similar?)
  checkMatchVal = function ( data ){
    var match_count = 0, idx;
    for ( idx = this.length; idx; 0 ){
      if ( this[--idx] === data ){ match_count++; }
    }
    return match_count;
  };
  removeListVal = function ( data ){
    var removed_count = 0, idx;
    for ( idx = this.length; idx; 0 ){
      if ( this[--idx] === data ){
        this.splice(idx, 1);
        removed_count++;
        idx++;
      }
    }
    return removed_count;
  };
  pushUniqVal = function ( data ){
    if ( checkMatchVal.call(this, data ) ){ return false; }
    this.push( data );
    return true;
  };
  // primary utility
  makeListPlus = function ( input_list ){
    if ( input_list && $.isArray(input_list) ){
      if ( input_list.remove_val ){
        console.warn('The array appears to already have listPlus capabilities');
        return input_list;
      }
    }
    else {
      input_list = [];
    }
    input_list.remove_val = removeListVal;
    input_list.match_val  = checkMatchVal;
    input_list.push_uniq  = pushUniqVal;

    return input_list;
  };
  // End utility /makeListPlus/

  // Begin Public constructor /makeError/
  // Purpose: a convenience wrapper to create an error object
  // Arguments:
  //   * name_text - the error name
  //   * msg_text  - long error message
  //   * data      - optional data attached to error object
  // Returns  : newly constructed error object
  // Throws   : none
  //
  makeError = function ( name_text, msg_text, data ) {
    var error     = new Error();
    error.name    = name_text;
    error.message = msg_text;

    if ( data ){ error.data = data; }

    return error;
  };
  // End Public constructor /makeError/

  // Begin Public method /setConfigMap/
  // Purpose: Common code to set configs in feature modules
  // Arguments:
  //   * input_map    - map of key-values to set in config
  //   * settable_map - map of allowable keys to set
  //   * config_map   - map to apply settings to
  // Returns: true
  // Throws : Exception if input key not allowed
  //
  setConfigMap = function ( arg_map ){
    var
      input_map    = arg_map.input_map,
      settable_map = arg_map.settable_map,
      config_map   = arg_map.config_map,
      key_name, error;

    for ( key_name in input_map ){
      if ( input_map.hasOwnProperty( key_name ) ){
        if ( settable_map.hasOwnProperty( key_name ) ){
          config_map[key_name] = input_map[key_name];
        }
        else {
          error = makeError( 'Bad Input',
            'Setting config key |' + key_name + '| is not supported'
          );
          console.trace(error);
          throw error;
        }
      }
    }
  };
  // End Public method /setConfigMap/

  return {
    makeError    : makeError,
    makeListPlus : makeListPlus,
    setConfigMap : setConfigMap
  };
}());

