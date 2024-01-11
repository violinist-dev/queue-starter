const createJob = require('./createJob')
const bunyan = require('bunyan')
const createCloudJob = require('./createCloudJob').createCloudJob
const createPruneJob = require('./createPruneJob')
const createPullJob = require('./createPullJob')
const supportedPhpVersions = require('./supportedPhpVersions')
const sleep = require('await-sleep')
const git = require('git-rev')
var gitRev
git.short(function (str) {
  gitRev = str
})
const findJob = require('./findJob')

var stopTheThing = false
function stopIt () {
  stopTheThing = true
}

const queue = require('queue')
var startFuncQueue = queue()
startFuncQueue.concurrency = 1

async function createStart (config, q, cloudQueue) {
  if (stopTheThing) {
    return
  }
  const sleepTime = config.sleepTime ? config.sleepTime : 1000
  const cloudSleepTime = config.cloudSleepTime ? config.cloudSleepTime : 3000
  const completeCallback = config.completeCallback ? config.completeCallback : start
  const log = bunyan.createLogger({ name: 'queue-starter', hostname: config.hostname })
  const job = await findJob(log, config)
  if (!job || !job.data || !job.data.job_id) {
    if (!q.length && !cloudQueue.length) {
      await sleep(sleepTime)
      if (!q.length && !cloudQueue.length) {
        await completeCallback(config, q, cloudQueue)
      }
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
    await sleep(cloudSleepTime)
    await completeCallback(config, q, cloudQueue)
  } else {
    const run = createJob(config, job, gitRev)
    q.push(run)
    q.start()
  }
}

async function start (config, q, cloudQueue) {
  startFuncQueue.push(createStart.bind(null, config, q, cloudQueue))
  startFuncQueue.start()
}

async function queuePull (config, q) {
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
  setTimeout(queuePull.bind(null, config, q), (60 * 1000 * 60))
}

export { queuePull, start, stopIt }
