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
var job_1 = require("./job");
var fetchError_1 = require("./fetchError");
var https = require("https");
var fetchLib = require('node-fetch');
function findJob(log, config) {
    return __awaiter(this, void 0, void 0, function () {
        var optsWithHeaders, awsRequired, res, healthRes, awsEnabled, e, body, claimed, data, job_2, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    optsWithHeaders = {
                        headers: {
                            'x-drupal-http-queue-token': config.token
                        },
                        timeout: 15000
                    };
                    awsRequired = config.runCloud;
                    return [4 /*yield*/, fetchLib(config.baseUrl + '/http-queue/get-a-job', optsWithHeaders)];
                case 1:
                    res = _a.sent();
                    healthRes = https.get(config.healthCheckUrl);
                    healthRes.on('error', function (err) {
                        log.error(err);
                    });
                    awsEnabled = res.headers.get('x-violinist-aws');
                    if (!awsEnabled && awsRequired) {
                        return [2 /*return*/, new Promise(function (resolve) {
                                resolve(new job_1.Job({}));
                            })];
                    }
                    if (res.status !== 200) {
                        e = new fetchError_1.default('Wrong status code on fetch job');
                        e.fetchStatusCode = res.status;
                        log.info('Job fetch ended with status code', res.status);
                        throw e;
                    }
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = _a.sent();
                    log.info('Found a job, trying to claim job id %d', body.job_id);
                    return [4 /*yield*/, fetchLib(config.baseUrl + '/http-queue/claim/' + body.job_id, optsWithHeaders)];
                case 3:
                    claimed = _a.sent();
                    if (claimed.status !== 200) {
                        throw new Error('Did not achieve a claim on job id ' + body.job_id + '. Status code was ' + claimed.status);
                    }
                    data = JSON.parse(body.payload);
                    data.job_id = body.job_id;
                    data.queueLength = res.headers.get('x-violinist-queue-length');
                    if (data.queueLength) {
                        data.queueLength = parseInt(data.queueLength, 10);
                    }
                    log.info({
                        queueLength: data.queueLength
                    }, 'Queue is now %d items long', data.queueLength);
                    job_2 = new job_1.Job(data);
                    return [2 /*return*/, new Promise(function (resolve) {
                            resolve(job_2);
                        })];
                case 4:
                    err_1 = _a.sent();
                    if (!(err_1 instanceof fetchError_1.default)) {
                        log.error(err_1, 'Caught an error trying to find and claim a job');
                    }
                    return [2 /*return*/, new Promise(function (resolve) {
                            resolve(new job_1.Job({}));
                        })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
module.exports = findJob;
//# sourceMappingURL=findJob.js.map