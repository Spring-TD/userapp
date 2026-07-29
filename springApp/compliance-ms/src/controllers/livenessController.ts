import { Request, Response, NextFunction } from 'express';
import { livenessService } from '../services/livenessService';
import { logger } from '../utils/logger';
import {
  notifyProductMsGuarantorKycCompleted,
  parseGuarantorUserRef
} from '../services/productMsGuarantorNotifyService';

export class LivenessController {
  /**
   * Webhook endpoint for liveness test results
   * This endpoint will be called by the third-party provider when a liveness test is completed
   */
  static async handleLivenessResult(req: Request, res: Response, next: NextFunction) {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const providerReference = String(body.providerReference || body.verificationId || body.verification_id || '').trim();
      const status = String(body.status || body.event || '').trim();
      const result = body.result as Record<string, unknown> | undefined;
      const userId = String(body.userId || body.user_id || body.userRef || body.user_ref || '').trim();

      if (!providerReference && !userId) {
        logger.warn('Liveness result webhook called without provider reference or user id');
        return res.status(400).json({
          success: false,
          error: 'Provider reference or user id is required'
        });
      }

      logger.info('Received liveness result webhook', {
        providerReference: providerReference || undefined,
        userId: userId || undefined,
        status,
        hasResult: Boolean(result)
      });

      const guarantorRef = parseGuarantorUserRef(userId);
      const completed =
        ['completed', 'verified', 'success', 'approved'].some((hint) => status.toLowerCase().includes(hint)) ||
        result?.success === true;

      if (guarantorRef && completed) {
        void notifyProductMsGuarantorKycCompleted(guarantorRef.applicationId, guarantorRef.guarantorId);
      }

      return res.status(200).json({
        success: true,
        message: 'Liveness result received and processed'
      });
    } catch (error) {
      logger.error('Error processing liveness result webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });
      
      next(error);
    }
  }
  
  /**
   * Endpoint to manually check liveness test results
   * This could be called by the frontend to check the status of a liveness test
   */
  static async checkLivenessStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerReference } = req.params;
      
      if (!providerReference) {
        return res.status(400).json({
          success: false,
          error: 'Provider reference is required'
        });
      }
      
      logger.info('Checking liveness status', {
        providerReference
      });
      
      // In a real implementation, you would retrieve the actual result from the provider
      // For this mock, we'll simulate getting results
      const result = await livenessService.processLivenessResult(providerReference);
      
      return res.status(200).json({
        success: true,
        data: {
          providerReference,
          result
        }
      });
    } catch (error) {
      logger.error('Error checking liveness status', {
        providerReference: req.params.providerReference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      next(error);
    }
  }
  
  /**
   * Endpoint to generate a new liveness test URL for a shareholder
   */
  static async generateLivenessTest(req: Request, res: Response, next: NextFunction) {
    try {
      const { shareholderId } = req.params;
      const { callbackUrl } = req.body;
      
      if (!shareholderId) {
        return res.status(400).json({
          success: false,
          error: 'Shareholder ID is required'
        });
      }
      
      // In a real implementation, you would:
      // 1. Retrieve the shareholder from the database
      // 2. Generate a new liveness test URL
      // 3. Update the shareholder with the new liveness test information
      
      // For this mock, we'll just generate a new URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const defaultCallbackUrl = `${baseUrl}/api/v1/liveness/webhook`;
      const finalCallbackUrl = callbackUrl || defaultCallbackUrl;
      
      const livenessInfo = await livenessService.generateLivenessTest(
        shareholderId,
        finalCallbackUrl
      );
      
      logger.info('Generated new liveness test for shareholder', {
        shareholderId,
        providerReference: livenessInfo.providerReference
      });
      
      return res.status(200).json({
        success: true,
        data: livenessInfo
      });
    } catch (error) {
      logger.error('Error generating liveness test', {
        shareholderId: req.params.shareholderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      next(error);
    }
  }
}