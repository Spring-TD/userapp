"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacService = exports.CACService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const environment_1 = require("../config/environment");
class CACService {
    async verifyCertificateOfIncorporation(registrationNumber, companyName) {
        try {
            if (!environment_1.CAC_API_URL || !environment_1.CAC_API_KEY) {
                logger_1.logger.warn('CAC API not configured', {
                    CAC_API_URL: environment_1.CAC_API_URL ? 'configured' : 'missing',
                    CAC_API_KEY: environment_1.CAC_API_KEY ? 'configured' : 'missing'
                });
                return {
                    success: false,
                    valid: false,
                    message: 'CAC verification service not configured',
                    error: 'CAC API not configured'
                };
            }
            const response = await axios_1.default.post(`${environment_1.CAC_API_URL}/verify-certificate`, {
                registrationNumber,
                companyName
            }, {
                headers: {
                    'Authorization': `Bearer ${environment_1.CAC_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            logger_1.logger.info('CAC verification completed', {
                registrationNumber,
                companyName,
                status: response.status,
                valid: response.data?.valid
            });
            return {
                success: true,
                valid: response.data?.valid || false,
                message: response.data?.message || 'Verification completed',
                data: response.data?.data
            };
        }
        catch (error) {
            logger_1.logger.error('Error verifying Certificate of Incorporation with CAC', {
                registrationNumber,
                companyName,
                error: error.message,
                status: error.response?.status,
                response: error.response?.data
            });
            if (error.response?.status === 404) {
                return {
                    success: true,
                    valid: false,
                    message: 'Company not found in CAC records',
                    error: 'Company not found'
                };
            }
            if (error.response?.status === 401 || error.response?.status === 403) {
                return {
                    success: false,
                    valid: false,
                    message: 'Authentication failed with CAC API',
                    error: 'Authentication error'
                };
            }
            return {
                success: false,
                valid: false,
                message: 'Failed to verify Certificate of Incorporation',
                error: error.message || 'Unknown error'
            };
        }
    }
    async mockVerifyCertificateOfIncorporation(registrationNumber, companyName) {
        logger_1.logger.info('Using mock CAC verification', {
            registrationNumber,
            companyName
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isValid = registrationNumber.length >= 5 && companyName.length >= 2;
        return {
            success: true,
            valid: isValid,
            message: isValid ? 'Mock verification successful' : 'Mock verification failed',
            data: isValid ? {
                companyName,
                registrationNumber,
                registrationDate: '2020-01-15',
                status: 'Active',
                address: '123 Business Street, Lagos, Nigeria',
                directors: [
                    { name: 'John Doe', position: 'Managing Director' },
                    { name: 'Jane Smith', position: 'Company Secretary' }
                ]
            } : undefined
        };
    }
}
exports.CACService = CACService;
exports.cacService = new CACService();
//# sourceMappingURL=cacService.js.map