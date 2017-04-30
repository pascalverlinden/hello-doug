var fs = require ('fs-extra');
var erisC = require('eris-contracts');
var crypto = require('crypto');
var async = require('async');
var moment = require('moment');




// Dear Zach:
// All this initial stuff you can change, I had it set up this way
// So I could use my javascript tools for deploying etc.
// But you can switch it around however you like.




// debug: use docker-machine ip <eris> or w/e
var erisdbURL = "http://localhost:1337/rpc";

// get the abi and deployed data squared away
// var contractData = require('./epm.json');
// var eggsContractAddress = contractData["deployStorageK"]; //probably needs to change... ?

var contracts = fs.readJSONSync('./egg-yolk/contracts.json')

var eggsContractAddress = contracts["eggtracker"].address;
console.log(eggsContractAddress)


//var eggsAbi = JSON.parse(fs.readFileSync("./abi/" + eggsContractAddress));
var eggsAbi = fs.readJSONSync("./egg-yolk/contracts/eggtracker.abi");

// properly instantiate the contract objects manager using the erisdb URL
// and the account data (which is a temporary hack)
var accountData = fs.readJSONSync('./accounts.json');

account = accountData['tyler-hide'];


// note: fackaccount is needed to query the chain
var contractsManager = erisC.newContractManagerDev(erisdbURL, account);

// properly instantiate the contract objects using the abi and address
var contractFactory = contractsManager.newContractFactory(eggsAbi);
contractFactory.setOutputFormatter(erisC.outputFormatters.jsonStrings)  //ZACH THIS PART IS VERY IMPORTANT
var eggsContract = contractFactory.at(eggsContractAddress);



//I touched up these functions a bit but only to use nicer formatting.

function createEgg(description, secretHash, callback) {
	eggsContract.createEgg.sendTransaction(description, secretHash, function(error, result){
		if (error) return callback(error);
		return callback(null, parseInt(result.values.error), parseInt(result.values.newID));
	});

}

function transferEgg(eggID, newOwner, callback) {
	eggsContract.transferEgg(eggID, newOwner, function(error, result){
		if (error) return callback(error);
		return callback(null, result.values.error);
	});
}

function claimEgg(eggID, secret, newSH, callback) {
	eggsContract.claimEgg(eggID, secret, newSH, function(error, result){
    	if (error) return callback(error);
		return callback(null, result.values.error);
	});
}

// get egg history
function getEggData(eggID, callback){
	eggsContract.getEggData(eggID, function(error, result){
    	if (error) return callback(error);
    	return callback(error, result.values);
    });
}

function getEventInformation(eggID, eventNumber, callback) { // return something
  	eggsContract.getHistoryEntry(eggID, eventNumber, function(error, result){
    	if (error) return callback(error);
    	return callback(error, result.values);
	});
}

// requires cartonID passed in from URL
function getEggHistory(eggID, callback) { //return something
	getEggData(eggID, function(error, result){
    	if (error) return callback(error);

    	var totalEvents = parseInt(result.historyLength);

    	var count = 1;

    	var history = [];

    	async.whilst(
		    function () { return (count <= totalEvents); },
		    function (cb) {
		    	getEventInformation(eggID, count, function(err, result){
		    		if(err) return cb(err);

		    		history.push(result);
		        	count++;
		    		cb(null)
		    	})
		    },
		    function (err) {
		    	if(err) return callback(err);
		    	return callback(null, history);
		    }
		);
  	});
}


function getUser(addr, callback){
	eggsContract.getUserByAddress(addr, function(err, data){
		if (err) return callback(err);
		return callback(null, data.values);
	})
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}


//You could probably do this better then me.

