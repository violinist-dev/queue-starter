import * as should from 'should'
const http = require('http')
var counter = 1
var port = 25212
var lastReq
var smallestInterval
const server = http.createServer(function (req, res) {
    if (req.url === "/http-queue/get-a-job") {
        if (!lastReq) {
            lastReq = Date.now()
        } else {
            const reqInterval = Date.now() - lastReq
            if (!smallestInterval) {
                smallestInterval = reqInterval
            }
            if (smallestInterval > reqInterval) {
                smallestInterval = reqInterval
            }
            lastReq = Date.now()
        }
    }
    if (counter % 10 === 0) {
        res.setHeader('x-violinist-aws', 1)
    }
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify({
        job_id: counter,
        payload: JSON.stringify({
            data: {
                job_id: counter
            },
            php_version: '8.3'
        })
    }));
    counter++
    res.end();
});
server.listen(port)
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
            await sleep(1000)
            callback()
        }
    }
}
const proxyquire = require('proxyquire').noCallThru();
const { start, stopIt } = proxyquire('../src/start', {
    './createCloudJob': fakeCreateCloudJob
})

var startCalls = 0
const wrappedStart = async(config, q, cloudQueue) => {
    startCalls++
    if (startCalls > 40) {
        return
    }
    let promise = new Promise<null>(async (resolve, reject) => {
        await start(config, q, cloudQueue)
        resolve(null)
    })
    return promise
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
            baseUrl: 'http://localhost:' + port,
            runCloud: true,
            hostname: 'myHostName',
            sleepTime: 100,
            cloudSleepTime: 100
        }
        myCloudQueue.on('end', function() {
            wrappedStart(myConfig, myQueue, myCloudQueue)
        })
        let promise = new Promise<null>(async (resolve, reject) => {
            await wrappedStart(myConfig, myQueue, myCloudQueue)
            while (startCalls <= 40) {
                await sleep(1)
            }
            stopIt()
            server.close()
            if (smallestInterval < 100) {
                throw new Error('Smallest interval (' + smallestInterval + ') was smaller than the smallest pause')
            }
            resolve(null)
        })
        return promise
    })
})
