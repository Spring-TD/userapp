import { Request, Response } from 'express';
import { ContractFormService } from '../services/contractFormService';
import { AuthRequest } from '../middleware/auth';
import { CreateContractFormRequest, UpdateContractFormRequest } from '../types/contractForm';

export class ContractFormController {
  private contractFormService: ContractFormService;

  constructor() {
    this.contractFormService = new ContractFormService();
  }

  createForm = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const formData: CreateContractFormRequest = req.body;

      const form = await this.contractFormService.createForm(formData, userId);

      res.status(201).json({
        success: true,
        message: 'Contract form created successfully',
        data: form,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create contract form',
        timestamp: new Date().toISOString()
      });
    }
  };

  getFormById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const form = await this.contractFormService.getFormById(id);

      if (!form) {
        res.status(404).json({
          success: false,
          error: 'Contract form not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: form,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contract form',
        timestamp: new Date().toISOString()
      });
    }
  };

  getFormByOrderId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const form = await this.contractFormService.getFormByOrderId(orderId);

      if (!form) {
        res.status(404).json({
          success: false,
          error: 'Contract form not found for this order',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: form,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contract form',
        timestamp: new Date().toISOString()
      });
    }
  };

  getFormsByUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const forms = await this.contractFormService.getFormsByUserId(userId);

      res.status(200).json({
        success: true,
        data: forms,
        count: forms.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contract forms',
        timestamp: new Date().toISOString()
      });
    }
  };

  getFormsByStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status } = req.params;
      const validStatuses = ['draft', 'submitted', 'approved', 'rejected'];

      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const forms = await this.contractFormService.getFormsByStatus(
        status as 'draft' | 'submitted' | 'approved' | 'rejected'
      );

      res.status(200).json({
        success: true,
        data: forms,
        count: forms.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contract forms',
        timestamp: new Date().toISOString()
      });
    }
  };

  updateForm = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdateContractFormRequest = req.body;

      const form = await this.contractFormService.updateForm(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Contract form updated successfully',
        data: form,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update contract form',
        timestamp: new Date().toISOString()
      });
    }
  };

  submitForm = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const form = await this.contractFormService.submitForm(id);

      res.status(200).json({
        success: true,
        message: 'Contract form submitted successfully',
        data: form,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to submit contract form',
        timestamp: new Date().toISOString()
      });
    }
  };

  deleteForm = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.contractFormService.deleteForm(id);

      res.status(200).json({
        success: true,
        message: 'Contract form deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete contract form',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get all signed contracts by user ID (JSON)
   */
  getSignedContractsByUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const contracts = await this.contractFormService.getSignedContractsByUserId(userId);

      res.status(200).json({
        success: true,
        data: contracts,
        count: contracts.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch signed contracts',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Download single contract as PDF
   */
  downloadContractPDF = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const pdfDoc = await this.contractFormService.generateContractPDF(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=contract-${id}.pdf`);

      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to generate PDF',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Download all signed contracts by user as combined PDF
   */
  downloadUserContractsPDF = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const pdfDoc = await this.contractFormService.generateUserContractsPDF(userId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=contracts-user-${userId}.pdf`);

      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to generate PDF',
        timestamp: new Date().toISOString()
      });
    }
  };
}
