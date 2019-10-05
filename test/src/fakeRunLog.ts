function createEmptyCalls() {
    return {
        error: [],
        info: [],
        warnings: []
    }
}

var calls =  createEmptyCalls()

export class Runlog {
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