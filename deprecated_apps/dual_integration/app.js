'use strict';

// app-level requires
var contracts = require('eris-contracts'),
  docusign = require('docusign-esign'),
  express = require('express'),
  fs = require('fs'),
  pdf = require('html-pdf');

// setup express app
var app = express(),
  appPort = process.env.APP_PORT || 3000;
app.set('view engine', 'pug');
app.use(require('body-parser').urlencoded({ extended: false }));

// setup ipfs
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI({
  host: process.env.IPFS_HOST || 'localhost',
  port: '5001',
  procotol: 'http'
});

// code contracts' variables populated
var abiDirectory = process.env.ABI_DIRECTORY || './abi/',
  chainName = process.env.CHAIN_NAME || 'dualintegrator',
  chainHost = process.env.CHAIN_HOST || 'localhost',
  chainPort = process.env.CHAIN_PORT || 1337,
  myHost = process.env.MY_HOST || 'localhost',
  factoryContractName = process.env.FACTORY_CONTRACT_NAME || 'IntegratorFactory',
  codeContractName = process.env.CODE_CONTRACT_NAME || 'DualIntegrator',
  keyFile = process.env.KEY_FILE || './accounts.json',
  jobsOutputFile = process.env.JOBS_FILE || './jobs_output.json';

var codeContractAddress = '';
var chainUrl = 'http://' + chainHost + ':' + chainPort + '/rpc';
var factoryContractAddress = require(jobsOutputFile)['deploy' + factoryContractName];
var keys = require(keyFile)[(chainName + '_full_000')];
var partyAAddress = keys.address;
var partyBAddress = require(keyFile)[(chainName + '_participant_000')].address;
var chainID = partyAAddress; // THIS IS A HACK UNTIL CHAINID's BETTER ON EDB/ERIS.js

var factory = contracts.newContractManagerDev(chainUrl, keys)
  .newContractFactory(JSON.parse(fs.readFileSync(abiDirectory + factoryContractName, 'utf8')))
  .at(factoryContractAddress);

// prose contracts' variables populated
var proseContractsDirectory = process.env.PROSE_CONTRACTS_DIR || './contracts/prose/',
  proseContractsTemplateFile = process.env.PROSE_CONTRACTS_FILE_NAME || 'template.commonform',
  proseContractsTitle = process.env.PROSE_CONTRACTS_TITLE || 'Sample Dual Integrated Contract',
  proseContractsDefaultTerms = process.env.PROSE_CONTRACTS_DEFAULT_TERMS || 'template.json',
  proseContractsHash = '',
  proseContractOpts = {html5: true, title: proseContractsTitle};

var proseContractsDefaultTerms = JSON.parse(fs.readFileSync(proseContractsDirectory + proseContractsDefaultTerms, 'utf8'));
var proseContractsTemplateString = fs.readFileSync(proseContractsDirectory + proseContractsTemplateFile, 'utf8');
var proseContractAsHTML = '',
  proseContractsHash = '';

// docusign variables populated
var hasDocusign = false;
if(process.env.DOCUSIGN_USER != null && process.env.DOCUSIGN_USER != "***") {
  console.log("Docusign User detected. Will integrate Docusign. User: " + process.env.DOCUSIGN_USER)
  hasDocusign = true;

  var docusignUser = process.env.DOCUSIGN_USER,
    docusignPass = process.env.DOCUSIGN_PASS,
    docusignKey = process.env.DOCUSIGN_KEY,
    docusignBaseUrl = process.env.DOCUSIGN_URL || 'https://demo.docusign.net/restapi',
    docusignClient = new docusign.ApiClient(),
    docusignEnvelopeID = '',
    docusignLoginCreds = '{"Username":"' + docusignUser + '","Password":"' + docusignPass + '","IntegratorKey":"' + docusignKey + '"}';

  docusignClient.setBasePath(docusignBaseUrl);
  docusignClient.addDefaultHeader('X-DocuSign-Authentication', docusignLoginCreds);
  docusign.Configuration.default.setDefaultApiClient(docusignClient);

  var docusignAuthApi = new docusign.AuthenticationApi();
  var docusignLoginOps = new docusignAuthApi.LoginOptions();
  docusignLoginOps.setApiPassword('true');
  docusignLoginOps.setIncludeAccountIdGuid('true');
} else {
  console.log("No Docusign User detected. Will not integrate Docusign.")
}

