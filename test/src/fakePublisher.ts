import Publisher from "../../src/publisher"
import * as http from "http"

var serverStarted = false

var server;

export default class fakePublisher extends Publisher {
    constructor(config: {baseUrl}) {
        config.baseUrl = 'http://localhost:12997'
        super(config)
    }
    publish(data: {jobId: number}, callback: Function) {
        server = http.createServer((req, res) => {
            res.end('sure why not')
        })
        server.listen(12997, 'localhost', 10, () => {
            serverStarted = true
        })
        var superMethod = super.publish.bind(this)
        function wrapStart() {
            if (!serverStarted) {
                return setTimeout(wrapStart.bind(this), 10)
            }
            superMethod(data, callback)
        }
        wrapStart()
    }
    static closeServer(callback) {
        if (server && !serverStarted) {
            return setTimeout(() => {
                this.closeServer(callback)
            }, 10);
        }
        if (server) {
            server.close(callback)
        }
        else {
            callback()
        }
        serverStarted = false
        server = null
    }
}