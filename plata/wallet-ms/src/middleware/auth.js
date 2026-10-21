"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeUser = exports.authorizeMerchant = exports.authenticate = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../config/environment");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }
        const token = authHeader.substring(7);
        try {
            const response = await axios_1.default.post(`${environment_1.config.authServiceUrl}/api/v1/auth/verify-token`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.data.success && response.data.data?.user) {
                const u = response.data.data.user;
                const userType = String(u.userType || '').toUpperCase();
                const isOwner = u.isOwner === true || userType === 'MERCHANT' || userType === 'ADMIN';
                req.user = {
                    ...u,
                    userType,
                    merchantId: u.merchantId || u.userMerchantId,
                    isOwner,
                    permissions: Array.isArray(u.permissions) ? u.permissions.map(String) : []
                };
                next();
            }
            else {
                res.status(401).json({
                    success: false,
                    error: 'Invalid token'
                });
            }
        }
        catch (authError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
/** Merchant owner or invited staff with a merchant tenant id. */
const authorizeMerchant = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
        return;
    }
    const type = req.user.userType;
    const merchantId = req.user.merchantId || req.user.userMerchantId;
    const isMerchantOwner = type === 'MERCHANT';
    const isStaff = type === 'USER' && Boolean(merchantId);
    const isAdmin = type === 'ADMIN';
    if (!isMerchantOwner && !isStaff && !isAdmin) {
        res.status(403).json({
            success: false,
            error: 'Access denied. Merchant access required.'
        });
        return;
    }
    next();
};
exports.authorizeMerchant = authorizeMerchant;
const authorizeUser = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
        return;
    }
    if (req.user.userType !== 'USER') {
        res.status(403).json({
            success: false,
            error: 'Access denied. User access required.'
        });
        return;
    }
    next();
};
exports.authorizeUser = authorizeUser;
//# sourceMappingURL=auth.js.map