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
function createCloudJob(config, job, gitRev) {
    return function runJob(callback) {
        return __awaiter(this, void 0, void 0, function () {
            var logData, runLog, awsconfig, data, env, ecsClient, watchClient, name_1, taskDefinition, startTime, taskData, task, taskArn, arnParts, retries, events, list, logErr_1, totalTime, stdout, message, updateData, publisher, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logData = job.data;
                        logData.cloud = true;
                        runLog = new RunLog_1.Runlog(logData);
                        runLog.log.info('Trying to start cloud job for ' + logData.slug);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, , 11]);
                        awsconfig = {
                            accessKeyId: config.accessKeyId,
                            secretAccessKey: config.secretAccessKey,
                            region: config.region,
                            apiVersion: config.apiVersion
                        };
                        data = job.data;
                        data.violinist_revision = gitRev;
                        // This log data property is not something we want as ENV. Also, it fails, since it is a boolean.
                        delete data.cloud;
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
                        name_1 = 'violinist-70';
                        taskDefinition = 'violinist-task-70';
                        switch (data.php_version) {
                            case '7.1':
                                name_1 = 'violinist-71';
                                taskDefinition = 'violinist-task-71';
                                break;
                            case '7.2':
                                name_1 = 'violinist-72';
                                taskDefinition = 'violinist-task-72';
                                break;
                            case '7.3':
                                name_1 = 'violinist-73';
                                taskDefinition = 'violinist-task-73';
                                break;
                        }
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
                                            name: name_1
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
                                logStreamName: util.format('ecs/%s/%s', name_1, arnParts[1])
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
                        if (retries > 240) {
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
                        publisher.publish(updateData, callback);
                        return [3 /*break*/, 11];
                    case 10:
                        err_1 = _a.sent();
                        runLog.log.error(err_1, 'There was an error running a cloud task');
                        // We do not care if things go ok, since things are queued so many times anyway.
                        callback();
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
}
exports.createCloudJob = createCloudJob;
//# sourceMappingURL=createCloudJob.js.map