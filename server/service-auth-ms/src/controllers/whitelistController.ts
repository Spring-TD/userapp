/**
 * SAMS IP Whitelist Controller
 * Handles IP address whitelisting for service access control
 */

import { Request, Response, NextFunction } from 'express';
import { WhitelistService } from '../services/samsService';
import { 
  serviceIdSchema, 
  whitelistIPSchema, 
  validateInput 
} from '../utils/validation';
import { WhitelistIPRequest } from '../types/samsTypes';
import { logger } from '../utils/logger';

/**
 * IP Whitelist Controller class for SAMS IP management
 */
export class WhitelistController {
  /**
   * POST /api/v1/services/:serviceId/whitelist-ip
   * Whitelist IP addresses for a service
   */
  static async whitelistIPs(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      // Validate whitelist data
      const { error, value } = validateInput<WhitelistIPRequest>(whitelistIPSchema, req.body);

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

      // Whitelist IPs
      const result = await WhitelistService.whitelistIPs(serviceId, value!, createdBy);

      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);

    } catch (error) {
      logger.error('IP whitelisting error', { 
        error, 
        serviceId: req.params['serviceId'], 
        body: req.body 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while whitelisting IP addresses'
      });
    }
  }

  /**
   * GET /api/v1/services/:serviceId/whitelist-ip
   * Get whitelisted IPs for a service
   */
  static async getWhitelistedIPs(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const whitelistedIPs = await WhitelistService.getWhitelistedIPs(serviceId);

      res.status(200).json({
        success: true,
        message: 'Whitelisted IPs retrieved successfully',
        data: {
          service_id: serviceId,
          whitelisted_ips: whitelistedIPs,
          total: whitelistedIPs.length
        }
      });

    } catch (error) {
      logger.error('Error retrieving whitelisted IPs', { 
        error, 
        serviceId: req.params['serviceId'] 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while retrieving whitelisted IPs'
      });
    }
  }

  /**
   * POST /api/v1/services/:serviceId/check-ip
   * Check if an IP address is whitelisted for a service
   */
  static async checkIPAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { ip_address } = req.body;

      if (!ip_address) {
        res.status(400).json({
          success: false,
          error: 'IP address is required',
          details: 'Please provide ip_address in request body'
        });
        return;
      }

      const result = await WhitelistService.checkIPAccess(serviceId, ip_address);

      res.status(200).json({
        success: true,
        message: result.isAllowed ? 'IP access allowed' : 'IP access denied',
        data: {
          service_id: serviceId,
          ip_address,
          is_allowed: result.isAllowed,
          reason: result.reason
        }
      });

    } catch (error) {
      logger.error('Error checking IP access', { 
        error, 
        serviceId: req.params['serviceId'], 
        body: req.body 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while checking IP access'
      });
    }
  }
}

export default WhitelistController;