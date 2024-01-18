const bunyan = {
    createLogger: function() {
        return {
            info: function() {},
            error: function() {}
        }
    }
}

module.exports = bunyan