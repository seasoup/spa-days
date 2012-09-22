var mongodb     = require("mongodb"),
    mongoserver = new mongodb.Server( "localhost", mongodb.Connection.DEFAULT_PORT ),
    db          = new mongodb.Db( "spa", mongoserver ),
    ObjectID    = mongodb.ObjectID,
    fs          = require('fs'),
    validator   = require( 'JSV' ).JSV.createEnvironment(),
    schema_map  = {
      'users': {}
    };

db.open( function () {
  console.log( 'connected to Mongo' );
});

for ( schema in schema_map ) {
  var schema_path = __dirname.replace('/lib','') + '/' + schema + '.json';

  fs.readFile( schema_path, 'utf8', function ( err, data ) {
    schema_map[ schema ] = JSON.parse( data );
  });
}

function validate ( object, schema, callback ) {
  var report = validator.validate( object, schema ),
      pass_validation = report.errors.length === 0;

  callback( pass_validation );
}

var crud = {
  create: function ( object_type, object_map, callback ) {
    var object_map = object_map;
    validate( object_map, schema_map[ object_type ], function ( pass_validation ) {
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
    validate( object_map, schema_map[ object_type ], function ( pass_validation ) {
      if ( pass_validation ) {
        db.collection( req.params.object, function ( err, collection ) {
          var sort_order = [],
              options_map = { new: true, upsert: false, safe: true };

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
  
  delete: function ( object_type, find_map, callback ) {
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