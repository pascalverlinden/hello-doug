//
// Urvogel - the eggs on the blockchain
//

// Node js native libs
var fs = require ('fs')
  , util = require('util')
  ;

// Open source libs
var erisC = require('eris-contracts')
  , ndef = require('ndef')
  , nfc  = require('nfc').nfc
  , devices = nfc.scan()
  ;

/********************************* Contracts **********************************/
var erisdbURL = "http://localhost:1337/rpc";

// get the abi and deployed data squared away
var contractData = require('./contracts/epm.json');
var eggsContractAddress = contractData["deployStorageK"];
var eggsAbi = JSON.parse(fs.readFileSync("./contracts/abi/" + eggsContractAddress));

// properly instantiate the contract objects manager using the erisdb URL
// and the account data (which is a temporary hack)
var accountData = require('./contracts/accounts.json');
var contractsManager = erisC.newContractManagerDev(erisdbURL, accountData.eggchain_full_001);

// properly instantiate the contract objects using the abi and address
var eggsContract = contractsManager.newContractFactory(eggsAbi).at(eggsContractAddress);

//
// Get current outstanding number of eggs in contract
// 
function getValue(callback) {
  eggsContract.get(function(error, result){
    if (error) { throw error }
    console.log("Egg number now is:\t\t\t" + result.toNumber());
    callback(result);
  });
}

//
// Set egg number in eggs contract
//
function setValue(value) {
  eggsContract.set(value, function(error, result){
    if (error) { throw error }
    getValue(function(){});
  });
}

//
// Read and process the RFID value
//
function read(deviceID) {
  var nfcdev = new nfc.NFC();

  // RFID data ready to read
  nfcdev.on('read', function(tag) {
    //console.log(util.inspect(tag, { depth: null }));
    if ((!!tag.data) && (!!tag.offset)) {
      tlvs = nfc.parse(tag.data.slice(tag.offset))
      //console.log(util.inspect(tlvs, { depth: null }))
      if (!!tlvs && ('ndef' in tlvs[0])) {
        attachedData = tlvs[0].ndef[0].value;
        console.log("TAG: " + attachedData);

        if (attachedData == "eggs") {
          // Update contract  
          getValue(function (result) {
            curEggs = result.toNumber();
            console.log("Adding a dozen eggs")
            setValue(curEggs+12);
          });
          /*
          eggsContract.get(function(error, result){
            if (error) { throw error }
            curEggs = result.toNumber();
            console.log("Current eggs number is:\t\t\t" + result.toNumber());
            console.log("Adding a dozen eggs")
            setValue(curEggs+12);
          });
          */
        } else {
          console.log("Sorry, we don't accept " + attachedData);
        }

      }
      
      nfcdev.stop();

    } else {
      console.log("Hold tag longer on the RFID reader.")
    }

  });
  
  // RFID/NFC error callback.
  nfcdev.on('error', function(err) {
    console.log(util.inspect(err, { depth: null }));
  });

  // RFID/NFC stopped, clean up.
  nfcdev.on('stopped', function() {
    //console.log('stopped');
    console.log('');
  });

  nfcdev.start(deviceID)
  console.log("Waiting for eggs...");
}

//
// Program entry 
//
for (var deviceID in devices) {
  read(deviceID);
}


