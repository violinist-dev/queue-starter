const { start, queuePull } = require('./built/start')

const queue = require('queue')
const ks = require('kill-switch')
const bunyan = require('bunyan')
const config = require('./config')
const log = bunyan.createLogger({ name: 'queue-starter', hostname: config.hostname })

const q = queue()
const cloudQueue = queue()
cloudQueue.concurrency = 100
cloudQueue.on('end', (err) => {
  if (err) {
    throw err
  }
  log.info('Cloud queue end')
  start(config, q, cloudQueue)
})

q.concurrency = 1

start(config, q, cloudQueue)
queuePull(config, q)

q.on('end', (err) => {
  if (err) {
    throw err
  }
  log.info('Local docker queue end')
  start(config, q, cloudQueue)
})

ks.autoStart()
