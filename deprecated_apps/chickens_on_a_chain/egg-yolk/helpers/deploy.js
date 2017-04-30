var egg = require("../egg.js");
var eggc = new egg;

var config = require("../modules/config.js");

var fs = require("fs-extra");

var accountName = config.edb.account;

var accounts = fs.readJSONSync("./accounts.json");
var account = accounts[accountName];

eggc.deploy(account, function(err, contractAddress){
	console.log(contractAddress)
	if(err) throw err;
	console.log("Deployed")
	eggc.initialize_users(accounts, function(err){
		console.log("Contract initialized with users. Enjoy!")
	})
})
	