// test prefill
proseContractsDefaultTerms['Contract Factory Address'] = factoryContractAddress;
proseContractsDefaultTerms['Chain ID'] = chainID;
proseContractsDefaultTerms['Party A Address'] = partyAAddress;
proseContractsDefaultTerms['Party B Address'] = partyBAddress;
proseContractsDefaultTerms['Party A Email'] = docusignUser;

// default route should submit the form.
app.get('/', function (req, res) {
  function returnToSender() {
    res.render('index', {
      title: 'Dual Integrator | Home',

      // static variables
      partyAAddress: partyAAddress,
      partyBAddress: partyBAddress,
      factoryContractAddress: factoryContractAddress,
      factoryContractAddresses: factoryContractAddresses,
      myHost: myHost,

      // fields users will fill in
      partyAName: partyAName,
      partyBName: partyBName,
      partyAEmail: partyAEmail,
      partyBEmail: partyBEmail,
      numberOfMonths: numberOfMonths
    });
  };

  // deploys the instrument contract
  function getAllContracts() {
    factory.getAddresses(function(error, result) {
      if (error != null) {
        throw error;
      }
      factoryContractAddresses = result;
      return returnToSender();
    });
  };

  // defaults
  var factoryContractAddresses = [ ],
    partyAName = proseContractsDefaultTerms['Party A Name'],
    partyBName = proseContractsDefaultTerms['Party B Name'],
    partyAEmail = proseContractsDefaultTerms['Party A Email'],
    partyBEmail = proseContractsDefaultTerms['Party B Email'],
    numberOfMonths = proseContractsDefaultTerms['Number of Months'];

  getAllContracts();
});

