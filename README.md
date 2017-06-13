# Hello DOUG Demo Application

This is a demo application how to use a Monax blockchain, deploy a simple contract and interact with the contract via JavaScript.
The NodeJS application leverages Monax's JS libraries as well as the [SQLSOL](https://github.com/monax/sqlsol) in-memory SQL cache. A REST services layer is included that serves data from the SQL cache while writing data to the smart contracts. Changes in the blockchain are refleted in the SQL cache through Solidity events.

## Setup

### Prerequisites
The application uses an in-memory SQLite database which needs to be installed before-hand. The `--no-bin-links` parameter was necessary on MacOS, but might not be needed depending on your operating system!
From the root of the project directory, run:

```
sudo npm install -g node-pre-gyp
npm install sqlite3 --save --no-bin-links
npm install
```

### Chain Setup
For demo purposes we can use a plain single-node chain. Execute the following commands to start a new chain. Note that the resulting `accounts.json` contains the public key of the account
which is used by the NodeJS application. If you want to use a chain with a different name, please adapt the name of the `server` account in `config/settings.toml` accordingly.
Also, note that if you are running more than one blockchain, you need to use the `-p` parameter in the `monax chains start` to avoid port conflicts and consequently set the port in `config/settings.toml` (see Appliation Startup -> Checklist below). 

```
monax chains make hello-chain --unsafe
monax chains start hello-chain --init-dir ~/.monax/chains/hello-chain/hello-chain_full_000/
cp ~/.monax/chains/hello-chain/accounts.json ./config/
```

### Contract Deployment
In Bash Shell:
```
cd contracts
fullAccount=$(jq -r '.["hello-chain_full_000"].address' ../config/accounts.json)
monax pkgs do -c hello-chain -a $fullAccount
```

Note: If you do not have `jq` available on the commandline, you can also simply manually copy the address of the _full_ account from `accounts.json` to use as parameter for the `monax pkgs` command.

### Application Startup
From the project root directory:

#### Checklist
- Ensure the chain container's IP address is set correctly in `config/settings.toml`. To do so, run `eris chains inspect hello-chain` and use the `IPAddress` value in the settings.toml file for the `host` setting.
- If your chain is using a host port other than `1337` (which is mapped to port 1337 of the chain container), please adjust the _chain.port_ setting in `config/settings.toml` accordingly. (Hint: Use `monax chains ports hello-chain` to see used ports for hello-chain)

#### Run Node App
- Start the application via `npm start`
- Use a REST client (e.g. Postman) with the following URLs:
 - POST `http://localhost:3080/deals` Body (application/json): `{"id": "234232", "buyer": "Mike", "seller": "Laura", "amount": 15000.99}`
 - GET `http://localhost:3080/deals`
 - GET `http://localhost:3080/deal/234232`

Note: the application currently only supports storing full integer amounts in the smart contract, so a decimal amount is converted by multiplying/dividing as it enters and leaves the NodeJS application.
