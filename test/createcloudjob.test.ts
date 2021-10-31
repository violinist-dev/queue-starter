import * as should from 'should';
import * as AWS from 'aws-sdk'
import { Job } from '../src/job';
const proxyquire = require('proxyquire').noCallThru();
import * as fakeRunlog from "./src/fakeRunLog";
import fakeEcs from "./src/fakeEcs"
import fakeWatchClient from "./src/fakeWatchClient"
import promisify from "../src/promisify"
import * as fakePublisher from "./src/fakePublisher"
const supportedVersions = require("../src/supportedPhpVersions")
const composerVersions = [1, 2]
import { createEcsTaskDefinition } from "../src/createCloudJob";

describe('createCloudJob', () => {

    beforeEach(done => {
        fakeRunlog.Runlog.clearCalls()
        done()
    })

    afterEach(function(done) {
        fakePublisher.default.closeServer(done)
    })

    it('Should export like expected and fail like expected', (done) => {
        let { createCloudJob } = proxyquire('../src/createCloudJob', {
            'aws-sdk': () => {},
            './RunLog': fakeRunlog
        })
        let run = createCloudJob({}, new Job({}), 'efef')
        should(run).be.instanceOf(Function)
        should(createCloudJob).be.instanceOf(Function)
        run(_ => {
            should(fakeRunlog.Runlog.getCalls().error.length).not.equal(0)
            should(fakeRunlog.Runlog.getCalls().error[0][0].message).equal('AWS.ECS is not a constructor')
            done()
        })

    })

    it('Should inform about the log and its output if we succeed in running a cloud job', (done) => {
        let { createCloudJob } = proxyquire('../src/createCloudJob', {
            'aws-sdk': {
                ECS: fakeEcs,
                CloudWatchLogs: fakeWatchClient
            },
            './publisher': fakePublisher,
            './RunLog': fakeRunlog
        })
        let run = createCloudJob({}, new Job({
            slug: 'violinst/example-slug'
        }), 'efef')
        run(_ => {
            let calls = fakeRunlog.Runlog.getCalls()
            should(calls.error.length).equal(0)
            should(calls.info[0][0]).equal("Trying to start cloud job for violinst/example-slug")
            done()
        })
    })

    it('Should totally have all the images as tasks in AWS', async () => {
        const awsconfig = {
            accessKeyId: process.env.CI_ACCESS_KEY_ID,
            secretAccessKey: process.env.CI_SECRET_KEY,
            region: process.env.CI_AWS_REGION,
        }
        const client = new AWS.ECS(awsconfig)
        let tasks = await client.listTaskDefinitions().promise()
        // Now go through all PHP versions and all composer versions, and see that we have
        // a matching definition for them.
        for (const delta in supportedVersions) {
            for (const cDelta in composerVersions) {
                const composerVersion = composerVersions[cDelta]
                const php_version = supportedVersions[delta]
                const taskName = createEcsTaskDefinition({
                    php_version,
                    composer_version: composerVersion
                })
                tasks.taskDefinitionArns.filter((item) => {
                    return item.includes(taskName)
                }).length.should.not.equal(0)
            }
        }
    })

    it('Should try to start the images expected', async () => {
        let { createCloudJob } = proxyquire('../src/createCloudJob', {
            'aws-sdk': {
                ECS: fakeEcs,
                CloudWatchLogs: fakeWatchClient
            },
            './publisher': fakePublisher,
            './RunLog': fakeRunlog
        })
        let versionTaskMap = {
            '7.0': 'violinist-70-composer-',
            '7.1': 'violinist-71-composer-',
            '7.2': 'violinist-72-composer-',
            '7.3': 'violinist-73-composer-',
            '7.4': 'violinist-74-composer-',
            '8.0': 'violinist-80-composer-'
        }
        for (const delta in supportedVersions) {
            for (const cDelta in composerVersions) {
                const composerVersion = composerVersions[cDelta]
                const php_version = supportedVersions[delta]
                let run = createCloudJob({}, new Job({
                    php_version,
                    composer_version: composerVersion,
                    slug: 'violinst/example-slug'
                }), 'efef')
                await promisify(run.bind(null))
                let calls = fakeRunlog.Runlog.getCalls()
                let data = fakeRunlog.Runlog.getData()
                data['taskDefinition'].should.equal(versionTaskMap[php_version] + composerVersion)
                await promisify(fakePublisher.default.closeServer)
            }
        }
    })
})
