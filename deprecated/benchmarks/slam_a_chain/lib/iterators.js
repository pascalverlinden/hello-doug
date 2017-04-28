/*

Copyright 2016 David Braun
soon to be released as open source

*/

'use strict'

const isPromise = require('is-promise')
const F = require('fairmont')
const stream = require('stream')

const Iterator = function* (value) {
  if (F.isFunction(value)) {
    while (true) {
      yield value()
    }
  } else {
    yield value
  }
}

const iteratorToStream = (iterator) =>
  new stream.Readable({
    read () {
      const push = (next) =>
        this.push(next.done ? null : next.value)

      const next = iterator.next()

      if (isPromise(next)) {
        next.then(push)
      } else {
        push(next)
      }
    }
  })

const intervalAsyncIterator = (delay) => {
  let lastOutput = Date.now()

  return Reactor((yieldResolve) =>
    () =>
      setTimeout(() => {
        lastOutput = Date.now()

        yieldResolve({
          done: false,
          value: lastOutput
        })
      }, delay - (Date.now() - lastOutput))
  )
}

const partitionOnTrigger = (trigger) =>
  (input) =>
    Reactor((enqueue) => {
      const undoableInput = undoableReactor(input)
      let inputDone = false

      const partitionReactor = () =>
        Reactor((partitionEnqueue) => {
          let triggered = false

          const pullInput = () => {
            if (!triggered) {
              undoableInput.next().then((result) => {
                if (triggered) {
                  undoableInput.undo(result)
                  inputDone = false
                } else {
                  partitionEnqueue(result)
                  inputDone = result.done
                }
              })
            }
          }

          trigger.next().then(() => {
            triggered = true

            if (inputDone) {
              enqueue({done: true})
            } else {
              partitionEnqueue({done: true})
              newPartition()
            }
          })

          return pullInput
        })

      const newPartition = () => {
        enqueue({
          done: false,
          value: partitionReactor()
        })
      }

      newPartition()
    })

const poll = F.curry((action, interval) => {
  const reactor = F.flow(
    interval,
    F.map(action),
    pullSerially
  )

  const pull = () =>
    reactor.next().catch(pull)

  return pull().then(F.property('value'))
})

const pullConcurrently = (iterator) =>
  Reactor((enqueue) => {
    const pullInput = () => {
      const next = iterator.next()

      if (next.done) {
        enqueue(next)
      } else {
        enqueue(Promise.resolve(next.value).then((value) => ({
          done: false,
          value
        })))

        setImmediate(pullInput)
      }
    }

    pullInput()
  })

const pullConcurrentlyWithThrottle = F.curry((count, iterator) =>
  Reactor((enqueue) => {
    let throttled = false
    let pending = 0
    let fulfilled = 0

    const pullInput = () => {
      setImmediate(() => {
        if (fulfilled < count) {
          const next = iterator.next()

          if (next.done) {
            enqueue(next)
          } else {
            pending++

            next.value
              .then((value) => {
                pending--
                fulfilled++

                enqueue({
                  done: false,
                  value
                })

                if (throttled) {
                  pullInput()
                }
              })
              .catch((reason) => {
                if (!throttled) {
                  throttled = true
                  console.warn(`Caught error, throttling to ${pending} simultaneous transactions.`)
                }
              })

            if (!throttled) {
              pullInput()
            }
          }
        } else {
          enqueue({done: true})
        }
      })
    }

    pullInput()
  })
)

const pullSerially = F.Method.create()

F.Method.define(pullSerially, F.isIterator, (iterator) =>
  Reactor((yieldResolve, yieldReject) => {
    let pending = 0

    return () => {
      const next = iterator.next()

      if (next.done) {
        if (pending === 0) {
          yieldResolve(next)
        }
      } else {
        pending++

        next.value
          .then((value) => {
            pending--

            yieldResolve({
              done: false,
              value
            })
          })
          .catch(yieldReject)
      }
    }
  })
)

F.Method.define(pullSerially, F.isReactor, (reactor) =>
  Reactor((yieldResolve, yieldReject) => {
    let pending = 0

    return () => {
      reactor.next().then((next) => {
        if (next.done) {
          if (pending === 0) {
            yieldResolve(next)
          }
        } else {
          pending++

          next.value
            .then((value) => {
              pending--

              yieldResolve({
                done: false,
                value
              })
            })
          .catch(yieldReject)
        }
      })
    }
  })
)

const Reactor = (func) => {
  let input = []
  let output = []

  const processQueues = () =>
    setImmediate(() => {
      if (input.length > 0 && output.length > 0) {
        const inputFront = input[0]
        const nextOutput = output.shift()

        if ((inputFront.type === 'resolve') && inputFront.result.done) {
          nextOutput['resolve'](inputFront.result)
        } else {
          const nextInput = input.shift()
          nextOutput[nextInput.type](nextInput.result)
        }

        processQueues()
      }
    }
  )

  const enqueue = F.curry((type, result) => {
    input.push({type, result})
    processQueues()
  })

  const onNext = func(enqueue('resolve'), enqueue('reject'))

  return F.reactor(() =>
    new Promise((resolve, reject) => {
      output.push({resolve, reject})

      if (F.isFunction(onNext)) {
        onNext()
      }

      processQueues()
    })
  )
}

const streamToPromise = (stream) =>
  new Promise((resolve, reject) => {
    stream.once('end', resolve)
    stream.once('error', reject)
  })

// Fairmont's takeN isn't curried and grabs one more result than necessary from
// the iterator before terminating.
const takeN = F.curry(function* (n, iterator) {
  for (let index = 0; index < n; index++) {
    const next = iterator.next()

    if (next.done) {
      break
    } else {
      yield next.value
    }
  }
})

const takeNFromReactor = F.curry((n, reactor) =>
  Reactor((enqueue) => {
    let count = 0

    return () => {
      if (count < n) {
        reactor.next().then((result) => {
          count++
          enqueue(result)
        })
      } else {
        enqueue({done: true})
      }
    }
  })
)

const trace = F.curry((label, value) => {
  console.log(label, value)
  return value
})

const undoableReactor = (reactor) => {
  let input = []
  let output = []

  const process = () => {
    if (input.length > 0 && output.length > 0) {
      output.shift()(input.shift())
      setImmediate(process)
    }
  }

  const undoable = F.reactor(() =>
    new Promise((resolve) => {
      output.push(resolve)

      reactor.next().then((result) => {
        input.push(result)
        process()
      })

      process()
    })
  )

  undoable.undo = (result) => {
    input.unshift(result)
    process()
  }

  return undoable
}

module.exports = {
  Iterator,
  iteratorToStream,
  intervalAsyncIterator,
  partitionOnTrigger,
  poll,
  pullConcurrently,
  pullConcurrentlyWithThrottle,
  pullSerially,
  streamToPromise,
  takeN,
  takeNFromReactor,
  trace
}