function prettyPrint(eggid, eggdata){
	//You could put some real HTML in here if you would like
	//I suck at HTML so this is basically all i could manage
	str = "<html><body>"
	str += "<h2>EGG REPORT</h2><br>";
	str += "<hr>"
	str += "Egg ID:\t" + eggid + "<br>";
	str += "Owner:\t" + eggdata.ownername + "<br>";
	str += "Address:\t" + eggdata.owner + "<br>";
	str += "Status:\t" + eggdata.claimed ? "Claimed<br>" : "Unclaimed<br>"
	str += "Origin Date:\t" + moment.unix(parseInt(eggdata.originDate)).format('DD-MM-YYYY') + "<br>";
	str += "Description:\t" + eggdata.desc + "<br>";
	str += "<hr>"
	str += "<h3>Tracking History</h3>"
	str += "<hr>"
	str += "Event:\t\t| Time:\t\t\t|By:<br>"

	for (var i = 0; i < eggdata.history.length; i++) {
		estr = ""
		evt = eggdata.history[i];
		if (evt.etype == 1){
			estr += "Created | "
		} else if (evt.etype == 2) {
			estr += "Transferred | "
		} else if (evt.etype == 3) {
			estr += "Claimed | "
		}

		estr += moment.unix(parseInt(evt.time)).format('DD-MM-YYYY') + " | "

		estr += evt.actor
		str += estr + "<br>"
	};

	str += "<hr>";
	str += "</body></html>"
	return str
}





//I swapped out your server for an easier to use module called
//Restify that is designed for rest endpoints
//If you wanted to build a more dynamic app I would recommend Express (which is similar 
//but specifically designed for web apps)


var restify = require('restify');

var name = "Consumer Egg Tracker Server"

var server = restify.createServer();
server.use(restify.queryParser());
server.use(restify.bodyParser({mapParams: true, mapFiles: true}));

server.get('/eggs/:eggid', function(req, res, next){
	getEggData(req.params.eggid, function(err, eggdata){
		if (err) {
			res.send(500, err)
			return next();
		}
		if (!eggdata || !eggdata.exists){
			res.send(404, "Egg Not Found!");
			return next();
		}

		getEggHistory(req.params.eggid, function(err, history){
			eggdata['history'] = history;
			res.json(200, eggdata)
			return next();
		})

	})
})

server.get('/pp/:eggid', function(req, res, next){
	getEggData(req.params.eggid, function(err, eggdata){
		if (err) {
			res.send(500, err)
			return next();
		}
		if (!eggdata || !eggdata.exists){
			res.send(404, "Egg Not Found!");
			return next();
		}

		getEggHistory(req.params.eggid, function(err, history){
			eggdata['history'] = history;

			getUser(eggdata.owner, function(err, userData){
				eggdata["ownername"] = userData.name;
				body = prettyPrint(req.params.eggid, eggdata)
				res.writeHead(200, {
				  'Content-Length': Buffer.byteLength(body),
				  'Content-Type': 'text/html'
				});
				res.write(body);
				res.end();
				return next();
			})

			
		})

	})	
})

server.get('/secret/:desc', function(req, res, next){ //This should be a POST end point but I'm lazy BAD FORM

	var hash = crypto.createHash('sha256');
	var secretBuf = crypto.randomBytes(32);
	hash.update(secretBuf)
	var secret = secretBuf.toString('hex')
	var secretHash = hash.digest().toString('hex');

	var EGGY;

	var histLen = getRandomInt(2, 9);

	createEgg(req.params.desc, secretHash, function(err, ecode, ID){
		if (err) res.send(500, err)

		EGGY = ID;

		var claim = false;
		var count = 0;
		async.whilst(
		    function () { return (count <= histLen); },
		    function (cb) {
		    	count ++;

		    	if(claim){
		    		claimEgg(EGGY, secret, secretHash, function(err, ecode){
						if (err) cb(err);
						claim = false;
						cb(null)
					})
		    	} else {
		    		transferEgg(EGGY, account.address, function(err, ecode){
						if (err) cb(err);
						claim = true;
						cb(null)
					})
		    	}
		    },
		    function (err) {
		    	if (err) res.send(500, err)
		    	res.send(200, "Random egg created with ID: " + EGGY.toString())
		    	return next();
		    }
		);
	})

})


server.listen(1212);

console.log("");
console.log("Welcome to: " + name + ".");
console.log("");

