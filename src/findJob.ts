import { Job } from './job'
import FetchError from './fetchError'

const fetchLib = require('node-fetch')

async function findJob (log, config) : Promise<Job> {
  // Start by trying to get a new job.
  try {
    const optsWithHeaders = {
      headers: {
        'x-drupal-http-queue-token': config.token
      }
    }
    const res = await fetchLib(config.baseUrl + '/http-queue/get-a-job', optsWithHeaders)
    if (res.status !== 200) {
      const e = new FetchError('Wrong status code on fetch job')
      e.fetchStatusCode = res.status
      log.info('Job fetch ended with status code', res.status)
      throw e
    }
    const body = await res.json()

    log.info('Found a job, trying to claim job id %d', body.job_id)
    const claimed = await fetchLib(config.baseUrl + '/http-queue/claim/' + body.job_id, optsWithHeaders)
    if (claimed.status !== 200) {
      throw new Error('Did not achieve a claim on job id ' + body.job_id + '. Status code was ' + claimed.status)
    }
    const data = JSON.parse(body.payload)
    data.job_id = body.job_id
    data.queueLength = res.headers.get('x-violinist-queue-length')
    log.info({
      queueLength: data.queueLength
    }, 'Queue is now %d items long', data.queueLength)
    const job = new Job(data)
    return new Promise<Job>(resolve => {
      resolve(job)
    })
  } catch (err) {
    log.info('No jobs found')
    return new Promise<Job>(resolve => {
      resolve(new Job({}))
    })
  }
}

module.exports = findJob
