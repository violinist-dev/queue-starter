import * as should from 'should';
import { Job } from '../src/job';
const proxyquire = require('proxyquire').noCallThru();
import * as fakeRunlog from "./src/fakeRunLog";
import fakeEcs from "./src/fakeEcs"
import fakeWatchClient from "./src/fakeWatchClient"
import promisify from "../src/promisify"
import * as fakePublisher from "./src/fakePublisher"
const supportedVersions = require("../src/supportedPhpVersions")
const composerVersions = [2]

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
            './RunLog': fakeRunlog,
            './publisher': fakePublisher,
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

    it('Should try to start the cloud images expected', async () => {
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
            '8.0': 'violinist-80-composer-',
            '8.1': 'violinist-81-composer-',
            '8.2': 'violinist-82-composer-',
            '8.3': 'violinist-83-composer-',
            '8.4': 'violinist-84-composer-',
            '8.5': 'violinist-85-composer-',
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
