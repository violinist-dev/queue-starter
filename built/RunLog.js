"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bunyan = require('bunyan');
var log = bunyan.createLogger({ name: 'queue-starter' });
var Runlog = /** @class */ (function () {
    function Runlog(data) {
        if (!data.taskDefinition) {
            data.taskDefinition = '';
        }
        if (!data.name) {
            data.name = '';
        }
        this.log = log.child({ job_id: data.job_id, slug: data.slug, php: data.php_version, cloud: !!data.cloud, taskName: data.name, taskDefinition: data.taskDefinition });
        this.log.info('Creating a run log');
    }
    return Runlog;
}());
exports.Runlog = Runlog;
//# sourceMappingURL=RunLog.js.map