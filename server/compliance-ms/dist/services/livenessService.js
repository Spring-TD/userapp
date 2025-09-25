"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.livenessService = exports.LivenessService = void 0;
const kycTypes_1 = require("../types/kycTypes");
const logger_1 = require("../utils/logger");
class MockLivenessProvider {
    async generateLivenessUrl(shareholderId, callbackUrl) {
        const providerReference = `liveness_${shareholderId}_${Date.now()}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const url = `https://mock-liveness-provider.com/test/${providerReference}?callback=${encodeURIComponent(callbackUrl)}`;
        logger_1.logger.info('Generated liveness test URL', {
            shareholderId,
            providerReference,
            expiresAt,
            url
        });
        return { url, expiresAt, providerReference };
    }
    async getLivenessResult(providerReference) {
        const success = Math.random() > 0.2;
        const score = success ? Math.floor(Math.random() * 41) + 60 : Math.floor(Math.random() * 30);
        const completedAt = new Date();
        const result = {
            success,
            score,
            details: success
                ? 'Liveness test passed successfully with clear facial recognition'
                : 'Liveness test failed - unable to verify facial movements',
            completedAt
        };
        logger_1.logger.info('Retrieved liveness test result', {
            providerReference,
            ...result
        });
        return result;
    }
}
class LivenessService {
    constructor() {
        this.livenessProvider = new MockLivenessProvider();
    }
    async generateLivenessTest(shareholderId, callbackUrl) {
        try {
            const result = await this.livenessProvider.generateLivenessUrl(shareholderId, callbackUrl);
            logger_1.logger.info('Liveness test generated successfully', {
                shareholderId,
                providerReference: result.providerReference
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to generate liveness test', {
                shareholderId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to generate liveness test');
        }
    }
    async processLivenessResult(providerReference) {
        try {
            const result = await this.livenessProvider.getLivenessResult(providerReference);
            logger_1.logger.info('Liveness result processed successfully', {
                providerReference,
                success: result.success
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to process liveness result', {
                providerReference,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to process liveness result');
        }
    }
    async initializeShareholderLiveness(shareholder, callbackUrl) {
        try {
            const livenessInfo = await this.generateLivenessTest(`${shareholder.fullName}_${shareholder.ownershipPercentage}`, callbackUrl);
            const initializedShareholder = {
                fullName: shareholder.fullName,
                email: shareholder.email,
                phoneNumber: shareholder.phoneNumber,
                bvn: shareholder.bvn,
                bankAccount: shareholder.bankAccount,
                ownershipPercentage: shareholder.ownershipPercentage,
                submittedAt: shareholder.submittedAt,
                uboDocument: shareholder.uboDocument,
                bankStatement: shareholder.bankStatement,
                status: kycTypes_1.KYCStatus.PENDING,
                kyc: {
                    url: livenessInfo.url,
                    expiresAt: livenessInfo.expiresAt,
                    status: kycTypes_1.KYCStatus.PENDING,
                    providerReference: livenessInfo.providerReference
                }
            };
            logger_1.logger.info('Shareholder liveness test initialized', {
                shareholderId: `${shareholder.fullName}_${shareholder.ownershipPercentage}`,
                providerReference: livenessInfo.providerReference
            });
            return initializedShareholder;
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize shareholder liveness test', {
                shareholder: shareholder.fullName,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to initialize shareholder liveness test');
        }
    }
    async updateShareholderWithLivenessResult(shareholder, providerReference) {
        try {
            const result = await this.processLivenessResult(providerReference);
            const updatedShareholder = {
                ...shareholder,
                kyc: {
                    ...shareholder.kyc,
                    status: result.success ? 'completed' : 'failed',
                    result: {
                        ...result
                    }
                },
                status: result.success ? kycTypes_1.KYCStatus.APPROVED : kycTypes_1.KYCStatus.REJECTED
            };
            logger_1.logger.info('Shareholder updated with liveness test result', {
                shareholderId: `${shareholder.fullName}_${shareholder.ownershipPercentage}`,
                providerReference,
                success: result.success
            });
            return updatedShareholder;
        }
        catch (error) {
            logger_1.logger.error('Failed to update shareholder with liveness result', {
                shareholder: shareholder.fullName,
                providerReference,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to update shareholder with liveness result');
        }
    }
}
exports.LivenessService = LivenessService;
exports.livenessService = new LivenessService();
//# sourceMappingURL=livenessService.js.map