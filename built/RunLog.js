"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bunyan = require('bunyan');
var config = require('../config');
var log = bunyan.createLogger({ name: 'queue-starter', hostname: config.hostname });
var Runlog = /** @class */ (function () {
    function Runlog(data) {
        if (!data.taskDefinition) {
            data.taskDefinition = '';
        }
        if (!data.name) {
            data.name = '';
        }
        if (!data.composer_version) {
            data.composer_version = 2;
        }
        this.log = log.child({ composer_version: data.composer_version, job_id: data.job_id, slug: data.slug, php: data.php_version, cloud: !!data.cloud, taskName: data.name, taskDefinition: data.taskDefinition });
        this.log.info('Creating a run log');
    }
    return Runlog;
}());
exports.Runlog = Runlog;
//# sourceMappingURL=RunLog.js.map