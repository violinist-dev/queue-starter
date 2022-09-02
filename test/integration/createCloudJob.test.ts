import * as should from 'should';
import * as AWS from 'aws-sdk'
import { createEcsTaskDefinition } from "../../src/createCloudJob";
const composerVersions = [1, 2]
const supportedVersions = require("../../src/supportedPhpVersions")


describe('createCloudJob integration tests', () => {

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
                let matchingTasks = tasks.taskDefinitionArns.filter((item) => {
                    return item.includes(taskName)
                })
                matchingTasks.length.should.not.equal(0)
            }
        }
    })
})
