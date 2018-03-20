const queue = require('queue')
const https = require('https')
const util = require('util')
const ks = require('kill-switch')
const Docker = require('dockerode')
const redis = require('redis')
const path = require('path')
const request = require('request')
const publisher = require('./publisher')
const bunyan = require('bunyan')
let log = bunyan.createLogger({name: 'queue-starter'})
const config = require('./config')
const fetch = require('node-fetch')

function RunLog (data) {
  this.log = log.child({job_id: data.job_id, slug: data.slug, php: data.php_version})
  this.log.info('Creating a run log')
}

var Writable = require('stream').Writable

let docker = new Docker()
let binds = []
binds.push(path.join(__dirname, 'composer-cache:/root/.composer/cache'))
binds.push(path.join(__dirname, 'cosy-cache:/root/.cosy-cache'))
const hostConfig = {
  Memory: 134217728,
  CpuPeriod: 100000,
  CpuQuota: 50000,
  Binds: binds
}
let client = redis.createClient()
client.psubscribe('violinist-queue', () => {
  log.info('Subscribed to redis')
})
log.info('Starting with the follwing host config:', hostConfig)

function createJob (data) {
  return function (callback) {
    https.get(config.healthCheckUrl)
    if (!data.php_version) {
      data.php_version = '7.0'
    }
    let dockerImage = util.format('violinist/update-check-runner:%s', data.php_version)
    var runLog = new RunLog(data)
    var publishResult = publisher(config, runLog)
    var j = request.jar()
    var cookie = request.cookie('XDEBUG_SESSION=PHPSTORM')
    var baseUrl = config.baseUrl
    var url = baseUrl + '/cronner/queue'
    j.setCookie(cookie, baseUrl)
    var postData = {
      job_id: data.job_id,
      set_state: 'processing',
      token: config.token
    }
    request({url: url, jar: j, method: 'POST', body: postData, json: true}, function (err, data) {
      if (err) {
        runLog.log.error(err)
        throw err
      }
      runLog.log.debug('Posted update about job with status code', data.statusCode)
    })
    var stdout = Writable()
    var stdoutdata = []
    stdout._write = function (chunk, enc, next) {
      stdoutdata.push(chunk.toString())
      next()
    }
    var stderr = Writable()
    var stderrdata = []
    stderr._write = function (chunk, enc, next) {
      stderrdata.push(chunk.toString())
      next()
    }
    var env = []
    Object.keys(data).forEach((n) => {
      var val = data[n]
      env.push(`${n}=${val}`)
    })
    runLog.log.info('Starting container for', data.slug)
    var startTime = Date.now()
    docker.run(dockerImage, ['php', 'runner.php'], [stdout, stderr], {
      HostConfig: hostConfig,
      Env: env,
      Binds: binds,
      TTy: false
    }).then(function (container) {
      let totalTime = Date.now() - startTime
      runLog.log.info({containerTime: totalTime}, 'Total time was ' + totalTime)
      let code = container.output.StatusCode
      runLog.log.info('Container ended with status code ' + code)
      let message = {
        stderr: stderrdata,
        stdout: stdoutdata
      }
      if (code === 0) {
        // Notify about the good news.
        postData.set_state = 'success'
        postData.message = message
        request({
          url: url,
          jar: j,
          method: 'POST',
          body: postData,
          json: true
        }, (err, data) => {
          if (err) {
            runLog.log.error(err, 'Error with posting success state')
            container.remove()
            throw err
          }
          runLog.log.info('Status update request code: ' + data.statusCode)
        })
        runLog.log.info('Posting to new endpoint as well')
        publishResult(postData, (err, data) => {
          if (err) {
            runLog.log.error(err, 'Error when completing job in new endpoint')
            container.remove()
            throw err
          }
          runLog.log.info('Job complete request code: ' + data.statusCode)
        })
      } else {
        runLog.log.warn('Status code was not 0, it was: ' + code)
        runLog.log.warn('Data from container:', {
          message: message
        })
        postData.message = message
        runLog.log.info('Posting error data to endpoint')
        publishResult(postData, (err, data) => {
          if (err) {
            runLog.log.error(err, 'Error when completing job in new endpoint')
            container.remove()
            throw err
          }
          runLog.log.info('Job complete request code: ' + data.statusCode)
        })
      }
      return container.remove()
    }).then(function (data) {
      runLog.log.info('container removed')
      callback()
    }).catch(function (err) {
      runLog.log.error(err, 'Error with container things')
      callback(err)
    })
  }
}

let q = queue()

client.on('pmessage', (channel, pattern, message) => {
  try {
    log.info('New data should be available')
    if (q.length > 0) {
      findJob()
    }
  } catch (err) {
    throw err
  }
})

async function findJob () {
  // Start by trying to get a new job.
  try {
    let optsWithHeaders = {
      headers: {
        'x-drupal-http-queue-token': config.token
      }
    }
    let res = await fetch(config.baseUrl + '/http-queue/get-a-job', optsWithHeaders)
    if (res.status !== 200) {
      let e = new Error('Wrong status code on fetch job')
      e.fetchStatusCode = res.status
      log.info('Job fetch ended with status code', res.status)
      throw e
    }
    let body = await res.json()
    log.info('Found a job, trying to claim job id %d', body.job_id)
    let claimed = await fetch(config.baseUrl + '/http-queue/claim/' + body.job_id, optsWithHeaders)
    if (claimed.status !== 200) {
      throw new Error('Did not achieve a claim on job id ' + body.job_id + '. Status code was ' + claimed.status)
    }
    let data = JSON.parse(body.payload)
    data.job_id = body.job_id
    q.push(createJob(data))
    log.info({
      queueLength: q.length
    }, 'Queue is now %d items long', q.length)
    q.start()
  } catch (err) {
    if (!err.fetchStatusCode || err.fetchStatusCode !== 404) {
      log.warn(err, 'Caught error when finding job')
    }
    setTimeout(findJob, 60000)
  }
}

findJob()

q.concurrency = 1
q.on('end', (err) => {
  if (err) {
    throw err
  }
  log.info('Queue end')
  findJob()
})

ks.autoStart()
