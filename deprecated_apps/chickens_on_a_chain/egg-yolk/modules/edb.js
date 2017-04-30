'use strict;'
var edbModule = require("eris-db");
var config = require('./config');
var eris = require("eris-contracts");
var async = require('async');
var fs = require("fs-extra");

var cfg = config.edb;
var cnames = config.contracts;

var conobjs = {}
var cms = {}

//Set up
contracts = fs.readJsonSync(__dirname +"/../contracts.json")


var makeContractObject = function(cname, cm){
    var contractFactory = cm.newContractFactory(contracts[cname].abi);
    contractFactory.setOutputFormatter(eris.outputFormatters.jsonStrings)
    var contract = contractFactory.at(contracts[cname].address);
    return contract
}

function getContract(cname, account, cb){
    if(cb){
        console.log("Callback provided attempting websocket connection")
        
        if (!cms[account]){
            var erisdbURL = "ws://"+cfg.host+":"+cfg.port+"/socketrpc"
            eris.newContractManagerDev(erisdbURL, account, function(err, cm){
                if(err) return cb(err);
                cms[account] = cm;
                var contract = makeContractObject(cname, cm)
                return cb(null, contract)
            })
        } else {
            var contract = makeContractObject(cname, cms[account])
            return cb(null, contract)
        }
    } else {
        var cm;
        if (!cms[account]){
            console.log("no callback provided setting up http connection")
            var erisdbURL = "http://"+cfg.host+":"+cfg.port+"/rpc"
            cm = eris.newContractManagerDev(erisdbURL, account)
            cms[account] = cm;
        } else {
            console.log("Reusing existing contract manager")
            cm = cms[account]
        }
        return makeContractObject(cname, cm)
    }
}

function getCM(account, cb){
    if(cb){
        console.log("callback provided attempting websocket connection")
        if (!cms[account]){
            var erisdbURL = "ws://"+cfg.host+":"+cfg.port+"/socketrpc"
            eris.newContractManagerDev(erisdbURL, account, function(err, cm){
                if(err) return cb(err);
                cms[account] = cm;
                return cb(null, cm)
            })
        } else {
            return cb(null, cms[account])
        }
    } else {
        console.log("no callback provided setting up http connection")
        if (!cms[account]){
            var erisdbURL = "http://"+cfg.host+":"+cfg.port+"/rpc"
            cm = eris.newContractManagerDev(erisdbURL, account)
            cms[account] = cm;
            return cm;
        } else {
            return cms[account]
        }

    }
    
    
}

var deploy = function(account, cname, cb){
    var cm = getCM(account)
    try{
        var bin = fs.readFileSync(__dirname +"/../contracts/" + cname + ".bin");
        var abi = fs.readJsonSync(__dirname +"/../contracts/" + cname + ".abi");
    } catch (err){
        return cb(err);
    }

    var contractFactory = cm.newContractFactory(abi);
    contractFactory.setOutputFormatter(eris.outputFormatters.jsonStrings)
    // properly instantiate the contract objects using the abi and address
    contractFactory.new({data: bin}, function(err, contract){
        if (err) cb(err);

        //Write shit to namereg
        setContract(account, cname, abi, contract.address, cb);
    });
}


//TODO check if a contract object can be saved directly
function setContract(account, cname, abi, address, cb){
    contract = {}
    contract.abi = abi;
    contract.isContract = true;
    contract.address = address;

    contracts[cname] = contract;

    fs.writeJsonSync(__dirname +"/../contracts.json", contracts)
    return cb(null)

}


function loadContracts(cb){
    contracts = fs.readJsonSync(__dirname +"/../contracts.json")
}

// function getContract(cname, account, cb){
//     if (!account) return cb(new Error("No account provided"));

//     getCM(account, function(err, cm){
//         if(err) return cb(err);

//         var contractFactory = cm.newContractFactory(contracts[cname].abi);
//         contractFactory.setOutputFormatter(eris.outputFormatters.jsonStrings)
//         var contract = contractFactory.at(contracts[cname].address);
//         return cb(null, contract)
//     });   
// }


//Contract interaction helpers
module.exports = {
    deploy: deploy,
    loadContracts: loadContracts,
	getContract: getContract,
    utils: eris.utils,
};