const queue = require('queue')
const eventLoopStats = require('event-loop-stats')
const ks = require('kill-switch')
const bunyan = require('bunyan')
const log = bunyan.createLogger({ name: 'queue-starter' })
const config = require('./config')
const git = require('git-rev')
const createJob = require('./built/createJob')
const createCloudJob = require('./built/createCloudJob').createCloudJob
var gitRev
git.short(function (str) {
  gitRev = str
})

const q = queue()
const cloudQueue = queue()
cloudQueue.concurrency = 100
cloudQueue.on('end', (err) => {
  if (err) {
    throw err
  }
  log.info('Cloud queue end')
})
const findJob = require('./built/findJob')

async function start () {
  log.info('This is the current stats', eventLoopStats.sense())
  const job = await findJob(log, config)
  if (!job || !job.data || !job.data.job_id) {
    if (!q.length) {
      setTimeout(start, 60000)
    }
    return
  }
  if (job.data.queueLength > config.maxQueueLength && config.canStartCloud) {
    log.info('Starting cloud job')
    const run = createCloudJob(config, job, gitRev)
    cloudQueue.push(run)
    cloudQueue.start()
    start()
  } else {
    const run = createJob(config, job, gitRev)
    q.push(run)
    q.start()
  }
}

start()

q.concurrency = 1
q.on('end', (err) => {
  if (err) {
    throw err
  }
  log.info('Local docker queue end')
  start()
})

ks.autoStart()
