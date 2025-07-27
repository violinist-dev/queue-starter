import * as should from 'should';
import * as AWS from 'aws-sdk'
import { createEcsTaskDefinition, createLogGroup } from "../../src/createCloudJob";
const composerVersions = [2]
const supportedVersions = require("../../src/supportedPhpVersions")


describe('createCloudJob integration tests', () => {

    it('Should totally have all the images as tasks in AWS', async () => {
        const awsconfig = {
            accessKeyId: process.env.CI_ACCESS_KEY_ID,
            secretAccessKey: process.env.CI_SECRET_KEY,
            region: process.env.CI_AWS_REGION,
        }
        const client = new AWS.ECS(awsconfig)
        const logGroupClient = new AWS.CloudWatchLogs(awsconfig)
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
                // This should make sure we are looking at the most recent one.
                matchingTasks = matchingTasks.reverse()
                let def = await client.describeTaskDefinition({taskDefinition: matchingTasks[0]}).promise()
                const logGroup = createLogGroup(taskName);
                logGroup.should.equal(def.taskDefinition.containerDefinitions[0].logConfiguration.options['awslogs-group'])
                def.taskDefinition.containerDefinitions[0].logConfiguration.options['awslogs-stream-prefix'].should.equal('ecs')
                def.taskDefinition.containerDefinitions[0].logConfiguration.options['awslogs-region'].should.equal(process.env.CI_AWS_REGION)
                matchingTasks.length.should.not.equal(0)
                // Now let's check that the actual log group exists.
                let logGroups = await logGroupClient.describeLogGroups({
                    logGroupNamePrefix: logGroup
                }).promise()
                logGroups.logGroups.length.should.not.equal(0, 'Log group ' + logGroup + ' should exist');
            }
        }
    })
})
