import * as should from 'should';
import { Job } from '../src/job';
const proxyquire = require('proxyquire').noCallThru();
import * as fakeRunlog from "./src/fakeRunLog";
import fakeDockerode from "./src/fakeDockerode"
import promisify from "../src/promisify"
const supportedVersions = require("../src/supportedPhpVersions")

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
                if (logItem[0] === 'Status code was not 0, it was: 1')  {
                    hasErrorMessage = true
                }
            })
            should(hasErrorMessage).equal(true)
            done()
        })

    })

    it('Should try to start the images expected', () => {
        let createJob = proxyquire('../src/createJob', {
            './RunLog': fakeRunlog,
            'dockerode': fakeDockerode
        })
        let jobs = supportedVersions.map(async (php_version) => {
            let run = createJob({
                baseUrl: 'http://example.com'
            }, new Job({php_version}), 'efef')
            await promisify(run.bind(null))
            let calls = fakeRunlog.Runlog.getCalls()
            let hasStartMessage = false
            let imageStarted = null
            calls.info.forEach((logItem) => {
                if (logItem[0] === 'Using image' && logItem[1].indexOf(php_version) > 0)  {
                    hasStartMessage = true
                    imageStarted = logItem[1]
                }
            })
            imageStarted.should.equal(`violinist/update-check-runner:${php_version}-multi-composer-2`)
            should(hasStartMessage).equal(true)
        })
        return Promise.all(jobs)
    })
})
