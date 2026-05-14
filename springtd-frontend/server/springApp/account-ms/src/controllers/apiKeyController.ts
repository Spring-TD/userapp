
import { Request, Response } from 'express';
import serviceAuthService from '../services/serviceAuthService';

class ApiKeyController {
    /**
     * Get all API keys
     */
    async getApiKeys(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                res.status(401).json({
                    success: false,
                    error: 'Authorization token is required'
                });
                return;
            }

            const result = await serviceAuthService.getApiKeys(token);
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in getApiKeys:', error);
            const status = error.response?.status || 500;
            const data = error.response?.data || { success: false, error: 'Internal server error' };
            res.status(status).json(data);
        }
    }

    /**
     * Create a new API key
     */
    async createApiKey(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                res.status(401).json({
                    success: false,
                    error: 'Authorization token is required'
                });
                return;
            }

            const result = await serviceAuthService.createApiKey(token, req.body);
            res.status(201).json(result);
        } catch (error: any) {
            console.error('Error in createApiKey:', error);
            const status = error.response?.status || 500;
            const data = error.response?.data || { success: false, error: 'Internal server error' };
            res.status(status).json(data);
        }
    }

    /**
     * Revoke an API key
     */
    async revokeApiKey(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                res.status(401).json({
                    success: false,
                    error: 'Authorization token is required'
                });
                return;
            }

            const { id } = req.params;
            const result = await serviceAuthService.revokeApiKey(token, id);
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in revokeApiKey:', error);
            const status = error.response?.status || 500;
            const data = error.response?.data || { success: false, error: 'Internal server error' };
            res.status(status).json(data);
        }
    }
}

export default new ApiKeyController();
