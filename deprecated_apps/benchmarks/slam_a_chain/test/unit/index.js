'use strict'

const assert = require('assert')
const F = require('fairmont')
const I = require('../../lib/iterators')

it('polls an action until the returned promise resolves', () => {
  const interval = F.repeat(null)
  const value = Date.now()

  const Action = () => {
    let index = 0

    return () => {
      index++

      return index < 5
        ? Promise.reject()
        : Promise.resolve(value)
    }
  }

  return I.poll(Action(), interval).then((result) => {
    assert.equal(result, value)
  })
})
