import * as should from 'should'
const http = require('http')
var counter = 1
var port = 25213
var lastReq
var smallestInterval
var completed
var reachedTwenty
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
    res.setHeader('x-violinist-aws', 1)
    counter++
    if (counter === 20) {
        reachedTwenty = Date.now()
    }
    if ((counter > 10 && counter < 20) || counter > 30) {
        res.writeHead(404, {'Content-Type': 'application/json'});
        res.end()
        return
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
    res.end();
});
server.listen(port)
const sleep = require('await-sleep')
import { Job } from '../src/job'
const cloudTakesTime = 1000
const fakeCreateCloudJob = {
    createCloudJob: (config, job: Job, gitRev) => {
        return async function runJob (callback) {
            await sleep(cloudTakesTime)
            callback()
        }
    }
}
const proxyquire = require('proxyquire').noCallThru();
const fakeBunyan = require('./src/fakeBunyan')
const { start, stopIt } = proxyquire('../src/start', {
    './createCloudJob': fakeCreateCloudJob,
    'bunyan': fakeBunyan
})

const wrappedStart = async(config, q, cloudQueue) => {
    if (completed) {
        return
    }
    let promise = new Promise<null>(async (resolve, reject) => {
        await start(config, q, cloudQueue)
        resolve(null)
    })
    return promise
}

const queue = require('queue')

describe('Main function when things are running', () => {
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
            sleepTime: 10,
            cloudSleepTime: 5
        }
        myCloudQueue.on('end', function() {
            completed = Date.now()
            wrappedStart(myConfig, myQueue, myCloudQueue)
        })
        let promise = new Promise<null>(async (resolve, reject) => {
            await wrappedStart(myConfig, myQueue, myCloudQueue)
            while (!completed) {
                await sleep(1)
            }
            stopIt()
            server.close()
            should(completed > reachedTwenty).equal(true)
            resolve(null)
        })
        return promise
    })
})
