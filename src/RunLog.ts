const bunyan = require('bunyan')
const config = require('../config')
const log = bunyan.createLogger({ name: 'queue-starter', hostname: config.hostname })

export class Runlog {
    log
    constructor (data) {
      if (!data.taskDefinition) {
        data.taskDefinition = ''
      }
      if (!data.name) {
        data.name = ''
      }
      if (!data.composer_version) {
        data.composer_version = 2
      }
      this.log = log.child({ composer_version: data.composer_version, job_id: data.job_id, slug: data.slug, php: data.php_version, cloud: !!data.cloud, taskName: data.name, taskDefinition: data.taskDefinition })
      this.log.info('Creating a run log')
    }
}
