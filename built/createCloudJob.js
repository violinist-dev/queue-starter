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
var AWS = require("aws-sdk");
var util = require("util");
var sleep = require("await-sleep");
var publisher_1 = require("./publisher");
var RunLog_1 = require("./RunLog");
var promisify_1 = require("./promisify");
var createEcsName = function (data) {
    // Should be named like this:
    // PHP version 7.1 => 71
    // PHP version 8.0 => 80
    // ...and so on.
    if (!data.php_version) {
        data.php_version = '7.2';
    }
    return data.php_version.replace('.', '');
};
var createEcsTaskDefinition = function (data) {
    // Should be named like this:
    // violinist-71-composer-1
    // Where 71 means version 7.1, and 1 means composer version 1.
    if (!data.composer_version) {
        data.composer_version = 1;
    }
    return util.format('violinist-%s-composer-%s', createEcsName(data), data.composer_version);
};
exports.createEcsTaskDefinition = createEcsTaskDefinition;
var createCloudJob = function (config, job, gitRev) {
    return function runJob(callback) {
        return __awaiter(this, void 0, void 0, function () {
            var logData, data, name, taskDefinition, runLog, awsconfig, env, ecsClient, watchClient, startTime, taskData, task, taskArn, arnParts, retries, events, list, logErr_1, totalTime, stdout, message, updateData, publisher, statusData, err_1, message, updateData, publisher, statusData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logData = job.data;
                        data = job.data;
                        name = createEcsName(data);
                        taskDefinition = createEcsTaskDefinition(data);
                        logData.cloud = true;
                        logData.name = name;
                        logData.taskDefinition = taskDefinition;
                        runLog = new RunLog_1.Runlog(logData);
                        runLog.log.info('Trying to start cloud job for ' + logData.slug);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 11, , 13]);
                        awsconfig = {
                            accessKeyId: config.accessKeyId,
                            secretAccessKey: config.secretAccessKey,
                            region: config.region,
                            apiVersion: config.apiVersion
                        };
                        data.violinist_revision = gitRev;
                        // This log data property is not something we want as ENV. Also, it fails, since it is a boolean.
                        delete data.cloud;
                        // And this also fails since it is a number.
                        delete data.queueLength;
                        // This is also a number, but since we need it, let's convert it to a string.
                        if (data.composer_version) {
                            data.composer_version = data.composer_version.toString();
                        }
                        env = Object.keys(data).map(function (key) {
                            return {
                                name: key,
                                value: job.data[key]
                            };
                        });
                        env.push({
                            name: 'violinist_hostname',
                            // We use this to identify the runners are from the cloud.
                            value: 'violinist-e2'
                        });
                        ecsClient = new AWS.ECS(awsconfig);
                        watchClient = new AWS.CloudWatchLogs(awsconfig);
                        startTime = Date.now();
                        return [4 /*yield*/, ecsClient.runTask({
                                cluster: 'violinist-cluster',
                                count: 1,
                                launchType: 'FARGATE',
                                networkConfiguration: {
                                    awsvpcConfiguration: {
                                        assignPublicIp: 'ENABLED',
                                        subnets: [
                                            config.subnet
                                        ]
                                    }
                                },
                                overrides: {
                                    containerOverrides: [
                                        {
                                            environment: env,
                                            name: name
                                        }
                                    ]
                                },
                                taskDefinition: taskDefinition
                            }).promise()];
                    case 2:
                        taskData = _a.sent();
                        if (!taskData.tasks.length) {
                            throw new Error('No valid ARN found');
                        }
                        task = taskData.tasks[0];
                        taskArn = task.taskArn;
                        arnParts = taskArn.split('/');
                        retries = 0;
                        events = [];
                        _a.label = 3;
                    case 3:
                        if (!true) return [3 /*break*/, 9];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        retries++;
                        return [4 /*yield*/, watchClient.getLogEvents({
                                logGroupName: util.format('/ecs/%s', taskDefinition),
                                logStreamName: util.format('ecs/%s/%s', name, arnParts[2])
                            }).promise()];
                    case 5:
                        list = _a.sent();
                        events = list.events;
                        if (events.length) {
                            return [3 /*break*/, 9];
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        logErr_1 = _a.sent();
                        return [3 /*break*/, 7];
                    case 7:
                        // We are allowed to wait for 3 hours. Thats a very long time, by the way...
                        if (retries > 2160) {
                            throw new Error('Retries reached: ' + retries);
                        }
                        return [4 /*yield*/, sleep(5000)];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 9:
                        totalTime = Date.now() - startTime;
                        runLog.log.info({ containerTime: totalTime }, 'Total time was ' + totalTime);
                        stdout = events.map(function (event) {
                            return event.message;
                        });
                        message = {
                            stdout: stdout,
                            stderr: ''
                        };
                        updateData = {
                            jobId: data.job_id,
                            token: config.token,
                            message: message,
                            set_state: 'success'
                        };
                        publisher = new publisher_1.default(config);
                        return [4 /*yield*/, promisify_1.default(publisher.publish.bind(publisher, updateData))];
                    case 10:
                        statusData = _a.sent();
                        runLog.log.info('Job complete request code: ' + statusData.statusCode);
                        callback();
                        return [3 /*break*/, 13];
                    case 11:
                        err_1 = _a.sent();
                        runLog.log.error(err_1, 'There was an error running a cloud task');
                        message = {
                            stdout: [
                                JSON.stringify([{
                                        message: 'There was an error completing the job task. The error message was: ' + err_1.message,
                                        type: 'message'
                                    }])
                            ],
                            stderr: ''
                        };
                        updateData = {
                            jobId: data.job_id,
                            token: config.token,
                            message: message,
                            // This field is actually not even used at the moment I think. That's too bad.
                            set_state: 'failure'
                        };
                        publisher = new publisher_1.default(config);
                        return [4 /*yield*/, promisify_1.default(publisher.publish.bind(publisher, updateData))];
                    case 12:
                        statusData = _a.sent();
                        runLog.log.info('Job complete request code: ' + statusData.statusCode);
                        // We do not care if things go ok, since things are queued so many times anyway.
                        callback();
                        return [3 /*break*/, 13];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
};
exports.createCloudJob = createCloudJob;
//# sourceMappingURL=createCloudJob.js.map