'use strict'

const childProcess = require('mz/child_process')
const httpRequest = require('request-promise')
const legacyDb = require('@monax/legacy-db')
const legacyContracts = require('@monax/legacy-contracts')
const fs = require('mz/fs')
const humanizeDuration = require('humanize-duration')
const numeral = require('numeral')
const os = require('os')
const path = require('path')
const Solidity = require('solc')
const url = require('url')

const exec = (command) =>
  childProcess.exec(command).then(([stdout]) => stdout.trim())

const blockchainName = 'slams'

const initDir = () =>
  path.join(
    os.homedir(),
    `.monax/chains/${blockchainName}/${blockchainName.toLowerCase()}_full_000`
  )

const dockerMachineIp = () =>
  exec('docker-machine ip $(docker-machine active)').catch(() => 'localhost')

const blockchainUrl = (hostname, port) =>
  url.format({
    protocol: 'http:',
    slashes: true,
    hostname,
    port,
    pathname: '/rpc'
  })

const blockchainIsAvailable = (url) =>
  new Promise((resolve) => {
    const poll = () => {
      httpRequest(url).then(
        resolve,
        (reason) => {
          if (reason.name === 'RequestError') {
            setTimeout(poll, 100)
          } else {
            resolve()
          }
        }
      )
    }

    poll()
  })

const newBlockchainPort = () => {
  const dir = initDir()

  return exec(`
    monax chains rm --data --dir --force ${blockchainName}
    monax chains make --unsafe ${blockchainName}
    monax chains start --init-dir ${dir} --publish ${blockchainName}
    id=$(monax chains inspect ${blockchainName} Id)
    docker inspect --format=\
'{{(index (index .NetworkSettings.Ports "1337/tcp") 0).HostPort}}' $id
  `, {env: Object.assign({}, process.env, {MONAX_PULL_APPROVE: true})})
}

const newBlockchain = () => {
  console.log(`Creating test blockchain.`)

  return Promise.all([
    dockerMachineIp(),
    newBlockchainPort()
  ]).then(([ipAddress, port]) =>
    Promise.all([
      fs.readFile(path.join(initDir(), 'priv_validator.json'))
        .then(JSON.parse),

      blockchainUrl(ipAddress, port)
    ]).then(([validator, blockchainUrl]) => {
      const blockchain = legacyDb.createInstance(url.format(blockchainUrl))

      return blockchainIsAvailable(blockchainUrl)
        .then(() => ({blockchain, blockchainUrl, validator}))
    })
  )
}

const source = `
    contract SimpleStorage {
        uint storedData;

        function set(uint x) {
            storedData = x;
        }

        function get() constant returns (uint) {
            return storedData;
        }
    }
`

const compile = source =>
  Solidity.compile(source, 1).contracts

const metric = (name, transactions, duration) =>
  transactions > 0
    ? ` (${Math.round(transactions / (duration / 1000))} ` +
      `${name}s per second)`
    : ``

const slam = (count, {name, description, action}, start) => {
  console.log(`\nRepeating ${numeral(count).format('0,0')} ` +
    `times:\n${description}`)

  return new Promise((resolve, reject) => {
    let progressTimeout
    let successes = 0
    let successTimeout
    let throttled = false

    const transact = () => {
      setImmediate(() => {
        action((error) => {
          if (error) {
            if (!throttled) {
              throttled = true
              console.log(`Received error, throttling transactions.`)
            }
          } else {
            successes++
            clearTimeout(successTimeout)

            successTimeout = setTimeout(() => {
              console.log(`Last successful transaction was over 5 seconds ` +
                `ago, giving up.`)

              clearTimeout(progressTimeout)
              resolve(successes)
            }, 5 * 1000)

            if (successes >= count) {
              resolve(successes)
            } else if (throttled) {
              // When we're throttled, start a new transaction only after a
              // previous one completes successfully.
              transact()
            }
          }
        })

        // Start as many transactions at once as we can before we're throttled.
        if (!throttled) {
          transact()
        }
      })
    }

    const reportProgress = () => {
      progressTimeout = setTimeout(() => {
        if (successes < count) {
          reportProgress()
        }

        console.log(`${Math.floor(100 * successes / count)}%` +
          `${metric(name, successes, Date.now() - start)}\n`)
      }, 1000)
    }

    transact()
    reportProgress()
  }).then((successes) => {
    const duration = Date.now() - start

    console.log(`duration: ${humanizeDuration(duration)}` +
      `${metric(name, successes, duration)}`)
  })
}

newBlockchain(blockchainName).then(({blockchain, blockchainUrl, validator}) => {
  const contractManager = legacyContracts.newContractManagerDev(blockchainUrl, {
    address: validator.address,
    pubKey: validator.pub_key,
    privKey: validator.priv_key
  })

  const compiled = compile(source).SimpleStorage
  const abi = JSON.parse(compiled.interface)
  const bytecode = compiled.bytecode
  const contractFactory = contractManager.newContractFactory(abi)

  contractFactory.new({data: bytecode}, (error, contract) => {
    if (error) {
      throw error
    } else {
      const privateKey = validator.priv_key[1]
      const destination = '0000000000000000000000000000000000000010'
      const amount = 1
      const count = 100000

      const send = {
        name: 'send',

        description: `Send ${amount} ether
    from ${validator.address}
    to ${destination}.`,

        action: (callback) =>
          blockchain.txs().send(privateKey, destination, amount, null, callback)
      }

      const set = {
        name: 'set',
        description: 'Set a value in a contract.',

        action: (callback) =>
          contract.set(42, callback)
      }

      slam(count, send, Date.now())
        .then(() =>
          slam(count, set, Date.now())
        )
        .catch(console.error)
    }
  })
})
