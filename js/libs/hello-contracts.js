
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const util = require('util');
const async = require('async');

const logger = require(__libs+'/monax-logger');
const monaxUtils = require(__libs+'/monax-utils');
const monaxDB = require(__libs+'/monax-db');
const monaxApp = require(__libs+'/monax-app');
const sqlcache = require(__libs+'/monax-sqlsol');

/**
 * This module provides the application-specific functions for Hello DOUG.
 */
(function() {

    const log = logger.getLogger('hello.contracts');

    const events = {NEW_MESSAGE: "newMessage"};

    // Set up event emitter
    function ChainEventEmitter() {
        EventEmitter.call(this);
    }
    util.inherits(ChainEventEmitter, EventEmitter);
    const chainEvents = new ChainEventEmitter();

    // Instantiate connection to the node
    const serverAccount = require(__config+'/accounts.json')[__settings.accounts.server];
    const db = new monaxDB.Connection((__settings.chain.host || 'localhost'), (__settings.chain.port || '32770'), serverAccount);
    // Make a choice of App Manager
    let appManager;
    if (__settings.manager.DOUG) {
    	appManager = new monaxApp.DougManager(db, __settings.manager.DOUG);
    }
    else if (__settings.manager.ContractAddresses) {
    	const contractAddresses = JSON.parse(fs.readFileSync(__appDir+'/'+__settings.manager.ContractAddresses));
    	appManager = new monaxApp.JsonManager(db, contractAddresses);
    }
    else {
    	log.warn('hello-contracts was not set up with a suitable app manager!');
    }
    
    // Initiate sqlsol cache
    const cache = new sqlcache(':memory:', serverAccount);
    
    /**
     * Uses the configuration 'contracts.load' in the settings to create a number of promises, each loading one of the configured contracts from
     * the DOUG contract and populating the contracts[] in the appManager.
     */
    var load = function() {
    	var modules = [];
    	// load registered modules from settings
    	if (__settings.contracts && __settings.contracts.load) {
    		modules = monaxUtils.getArrayFromString(__settings.contracts.load);
        	if (log.isDebugEnabled())
        		log.debug('Detected '+modules.length+' contracts to be loaded: '+modules);
    	}
    	// create promises to load the contracts
    	var loadPromises = [];
    	for (let m of modules) {
    		loadPromises.push(appManager.loadContract(m));
    	}
    	return Promise.all(loadPromises);
    }

    /**
     * Loads information from contracts into the sql cache as configured via the sqlsol/ directory.
     * Note: The contract matching the .json filename must already be loaded in the appManager.
     */
    var initCache = function() {
    	var cachePromises = [];
    	fs.readdirSync(__sqlsol).forEach(file => {
    		if (file.endsWith('.json')) {
    			if (log.isDebugEnabled())
    				log.debug('Processing SQLSOL configuration: '+file);
    			var structDef = JSON.parse(fs.readFileSync(__sqlsol+'/'+file));
    			var name = path.parse(file).name;
    			if (appManager.contracts[name]) {
    				cachePromises.push(cache.addContract(appManager.contracts[name].factory, structDef, name));
    			}
    			else {
    				cachePromises.push(Promise.reject(new Error('Unable to init cache for contract <'+name+'>. Contract not found in AppManager.')));
    			}
    		}
    	});
    	return Promise.all(cachePromises);
    }
    
    /**
     * Creates a promise to create a new deal.
     * @param organization
     */
    var createDeal = function(deal) {
    	return new Promise(function(resolve, reject) {
    		// transform fields
    		deal.amount = deal.amount*100; // allow decimals by converting to full integer
    		deal.id = db.str2hex(deal.id); // explicitly convert to hex to allow numeric ID
            appManager.contracts['DealManager'].factory.addDeal(deal.id, deal.buyer, deal.seller, deal.amount, function(error, result) {
            	if (error) reject(error);
            	if (log.isDebugEnabled())
            		log.debug('Created new deal at address '+result['dealAddress']+' with id: '+deal.id+', buyer:'+deal.buyer+', seller: '+deal.seller+', amount: '+deal.amount);
                resolve(result['dealAddress']);
            });
    	});
    };

    module.exports = {
        'load': load,
        'initCache': initCache,
        'events': events,
        'listen': chainEvents,
        'db': db,
        'cache': cache,
        'createDeal': createDeal
    }

}());