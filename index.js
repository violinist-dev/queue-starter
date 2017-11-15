const queue = require('queue')
const ks = require('kill-switch')
const Docker = require('dockerode')
const redis = require('redis')

let docker = new Docker()

let client = redis.createClient();
client.psubscribe('violinist-queue')
client.on('pmessage', (channel, pattern, message) => {
    try {
        let data = JSON.parse(message)
        var env = [];
        Object.keys(data).forEach((n) => {
            var val = data[n];
            env.push(`${n}=${val}`)
        })
        console.log('a')
        docker.run('violinist-worker', ['php', 'runner.php'], process.stdout, {
            Env: env
          }).then(function(container) {
            console.log(container.output.StatusCode);
            return container.remove();
        }).then(function(data) {
        console.log('container removed');
        }).catch(function(err) {
        console.log(err);
        });
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
    logger('Queue end')
})

ks.autoStart()