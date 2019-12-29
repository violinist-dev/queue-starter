export default abstract class fakeAwsBase {
    protected config

    getPromiseOutput() {}

    promise() {
        return new Promise(resolve => setTimeout(() => {
            resolve(this.getPromiseOutput())
        }))
    }

    constructor(config: object) {
        this.config = config
    }
}