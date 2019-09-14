"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var https = require("https");
var util = require("util");
function createJob(config, data, gitRev) {
    return function (callback) {
        https.get(config.healthCheckUrl);
        data.violinist_revision = gitRev;
        data.violinist_hostname = config.hostname;
        if (!data.php_version) {
            data.php_version = '7.0';
        }
        var dockerImage = util.format('violinist/update-check-runner:%s', data.php_version);
        var runLog = new RunLog(data);
        var publishResult = publisher(config, runLog);
        var j = request.jar();
        var cookie = request.cookie('XDEBUG_SESSION=PHPSTORM');
        var baseUrl = config.baseUrl;
        j.setCookie(cookie, baseUrl);
        var postData = {
            job_id: data.job_id,
            set_state: 'processing',
            token: config.token
        };
        var stdout = Writable();
        var stdoutdata = [];
        stdout._write = function (chunk, enc, next) {
            stdoutdata.push(chunk.toString());
            next();
        };
        var stderr = Writable();
        var stderrdata = [];
        stderr._write = function (chunk, enc, next) {
            stderrdata.push(chunk.toString());
            next();
        };
        var env = [];
        Object.keys(data).forEach(function (n) {
            var val = data[n];
            env.push(n + "=" + val);
        });
        runLog.log.info('Starting container for', data.slug);
        var startTime = Date.now();
        hostConfig.autoRemove = true;
        docker.run(dockerImage, ['php', 'runner.php'], [stdout, stderr], {
            HostConfig: hostConfig,
            Env: env,
            Binds: binds,
            TTy: false
        }).then(function (container) {
            var totalTime = Date.now() - startTime;
            runLog.log.info({ containerTime: totalTime }, 'Total time was ' + totalTime);
            var code = container.output.StatusCode;
            runLog.log.info('Container ended with status code ' + code);
            var message = {
                stderr: stderrdata,
                stdout: stdoutdata
            };
            if (code === 0) {
                // Notify about the good news.
                postData.set_state = 'success';
                postData.message = message;
                runLog.log.info('Posting job data');
                publishResult(postData, function (err, data) {
                    if (err) {
                        runLog.log.error(err, 'Error when completing job in new endpoint');
                        container.remove();
                        throw err;
                    }
                    runLog.log.info('Job complete request code: ' + data.statusCode);
                });
            }
            else {
                runLog.log.warn('Status code was not 0, it was: ' + code);
                runLog.log.warn('Data from container:', {
                    message: message
                });
                postData.message = message;
                runLog.log.info('Posting error data to endpoint');
                publishResult(postData, function (err, data) {
                    if (err) {
                        runLog.log.error(err, 'Error when completing job in new endpoint');
                        container.remove();
                        throw err;
                    }
                    runLog.log.info('Job complete request code: ' + data.statusCode);
                });
            }
        }).then(function (data) {
            runLog.log.info('container removed');
            callback();
        }).catch(function (err) {
            runLog.log.error(err, 'Error with container things');
            callback(err);
        });
    };
}
