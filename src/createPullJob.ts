import promisify from './promisify'
import * as Docker from 'dockerode'
const bunyan = require('bunyan')
const docker = new Docker()
const log = bunyan.createLogger({ name: 'queue-starter' })

function createPullJob (version) {
  return async function () {
    try {
      const img = 'violinist/update-check-runner:' + version
      log.info({
        img
      }, 'Pulling img for ' + img)
      const startTime = Date.now()
      const stream = await promisify(docker.pull.bind(docker, img))
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

module.exports = createPullJob
