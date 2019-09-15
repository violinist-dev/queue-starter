var calls = {
    error: [],
    info: []
}

export class Runlog {
    log = {
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
}