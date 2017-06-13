
// Set up global directory constants used throughout the app
global.__appDir = __dirname;
global.__libs = __appDir + '/js/libs';
global.__config = __appDir + '/config';
global.__contracts = __appDir + '/contracts';
global.__abi = __contracts + '/abi';
global.__sqlsol = __appDir + '/sqlsol';

// External dependencies
var fs = require('fs');
var toml = require('toml');

// Read configuration
var configFilePath = process.env.MONAX_CONFIG || __config+'/settings.toml';
global.__settings = toml.parse( fs.readFileSync(configFilePath) );

// Local modules require configuration to be loaded
var logger = require(__libs+'/monax-logger');
var server;

var log = logger.getLogger('Main');

log.info('Starting platform ...')
var contracts = require(__libs+'/hello-contracts');

// Module initialization sequence
contracts.load().then(() => {
	log.info('Contracts loaded.');
	return contracts.initCache();
}).then(() => {
	log.info('SQL Cache initiated.')
	server = require(__libs+'/hello-web-api');
	log.info('Web API started and ready for requests.');
	log.info('Application started successfully ...');
}).catch(error => {
	log.error('Unexpected error initializing the application: '+error.message);
});
