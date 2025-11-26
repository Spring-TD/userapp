"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIndividual = exports.isMerchant = exports.isAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const kycTypes_1 = require("../types/kycTypes");
const authenticate = (req, res, next) => {
    try {
        if (req.service) {
            return next();
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger_1.logger.warn('Authentication failed - No token provided or invalid format');
            return res.status(401).json({
                success: false,
                error: 'Authentication required - No token provided'
            });
        }
        const token = authHeader.split(' ')[1];
        const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            userType: decoded.userType,
            email: decoded.email,
            token
        };
        return next();
    }
    catch (error) {
        logger_1.logger.error('Authentication failed - Invalid token', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(401).json({
            success: false,
            error: 'Authentication failed - Invalid token'
        });
    }
};
exports.authenticate = authenticate;
const isAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            logger_1.logger.warn('Admin access denied - User not authenticated');
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (req.user.userType !== kycTypes_1.UserType.ADMIN) {
            logger_1.logger.warn(`Admin access denied for user ${req.user.userId}`);
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        return next();
    }
    catch (error) {
        logger_1.logger.error('Error in admin middleware', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.isAdmin = isAdmin;
const isMerchant = (req, res, next) => {
    try {
        if (!req.user) {
            logger_1.logger.warn('Merchant access denied - User not authenticated');
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (req.user.userType !== kycTypes_1.UserType.MERCHANT) {
            logger_1.logger.warn(`Merchant access denied for user ${req.user.userId}`);
            return res.status(403).json({
                success: false,
                error: 'Merchant access required'
            });
        }
        return next();
    }
    catch (error) {
        logger_1.logger.error('Error in merchant middleware', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.isMerchant = isMerchant;
const isIndividual = (req, res, next) => {
    try {
        if (!req.user) {
            logger_1.logger.warn('Individual access denied - User not authenticated');
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (req.user.userType !== kycTypes_1.UserType.INDIVIDUAL) {
            logger_1.logger.warn(`Individual access denied for user ${req.user.userId}`);
            return res.status(403).json({
                success: false,
                error: 'Individual access required'
            });
        }
        return next();
    }
    catch (error) {
        logger_1.logger.error('Error in individual middleware', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.isIndividual = isIndividual;
//# sourceMappingURL=auth.js.map