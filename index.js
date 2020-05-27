const queue = require('queue')
const Docker = require('dockerode');
let docker = new Docker()
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

setInterval(async () => {
  const imgs = [
    '7.0',
    '7.1',
    '7.2',
    '7.3',
    '7.4',
  ]
  const jobs = imgs.map(async (img) => {
    log.info('Pulling img for ' + img, {
      img
    })
    let startTime = Date.now()
    let stream = await promisify(docker.pull.bind(docker, 'violinist/update-check-runner:' + img))
    for await (const chunk of stream) {
      // Just so we are not doing to much at the same time.
    }
    let pullTime = Date.now() - startTime
    log.info('Pull finished for ' + img, {
      pullTime,
      img
    })
  })

  await Promise.all(jobs)

}, 10000)

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
