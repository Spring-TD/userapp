"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsMiddleware = void 0;
const environment_1 = require("../config/environment");
const corsMiddleware = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', environment_1.CORS_ALLOWED_ORIGINS);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
};
exports.corsMiddleware = corsMiddleware;
//# sourceMappingURL=cors.js.map