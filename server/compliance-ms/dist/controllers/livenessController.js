"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LivenessController = void 0;
const livenessService_1 = require("../services/livenessService");
const logger_1 = require("../utils/logger");
class LivenessController {
    static async handleLivenessResult(req, res, next) {
        try {
            const { providerReference, status, result } = req.body;
            if (!providerReference) {
                logger_1.logger.warn('Liveness result webhook called without provider reference');
                return res.status(400).json({
                    success: false,
                    error: 'Provider reference is required'
                });
            }
            logger_1.logger.info('Received liveness result webhook', {
                providerReference,
                status,
                hasResult: !!result
            });
            logger_1.logger.info('Processing liveness result for provider reference', {
                providerReference
            });
            return res.status(200).json({
                success: true,
                message: 'Liveness result received and processed'
            });
        }
        catch (error) {
            logger_1.logger.error('Error processing liveness result webhook', {
                error: error instanceof Error ? error.message : 'Unknown error',
                body: req.body
            });
            next(error);
        }
    }
    static async checkLivenessStatus(req, res, next) {
        try {
            const { providerReference } = req.params;
            if (!providerReference) {
                return res.status(400).json({
                    success: false,
                    error: 'Provider reference is required'
                });
            }
            logger_1.logger.info('Checking liveness status', {
                providerReference
            });
            const result = await livenessService_1.livenessService.processLivenessResult(providerReference);
            return res.status(200).json({
                success: true,
                data: {
                    providerReference,
                    result
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error checking liveness status', {
                providerReference: req.params.providerReference,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            next(error);
        }
    }
    static async generateLivenessTest(req, res, next) {
        try {
            const { shareholderId } = req.params;
            const { callbackUrl } = req.body;
            if (!shareholderId) {
                return res.status(400).json({
                    success: false,
                    error: 'Shareholder ID is required'
                });
            }
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const defaultCallbackUrl = `${baseUrl}/api/v1/liveness/webhook`;
            const finalCallbackUrl = callbackUrl || defaultCallbackUrl;
            const livenessInfo = await livenessService_1.livenessService.generateLivenessTest(shareholderId, finalCallbackUrl);
            logger_1.logger.info('Generated new liveness test for shareholder', {
                shareholderId,
                providerReference: livenessInfo.providerReference
            });
            return res.status(200).json({
                success: true,
                data: livenessInfo
            });
        }
        catch (error) {
            logger_1.logger.error('Error generating liveness test', {
                shareholderId: req.params.shareholderId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            next(error);
        }
    }
}
exports.LivenessController = LivenessController;
//# sourceMappingURL=livenessController.js.map