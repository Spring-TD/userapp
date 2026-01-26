import { Request, Response } from 'express';
import { PricingService, CreatePricingScheduleData, BillingException } from '../services/pricingService';

export class PricingController {
  /**
   * Create a new pricing schedule
   */
  static async createPricingSchedule(req: Request, res: Response) {
    try {
      const scheduleData: CreatePricingScheduleData = req.body;
      const result = await PricingService.createPricingSchedule(scheduleData);
      res.status(201).json({
        success: true,
        message: 'Pricing schedule created successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating pricing schedule',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a pricing schedule by ID
   */
  static async getPricingSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await PricingService.getPricingSchedule(id);
      if (result) {
        res.status(200).json({
          success: true,
          message: 'Pricing schedule retrieved successfully',
          data: result
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Pricing schedule not found'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving pricing schedule',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * List all pricing schedules
   */
  static async listPricingSchedules(req: Request, res: Response) {
    try {
      const result = await PricingService.listPricingSchedules();
      res.status(200).json({
        success: true,
        message: 'Pricing schedules retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving pricing schedules',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update a pricing schedule
   */
  static async updatePricingSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const result = await PricingService.updatePricingSchedule(id, updateData);
      if (result) {
        res.status(200).json({
          success: true,
          message: 'Pricing schedule updated successfully',
          data: result
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Pricing schedule not found'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating pricing schedule',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cancel a pricing schedule
   */
  static async cancelPricingSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await PricingService.cancelPricingSchedule(id);
      if (result) {
        res.status(200).json({
          success: true,
          message: 'Pricing schedule cancelled successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Pricing schedule not found'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error cancelling pricing schedule',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Pause a pricing schedule
   */
  static async pausePricingSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await PricingService.pausePricingSchedule(id);
      if (result) {
        res.status(200).json({
          success: true,
          message: 'Pricing schedule paused successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Pricing schedule not found'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error pausing pricing schedule',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Resume a pricing schedule
   */
  static async resumePricingSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await PricingService.resumePricingSchedule(id);
      if (result) {
        res.status(200).json({
          success: true,
          message: 'Pricing schedule resumed successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Pricing schedule not found'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error resuming pricing schedule',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Manually trigger the pricing schedule process
   */
  static async triggerPricingProcess(req: Request, res: Response) {
    try {
      const result = await PricingService.processDuePricingSchedules();
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Pricing schedule process completed',
          data: {
            processedCount: result.processedCount,
            failedCount: result.failedCount
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Pricing schedule process failed',
          error: result.errors
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error triggering pricing schedule process',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}