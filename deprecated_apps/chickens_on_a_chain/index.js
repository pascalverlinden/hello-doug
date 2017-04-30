var e = require("./egg-yolk/egg.js");
var ec = new e;
var fs = require("fs-extra");
var crypto = require("crypto");

var config = require("./egg-yolk/modules/config.js");

var accountName = config.edb.account;

var accounts = fs.readJSONSync("./accounts.json");
var account = accounts[accountName];

var hash = crypto.createHash('sha256');
var secret = "ThisIsASecret"
hash.update(secret)
var secretHash = hash.digest();


ec.init(account, function (err) {
    if (err) {
        throw err;
    }

    ec.createEgg("broken, runny basically shit", secretHash, function(errorCode, ID){
        console.log(errorCode)
        console.log(ID)
    })

    console.log("START UP");
    // ec.cache.run('select * from eggs', function(err, row){
    //     console.log("EGGs:")
    //     console.log(row)

    //     ec.cache.run('select * from history', function(err, row){
    //         console.log("History: ")
    //         console.log(row)
    //     })

    //     ec.cache.run('select * from users', function(err, row){
    //         console.log("Users:")
    //         console.log(row)
    //     })

    // });
});

