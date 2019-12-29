/* eslint no-unused-vars: "off" */
/* eslint @typescript-eslint/no-unused-vars: "error" */
import { Job } from './job'
import * as AWS from 'aws-sdk'
import * as util from 'util'
import * as sleep from 'await-sleep'
import Publisher from './publisher'
import { Runlog } from './RunLog'
import promisify from './promisify'

export function createCloudJob (config, job: Job, gitRev) {
  return async function runJob (callback) {
    const logData = job.data
    logData.cloud = true
    var runLog = new Runlog(logData)
    runLog.log.info('Trying to start cloud job for ' + logData.slug)
    try {
      const awsconfig = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        apiVersion: config.apiVersion
      }
      const data = job.data
      data.violinist_revision = gitRev
      // This log data property is not something we want as ENV. Also, it fails, since it is a boolean.
      delete data.cloud
      // And this also fails since it is a number.
      delete data.queueLength
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
      let name = 'violinist-70'
      let taskDefinition = 'violinist-task-70'
      switch (data.php_version) {
        case '7.1':
          name = 'violinist-71'
          taskDefinition = 'violinist-task-71'
          break
        case '7.2':
          name = 'violinist-72'
          taskDefinition = 'violinist-task-72'
          break
        case '7.3':
          name = 'violinist-73'
          taskDefinition = 'violinist-task-73'
          break
      }
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
            logStreamName: util.format('ecs/%s/%s', name, arnParts[1])
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
