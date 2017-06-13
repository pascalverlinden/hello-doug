
var fs = require('fs');
var EventEmitter = require('events');
var util = require('util');
var async = require('async');
var monax = require('@monax/legacy-contracts');
var logger = require(__libs+'/monax-logger');


/**
 * Module to handle Monax SDK-specific functionality.
 */
(function () {

    var log = logger.getLogger('monax.app');

    // EventEmitter
    function AppEvents() {
        EventEmitter.call(this);
    }

    util.inherits(AppEvents, EventEmitter);

    /**
     * DougManager
     */
    function DougManager(db, dougAddress, dougABI) {
        var self = this;
        log.info('Creating a new application manager for DOUG at address: '+dougAddress);
        self.db = db;
        // Attempt to resolve the DOUG abi, if not provided.
        dougABI = dougABI || getABI('DOUG');
        self.doug = db.createContractFactory(dougABI, true).at(dougAddress);
        self.contracts = {};
        self.listen = new AppEvents();
    }

    /**
     * JsonManager
     */
    function JsonManager(db, contractAddresses) {
        var self = this;
        log.info('Creating a new application manager from JSON: '+JSON.stringify(contractAddresses));
        self.db = db;
        self.contractAddresses = contractAddresses;
        self.contracts = {};
        self.listen = new AppEvents();
    }

    /**
     * Loads the ABI as JSON object from the file with the given name (or name.abi) in the global ABI path
     * @param contractName
     * @returns the ABI JSON object
     */
    function getABI(contractName) {
    	var path = __abi+"/"+contractName;
    	if (!fs.existsSync(path)) {
    		path = __abi+"/"+contractName+'.abi';
    	}
		return JSON.parse(fs.readFileSync(path));
    }
    
    /**
     * Returns a promise to load the details for the contract registered under the provided name from DOUG.
     * The contract is stored in the Manager's contracts array as an object with the following fields:
     * { abi: abiJsonObject,
     *   address: "0x234294...",
     *   factory: contractFactory.at(address)
     * }
     */
    DougManager.prototype.loadContract = function(name, abi) {
    	var self = this;
    	return new Promise(function(resolve, reject) {
    		if (log.isDebugEnabled())
    			log.debug('Loading contract '+name);
            self.doug.getContract(self.db.str2hex(name), function(err, data) {
                if(err) reject(err);
                if(data.values.error == 1001) reject(new Error("Contract not found in DOUG: "+name));
                // Populate contracts object
            	self.contracts[name] = {};
            	self.contracts[name].abi = abi || getABI(name);
                self.contracts[name].address = (data.raw[1].slice(0,2)=='0x') ? data.raw[1].slice(2) : data.raw[1];
                if (log.isDebugEnabled())
                	log.debug('DOUG resolved contract <'+name+'> to address: '+self.contracts[name].address);
                self.contracts[name].factory = self.db.createContractFactory(self.contracts[name].abi, true).at(self.contracts[name].address);
                log.info('Contract <'+name+'> successfully loaded from DOUG.');
                resolve();
            });
		});
    }

    /**
     * Returns a promise to load the details for the contract registered under the provided name from DOUG.
     * The contract is stored in the Manager's contracts array as an object with the following fields:
     * { abi: abiJsonObject,
     *   address: "0x234294...",
     *   factory: contractFactory.at(address)
     * }
     */
    JsonManager.prototype.loadContract = function(name, abi) {
    	var self = this;
    	return new Promise(function(resolve, reject) {
    		if (log.isDebugEnabled())
    			log.debug('Loading contract '+name);
			if (!self.contractAddresses[name]) {
				reject(new Error("Contract not found in JSON: "+name))
			}
            // Populate contracts object
        	self.contracts[name] = {};
        	self.contracts[name].abi = abi || getABI(name);
            self.contracts[name].factory = self.db.createContractFactory(self.contracts[name].abi, true).at(self.contractAddresses[name]);
            log.info('Contract <'+name+'> successfully loaded from JSON.');
            resolve();
		});
    }

    DougManager.prototype.events = {};
    JsonManager.prototype.events = {};
    
    module.exports = {
        'DougManager': DougManager,
        'JsonManager': JsonManager,
        'getABI': getABI
    };

}());
