/*jslint         node    : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global require, process, module, res, req */

var mongodb     = require( 'mongodb' ),
    mongoserver = new mongodb.Server( 'localhost', mongodb.Connection.DEFAULT_PORT ),
    db          = new mongodb.Db( 'spa', mongoserver ),
    ObjectID    = mongodb.ObjectID,
    fs          = require( 'fs' ),
    jsv         = require( 'JSV' ).JSV.createEnvironment(),
    schema_map  = { 'users': {} },
    check_schema,
    load_schema,
    schema_name, crud;

db.open( function () {
  console.log( 'connected to Mongo' );
  // Our first step is to set all is_online flags to false on start
  //
  crud.update(
    'user',
    { is_online : true },
    { $set : { is_online : false } },
    function () { }
  );
});

load_schema = function ( err, data ){
  schema_map[ schema_name ] = JSON.parse( data );
};

for ( schema_name in schema_map ) {
  if ( schema_map.hasOwnProperty( schema_name ) ){
    var schema_path = __dirname.replace('/lib','') + '/' + schema_name + '.json';

    fs.readFile( schema_path, 'utf8', load_schema );
  }
}

check_schema = function ( object, schema, callback ) {
  var report = jsv.validate( object, schema ),
      pass_validation = report.errors.length === 0;

  callback( pass_validation );
};

crud = {
  make : function ( object_type, object_map, callback ) {
    check_schema( object_map, schema_map[ object_type ], function ( pass_validation ) {
      var obj_map = object_map;
      if ( pass_validation ) {
        db.collection( object_type, function ( err, collection ) {
          var options_map = { safe: true };
          collection.insert( obj_map, options_map, function ( err, result ) {
            callback( result );
          });
        });
      } else {
        res.send( 'Did not pass validation\n' );
      }
    });
  },

  read: function ( object_type, find_map, callback ) {
    db.collection( object_type, function ( err, collection ) {
      collection.find( find_map ).toArray( function ( err, result ) {
        callback( result );
      });
    });
  },

  update: function ( object_type, find_map, object_map, callback) {
    check_schema( object_map, schema_map[ object_type ], function ( pass_validation ) {
      if ( pass_validation ) {
        db.collection( object_type, function ( err, collection ) {
          var sort_order = [],
            options_map = { 'new' : true, upsert: false, safe: false, multi : true };

          collection.findAndModify( find_map, sort_order, object_map, options_map,
            function ( err, result ) {
              callback( result );
            }
          );
        });
      } else {
        res.send( 'Did not pass validation\n' );
      }
    });
  },

  destroy: function ( object_type, find_map, callback ) {
    db.collection( object_type, function ( err, collection ) {
      var options_map = { safe: true, single: true };

      collection.remove( find_map, options_map,
        function ( err, result ) {
          callback( result );
        }
      );
    });
  },
  schema_map: schema_map
};

module.exports = crud;