// submit POST route is what accepts the parameters and performs the dual integration process
app.post('/contract', function(req, res) {
  function signDocumentWithDocusign(){
    console.log("Sending document for signature with Docusign")
    var envelopeId = '';
    docusignAuthApi.login(docusignLoginOps, function (error, loginInfo, response) {
      if (error) {
        throw('Error logging into Docusign API: ' + error);
      }

      if (loginInfo) {
        var loginAccounts = loginInfo.getLoginAccounts();
        var loginAccount = new docusign.LoginAccount();
        loginAccount = loginAccounts[0];
        var accountId = loginAccount.accountId;

        // create an envelope that will store the document(s), field(s), and recipient(s)
        var envDef = new docusign.EnvelopeDefinition();
        envDef.setEmailSubject('Please sign this document from Dual Integrator Demonstrator Application');

        pdf.create(proseContractAsHTML).toBuffer(function(err, buffer){
          // add a document to the envelope
          var doc = new docusign.Document();
          var base64Doc = buffer.toString('base64');
          doc.setDocumentBase64(base64Doc);
          doc.setName(codeContractAddress + '.pdf'); // can be different from actual file name
          doc.setDocumentId('1');

          var docs = [];
          docs.push(doc);
          envDef.setDocuments(docs);

          // add a recipient to sign the document, identified by name and email we used above
          var signer = new docusign.Signer();
          signer.setEmail(partyBEmail);
          signer.setName(partyBName); // XXXX
          signer.setRecipientId('1');
          signer.setClientUserId(partyBAddress);

          // create a signHere tab somewhere on the document for the signer to sign
          // default unit of measurement is pixels, can be mms, cms, inches also
          var signHere = new docusign.SignHere();
          signHere.setDocumentId('1');
          signHere.setPageNumber('1');
          signHere.setRecipientId('1');
          signHere.setXPosition('400');
          signHere.setYPosition('700');

          // can have multiple tabs, so need to add to envelope as a single element list
          var signHereTabs = [];
          signHereTabs.push(signHere);
          var tabs = new docusign.Tabs();
          tabs.setSignHereTabs(signHereTabs);
          signer.setTabs(tabs);

          // add recipients (in this case a single signer) to the envelope
          envDef.setRecipients(new docusign.Recipients());
          envDef.getRecipients().setSigners([]);
          envDef.getRecipients().getSigners().push(signer);

          // send the envelope by setting |status| to "sent". To save as a draft set to "created"
          envDef.setStatus('sent');

          // instantiate a new EnvelopesApi object
          var envelopesApi = new docusign.EnvelopesApi();

          // call the createEnvelope() API
          envelopesApi.createEnvelope(accountId, envDef, null, function (error, envelopeSummary, response) {
            if (error) {
              throw('Error creating envelope: ' + error);
            }

            if (envelopeSummary) {
              envelopeId = envelopeSummary.envelopeId;

              // instantiate a new EnvelopesApi object
              var envelopesApi = new docusign.EnvelopesApi();

              // set the url where you want the recipient to go once they are done signing
              var returnUrl = new docusign.RecipientViewRequest();
              returnUrl.setReturnUrl('http://' + myHost + ':' + appPort + '/complete/' + codeContractAddress + '/' + envelopeId);
              returnUrl.setAuthenticationMethod('email');

              // recipient information must match embedded recipient info we provided in step #2
              returnUrl.setEmail(partyBEmail);
              returnUrl.setUserName(partyBName);
              returnUrl.setRecipientId('1');
              returnUrl.setClientUserId(partyBAddress);

              // call the CreateRecipientView API
              envelopesApi.createRecipientView(accountId, envelopeId, returnUrl, function (error, recipientView, response) {
                if (error) {
                  throw('Error creating client view: ' + error);
                }

                if (recipientView) {
                  return res.redirect(recipientView.url);
                }
              });
            }
          });
        });
      }
    });
  }

  // returns the formulated document
  function renderProseContract(form, defaultTerms) {
    // stolen from https://github.com/commonform/commonform-cli/blob/master/source/transform-for-format.js#L58-L70
    console.log("Rendering a new prose contract via the prose factory template: " + proseContractsTemplateFile)
    var terms = Object.keys(defaultTerms)
      .reduce(function(output, key) {
        var value = defaultTerms[key]
        form.directions.filter(function(direction) {
            return direction.identifier === key
          })
          .forEach(function(direction) {
            output.push({
              blank: direction.path,
              value: value })
          })
        return output
        },
        [ ]
      );

    proseContractAsHTML = require('commonform-html')(form.form, terms, proseContractOpts);
    if (hasDocusign) {
      return signDocumentWithDocusign();
    } else {
      return res.redirect('/complete/' + codeContractAddress + '/' + 'n_a')
    }
  }

  // ensures that the prose params are properly populated
  function assembleProseParams(form) {
    // recieve from the submission of the form
    proseContractsDefaultTerms['Party A Name'] = partyAName;
    proseContractsDefaultTerms['Party B Name'] = partyBName;
    proseContractsDefaultTerms['Party A Email'] = partyAEmail;
    proseContractsDefaultTerms['Party B Email'] = partyBEmail;
    proseContractsDefaultTerms['Number of Months'] = numberOfMonths;
    proseContractsDefaultTerms['Contract Address'] = codeContractAddress;

    return renderProseContract(form, proseContractsDefaultTerms);
  }

  // returns a common form object with both form and directions
  function parseProseContract() {
    var form = require('commonform-markup-parse')(proseContractsTemplateString);
    return assembleProseParams(form);
  }

  // deploys the instrument contract
  function deployCodeContract() {
    console.log("Deploying a new code contract via the code factory contract at address: " + factoryContractAddress)
    factory.createInstrument(numberOfMonths, partyAAddress, partyBAddress, partyAName, partyBName, function(error, result) {
      if (error != null) {
        throw error;
      }
      codeContractAddress = result;
      console.log("Code contract address: " + codeContractAddress)
      return parseProseContract();
    });
  }

  // defaults
  var partyAName = req.body.partyAName,
    partyBName = req.body.partyBName,
    partyAEmail = req.body.partyAEmail,
    partyBEmail = req.body.partyBEmail,
    numberOfMonths = req.body.numberOfMonths;

  console.log("\nNew contract request sent.\nInitiating Dual Integration sequence.\n")
  deployCodeContract();
});

