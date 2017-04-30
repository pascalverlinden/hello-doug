# Dual Integration Example Application

**Status**: beta (ready for external testing)

## Introduction

This is an example application for [dual integration](https://erisindustries.com/components/erislegal/), a conceptual linkage between a contract that is written in prose (and therefore can be taken to court) along with a contract that is written in code and runs on a smart contract compatible blockchain (hereinafter "chain").

The dual integration example takes a set of parameters and uses those to deploy a code contract from what is called a `factory contract`. Factory contracts are contracts which create other contracts and are used within smart contract compatible chains in a similar manner to how object oriented programmers utilize class definitions.

After the code contract is created via the set of parameters which are passed to the `factory contract` then the application leverages the excellent [CommonForm](https://commonform.org) document assembly mechanisms to create a template of the prose contract using the exact same parameters which were passed to the code contract as well as the addresses on the chain of the various entities and contracts.

Next the application sends the assembled prose contract to [Docusign's API Sandbox](https://www.docusign.com/developer-center/api-overview) for signature (to use this feature you will need to register for a docusign API key, more on that below).

Next the assembled package of contracts is sent to the [IPFS](https://ipfs.io) distributed file storage system for p2p distribution of the files. The final step is registration of the immutable hash which IPFS utilizes in its [content addressable storage](https://en.wikipedia.org/wiki/Content-addressable_storage) system into the proper parameters of the code contract.

## Screenshots

#### Index Page

![Index page](images/index-ing.png?raw=true "Index page")

#### Contract Details (without Docusign)

![Contract details](images/contract-details.png?raw=true "Contract details")

#### Contract Details (with Docusign)

![Contract details with docusign](images/contract-details-docusign.png?raw=true "Contract details -- with Docusign")

* Note, this view uses a super slick way of embedding pdf documents right from their hash! See `views/contract.pug`.

#### Docusign-ing

![Docusign-ing](images/docusign-ing.png?raw=true "Docusign-ing")

## What does this demonstrate?

This application demonstrates the proper integration of a piece of code which tracks a given relationship into the legal contract that provides the overarching legal framework for that relationship. This integration, when done according to the proper legalities in the relevant jurisdiction(s) ensures that there is a clear distinction as well as integration of both the code and the prose contracts into each other.

## Installation

First, ensure that you have [eris installed](https://docs.erisindustries.com/tutorials/getting-started).

Second get this directory either from IPFS or via cloning this repository.

To get this directory from IPFS:

```bash
eris services start ipfs
eris files get QmexoM66S7TdoQ3E2Vp767Hbdy7UBwVZphgHPKXuwNQF4L -o dual_integrator
cd dual_integrator
```

## Operate

A script which provides all the necessary functionality has been included in the root directory of this folder. If you downloaded the directory from IPFS then you will need to perform the following:

```bash
chmod -R +x scripts
```

If you cloned the repository from git then you will not need to do so.

Now start the application with:

```bash
scripts/run
```

### Linux

Once the application has booted then go to http://localhost:3000/ in your browser.

### OSX

Once the application has booted then go to http://IP:3000/ in your browser, where IP is the docker-machine IP of your `eris` machine.

## Utilizing Docusign

If you would like to see the docusign API leveraged then you will need to [register for a Docusign Developer Sandbox and API Key](https://www.docusign.com/developer-center).

Once you have those then change the `dualintegrator.toml` file in the appropriate lines for your user, password, and API key.

Once you have filled in those fields, then re-run the `scripts/run` script and you'll be good to go!



## License

MIT (see repository root).