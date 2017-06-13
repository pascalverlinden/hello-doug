

var fs = require('fs');
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');

var logger = require(__libs+'/monax-logger');
var contracts = require(__libs+'/hello-contracts');

(function() {

    var log = logger.getLogger('hello.web');

    var portHTTP = __settings.server.port_http || 3080;
    var app = express();

    // Configure PORTAL
    app.use('/'+(__settings.server.contextPath || 'portal'), express.static(__appDir + '/ui'));

    // Configure JSON parsing as default
    app.use(bodyParser.json());
    // Allow text for query route
    app.use('/query', bodyParser.text({type: '*/*'}));

    /**
     * Deals
     */

    // GET multiple
    app.get('/deals', function(req, res, next) {
		const retdata = [];
		const queryString = "select * from DEALS";
		
		contracts.cache.db.all(queryString, function(err, data) {
			if (err) {
				res.send(500, err);
				return next()
			}

			for (var i = 0; i < data.length; i++) {
				const deal = data[i];
				retdata.push({
					address: deal.dealAddress,
					id: contracts.db.hex2str(deal.dealId),
					buyer: contracts.db.hex2str(deal.buyer),
					seller: contracts.db.hex2str(deal.seller),
					amount: deal.amount/100 //divide by 100 to re-establish decimals
				})
			}
			
			res.json(retdata);
			return next();
		});
    });

    // GET single
    app.get('/deals/:id', function(req, res, next) {
		var queryString = "select * from DEALS where id = ?";
		contracts.cache.db.get(queryString, req.params.id, function(err, data) {
			if(err){
				res.send(500, err);
				return next()
			}
			if(!data || data == [] || data == {}) {
				res.send(500, new Error('Invalid data retrieved for deal with ID: '+req.params.id));
			}
	        res.json(data);
	        return next();
		});
    });

    // POST new 
    app.post('/deals', function(req, res, next) {
        var deal = req.body;
        log.debug('Request to create new deal: '+deal.id);
        contracts.createDeal(deal).then(address => {
            //TODO wait for event from cache that data has been received
            // callback to wait for the confirmation from the DB that it has received the data from the event
            // var eventNeworg = function(error, newDeal) {
            //     if (newDeal)
            //         res.sendStatus(200);
            //     else {
            //         console.dir(this);
            //         db.listen.removeListener(db.events.NEW_DEAL+'_'+deal.id, this);
            //         res.sendStatus(500);
            //     }
            // }
            // setTimeout(eventNewDeal, 5000, new Error('Timeout'));
            // db.listen.once( db.events.NEW_DEAL+'_'+deal.idr, eventNewDeal);
            res.sendStatus(200, address);
	        return next();
        }, error => {
			res.send(500, err);
			return next()
        });
    });

    // SQL TEST ROUTE
	app.post('/query', function(req, res, next) {
		log.info(req.body)
		contracts.cache.db.all(req.body, function(err, data){
			res.json(data)
			return next();
		})
	});

    var httpServer = http.createServer(app).listen(portHTTP);

}());
