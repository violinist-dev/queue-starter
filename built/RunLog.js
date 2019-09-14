"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bunyan = require('bunyan');
var log = bunyan.createLogger({ name: 'queue-starter' });
var Runlog = /** @class */ (function () {
    function Runlog(data) {
        this.log = log.child({ job_id: data.job_id, slug: data.slug, php: data.php_version, cloud: !!data.cloud });
        this.log.info('Creating a run log');
    }
    return Runlog;
}());
exports.default = Runlog;
//# sourceMappingURL=RunLog.js.map