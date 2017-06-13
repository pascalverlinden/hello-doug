
var binstring = require('binstring');
var monax = require('@monax/legacy-contracts');
var EventEmitter = require('events');
var util = require('util');
var logger = require(__libs+'/monax-logger');
const I = require('iteray');
const R = require('ramda');
const stream = require('stream');

(function () {

    var log = logger.getLogger('monax.db');

    // EventEmitter
    function ChainEvents() {
        EventEmitter.call(this);
    }

    util.inherits(ChainEvents, EventEmitter);

    /**
     * Constructor for a Wrapper instance to talk to a specific chain
     */
    function MonaxDB(host, port, account) {

        if (!account) {
        	log.error('No account specified for MonaxDB!');
        }

        const observer = (asyncIterable) => R.pipe(
          I.map((event) => JSON.stringify(event, null, 2) + '\n\n'),
          I.to(stream.Readable)
        )(asyncIterable).pipe(process.stderr)

        var self = this;
        self.chainURL = 'http://'+host+':'+port+'/rpc';
        self.contractManager = monax.newContractManagerDev(self.chainURL, account, {observer: process.env.DEBUG ? observer : I.sink});
        self.listen = new ChainEvents();
        log.info('Connection established with node at URL '+self.chainURL);
    }

    MonaxDB.prototype.events = {}; //TODO to be defined, e.g. contract added event
    
    /**
     * Creates and returns a contractFactory for the given ABI.
     */
    MonaxDB.prototype.createContractFactory = function(abi, jsonOutput) {

        //TODO check inputs, check existing contract at name
        if(log.isDebugEnabled()) {
            log.debug('Creating contract factory from ABI.');
        }
        // instantiate the contract factory using the abi.
        var factory = this.contractManager.newContractFactory(abi);

        if(jsonOutput) {
            if(log.isDebugEnabled()) {
                log.debug('Enabling json output on contract factory.');
            }
            factory.setOutputFormatter(monax.outputFormatters.jsonStrings);
        }
        return factory;
    }

    /**
     * Wraps the given callback and executes the 'convert' function on the result,
     * if there is one, before invoking the callback(error, result).
     */
    MonaxDB.prototype.convertibleCallback = function(callback, convert) {
        return function(err, res) {
            callback(err, (res && convert) ? convert(res) : res);
        };
    }

    /* Converts given string to hex */
    MonaxDB.prototype.str2hex = function (str) {
        return binstring(str, { in:'binary', out:'hex' });
    }

    /* Converts given hex to string and removes trailing null character */
    MonaxDB.prototype.hex2str = function (hexx) {
        return String(new Buffer(hexx, 'hex')).replace(/\0/g, '');
    }

    module.exports = {
        'Connection': MonaxDB
    };

}());
