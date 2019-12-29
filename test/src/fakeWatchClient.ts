import fakeAwsBase from "./fakeAwsBase"

export default class fakeWatchClient extends fakeAwsBase {

    getLogEvents() {
        return this
    }

    getPromiseOutput() {
        return {
            events: [
                {
                    message: 'One log message',

                },
                {
                    message: 'Log message 2'
                }
            ]
        }
    }
}