# Hello Eris Demo Application

## Setup

### Project
```
npm install
```
### Test Chain
```
cd test
eris keys import chain-config/export-account
eris chains new hello --dir chain-config
```

### Contract Deployment
In Bash Shell:
```
cd contracts
account=$(sed -n -e '/Address/ s/.*Address\":\"\([[:alnum:]]*\)\".*$/\1/p' ../test/chain-config/export-account)
eris pkgs do -c hello -a $account
```

### Application
- Run the test/hello-test.js mocha/chai test script to invoke some basic JS functions
- Use a REST client / browser with the following URLs:
 - POST http://localhost:3080/deals Body: `{"id": "234232", "buyer": "Mike", "seller": "Laura", "amount": 23984}`
 - GET http://localhost:3080/deals
 - GET http://localhost:3080/deal/234232

**NOTE**: the application currently does not support conversion of decimal input, so only full integer amounts can be stored.
