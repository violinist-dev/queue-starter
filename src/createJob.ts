/* eslint no-unused-vars: "off" */
/* eslint @typescript-eslint/no-unused-vars: "error" */
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
const getHostConfig = function (type: string, config) {
  const hostConfig = {
    Memory: 2147483648,
    Binds: binds,
    autoRemove: true,
    ExtraHosts: []
  }
  if (type === 'update') {
    // For now just making sure the coding standard is correct.
    hostConfig.Binds = []
  }
  if (config.extraHosts) {
    hostConfig.ExtraHosts = config.extraHosts
  }
  return hostConfig
}
function createJob (config, job: Job, gitRev) {
  return async function (callback) {
    const data = job.data
    data.violinist_revision = gitRev
    data.violinist_hostname = config.hostname
    if (!data.php_version) {
      data.php_version = '8.0'
    }
    if (!data.composer_version) {
      data.composer_version = '2'
    }
    let dockerImage = util.format('ghcr.io/violinist-dev/update-check-runner:%s-multi-composer-%s', data.php_version, data.composer_version)
    // Of course, if the job is trying to say that the type is different, we might want to also use a different image.
    let type = 'update'
    if (data.type === 'violinist_needs_update_checker') {
      dockerImage = 'needs-update-check-runner'
      type = 'needsUpdate'
    }
    var runLog = new Runlog(data)
    runLog.log.info('Using image', dockerImage)
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
      const container = await docker.run(dockerImage, ['php', '/app/runner'], [stdout, stderr], {
        HostConfig: getHostConfig(type, config),
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
        const data = await promisify(publisher.publish.bind(publisher, postData))
        runLog.log.info('Job complete request code: ' + data.statusCode)
      } else {
        postData.set_state = 'failure'
        runLog.log.warn('Status code was not 0, it was: ' + code)
        runLog.log.warn('Data from container:', {
          message: message
        })
        postData.message = message
        runLog.log.info('Posting error data to endpoint')
        const data = await promisify(publisher.publish.bind(publisher, postData))
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
