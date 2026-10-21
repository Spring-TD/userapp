"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireInternalToken = requireInternalToken;
const internalToken = (process.env.JWT_SECRET || 'fallback-secret-key-for-development-purposes-only').trim();
function requireInternalToken(req, res, next) {
    const token = (req.header('X-Internal-Token') || '').trim();
    if (!token || token !== internalToken) {
        res.status(401).json({ success: false, error: 'Unauthorized internal request' });
        return;
    }
    next();
}
//# sourceMappingURL=internalAuth.js.map