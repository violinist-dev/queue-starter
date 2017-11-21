const queue = require('queue')
const ks = require('kill-switch')
const Docker = require('dockerode')
const redis = require('redis')
const path = require('path')
const request = require('request')
const config = require('./config')

var Writable = require('stream').Writable

let docker = new Docker()
let binds = []
binds.push(path.join(__dirname, 'composer-cache:/root/.composer/cache'))

let client = redis.createClient()
client.psubscribe('violinist-queue')

function createJob (data) {
  return function (callback) {
    var j = request.jar();
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
      console.log(err)
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
    console.log('Starting container for', data.slug)
    docker.run('violinist-worker', ['php', 'runner.php'], [stdout, stderr], {
      Env: env,
      Binds: binds,
      TTy: false
    }).then(function (container) {
      let code = container.output.StatusCode
      console.log('Container ended with status code ' + code)
      if (code === 0) {
        // Notify about the good news.
        postData.set_state = 'success'
        postData.message = {
          stderr: stderrdata,
          stdout: stdoutdata
        }
        request({
          url: url,
          jar: j,
          method: 'POST',
          body: postData,
          json: true
        }, (err, data) => {
          if (err) throw err
        })
      }
      return container.remove()
    }).then(function (data) {
      console.log('container removed')
      callback()
    }).catch(function (err) {
      console.log(err)
    })
  }
}

client.on('pmessage', (channel, pattern, message) => {
  try {
    let data = JSON.parse(message)
    console.log('Adding something to the queue: ', data.slug)
    q.push(createJob(data))
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
  console.log('Queue end')
})

ks.autoStart()
