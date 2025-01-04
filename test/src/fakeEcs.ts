import fakeAwsBase from "./fakeAwsBase"

export default class fakeEcs extends fakeAwsBase {
    protected taskConfig
    protected query
    protected currentTask

    getTaskConfig () {
        return this.taskConfig
    }

    runTask (taskConfig: object) {
        this.currentTask = 'runTask'
        this.taskConfig = taskConfig
        return this
    }

    describeTasks (query: object) {
        this.currentTask = 'describeTasks'
        this.query = query
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
                                lastStatus: 'STOPPED'
                            }
                        ]
                    }
                ]
            }
        }
    }
}
