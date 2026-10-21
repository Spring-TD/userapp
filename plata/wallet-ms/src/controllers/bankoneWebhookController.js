"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankOneWebhookController = void 0;
const bankone_1 = require("../config/bankone");
const bankoneActivityWebhookService_1 = require("../services/bankone/bankoneActivityWebhookService");
const logger_1 = require("../utils/logger");
function headerMap(req) {
    return req.headers;
}
class BankOneWebhookController {
    /**
     * GET /api/v1/wallets/bankone/webhook
     * Health / discovery for Charis BankOne activity webhook registration.
     */
    static async getInfo(req, res) {
        res.status(200).json({
            success: true,
            message: 'Charis/BankOne activity webhook is active. POST JSON events (account.created, credit, debit, or other).',
            path: '/api/v1/wallets/bankone/webhook',
            auth: {
                headers: ['X-BankOne-Webhook-Token', 'X-Charis-Webhook-Token', 'Authorization: Bearer <token>'],
                query: ['authToken']
            },
            configured: Boolean(bankone_1.bankoneConfig.webhookToken)
        });
    }
    /**
     * POST /api/v1/wallets/bankone/webhook
     * Charis pushes account activity for our applicants (NUBAN create, credit, debit, etc.).
     */
    static async handleActivity(req, res, next) {
        try {
            if (!bankone_1.bankoneConfig.webhookToken) {
                res.status(503).json({
                    success: false,
                    error: 'BankOne webhook token is not configured on wallet-ms'
                });
                return;
            }
            const provided = (0, bankoneActivityWebhookService_1.extractBankOneWebhookToken)({
                headers: headerMap(req),
                query: req.query
            });
            if (!(0, bankoneActivityWebhookService_1.verifyBankOneWebhookToken)(bankone_1.bankoneConfig.webhookToken, provided, bankone_1.bankoneConfig.webhookEnforceToken)) {
                logger_1.logger.warn('Rejected BankOne activity webhook: invalid token');
                res.status(401).json({ success: false, error: 'Invalid webhook token' });
                return;
            }
            const result = await (0, bankoneActivityWebhookService_1.processBankOneActivityWebhook)(req.body);
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error || 'Failed to process BankOne activity webhook',
                    eventType: result.eventType
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: result.duplicate
                    ? 'Duplicate BankOne activity acknowledged'
                    : result.acknowledged
                        ? 'BankOne activity acknowledged'
                        : 'BankOne activity processed',
                eventType: result.eventType,
                duplicate: result.duplicate === true,
                data: result.data
            });
        }
        catch (error) {
            logger_1.logger.error('BankOne activity webhook error', { error });
            next(error);
        }
    }
}
exports.BankOneWebhookController = BankOneWebhookController;
//# sourceMappingURL=bankoneWebhookController.js.map