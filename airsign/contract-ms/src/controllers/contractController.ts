import { Request, Response } from 'express';
import { ContractService } from '../services/contractService';
import { AuthRequest } from '../middleware/auth';
import { AccountServiceClient, UserRegistrationData } from '../services/accountServiceClient';

export class ContractController {
  private contractService: ContractService;

  constructor() {
    this.contractService = new ContractService();
  }

  createPublicContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, name, contractData } = req.body;

      // Validate email is provided
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create account service client
      const accountClient = new AccountServiceClient();

      // Create or get user account
      const accountResult = await accountClient.createUserAccount({
        email,
        name: name || email.split('@')[0]
      });

      if (!accountResult.success) {
        res.status(400).json({
          success: false,
          error: accountResult.message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // If we got a user, create the contract with the user ID
      if (accountResult.user) {
        const finalContractData = {
          ...contractData,
          createdBy: accountResult.user.id,
          title: contractData.title || 'Untitled Contract',
          status: 'draft'
        };

        const contract = await this.contractService.createContract(finalContractData);

        res.status(201).json({
          success: true,
          message: 'Contract created successfully',
          data: {
            contract,
            token: accountResult.token, // Return token if available
            redirectUrl: `/contracts/${contract.id}/edit` // Provide redirect URL for UI
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Account was created but user data is missing',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create public contract',
        timestamp: new Date().toISOString()
      });
    }
  }

  createContract = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const contractData = {
        ...req.body,
        createdBy: userId
      };

      const contract = await this.contractService.createContract(contractData);

      res.status(201).json({
        success: true,
        message: 'Contract created successfully',
        data: contract,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create contract',
        timestamp: new Date().toISOString()
      });
    }
  };

  getAllContracts = async (_req: Request, res: Response): Promise<void> => {
    try {
      const contracts = await this.contractService.getAllContracts();

      res.status(200).json({
        success: true,
        data: contracts,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contracts',
        timestamp: new Date().toISOString()
      });
    }
  };

  getContractById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const contract = await this.contractService.getContractById(id);

      if (!contract) {
        res.status(404).json({
          success: false,
          error: 'Contract not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: contract,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contract',
        timestamp: new Date().toISOString()
      });
    }
  };

  updateContract = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const contract = await this.contractService.updateContract(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Contract updated successfully',
        data: contract,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update contract',
        timestamp: new Date().toISOString()
      });
    }
  };

  deleteContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.contractService.deleteContract(id);

      res.status(200).json({
        success: true,
        message: 'Contract deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete contract',
        timestamp: new Date().toISOString()
      });
    }
  };

  signContract = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const { signature } = req.body;

      const contract = await this.contractService.signContract(id, userId!, signature);

      res.status(200).json({
        success: true,
        message: 'Contract signed successfully',
        data: contract,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to sign contract',
        timestamp: new Date().toISOString()
      });
    }
  };

  getContractStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const status = await this.contractService.getContractStatus(id);

      res.status(200).json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contract status',
        timestamp: new Date().toISOString()
      });
    }
  };
}
