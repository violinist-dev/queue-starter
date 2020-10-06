const queue = require('queue')
const Docker = require('dockerode')
const docker = new Docker()
const eventLoopStats = require('event-loop-stats')
const ks = require('kill-switch')
const bunyan = require('bunyan')
const log = bunyan.createLogger({ name: 'queue-starter' })
const config = require('./config')
const git = require('git-rev')
const createJob = require('./built/createJob')
const promisifyModule = require('./built/promisify')
const promisify = promisifyModule.default
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
      log.info('Waiting for 60 seconds to look for a another job')
      setTimeout(start, 60000)
    } else {
      log.info('It seems we already have a something in the queue, trusting job search to be coming up')
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

function createPullJob (img) {
  return async function () {
    try {
      log.info({
        img
      }, 'Pulling img for ' + img)
      const startTime = Date.now()
      const stream = await promisify(docker.pull.bind(docker, 'violinist/update-check-runner:' + img))
      for await (const _ of stream) {
        // Ignore this, but use the variable so standard does not complain.
        let chunk = _
        chunk = chunk.toString()
      }
      const pullTime = Date.now() - startTime
      log.info({
        pullTime,
        img
      }, 'Pull finished for ' + img)
    } catch (err) {
      log.error(err, 'There was an error: ')
    }
  }
}

function createPruneJob (img) {
  return async function () {
    try {
      log.info({
        img
      }, 'Prune img for ' + img)
      const startTime = Date.now()
      const pruneData = await promisify(docker.pruneImages.bind(docker, {
        label: 'violinist/update-check-runner:' + img,
        dangling: true
      }))
      log.info({
        pruneData,
        img
      }, 'Prune data')
      const pruneTime = Date.now() - startTime
      log.info({
        pruneTime,
        img
      }, 'Prune finished for ' + img)
    } catch (err) {
      log.error(err, 'There was an error: ')
    }
  }
}

async function queuePull () {
  const imgs = [
    '7.0',
    '7.1',
    '7.2',
    '7.3',
    '7.4'
  ]
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
