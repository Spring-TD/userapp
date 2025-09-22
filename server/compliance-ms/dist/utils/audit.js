"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditStats = exports.clearAuditLogs = exports.getAuditLogs = exports.auditLogger = void 0;
const crypto_1 = require("crypto");
const auditLogs = [];
const auditLogger = (action, userId, details, req) => {
    const auditEntry = {
        id: (0, crypto_1.randomUUID)(),
        action,
        userId,
        timestamp: new Date(),
        details,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent')
    };
    auditLogs.push(auditEntry);
    console.log('Audit Log:', JSON.stringify(auditEntry, null, 2));
    return auditEntry;
};
exports.auditLogger = auditLogger;
const getAuditLogs = (filters = {}) => {
    return auditLogs.filter(log => {
        if (filters.userId && log.userId !== filters.userId)
            return false;
        if (filters.action && log.action !== filters.action)
            return false;
        if (filters.startDate && log.timestamp < filters.startDate)
            return false;
        if (filters.endDate && log.timestamp > filters.endDate)
            return false;
        return true;
    });
};
exports.getAuditLogs = getAuditLogs;
const clearAuditLogs = () => {
    auditLogs.length = 0;
};
exports.clearAuditLogs = clearAuditLogs;
const getAuditStats = () => {
    const actions = auditLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
    }, {});
    const users = auditLogs.reduce((acc, log) => {
        acc[log.userId] = (acc[log.userId] || 0) + 1;
        return acc;
    }, {});
    return {
        totalLogs: auditLogs.length,
        actions,
        users,
        lastActivity: auditLogs.length > 0 ? auditLogs[auditLogs.length - 1].timestamp : null
    };
};
exports.getAuditStats = getAuditStats;
//# sourceMappingURL=audit.js.map