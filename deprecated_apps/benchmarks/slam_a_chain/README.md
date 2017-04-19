# Slam a Chain

Step right up folks and get ready to slam a chain, a blockchain that is!  This application creates a test blockchain and slams it with 100,000 `sends` and 100,000 contract calls in order to benchmark performance.  Transactions are sent in parallel until Burrow responds with an error, at which point the number of simultaneous transactions is throttled.

## Prerequisites

* [Git](https://git-scm.com/)
* [Monax](https://monax.io/) version 0.16
* [Node.js](https://nodejs.org/) version 6 or higher

## Installation

`npm install`

## Use

`npm start`

## Known Issues

The `sends` test fails to complete, complaining of `Error broadcasting transaction: Unknown error returned: Duplicate transaction (ignored)` errors.
