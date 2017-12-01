const queue = require('queue')
const util = require('util')
const ks = require('kill-switch')
const Docker = require('dockerode')
const redis = require('redis')
const path = require('path')
const request = require('request')
const bunyan = require('bunyan')
let log = bunyan.createLogger({name: 'queue-starter'})
const config = require('./config')

function RunLog (data) {
  this.log = log.child({job_id: data.job_id, slug: data.slug, php: data.php_version})
  this.log.info('Creating a run log')
}

var Writable = require('stream').Writable

let docker = new Docker()
let binds = []
binds.push(path.join(__dirname, 'composer-cache:/root/.composer/cache'))

let client = redis.createClient()
client.psubscribe('violinist-queue', () => {
  log.info('Subscribed to redis')
})

function createJob (data) {
  return function (callback) {
    if (!data.php_version) {
      data.php_version = '7.0'
    }
    let dockerImage = util.format('violinist/update-check-runner:%s', data.php_version)
    var runLog = new RunLog(data)
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
        log.error(err)
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
            throw err
          }
          runLog.log.info('Status update request code: ' + data.statusCode)
        })
      } else {
        runLog.log.warn('Status code was not 0, it was: ' + code)
        runLog.log.warn('Data from container:', {
          message: message
        })
      }
      return container.remove()
    }).then(function (data) {
      runLog.log.info('container removed')
      callback()
    }).catch(function (err) {
      runLog.log.error(err, 'Error with container things')
    })
  }
}

client.on('pmessage', (channel, pattern, message) => {
  try {
    let data = JSON.parse(message)
    log.info('Adding something to the queue: ', data.slug)
    q.unshift(createJob(data))
    q.start()
  } catch (err) {
    throw err
  }
})

let q = queue()

q.concurrency = 1
q.on('end', (err) => {
  if (err) {
    throw err
  }
  log.debug('Queue end')
})

ks.autoStart()
