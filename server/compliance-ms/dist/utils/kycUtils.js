"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = exports.validateKYCSubmission = exports.kycSubmissionSchema = exports.logger = exports.seedData = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const connectDB = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/compliance_db';
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        };
        await mongoose_1.default.connect(MONGODB_URI, options);
        exports.logger.info('MongoDB connected for Compliance Service');
    }
    catch (error) {
        exports.logger.error('MongoDB connection error for Compliance Service', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        process.exit(1);
    }
};
exports.connectDB = connectDB;
const seedData = async () => {
    exports.logger.info('Seeding compliance data (development only)');
};
exports.seedData = seedData;
const winston_1 = __importDefault(require("winston"));
const winston_2 = require("winston");
const environment_1 = require("../config/environment");
const { combine, timestamp, printf } = winston_2.format;
const kycLogFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});
exports.logger = winston_1.default.createLogger({
    level: environment_1.KYC_LOG_LEVEL,
    format: combine(timestamp(), kycLogFormat),
    transports: [
        new winston_2.transports.Console(),
    ],
    exitOnError: false,
});
const joi_1 = __importDefault(require("joi"));
exports.kycSubmissionSchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    userType: joi_1.default.string().valid(...Object.values(UserType)).required(),
    documents: joi_1.default.array().items(joi_1.default.object({
        type: joi_1.default.string().valid(...Object.values(DocumentType)).required(),
        fileName: joi_1.default.string().required(),
        fileType: joi_1.default.string().required(),
        fileSize: joi_1.default.number().positive().required(),
        fileUrl: joi_1.default.string().uri().required()
    })).min(1).required(),
    additionalInfo: joi_1.default.object().optional()
});
const validateKYCSubmission = (data) => {
    const { error, value } = exports.kycSubmissionSchema.validate(data, { abortEarly: false });
    if (error) {
        exports.logger.warn('KYC submission validation failed', {
            error: error.details.map(detail => detail.message)
        });
        return { error };
    }
    return { value };
};
exports.validateKYCSubmission = validateKYCSubmission;
const auditLogger = (action, user, details) => {
    exports.logger.info(`KYC Action: ${action} by ${user}`, {
        user,
        action,
        details,
        timestamp: new Date()
    });
};
exports.auditLogger = auditLogger;
//# sourceMappingURL=kycUtils.js.map