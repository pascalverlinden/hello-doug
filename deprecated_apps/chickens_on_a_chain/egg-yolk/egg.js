var sqlcache = require("./modules/sqlcache");
var edb = require("./modules/edb");
var  config = require("./modules/config");
var fs = require("fs-extra");
var async = require("async");


function Egg(){
	this.cacheStruct = fs.readJSONSync("./egg-yolk/contracts/eggStruct.json");
}

/*
Init - Initialize the backend connection and local caching system
Inputs:
 -> account 	- Object 	- Must have fields address, PubKey, PrivKey
 -> Callback 	- function 	- callback function
*/
Egg.prototype.init = function(account, cb){
	var self = this;
	this.account = account;
	this.cache = new sqlcache(':memory:', account);
	this.egg = edb.getContract("eggtracker", account)
	
	// this.cache.addContract(self.egg, self.cacheStruct, "eggtracker", function(err){
	// 	if(err) return cb(err);
	// 	self.cache.initTables("eggtracker", cb);
	// });
	return cb(null);
}


Egg.prototype.getHistoryEntry = function(eggid, eventNum, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.getHistoryEntry.sendTransaction(eggid, eventNum, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.etype, result.values.actor, result.values.time);
	})
}

Egg.prototype.createUser = function(userAddress, name, adminPerm, createPerm, tradePerm, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.createUser.sendTransaction(userAddress, name, adminPerm, createPerm, tradePerm, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error);
	})
}

Egg.prototype.isAdmin = function(user, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.isAdmin.call(user, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values);
	})
}

Egg.prototype.createEgg = function(desc, secretHash, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.createEgg.sendTransaction(desc, secretHash, function(err, result){
		console.log("fkjldskl")
		console.log(err)
		if(err) return cb(err, null);
		return cb(null, result.values.error, result.values.newID);
	})
}

Egg.prototype.transferEgg = function(eggid, newOwner, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.transferEgg.sendTransaction(eggid, newOwner, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error);
	})
}

Egg.prototype.getShit = function(cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.getShit.sendTransaction(function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.EGGLen, result.values.USERLen);
	})
}

Egg.prototype.getEggData = function(eggid, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.getEggData.sendTransaction(eggid, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.owner, result.values.secretHash, result.values.claimed, result.values.originDate, result.values.desc, result.values.historyLength);
	})
}

Egg.prototype.canTrade = function(user, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.canTrade.call(user, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values);
	})
}

Egg.prototype.changeUserPerms = function(userAddress, adminPerm, createPerm, tradePerm, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.changeUserPerms.sendTransaction(userAddress, adminPerm, createPerm, tradePerm, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error);
	})
}

Egg.prototype.canCreate = function(user, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.canCreate.call(user, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values);
	})
}

Egg.prototype.claimEgg = function(eggid, secret, newSecretHash, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.claimEgg.sendTransaction(eggid, secret, newSecretHash, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error);
	})
}

Egg.prototype.removeUser = function(userAddress, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.removeUser.sendTransaction(userAddress, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error);
	})
}

Egg.prototype.getUser = function(uid, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	this.egg.getUser.sendTransaction(uid, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.name, result.values.addr, result.values.exists, result.values.adminPerm, result.values.createPerm, result.values.tradePerm);
	})
}



///
Egg.prototype.deploy = function(account, cb){
	var self = this;
	edb.deploy(account, "eggtracker", function(err){
		if(err) return cb(err);
		self.egg = edb.getContract("eggtracker", account);
		return cb(null, self.egg.address)
	});
}

Egg.prototype.initialize_users = function(accounts, cb){
	var self = this;
	async.forEachOfLimit(accounts, 3, function(account, key, callback){
//		console.log(account)
		self.createUser(account.address, key, account.adminPerm, account.createPerm, account.tradePerm, function(err, ecode){
			// console.log("hello")
			// console.log(err)
			// console.log(ecode)
			callback(err)
		});
	}, cb)
}

module.exports = Egg;
