
// Set up global directory constants used throughout the app
global.__libs = __dirname + '/js/libs';
global.__routes = __dirname + '/js/routes';
global.__config = __dirname + '/config';
global.__contracts = __dirname + '/contracts';

// External dependencies
var fs = require('fs');
var toml = require('toml-js');

// Read configuration
var configFilePath = process.env.ERIS_CONFIG || __config+'/settings.toml';
global.__settings = toml.parse( fs.readFileSync(configFilePath) );

// Local modules require configuration to be loaded
var logger = require(__libs+'/eris-logger');
var chain = require(__libs+'/hello-chain');
var db = require(__libs+'/hello-db');
var server = require(__libs+'/hello-server');

var log = logger.getLogger('Main');

chain.init( function(error) {
    if(error) {
        log.error('Unexpected error initializing chain layer: '+error.message);
    }
   db.refresh( function(error) {
        if(error) {
           log.error('Unexpected error initializing persistence layer: '+error.message);
        }
        log.info('Hello Eris Application started successfully ...');
   })
});
