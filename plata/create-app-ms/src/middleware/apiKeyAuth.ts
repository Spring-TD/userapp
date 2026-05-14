import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';
import { ApiError } from './errorHandler';

/**
 * Middleware to authenticate requests with special API key and public key
 * Expects headers:
 * - X-Special-Key: The special API key
 * - PLATA_PUBLIC_KEY: The public key
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const specialKey = req.headers['x-special-key'];
    const publicKey = req.headers['plata_public_key'];

    // Check if both keys are provided
    if (!specialKey || !publicKey) {
      throw new ApiError(401, 'Missing API keys in headers');
    }

    // Validate the keys
    if (specialKey !== config.specialApiKey || publicKey !== config.publicKey) {
      throw new ApiError(403, 'Invalid API keys provided');
    }

    // If keys are valid, proceed to the next middleware/route handler
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication'
    });
  }
};