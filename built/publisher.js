"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var request = require('request');
var Publisher = /** @class */ (function () {
    function Publisher(config) {
        this.config = config;
    }
    Publisher.prototype.publish = function (data, callback) {
        var headers = {
            'x-drupal-http-queue-token': this.config.token
        };
        var j = request.jar();
        var cookie = request.cookie('XDEBUG_SESSION=PHPSTORM');
        var baseUrl = this.config.baseUrl;
        j.setCookie(cookie, baseUrl);
        request({
            url: this.config.baseUrl + '/http-queue/complete/' + data.jobId,
            jar: j,
            headers: headers,
            method: 'POST',
            body: data,
            json: true
        }, callback);
    };
    return Publisher;
}());
exports.default = Publisher;
//# sourceMappingURL=publisher.js.map