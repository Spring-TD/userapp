"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (err, req, res, next) => {
    logger_1.logger.error('Unhandled error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
    });
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error'
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map