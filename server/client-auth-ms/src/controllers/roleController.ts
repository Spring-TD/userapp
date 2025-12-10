
import { Request, Response } from 'express';
import { authApiService } from '../services/authApiService';

export class RoleController {

    static async createRole(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                res.status(401).json({
                    success: false,
                    error: 'Authorization token is required'
                });
                return;
            }

            const roleData = req.body;
            const result = await authApiService.createRole(token, roleData);

            res.status(result.success ? 201 : 400).json(result);
        } catch (error) {
            console.error('Error in createRole:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    static async getRoles(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                res.status(401).json({
                    success: false,
                    error: 'Authorization token is required'
                });
                return;
            }

            const result = await authApiService.getRoles(token);
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in getRoles:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    static async getPermissions(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            // Token is optional for permissions in some contexts but let's pass it if present

            const result = await authApiService.getPermissions(token);
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in getPermissions:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}
