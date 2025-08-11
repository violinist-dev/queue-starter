import fakeAwsBase from "./fakeAwsBase"

export default class fakeWatchClient extends fakeAwsBase {

    getLogEvents() {
        return this
    }

    getPromiseOutput() {
        return {
            nextForwardToken: 'nextToken',
            events: [
                {
                    message: '[{"message: "One log message"',

                },
                {
                    message: '},"message":"Log message 2"}]',
                }
            ]
        }
    }
}
