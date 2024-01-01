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
var createJob = require('./createJob');
var bunyan = require('bunyan');
var createCloudJob = require('./createCloudJob').createCloudJob;
var createPruneJob = require('./createPruneJob');
var createPullJob = require('./createPullJob');
var supportedPhpVersions = require('./supportedPhpVersions');
var sleep = require('await-sleep');
var git = require('git-rev');
var gitRev;
git.short(function (str) {
    gitRev = str;
});
var findJob = require('./findJob');
var stopTheThing = false;
function stopIt() {
    stopTheThing = true;
}
exports.stopIt = stopIt;
var queue = require('queue');
var startFuncQueue = queue();
startFuncQueue.concurrency = 1;
function createStart(config, q, cloudQueue) {
    return __awaiter(this, void 0, void 0, function () {
        var sleepTime, cloudSleepTime, completeCallback, log, job, run_1, run_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (stopTheThing) {
                        return [2 /*return*/];
                    }
                    sleepTime = config.sleepTime ? config.sleepTime : 1000;
                    cloudSleepTime = config.cloudSleepTime ? config.cloudSleepTime : 3000;
                    completeCallback = config.completeCallback ? config.completeCallback : start;
                    log = bunyan.createLogger({ name: 'queue-starter', hostname: config.hostname });
                    return [4 /*yield*/, findJob(log, config)];
                case 1:
                    job = _a.sent();
                    if (!(!job || !job.data || !job.data.job_id)) return [3 /*break*/, 7];
                    if (!(!q.length && !cloudQueue.length)) return [3 /*break*/, 5];
                    return [4 /*yield*/, sleep(sleepTime)];
                case 2:
                    _a.sent();
                    if (!(!q.length && !cloudQueue.length)) return [3 /*break*/, 4];
                    return [4 /*yield*/, completeCallback(config, q, cloudQueue)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    log.info('It seems we already have a something in the queue, trusting job search to be coming up');
                    _a.label = 6;
                case 6: return [2 /*return*/];
                case 7:
                    if (!config.runCloud) return [3 /*break*/, 10];
                    log.info('Starting cloud job');
                    run_1 = createCloudJob(config, job, gitRev);
                    cloudQueue.push(run_1);
                    cloudQueue.start();
                    return [4 /*yield*/, sleep(cloudSleepTime)];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, completeCallback(config, q, cloudQueue)];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 11];
                case 10:
                    run_2 = createJob(config, job, gitRev);
                    q.push(run_2);
                    q.start();
                    _a.label = 11;
                case 11: return [2 /*return*/];
            }
        });
    });
}
function start(config, q, cloudQueue) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            startFuncQueue.push(createStart.bind(null, config, q, cloudQueue));
            startFuncQueue.start();
            return [2 /*return*/];
        });
    });
}
exports.start = start;
function queuePull(config, q) {
    return __awaiter(this, void 0, void 0, function () {
        var imgs, jobs;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (config.runCloud) {
                        return [2 /*return*/];
                    }
                    imgs = supportedPhpVersions;
                    jobs = imgs.map(function (version) { return __awaiter(_this, void 0, void 0, function () {
                        var imgs;
                        return __generator(this, function (_a) {
                            imgs = [
                                version + "-multi-composer-1",
                                version + "-multi-composer-2"
                            ];
                            imgs.forEach(function (img) {
                                q.push(createPullJob(img));
                                q.push(createPruneJob(img));
                            });
                            q.start();
                            return [2 /*return*/];
                        });
                    }); });
                    return [4 /*yield*/, Promise.all(jobs)];
                case 1:
                    _a.sent();
                    setTimeout(queuePull.bind(null, config, q), (60 * 1000 * 60));
                    return [2 /*return*/];
            }
        });
    });
}
exports.queuePull = queuePull;
//# sourceMappingURL=start.js.map