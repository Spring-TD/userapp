/**
 * SAMS Service Controller
 * Handles service registration, discovery, and management endpoints
 */

import { Request, Response } from 'express';
import { ServiceService } from '../services/samsService';
import { 
  createServiceSchema, 
  serviceIdSchema, 
  updateServiceStatusSchema, 
  validateInput 
} from '../utils/validation';
import { 
  CreateServiceRequest, 
  ServiceStatus 
} from '../types/samsTypes';
import { logger } from '../utils/logger';

/**
 * Service Controller class for SAMS service management
 */
export class ServiceController {
  /**
   * POST /api/v1/services/create
   * Create a new service registration
   */
  static async createService(req: Request, res: Response): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<CreateServiceRequest>(createServiceSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Extract user info from authenticated request (if available)
      const createdBy = req.user?.email || 'system';

      // Create service
      const result = await ServiceService.createService(value!, createdBy);

      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);

    } catch (error) {
      logger.error('Service creation error', { error, body: req.body });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while creating the service'
      });
    }
  }

  /**
   * GET /api/v1/services
   * Get all registered services
   */
  static async getAllServices(req: Request, res: Response): Promise<void> {
    try {
      const result = await ServiceService.getAllServices();
      
      const statusCode = result.success ? 200 : 500;
      res.status(statusCode).json(result);

    } catch (error) {
      logger.error('Error retrieving services', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while retrieving services'
      });
    }
  }

  /**
   * GET /api/v1/services/:serviceId
   * Get a specific service by ID
   */
  static async getServiceById(req: Request, res: Response): Promise<void> {
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
      if (!serviceId) {
        res.status(400).json({
          success: false,
          error: 'Invalid service ID',
          details: 'Service ID parameter is required'
        });
        return;
      }
      const result = await ServiceService.getServiceById(serviceId);

      const statusCode = result.success ? 200 : 404;
      res.status(statusCode).json(result);

    } catch (error) {
      logger.error('Error retrieving service', { error, serviceId: req.params['serviceId'] });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while retrieving the service'
      });
    }
  }

  /**
   * GET /api/v1/services/health
   * Get SAMS system health status
   */
  static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = {
        status: 'healthy',
        services: 0,
        credentials: 0,
        ip_whitelists: 0,
        timestamp: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        message: 'SAMS system health retrieved successfully',
        data: healthStatus
      });

    } catch (error) {
      logger.error('Error retrieving system health', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while retrieving system health'
      });
    }
  }
}

export default ServiceController;