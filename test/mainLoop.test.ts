import * as should from 'should'
const sleep = require('await-sleep')
import { Job } from '../src/job'
var jobPool = []
while (jobPool.length < 2) {
    let key = jobPool.length + 1
    var job = new Job({
        nid: key,
        job_id: key
    })
    jobPool.push(job)
}
const fakeFindJob = async (log, config) => {
    config.findJobCalls++
    var job = jobPool.shift()
    if (job instanceof Job) {
        return new Promise<Job>(resolve => {
            resolve(job)
        })
    }
    return new Promise<Job>(resolve => {
        resolve(new Job({}))
    })
}
const fakeCreateCloudJob = {
    createCloudJob: (config, job: Job, gitRev) => {
        return async function runJob (callback) {
            await sleep(4000)
            callback()
        }
    }
}
const proxyquire = require('proxyquire').noCallThru();
const { start } = proxyquire('../src/start', {
    './findJob': fakeFindJob,
    './createCloudJob': fakeCreateCloudJob
})

var startCalls = 0
const wrappedStart = async(config, q, cloudQueue) => {
    startCalls++
    if (startCalls > 3) {
        throw new Error('More than 3 start calls over here')
    }
    console.log(startCalls)
    return start(config, q, cloudQueue)
}

const queue = require('queue')

describe('That main function polling over there', () => {
    it('Should be possible to start I guess', async () => {
        const myQueue = queue()
        const myCloudQueue = queue()
        var myConfig = {
            findJobCalls: 0,
            completeCallback: wrappedStart,
            endedCalls: 0,
            baseUrl: 'http://example.com',
            runCloud: true,
            hostname: 'myHostName',
            sleepTime: 100
        }
        myCloudQueue.on('end', function() {
            myConfig.endedCalls++
            console.log('queue end')
            wrappedStart(myConfig, myQueue, myCloudQueue)
        })
        let promise = new Promise<null>(async (resolve, reject) => {
            await wrappedStart(myConfig, myQueue, myCloudQueue)
            while (true) {
                await sleep(1)
                if (startCalls === 3) {
                    resolve(null)
                }
            }
            resolve(null)
        })
        return promise
    })
})