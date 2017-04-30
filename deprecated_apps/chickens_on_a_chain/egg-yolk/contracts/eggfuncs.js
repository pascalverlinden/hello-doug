
module.exports = {
	getHistoryEntry:getHistoryEntry,
	createUser:createUser,
	isAdmin:isAdmin,
	createEgg:createEgg,
	transferEgg:transferEgg,
	getShit:getShit,
	getEggData:getEggData,
	canTrade:canTrade,
	changeUserPerms:changeUserPerms,
	canCreate:canCreate,
	claimEgg:claimEgg,
	removeUser:removeUser,
	getUser:getUser,
}

Egg.prototype.getHistoryEntry = function(eggid, eventNum, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.getHistoryEntry.sendTransaction(eggid, eventNum, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.etype, result.values.actor, result.values.time);
	})
}

Egg.prototype.createUser = function(userAddress, name, adminPerm, createPerm, tradePerm, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.createUser.sendTransaction(userAddress, name, adminPerm, createPerm, tradePerm, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error);
	})
}

Egg.prototype.isAdmin = function(user, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.isAdmin.call(user, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values);
	})
}

Egg.prototype.createEgg = function(desc, secretHash, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.createEgg.sendTransaction(desc, secretHash, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error, result.values.newID);
	})
}

Egg.prototype.transferEgg = function(eggid, newOwner, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.transferEgg.sendTransaction(eggid, newOwner, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error);
	})
}

Egg.prototype.getShit = function(cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.getShit.sendTransaction(function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.EGGLen, result.values.USERLen);
	})
}

Egg.prototype.getEggData = function(eggid, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.getEggData.sendTransaction(eggid, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.owner, result.values.secretHash, result.values.claimed, result.values.originDate, result.values.desc, result.values.historyLength);
	})
}

Egg.prototype.canTrade = function(user, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.canTrade.call(user, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values);
	})
}

Egg.prototype.changeUserPerms = function(userAddress, adminPerm, createPerm, tradePerm, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.changeUserPerms.sendTransaction(userAddress, adminPerm, createPerm, tradePerm, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error);
	})
}

Egg.prototype.canCreate = function(user, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.canCreate.call(user, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values);
	})
}

Egg.prototype.claimEgg = function(eggid, secret, newSecretHash, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.claimEgg.sendTransaction(eggid, secret, newSecretHash, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error);
	})
}

Egg.prototype.removeUser = function(userAddress, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.removeUser.sendTransaction(userAddress, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.error);
	})
}

Egg.prototype.getUser = function(uid, cb){
	if (!this.egg) return cb(new Error('Egg contract has not been initialized'));
	egg.getUser.sendTransaction(uid, function(err, result){
		if(err) return cb(err, null);
		return cb(null, result.values.name, result.values.addr, result.values.exists, result.values.adminPerm, result.values.createPerm, result.values.tradePerm);
	})
}

