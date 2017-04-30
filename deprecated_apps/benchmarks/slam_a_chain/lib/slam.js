'use strict'

const F = require('fairmont')
const I = require('./iterators')

const slam = (count) => F.pipe(
  I.Iterator,
  I.pullConcurrentlyWithThrottle(count),
  I.partitionOnTrigger(I.intervalAsyncIterator(1000)),
  F.map(F.reduce(F.add(1), 0)),
  I.pullSerially,
  F.accumulate(F.add, 0)
)

module.exports = slam
