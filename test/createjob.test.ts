import * as should from 'should';
import { Job } from '../src/job';
const proxyquire = require('proxyquire').noCallThru();
import * as fakeRunlog from "./src/fakeRunLog";

describe('createJob', () => {

    beforeEach(done => {
        fakeRunlog.Runlog.clearCalls()
        done()
    })

    it('Should export like expected and fail like expected', (done) => {
        let createJob = proxyquire('../src/createJob', {
            './RunLog': fakeRunlog
        })
        let run = createJob({
            baseUrl: 'http://example.com'
        }, new Job({}), 'efef')
        should(run).be.instanceOf(Function)
        should(createJob).be.instanceOf(Function)
        run(_ => {
            should(fakeRunlog.Runlog.getCalls().error.length).not.equal(0)
            let hasErrorMessage = false
            fakeRunlog.Runlog.getCalls().warnings.forEach((logItem) => {
                if (logItem[0] === 'Status code was not 0, it was: 1') hasErrorMessage = true
            })
            should(hasErrorMessage).equal(true)
            done()
        })

    })
})
