"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = void 0;
const audit_1 = require("../utils/audit");
const auditLog = (req, res, next) => {
    (0, audit_1.auditLogger)(`${req.method} ${req.path}`, req.user?.userId || 'anonymous', {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        body: req.body
    }, req);
    next();
};
exports.auditLog = auditLog;
exports.default = exports.auditLog;
//# sourceMappingURL=audit.js.map