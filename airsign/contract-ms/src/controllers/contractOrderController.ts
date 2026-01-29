import { Request, Response } from 'express';
import { ContractOrderService } from '../services/contractOrderService';
import { AuthRequest } from '../middleware/auth';
import { CreateContractOrderRequest } from '../types/contractOrder';
import { CONTRACT_TYPE_CONFIGS, ContractTypeEnum } from '../types/contractType';
import { NotificationService } from '../services/notificationService';

export class ContractOrderController {
  private contractOrderService: ContractOrderService;
  private notificationService: NotificationService;

  constructor() {
    this.contractOrderService = new ContractOrderService();
    this.notificationService = new NotificationService();
  }

  createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
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

      const orderData: CreateContractOrderRequest = req.body;

      // Validate required fields
      if (!orderData.contract_id) {
        res.status(400).json({
          success: false,
          error: 'contract_id is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!orderData.contract_type) {
        res.status(400).json({
          success: false,
          error: 'contract_type is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!orderData.expiration) {
        res.status(400).json({
          success: false,
          error: 'expiration is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const order = await this.contractOrderService.createOrder(orderData, userId);

      res.status(201).json({
        success: true,
        message: 'Contract order created successfully',
        data: order,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create contract order',
        timestamp: new Date().toISOString()
      });
    }
  };

  getOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const order = await this.contractOrderService.getOrderById(id);

      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Contract order not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contract order',
        timestamp: new Date().toISOString()
      });
    }
  };

  getOrdersByUser = async (req: AuthRequest, res: Response): Promise<void> => {
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

      const orders = await this.contractOrderService.getOrdersByUserId(userId);

      res.status(200).json({
        success: true,
        data: orders,
        count: orders.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contract orders',
        timestamp: new Date().toISOString()
      });
    }
  };

  getOrdersByContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contractId } = req.params;
      const orders = await this.contractOrderService.getOrdersByContractId(contractId);

      res.status(200).json({
        success: true,
        data: orders,
        count: orders.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contract orders',
        timestamp: new Date().toISOString()
      });
    }
  };

  updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const validStatuses = ['pending', 'sent', 'accepted', 'rejected', 'expired'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const order = await this.contractOrderService.updateOrderStatus(id, status);

      res.status(200).json({
        success: true,
        message: 'Contract order status updated successfully',
        data: order,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update contract order status',
        timestamp: new Date().toISOString()
      });
    }
  };

  getContractTypes = async (_req: Request, res: Response): Promise<void> => {
    try {
      const contractTypes = Object.values(ContractTypeEnum).map(type => ({
        ...CONTRACT_TYPE_CONFIGS[type],
        type
      }));

      res.status(200).json({
        success: true,
        data: contractTypes,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contract types',
        timestamp: new Date().toISOString()
      });
    }
  };

  getContractTypeRequirements = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
      const requirements = this.contractOrderService.getContractTypeRequirements(type);

      res.status(200).json({
        success: true,
        data: requirements,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch contract type requirements',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Share contract URL via email and/or SMS
   */
  shareContractUrl = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { email, phone, recipientName, message } = req.body;

      // Validate that at least one contact method is provided
      if (!email && !phone) {
        res.status(400).json({
          success: false,
          error: 'At least one contact method (email or phone) is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get the contract order to retrieve contract_url
      const order = await this.contractOrderService.getOrderById(id);
      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Contract order not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const results = {
        emailSent: false,
        smsSent: false
      };

      const name = recipientName || 'Recipient';
      const customMessage = message || '';

      // Send email if provided
      if (email) {
        const emailSubject = 'Contract Invitation';
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Contract Invitation</h1>
              </div>
              <div class="content">
                <p>Dear ${name},</p>
                ${customMessage ? `<p>${customMessage}</p>` : ''}
                <p>You have been invited to review and sign a contract.</p>
                <p><strong>Contract Type:</strong> ${order.contract_type}</p>
                <p><strong>Expires:</strong> ${new Date(order.expiration).toLocaleString()}</p>
                <p>Please click the button below to view and complete the contract:</p>
                <a href="${order.contract_url}" class="button">View Contract</a>
                <p>Or copy this link: <br><a href="${order.contract_url}">${order.contract_url}</a></p>
              </div>
              <div class="footer">
                <p>This is an automated message from the Contract Management Service.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const emailText = `
Dear ${name},

${customMessage ? customMessage + '\n\n' : ''}You have been invited to review and sign a contract.

Contract Type: ${order.contract_type}
Expires: ${new Date(order.expiration).toLocaleString()}

Please visit the following link to view and complete the contract:
${order.contract_url}

Thank you!
        `;

        results.emailSent = await this.notificationService.sendEmail({
          to: email,
          subject: emailSubject,
          html: emailHtml,
          text: emailText
        });
      }

      // Send SMS if provided
      if (phone) {
        const smsMessage = `Hi ${name}, you have a contract to review and sign. ${customMessage ? customMessage + ' ' : ''}Please visit: ${order.contract_url} (Expires: ${new Date(order.expiration).toLocaleDateString()})`;
        
        results.smsSent = await this.notificationService.sendSMS({
          to: phone,
          message: smsMessage
        });
      }

      // Check if at least one notification was sent successfully
      if (!results.emailSent && !results.smsSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to send notifications. Please check email/SMS configuration.',
          details: results,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Contract URL shared successfully',
        data: {
          contractUrl: order.contract_url,
          sharedWith: {
            email: email || null,
            phone: phone || null
          },
          results
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to share contract URL',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Verify contract by reference code
   */
  verifyContractReference = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reference } = req.params;

      if (!reference) {
        res.status(400).json({
          success: false,
          error: 'Contract reference is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const order = await this.contractOrderService.verifyContractByReference(reference);

      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Contract not found with the provided reference',
          verified: false,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if contract is expired
      const isExpired = new Date() > new Date(order.expiration);

      res.status(200).json({
        success: true,
        verified: true,
        message: isExpired ? 'Contract found but has expired' : 'Contract verified successfully',
        data: {
          reference: order.contract_reference,
          contractType: order.contract_type,
          status: order.status,
          expiration: order.expiration,
          isExpired,
          contractUrl: order.contract_url,
          createdAt: order.createdAt
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify contract reference',
        timestamp: new Date().toISOString()
      });
    }
  };
}