app.get('/complete/:address/:envelope', function(req, res) {
  function addIPFSHashToCodeContract(hash) {
    proseContractsHash = hash[0].hash;

    console.log("Logging the hash of the prose contract from IPFS into the code contract's parameters. Hash: ", proseContractsHash)
    var codeContract = contracts.newContractManagerDev(chainUrl, keys)
      .newContractFactory(JSON.parse(fs.readFileSync(abiDirectory + codeContractName, 'utf8')))
      .at(codeContractAddress);

    codeContract.setHash(proseContractsHash, function(error, result) {
      if (error != null) {
        throw error;
      }

      console.log("Dual Integration sequence complete!")
      return res.redirect('/contract/' + codeContractAddress);
    });
  }

  function getSignedDocumentFromDocusign() {
    console.log("Getting signed document from signature with Docusign")
    docusignAuthApi.login(docusignLoginOps, function (error, loginInfo, response) {
      if (error) {
        throw('Error logging into Docusign API: ' + error);
      }

      if (loginInfo) {
        var loginAccounts = loginInfo.getLoginAccounts();
        var loginAccount = new docusign.LoginAccount();
        loginAccount = loginAccounts[0];
        var accountId = loginAccount.accountId;

        // instantiate a new EnvelopesApi object
        var envelopesApi = new docusign.EnvelopesApi();

        // call the getDocument() API
        envelopesApi.getDocument(accountId, envelopeId, documentId, function (error, document, response) {
          if (error) {
            throw('Error getting document from docusign: ' + error);
          }

          if (document) {
            console.log("Adding prose contract to the IPFS distributed file storage system.")
            ipfs.util.addFromStream(new Buffer(document, 'binary'), function(err, result) {
              if (err) {
                throw err
              }
              return addIPFSHashToCodeContract(result);
            });
          }
        })
      }
    })
  }

  function sendHashToIPFS() {
    ipfs.util.addFromStream(new Buffer(proseContractAsHTML, "utf-8"), function(err, result) {
      if (err) {
        throw err
      }
      return addIPFSHashToCodeContract(result);
    });
  }

  // get defaults from request
  var envelopeId = req.params.envelope,
    codeContractAddress = req.params.address,
    documentId = '1';

  if (hasDocusign) {
    getSignedDocumentFromDocusign();
  } else {
    sendHashToIPFS();
  }
});

app.get('/contract/:address', function(req, res) {
  function returnToSender() {
    res.render('contract', {
      title: "Dual Integrator | Contract: " + codeContractAddress,

      // static variables
      partyAAddress: partyAAddress,
      partyBAddress: partyBAddress,
      factoryContractAddress: factoryContractAddress,
      codeContractAddress: codeContractAddress,
      partyAName: partyAName,
      partyBName: partyBName,
      numberOfMonths: numberOfMonths,
      proseContractsHash: proseContractsHash,
      proseContractAsHTML: proseContractAsHTML,
      myHost: myHost,
    });
  }

  function populateHTML() {
    ipfs.files.get(proseContractsHash, function(error, stream) {
      if (error != null) {
        throw error;
      }

      stream.on('data', (chunk) => {
        proseContractAsHTML += chunk.content.read().toString();
      })

      stream.on('end', () => {
        return returnToSender();
      });
    })
  }

  function populateSecondParams() {
    codeContract.getNames(function(error, result) {
      if (error != null) {
        throw error;
      }
      proseContractsHash = result;
      if (hasDocusign) {
        return returnToSender();
      } else {
        return populateHTML();
      }
    });
  };

  function populateFirstParms() {
    codeContract.getParams(function(error, result) {
      if (error != null) {
        throw error;
      }
      numberOfMonths = result[0]['c'][0];
      partyAAddress = result[1];
      partyBAddress = result[2];
      return populateSecondParams();
    });
  };

  // defaults
  var numberOfMonths = '',
      partyAName = '',
      partyBName = '',
      proseContractsHash = '',
      proseContractAsHTML = '';

  // correct contract
  codeContractAddress = req.params.address;
  var codeContract = contracts.newContractManagerDev(chainUrl, keys)
    .newContractFactory(JSON.parse(fs.readFileSync(abiDirectory + codeContractName, 'utf8')))
    .at(codeContractAddress);

  populateFirstParms();
});

app.listen(appPort, function () {
  console.log('Application listening on port: ' + appPort + '.');
});
