/* eslint no-unused-vars: "off" */
/* eslint @typescript-eslint/no-unused-vars: "error" */
import * as https from 'https'
import * as util from 'util'
import * as Docker from 'dockerode'
import { Runlog } from './RunLog'
import Publisher from './publisher'
import { Writable } from 'stream'
import { Job } from './job'
import promisify from './promisify'
const docker = new Docker()
const request = require('request')

const binds = []
const hostConfig = {
  Memory: 1073741824,
  Binds: binds,
  autoRemove: true
}

function createJob (config, job: Job, gitRev) {
  return async function (callback) {
    const data = job.data
    data.violinist_revision = gitRev
    data.violinist_hostname = config.hostname
    if (!data.php_version) {
      data.php_version = '7.0'
    }
    const dockerImage = util.format('violinist/update-check-runner:%s', data.php_version)
    var runLog = new Runlog(data)
    const res = https.get(config.healthCheckUrl)
    res.on('error', err => {
      runLog.log.error(err)
    })
    const publisher = new Publisher(config)
    var j = request.jar()
    var cookie = request.cookie('XDEBUG_SESSION=PHPSTORM')
    var baseUrl = config.baseUrl
    j.setCookie(cookie, baseUrl)
    var postData = {
      message: {},
      jobId: data.job_id,
      set_state: 'processing',
      token: config.token
    }
    var stdout = new Writable()
    var stdoutdata = []
    stdout._write = function (chunk, enc, next) {
      stdoutdata.push(chunk.toString())
      next()
    }
    var stderr = new Writable()
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
    try {
      const container = await docker.run(dockerImage, ['php', 'runner.php'], [stdout, stderr], {
        HostConfig: hostConfig,
        Env: env,
        Binds: binds,
        TTy: false
      })
      const totalTime = Date.now() - startTime
      runLog.log.info({ containerTime: totalTime }, 'Total time was ' + totalTime)
      const code = container.output.StatusCode
      runLog.log.info('Container ended with status code ' + code)
      const message = {
        stderr: stderrdata,
        stdout: stdoutdata
      }
      if (code === 0) {
        // Notify about the good news.
        postData.set_state = 'success'
        postData.message = message
        runLog.log.info('Posting job data')
        const data = await promisify(publisher.publish.bind(null, postData))
        runLog.log.info('Job complete request code: ' + data.statusCode)
      } else {
        runLog.log.warn('Status code was not 0, it was: ' + code)
        runLog.log.warn('Data from container:', {
          message: message
        })
        postData.message = message
        runLog.log.info('Posting error data to endpoint')
        const data = await promisify(publisher.publish.bind(null, postData))
        runLog.log.info('Job complete request code: ' + data.statusCode)
      }
      runLog.log.info('container removed')
      callback()
    } catch (err) {
      runLog.log.error(err, 'Error with container things')
      callback()
    }
  }
}

module.exports = createJob
