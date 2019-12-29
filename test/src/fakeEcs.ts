import fakeAwsBase from "./fakeAwsBase"

export default class fakeEcs extends fakeAwsBase {
    protected taskConfig

    getTaskConfig () {
        return this.taskConfig
    }

    runTask (taskConfig: object) {
        this.taskConfig = taskConfig
        return this
    }

    getPromiseOutput() {
        return {
            tasks: [
                {
                    taskArn: 'firstpart/secondpart'
                }
            ]
        }
    }
}