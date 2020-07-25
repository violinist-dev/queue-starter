"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint no-unused-vars: "off" */
/* eslint @typescript-eslint/no-unused-vars: "error" */
var https = require("https");
var util = require("util");
var Docker = require("dockerode");
var RunLog_1 = require("./RunLog");
var publisher_1 = require("./publisher");
var stream_1 = require("stream");
var promisify_1 = require("./promisify");
var docker = new Docker();
var request = require('request');
var binds = [];
var hostConfig = {
    Memory: 2147483648,
    Binds: binds,
    autoRemove: true
};
function createJob(config, job, gitRev) {
    return function (callback) {
        return __awaiter(this, void 0, void 0, function () {
            var data, dockerImage, runLog, res, publisher, j, cookie, baseUrl, postData, stdout, stdoutdata, stderr, stderrdata, env, startTime, container, totalTime, code, message, data_1, data_2, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        data = job.data;
                        data.violinist_revision = gitRev;
                        data.violinist_hostname = config.hostname;
                        if (!data.php_version) {
                            data.php_version = '7.0';
                        }
                        dockerImage = util.format('violinist/update-check-runner:%s', data.php_version);
                        runLog = new RunLog_1.Runlog(data);
                        res = https.get(config.healthCheckUrl);
                        res.on('error', function (err) {
                            runLog.log.error(err);
                        });
                        publisher = new publisher_1.default(config);
                        j = request.jar();
                        cookie = request.cookie('XDEBUG_SESSION=PHPSTORM');
                        baseUrl = config.baseUrl;
                        j.setCookie(cookie, baseUrl);
                        postData = {
                            message: {},
                            jobId: data.job_id,
                            set_state: 'processing',
                            token: config.token
                        };
                        stdout = new stream_1.Writable();
                        stdoutdata = [];
                        stdout._write = function (chunk, enc, next) {
                            stdoutdata.push(chunk.toString());
                            next();
                        };
                        stderr = new stream_1.Writable();
                        stderrdata = [];
                        stderr._write = function (chunk, enc, next) {
                            stderrdata.push(chunk.toString());
                            next();
                        };
                        env = [];
                        Object.keys(data).forEach(function (n) {
                            var val = data[n];
                            env.push(n + "=" + val);
                        });
                        runLog.log.info('Starting container for', data.slug);
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, docker.run(dockerImage, ['php', 'runner.php'], [stdout, stderr], {
                                HostConfig: hostConfig,
                                Env: env,
                                Binds: binds,
                                TTy: false
                            })];
                    case 2:
                        container = _a.sent();
                        totalTime = Date.now() - startTime;
                        runLog.log.info({ containerTime: totalTime }, 'Total time was ' + totalTime);
                        code = container.output.StatusCode;
                        runLog.log.info('Container ended with status code ' + code);
                        message = {
                            stderr: stderrdata,
                            stdout: stdoutdata
                        };
                        if (!(code === 0)) return [3 /*break*/, 4];
                        // Notify about the good news.
                        postData.set_state = 'success';
                        postData.message = message;
                        runLog.log.info('Posting job data');
                        return [4 /*yield*/, promisify_1.default(publisher.publish.bind(publisher, postData))];
                    case 3:
                        data_1 = _a.sent();
                        runLog.log.info('Job complete request code: ' + data_1.statusCode);
                        return [3 /*break*/, 6];
                    case 4:
                        runLog.log.warn('Status code was not 0, it was: ' + code);
                        runLog.log.warn('Data from container:', {
                            message: message
                        });
                        postData.message = message;
                        runLog.log.info('Posting error data to endpoint');
                        return [4 /*yield*/, promisify_1.default(publisher.publish.bind(publisher, postData))];
                    case 5:
                        data_2 = _a.sent();
                        runLog.log.info('Job complete request code: ' + data_2.statusCode);
                        _a.label = 6;
                    case 6:
                        runLog.log.info('container removed');
                        callback();
                        return [3 /*break*/, 8];
                    case 7:
                        err_1 = _a.sent();
                        runLog.log.error(err_1, 'Error with container things');
                        callback();
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
}
module.exports = createJob;
//# sourceMappingURL=createJob.js.map