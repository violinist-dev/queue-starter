/* eslint no-unused-vars: "off" */
/* eslint @typescript-eslint/no-unused-vars: "error" */
import { Job } from './job'
import * as AWS from 'aws-sdk'
import * as util from 'util'
import * as sleep from 'await-sleep'
import Publisher from './publisher'
import { Runlog } from './RunLog'
import promisify from './promisify'

const createEcsName = (data) => {
  // Should be named like this:
  // PHP version 7.1 => 71
  // PHP version 8.0 => 80
  // ...and so on.
  if (!data.php_version) {
    data.php_version = '7.2'
  }
  return data.php_version.replace('.', '')
}

const createEcsTaskDefinition = (data) => {
  // Should be named like this:
  // violinist-71-composer-1
  // Where 71 means version 7.1, and 1 means composer version 1.
  if (!data.composer_version) {
    data.composer_version = 1
  }
  return util.format('violinist-%s-composer-%s', createEcsName(data), data.composer_version)
}

export function createCloudJob (config, job: Job, gitRev) {
  return async function runJob (callback) {
    const logData = job.data
    const data = job.data
    const name = createEcsName(data)
    const taskDefinition = createEcsTaskDefinition(data)
    logData.cloud = true
    logData.name = name
    logData.taskDefinition = taskDefinition
    var runLog = new Runlog(logData)
    runLog.log.info('Trying to start cloud job for ' + logData.slug)
    try {
      const awsconfig = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        apiVersion: config.apiVersion
      }
      data.violinist_revision = gitRev
      // This log data property is not something we want as ENV. Also, it fails, since it is a boolean.
      delete data.cloud
      // And this also fails since it is a number.
      delete data.queueLength
      // This is also a number, but since we need it, let's convert it to a string.
      if (data.composer_version) {
        data.composer_version = data.composer_version.toString()
      }
      const env = Object.keys(data).map(key => {
        return {
          name: key,
          value: job.data[key]

        }
      })
      env.push({
        name: 'violinist_hostname',
        // We use this to identify the runners are from the cloud.
        value: 'violinist-e2'
      })
      const ecsClient = new AWS.ECS(awsconfig)
      const watchClient = new AWS.CloudWatchLogs(awsconfig)
      const startTime = Date.now()
      const taskData = await ecsClient.runTask({
        cluster: 'violinist-cluster',
        count: 1,
        launchType: 'FARGATE',
        networkConfiguration: {
          awsvpcConfiguration: {
            assignPublicIp: 'ENABLED',
            subnets: [
              config.subnet
            ]
          }
        },
        overrides: {
          containerOverrides: [
            {
              environment: env,
              name: name
            }
          ]
        },
        taskDefinition: taskDefinition
      }).promise()
      if (!taskData.tasks.length) {
        throw new Error('No valid ARN found')
      }
      const task = taskData.tasks[0]
      const taskArn = task.taskArn
      const arnParts = taskArn.split('/')
      let retries = 0
      let events = []
      while (true) {
        try {
          retries++
          const list = await watchClient.getLogEvents({
            logGroupName: util.format('/ecs/%s', taskDefinition),
            logStreamName: util.format('ecs/%s/%s', name, arnParts[2])
          }).promise()
          events = list.events
          if (events.length) {
            break
          }
        } catch (logErr) {

        }
        if (retries > 240) {
          throw new Error('Retries reached: ' + retries)
        }
        await sleep(5000)
      }
      const totalTime = Date.now() - startTime
      runLog.log.info({ containerTime: totalTime }, 'Total time was ' + totalTime)
      const stdout = events.map(event => {
        return event.message
      })
      const message = {
        stdout,
        stderr: ''
      }
      const updateData = {
        jobId: data.job_id,
        token: config.token,
        message,
        set_state: 'success'
      }
      const publisher = new Publisher(config)
      const statusData = await promisify(publisher.publish.bind(publisher, updateData))
      runLog.log.info('Job complete request code: ' + statusData.statusCode)
      callback()
    } catch (err) {
      runLog.log.error(err, 'There was an error running a cloud task')
      // We do not care if things go ok, since things are queued so many times anyway.
      callback()
    }
  }
}
