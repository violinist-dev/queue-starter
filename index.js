const queue = require('queue')
const eventLoopStats = require('event-loop-stats')
const ks = require('kill-switch')
const bunyan = require('bunyan')
const config = require('./config')
const log = bunyan.createLogger({ name: 'queue-starter', hostname: config.hostname })
const git = require('git-rev')
const createJob = require('./built/createJob')
const createCloudJob = require('./built/createCloudJob').createCloudJob
const createPruneJob = require('./built/createPruneJob')
const createPullJob = require('./built/createPullJob')
const supportedPhpVersions = require('./built/supportedPhpVersions')
const sleep = require('await-sleep')
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
  start()
})
const findJob = require('./built/findJob')

async function start () {
  log.info('This is the current stats', eventLoopStats.sense())
  const job = await findJob(log, config)
  if (!job || !job.data || !job.data.job_id) {
    if (!q.length) {
      log.info('Waiting for 60 seconds to look for a another job')
      setTimeout(start, 60000)
    } else {
      log.info('It seems we already have a something in the queue, trusting job search to be coming up')
    }
    return
  }
  if (config.runCloud) {
    log.info('Starting cloud job')
    const run = createCloudJob(config, job, gitRev)
    cloudQueue.push(run)
    cloudQueue.start()
    await sleep(3000)
    start()
  } else {
    const run = createJob(config, job, gitRev)
    q.push(run)
    q.start()
  }
}

async function queuePull () {
  if (config.runCloud) {
    return
  }
  const imgs = supportedPhpVersions
  const jobs = imgs.map(async (version) => {
    var imgs = [
      `${version}-multi-composer-1`,
      `${version}-multi-composer-2`
    ]
    imgs.forEach((img) => {
      q.push(createPullJob(img))
      q.push(createPruneJob(img))
    })
    q.start()
  })

  await Promise.all(jobs)
  setTimeout(queuePull, (60 * 1000 * 60))
}

q.concurrency = 1

start()
queuePull()

q.on('end', (err) => {
  if (err) {
    throw err
  }
  log.info('Local docker queue end')
  start()
})

ks.autoStart()
