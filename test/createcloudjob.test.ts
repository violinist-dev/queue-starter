import * as should from 'should';
import { Job } from '../src/job';
const proxyquire = require('proxyquire').noCallThru();
import * as fakeRunlog from "./src/fakeRunLog";

describe('createCloudJob', () => {

    beforeEach(done => {
        fakeRunlog.Runlog.clearCalls()
        done()
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
})