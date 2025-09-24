"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = exports.validateKYCSubmission = exports.kycSubmissionSchema = void 0;
const kycTypes_1 = require("../types/kycTypes");
const kycSubmissionSchema = (Joi) => Joi.object({
    userId: Joi.string().required(),
    userType: Joi.string().valid(...Object.values(kycTypes_1.UserType)).required(),
    documents: Joi.array().items(Joi.object({
        type: Joi.string().valid(...Object.values(kycTypes_1.DocumentType)).required(),
        fileName: Joi.string().required(),
        fileType: Joi.string().required(),
        fileSize: Joi.number().positive().required(),
        fileUrl: Joi.string().uri().required()
    })).min(1).required(),
    additionalInfo: Joi.object().optional()
});
exports.kycSubmissionSchema = kycSubmissionSchema;
const validateKYCSubmission = (data, Joi) => {
    const schema = (0, exports.kycSubmissionSchema)(Joi);
    const { error, value } = schema.validate(data, { abortEarly: false });
    if (error) {
        console.warn('KYC submission validation failed', {
            error: error.details.map((detail) => detail.message)
        });
        return { error };
    }
    return { value };
};
exports.validateKYCSubmission = validateKYCSubmission;
const auditLogger = (action, user, details) => {
    console.info(`KYC Action: ${action} by ${user}`, {
        user,
        action,
        details,
        timestamp: new Date()
    });
};
exports.auditLogger = auditLogger;
//# sourceMappingURL=kycUtils.js.map