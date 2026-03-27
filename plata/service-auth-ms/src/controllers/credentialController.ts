/**
 * SAMS Credential Controller
 * Handles creation, validation, and management of service-to-service credentials
 */

import { Request, Response } from 'express';
import { CredentialService } from '../services/samsService';
import { 
  serviceIdSchema, 
  createCredentialSchema,
  validateCredentialSchema,
  credentialIdSchema,
  voidCredentialSchema,
  validateInput 
} from '../utils/validation';
import { 
  CreateCredentialRequest,
  ValidateCredentialRequest,
  VoidCredentialRequest 
} from '../types/samsTypes';
import { logger } from '../utils/logger';

/**
 * Credential Controller class for SAMS credential management
 */
export class CredentialController {
  /**
   * POST /api/v1/services/:serviceId/credentials
   * Create credentials for a service
   */
  static async createCredential(req: Request, res: Response): Promise<void> {
    try {
      // Validate service ID parameter
      const { error: paramError } = validateInput(serviceIdSchema, req.params);
      
      if (paramError) {
        res.status(400).json({
          success: false,
          error: 'Invalid service ID',
          details: paramError
        });
        return;
      }

      // Validate credential data
      const { error, value } = validateInput<CreateCredentialRequest>(createCredentialSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { serviceId } = req.params;
      const createdBy = req.user?.email || 'system';

      // Create credential
      const result = await CredentialService.createCredential(serviceId || '', value!, createdBy || 'system');

      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);

    } catch (error) {
      logger.error('Credential creation error', { 
        error, 
        serviceId: req.params['serviceId'], 
        body: req.body 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while creating credential'
      });
    }
  }

  /**
   * POST /api/v1/credentials/validate
   * Validate a credential
   */
  static async validateCredential(req: Request, res: Response): Promise<void> {
    try {
      // Validate credential validation data
      const { error, value } = validateInput<ValidateCredentialRequest>(validateCredentialSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Extract merchant ID from request context (could be from headers, JWT, or session)
      const userMerchantId = req.headers['x-user-merchant-id'] as string || 
                           req.body.user_merchant_id || 
                           (req.user as any)?.user_merchant_id;

      // Create an updated validation request with merchant ID
      const validationRequest: ValidateCredentialRequest = {
        ...value!,
        user_merchant_id: userMerchantId
      };

      // Validate credential
      const result = await CredentialService.validateCredential(validationRequest);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Credential validation error', { error, body: req.body });
      res.status(500).json({
        success: false,
        valid: false,
        error: 'Internal server error',
        message: 'An error occurred while validating credential'
      });
    }
  }

  /**
   * POST /api/v1/credentials/void/:credentialId
   * Void/revoke a credential
   */
  static async voidCredential(req: Request, res: Response): Promise<void> {
    try {
      // Validate credential ID parameter
      const { error: paramError } = validateInput(credentialIdSchema, req.params);
      
      if (paramError) {
        res.status(400).json({
          success: false,
          error: 'Invalid credential ID',
          details: paramError
        });
        return;
      }

      // Validate void data (optional)
      const { error, value } = validateInput<VoidCredentialRequest>(voidCredentialSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { credentialId } = req.params;
      const voidedBy = req.user?.email || 'system';

      // Void credential
      const result = await CredentialService.voidCredential(credentialId || '', value || {}, voidedBy || 'system');

      const statusCode = result.success ? 200 : 404;
      res.status(statusCode).json(result);

    } catch (error) {
      logger.error('Credential voiding error', { 
        error, 
        credentialId: req.params['credentialId'], 
        body: req.body 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while voiding credential'
      });
    }
  }

  /**
   * POST /api/v1/credentials/:credentialId/regenerate
   * Regenerate a credential by creating a new one and voiding the old one
   */
  static async regenerateCredential(req: Request, res: Response): Promise<void> {
    try {
      // Validate credential ID parameter
      const { error: paramError } = validateInput(credentialIdSchema, req.params);
      
      if (paramError) {
        res.status(400).json({
          success: false,
          error: 'Invalid credential ID',
          details: paramError
        });
        return;
      }

      const { credentialId } = req.params;
      const regeneratedBy = req.user?.email || 'system';

      // Regenerate credential
      const result = await CredentialService.regenerateCredential(credentialId || '', regeneratedBy || 'system');

      const statusCode = result.success ? 200 : (result.status === 404 ? 404 : 400);
      res.status(statusCode).json(result);

    } catch (error) {
      logger.error('Credential regeneration error', { 
        error, 
        credentialId: req.params['credentialId'], 
        body: req.body 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while regenerating credential'
      });
    }
  }

  /**
   * GET /api/v1/services/:serviceId/credentials
   * Get credentials for a service
   */
  static async getServiceCredentials(req: Request, res: Response): Promise<void> {
    try {
      // Validate service ID parameter
      const { error: paramError } = validateInput(serviceIdSchema, req.params);
      
      if (paramError) {
        res.status(400).json({
          success: false,
          error: 'Invalid service ID',
          details: paramError
        });
        return;
      }

      const { serviceId } = req.params;
      const credentials = await CredentialService.getServiceCredentials(serviceId || '');

      // Remove sensitive credential values from response
      const sanitizedCredentials = credentials.map(cred => {
        const { credential_value, credential_hash, ...sanitized } = cred;
        return {
          ...sanitized,
          credential_preview: credential_value.substring(0, 8) + '...'
        };
      });

      res.status(200).json({
        success: true,
        message: 'Service credentials retrieved successfully',
        data: {
          service_id: serviceId,
          credentials: sanitizedCredentials,
          total: credentials.length
        }
      });

    } catch (error) {
      logger.error('Error retrieving service credentials', { 
        error, 
        serviceId: req.params['serviceId'] 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while retrieving service credentials'
      });
    }
  }
}

export default CredentialController;