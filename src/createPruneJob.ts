import promisify from './promisify'
import * as Docker from 'dockerode'
const bunyan = require('bunyan')
const docker = new Docker()
const config = require('../config')
const log = bunyan.createLogger({ name: 'queue-starter', hostname: config.hostname })

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

module.exports = createPruneJob
