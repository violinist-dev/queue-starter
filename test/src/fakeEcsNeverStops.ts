import fakeAwsBase from "./fakeAwsBase"

// Like fakeEcs, but describeTasks never reports the container as STOPPED, so
// createCloudJob's "wait for the task to stop" polling loop never breaks out
// on its own and is forced to hit the timeout branch.
export default class fakeEcsNeverStops extends fakeAwsBase {
    protected currentTask

    runTask (taskConfig: object) {
        this.currentTask = 'runTask'
        return this
    }

    describeTasks (query: object) {
        this.currentTask = 'describeTasks'
        return this
    }

    getPromiseOutput() {
        if (this.currentTask === 'runTask') {
            return {
                tasks: [
                    {
                        taskArn: 'firstpart/secondpart'
                    }
                ]
            }
        }
        if (this.currentTask === 'describeTasks') {
            return {
                tasks: [
                    {
                        containers: [
                            {
                                lastStatus: 'RUNNING'
                            }
                        ]
                    }
                ]
            }
        }
    }
}
