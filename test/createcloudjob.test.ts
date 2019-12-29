import * as should from 'should';
import { Job } from '../src/job';
const proxyquire = require('proxyquire').noCallThru();
import * as fakeRunlog from "./src/fakeRunLog";
import fakeEcs from "./src/fakeEcs"
import fakeWatchClient from "./src/fakeWatchClient"
import promisify from "../src/promisify"
import * as fakePublisher from "./src/fakePublisher"

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
})