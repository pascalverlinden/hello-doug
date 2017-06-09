
var binstring = require('binstring');
var erisC = require('eris-contracts');
var EventEmitter = require('events');
var util = require('util');
var logger = require(__libs+'/eris-logger');
const I = require('iteray');
const R = require('ramda');
const stream = require('stream');

(function () {

    var log = logger.getLogger('eris.wrapper');

    // EventEmitter
    function ErisEvents() {
        EventEmitter.call(this);
    }

    util.inherits(ErisEvents, EventEmitter);

    /*
     Constructor for a Wrapper instance to talk to a specific chain
     */
    function ErisWrapper(host, port, account) {

        //TODO find a better way to easily test
        account = account || require('../../test/chain-config/accounts.json')[__settings.eris.chain.devAccount];

        const observer = (asyncIterable) => R.pipe(
          I.map((event) => JSON.stringify(event, null, 2) + '\n\n'),
          I.to(stream.Readable)
        )(asyncIterable).pipe(process.stderr)

        var self = this;
        self.erisdbURL = 'http://'+host+':'+port+'/rpc';
        self.contractManager = erisC.newContractManagerDev(self.erisdbURL, account, {observer: process.env.DEBUG ? observer : I.sink});
        self.listen = new ErisEvents();
    }

    ErisWrapper.prototype.events = {}; //TODO to be defined, e.g. contract added event

    /**
     * Creates and returns a contractFactory for the given ABI. If an address is provided, the
     * object will allow communicating with that contract instance.
     */
    ErisWrapper.prototype.createContractFactory = function(abi, jsonOutput) {

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
            factory.setOutputFormatter(erisC.outputFormatters.jsonStrings);
        }
        return factory;
    }

    /*
     Wraps the given callback and executes the 'convert' function on the result,
     if there is one, before invoking the callback(error, result).
     */
    var convertibleCallback = function(callback, convert) {
        return function(err, res) {
            callback(err, (res && convert) ? convert(res) : res);
        };
    }

    /* Converts given string to hex */
    var str2hex = function (str) {
        return binstring(str, { in:'binary', out:'hex' });
    }

    /* Converts given hex to string and removes trailing null character */
    var hex2str = function (hexx) {
        return String(new Buffer(hexx, 'hex')).replace(/\0/g, '');
    }

    module.exports = {
        'NewWrapper': ErisWrapper,
        'convertibleCallback': convertibleCallback,
        'str2hex': str2hex,
        'hex2str': hex2str
    };

}());
