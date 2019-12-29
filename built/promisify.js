"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (function (func) {
    return new Promise(function (resolve, reject) {
        func(function (err, data) {
            if (err) {
                return reject(err);
            }
            return resolve(data);
        });
    });
});
//# sourceMappingURL=promisify.js.map