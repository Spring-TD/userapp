import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';
import { isInsecureDefaultApiKeyPair } from '../config/apiKeys';
import { ApiError } from './errorHandler';

/**
 * Middleware to authenticate requests with special API key and public key
 * Expects headers:
 * - X-Special-Key: The special API key
 * - X-Public-Key: The public key
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const specialKey = req.headers['x-special-key'];
    const publicKey = req.headers['x-public-key'];

    // Check if both keys are provided
    if (!specialKey || !publicKey) {
      throw new ApiError(401, 'Missing API keys in headers');
    }

    const specialKeyValue = Array.isArray(specialKey) ? specialKey[0] : specialKey;
    const publicKeyValue = Array.isArray(publicKey) ? publicKey[0] : publicKey;

    if (
      config.nodeEnv === 'production' &&
      isInsecureDefaultApiKeyPair(specialKeyValue, publicKeyValue)
    ) {
      throw new ApiError(403, 'Default API keys are not allowed in production');
    }

    // Validate the keys
    if (specialKeyValue !== config.specialApiKey || publicKeyValue !== config.publicKey) {
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
