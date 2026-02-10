import { Request, Response } from 'express';
import { PublicContractService } from '../services/publicContractService';
import { AccountServiceClient } from '../services/accountServiceClient';

export class PublicContractController {
  private publicContractService: PublicContractService;
  private accountServiceClient: AccountServiceClient;

  constructor() {
    this.publicContractService = new PublicContractService();
    this.accountServiceClient = new AccountServiceClient();
  }

  /**
   * Step 1: User enters email to receive OTP
   * Endpoint: POST /api/v1/contracts/public/request-otp
   */
  requestOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, contractUrl } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!contractUrl) {
        res.status(400).json({
          success: false,
          error: 'Contract URL is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate contract URL exists and is valid
      const contractOrder = await this.publicContractService.validateContractUrl(contractUrl);
      if (!contractOrder) {
        res.status(404).json({
          success: false,
          error: 'Invalid or expired contract URL',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate and send OTP
      const result = await this.publicContractService.generateAndSendOtp(email, contractOrder.id);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'OTP sent to your email',
          data: {
            email: email,
            contractOrderId: contractOrder.id
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.message,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process OTP request',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Step 2: User verifies OTP and gets account created
   * Endpoint: POST /api/v1/contracts/public/verify-otp
   */
  verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, otp, contractOrderId } = req.body;

      if (!email || !otp || !contractOrderId) {
        res.status(400).json({
          success: false,
          error: 'Email, OTP, and contract order ID are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify OTP
      const otpResult = await this.publicContractService.verifyOtp(email, otp, contractOrderId);
      
      if (!otpResult.success) {
        res.status(400).json({
          success: false,
          error: otpResult.message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create account for user
      const accountResult = await this.accountServiceClient.createUserAccount({
        email: email,
        name: email.split('@')[0] // Use email prefix as name
      });

      if (!accountResult.success) {
        res.status(500).json({
          success: false,
          error: 'Failed to create account: ' + accountResult.message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create unique contract form for this user
      const contractForm = await this.publicContractService.createContractFormForUser(
        contractOrderId,
        accountResult.user!.id,
        email
      );

      res.status(200).json({
        success: true,
        message: 'Verification successful',
        data: {
          token: accountResult.token,
          contractFormId: contractForm.id,
          contractUrl: contractForm.contract_url,
          userId: accountResult.user!.id
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify OTP',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Step 3: Get contract form for signing
   * Endpoint: GET /api/v1/contracts/public/form/:formId
   */
  getContractForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { formId } = req.params;

      if (!formId) {
        res.status(400).json({
          success: false,
          error: 'Form ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const contractForm = await this.publicContractService.getContractForm(formId);
      
      if (!contractForm) {
        res.status(404).json({
          success: false,
          error: 'Contract form not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: contractForm,
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

  /**
   * Step 4: Submit signed contract
   * Endpoint: POST /api/v1/contracts/public/form/:formId/submit
   */
  submitContractForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { formId } = req.params;
      const formData = req.body;

      if (!formId) {
        res.status(400).json({
          success: false,
          error: 'Form ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.publicContractService.submitContractForm(formId, formData);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Contract submitted successfully',
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit contract form',
        timestamp: new Date().toISOString()
      });
    }
  };
}