function createEmptyCalls() {
    return {
        error: [],
        info: [],
        warnings: []
    }
}

var calls =  createEmptyCalls()
var lastData = {}


export class Runlog {
    constructor(data) {
        lastData = data
    }
    static getData = () => {
        return lastData
    }
    log = {
        warn: function () {
            calls.warnings.push(arguments)
        },
        info: function () {
            calls.info.push(arguments)
        },
        error: function() {
            calls.error.push(arguments)

        }
    }
    static getCalls() {
        return calls
    }
    static clearCalls() {
        calls = createEmptyCalls()
    }
}
