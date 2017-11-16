const queue = require('queue')
const ks = require('kill-switch')
const Docker = require('dockerode')
const redis = require('redis')

let docker = new Docker()
let binds = []
binds.push(__dirname + '/composer-cache:/root/.composer/cache')

let client = redis.createClient();
client.psubscribe('violinist-queue')

function createJob(data) {
    return function(callback) {
        var env = [];
        Object.keys(data).forEach((n) => {
            var val = data[n];
            env.push(`${n}=${val}`)
        })
        console.log('Starting container')
        docker.run('violinist-worker', ['php', 'runner.php'], process.stdout, {
            Env: env,
            Binds: binds
          }).then(function(container) {
            console.log('Container ended with status code ' + container.output.StatusCode)
            return container.remove();
        }).then(function(data) {
            console.log('container removed');
            callback()
        }).catch(function(err) {
            console.log(err);
        });
    }
}

client.on('pmessage', (channel, pattern, message) => {
    try {
        let data = JSON.parse(message)
        console.log('Adding something to the queue: ', data.slug)
        q.push(createJob(data))
        q.start()
    }
    catch (err) {
        throw err;
    }
})

let q = queue()

q.concurrency = 1
q.on('end', (err) => {
    if (err) {
        throw err
    }
    console.log(('Queue end')
})

ks.autoStart()
