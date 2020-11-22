const bunyan = require('bunyan')
const log = bunyan.createLogger({ name: 'queue-starter' })

export class Runlog {
    log
    constructor (data) {
      if (!data.taskDefinition) {
        data.taskDefinition = ''
      }
      if (!data.name) {
        data.name = ''
      }
      this.log = log.child({ job_id: data.job_id, slug: data.slug, php: data.php_version, cloud: !!data.cloud, taskName: data.name, taskDefinition: data.taskDefinition })
      this.log.info('Creating a run log')
    }
}
