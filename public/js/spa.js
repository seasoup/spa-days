/*
 *   spa.js
 *   Base module for spa application
 *
 *   Michael S. Mikowski - mike.mikowski@gmail.com
 *   Copyright 2011,2012 Manning Publications Co.
*/

/*jslint           browser : true,   continue : true,
  devel  : true,    indent : 2,       maxerr  : 50,
  newcap : true,     nomen : true,   plusplus : true,
  regexp : true,    sloppy : true,       vars : false,
  white  : true
*/

/*global $, spa */

var spa = (function () {
  "use strict";
  var initModule = function ( $container ){
    try {
      spa.data.initModule();
      spa.model.initModule();
      spa.shell.initModule( $container );
    }
    catch ( error ) {
      console.trace('spa.js caught exception', error );
    }
  };
  return { initModule: initModule };
}());
