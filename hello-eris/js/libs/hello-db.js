
var loki = require('lokijs');
var EventEmitter = require('events');
var util = require('util');
var logger = require('./eris-logger');
var chain = require('./hello-chain');

(function() {

    var log = logger.getLogger('eris.hello.db');

    // Set up event emitter
    var events = {NEW_DEAL: 'newDeal'};
    function DbEventEmitter() {
        EventEmitter.call(this);
    }
    util.inherits(DbEventEmitter, EventEmitter);
    var dbEventEmitter = new DbEventEmitter();

    // Set up Loki DB
    _db = new loki();
    _collection = _db.addCollection('deals', {indices: ['id', 'buyer', 'seller', 'amount']});
    _collection.ensureUniqueIndex('contractAddress');

    // Register for events from chain module
    chain.listen.on(chain.events.NEW_DEAL, function (address, id, buyer, seller, amount) {
        log.info('New deal detected ('+id+':'+buyer+':'+seller+':'+amount+') with address: '+address);
        // Loading deal freshly from chain as there might be more data than conveyed in the event
        chain.getDealAtAddress(address, function(err, deal) {
            if(err) { throw err; }
            log.debug('Performing DB insert for new deal with address '+deal.contractAddress)
            _collection.insert(deal);
            // emit two events! One carries the ID of the deal, so it can be specifically detected
            dbEventEmitter.emit(events.NEW_DEAL, deal);
            dbEventEmitter.emit(events.NEW_DEAL+'_'+deal.id, deal);
        });
    })

    /**
     * @param library
     * @param callback
     */
    function loadDeals(callback) {
        chain.getDeals( function(error, deals) {
            log.info('Storing '+deals.length+' deals from chain in DB.');
            _collection.removeDataOnly();
            _collection.insert(deals);
            callback(null);
        });
    }

    /**
     * Refreshes the DB
     * @param callback
     */
    function refresh(callback) {
        loadDeals(callback);
    }

    function getDeal(id) {
        log.debug('Retrieving deal from DB for ID: ' + id);
        return _collection.findOne({'id': id});
    }

    function getDeals(buyer, seller) {
        log.debug('Retrieving deals from DB using parameters buyer: '+buyer+', seller: '+seller);
        var queryParams = createQuery(buyer, seller);
        // Use AND for multiple query params
        if (queryParams.length > 1) {
            return _collection.find({'$and': queryParams});
        }
        else if (queryParams.length == 1) {
            return _collection.find(queryParams[0]);
        }
        else {
            // for 'undefined' query all documents in the collection are returned
            return _collection.find();
        }
    }

    function addDeal(deal, callback) {
        // TODO check if deal exists in DB
        chain.addDeal(deal, callback);
    }

    /*
        Helper method to create a query object for LokiJS' search
     */
    function createQuery(buyer, seller) {
        var queryParams = [];
        if (buyer) {
            queryParams.push({'buyer': buyer});
        }
        if (seller) {
            queryParams.push({'seller': seller});
        }
        return queryParams;
    }

    module.exports = {
        'events': events,
        'listen': dbEventEmitter,
        'refresh': refresh,
        'getDeal': getDeal,
        'getDeals': getDeals,
        'addDeal': addDeal
    };

}());