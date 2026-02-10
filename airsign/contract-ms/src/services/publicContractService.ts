import { ContractOrderService } from './contractOrderService';
import { ContractFormService } from './contractFormService';
import { ContractOrderModel } from '../models/contractOrderModel';
import { ContractFormModel } from '../models/contractFormModel';
import { ContractForm } from '../types/contractForm';
import { ContractOrder } from '../types/contractOrder';
import { NotificationService } from './notificationService';
import crypto from 'crypto';

interface OtpRecord {
  email: string;
  otp: string;
  contractOrderId: string;
  expiresAt: Date;
  createdAt: Date;
}

export class PublicContractService {
  private contractOrderService: ContractOrderService;
  private contractFormService: ContractFormService;
  private notificationService: NotificationService;
  private otpStore: Map<string, OtpRecord> = new Map(); // In-memory OTP storage

  constructor() {
    this.contractOrderService = new ContractOrderService();
    this.contractFormService = new ContractFormService();
    this.notificationService = new NotificationService();
  }

  /**
   * Validate that a contract URL exists and is not expired
   */
  async validateContractUrl(contractUrl: string): Promise<ContractOrder | null> {
    try {
      // Extract order ID from URL (format: http://localhost:3009/contracts/{orderId})
      const urlParts = contractUrl.split('/');
      const orderId = urlParts[urlParts.length - 1];
      
      if (!orderId) {
        return null;
      }

      const order = await this.contractOrderService.getOrderById(orderId);
      
      if (!order) {
        return null;
      }

      // Check if contract is expired
      if (new Date() > new Date(order.expiration)) {
        return null;
      }

      // Check if contract is still pending
      if (order.status !== 'pending') {
        return null;
      }

      return order;
    } catch (error) {
      console.error('Error validating contract URL:', error);
      return null;
    }
  }

  /**
   * Generate OTP and send it to user's email
   */
  async generateAndSendOtp(email: string, contractOrderId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration (10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      // Store OTP
      const otpKey = `${email}-${contractOrderId}`;
      this.otpStore.set(otpKey, {
        email,
        otp,
        contractOrderId,
        expiresAt,
        createdAt: new Date()
      });

      // Send OTP via email
      const emailSubject = 'Contract Signing Verification Code';
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .otp-code { font-size: 24px; font-weight: bold; color: #4CAF50; text-align: center; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Contract Signing Verification</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have requested to sign a contract. Please use the following verification code to proceed:</p>
              <div class="otp-code">${otp}</div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you did not request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the Contract Management Service.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `
Hello,

You have requested to sign a contract. Please use the following verification code to proceed:

Verification Code: ${otp}

This code will expire in 10 minutes.

If you did not request this, please ignore this email.

This is an automated message from the Contract Management Service.
      `;

      const emailSent = await this.notificationService.sendEmail({
        to: email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText
      });

      if (emailSent) {
        return {
          success: true,
          message: 'OTP sent successfully'
        };
      } else {
        // Clean up failed OTP
        this.otpStore.delete(otpKey);
        return {
          success: false,
          message: 'Failed to send OTP email'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to generate OTP'
      };
    }
  }

  /**
   * Verify OTP for a specific email and contract order
   */
  async verifyOtp(email: string, otp: string, contractOrderId: string): Promise<{ success: boolean; message: string }> {
    try {
      const otpKey = `${email}-${contractOrderId}`;
      const storedOtp = this.otpStore.get(otpKey);

      if (!storedOtp) {
        return {
          success: false,
          message: 'OTP not found or expired'
        };
      }

      // Check expiration
      if (new Date() > storedOtp.expiresAt) {
        this.otpStore.delete(otpKey);
        return {
          success: false,
          message: 'OTP has expired'
        };
      }

      // Check OTP match
      if (storedOtp.otp !== otp) {
        return {
          success: false,
          message: 'Invalid OTP'
        };
      }

      // Clear OTP after successful verification
      this.otpStore.delete(otpKey);

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to verify OTP'
      };
    }
  }

  /**
   * Create a unique contract form for a user
   */
  async createContractFormForUser(contractOrderId: string, userId: string, userEmail: string): Promise<any> {
    try {
      // Get the contract order
      const contractOrder = await this.contractOrderService.getOrderById(contractOrderId);
      if (!contractOrder) {
        throw new Error('Contract order not found');
      }

      // Create contract form data
      const contractFormData = {
        contractOrderId: contractOrderId,
        contractName: `Contract for ${userEmail}`,
        contractDescription: `Contract signing request for ${userEmail}`,
        contractContent: contractOrder.contract_content || 'Contract content will be loaded from the order',
        contractType: contractOrder.contract_type,
        contract_to: {
          email: userEmail,
          user_id: userId
        }
      };

      // Create the contract form
      const contractForm = await this.contractFormService.createForm(contractFormData, userId);
      
      // Generate a unique URL for this form
      const formUrl = `${process.env.CONTRACT_BASE_URL || 'http://localhost:3009'}/contracts/form/${contractForm.id}`;
      
      return {
        id: contractForm.id,
        contract_url: formUrl,
        contract_data: contractForm
      };
    } catch (error: any) {
      throw new Error(`Failed to create contract form: ${error.message}`);
    }
  }

  /**
   * Get contract form by ID
   */
  async getContractForm(formId: string): Promise<ContractForm | null> {
    try {
      const form = await ContractFormModel.findById(formId);
      if (!form) {
        return null;
      }
      
      // Map to contract form interface
      return {
        id: form._id.toString(),
        contractOrderId: form.contractOrderId,
        contract_from: form.contract_from ? {
          partyType: form.contract_from.partyType,
          fullName: form.contract_from.fullName,
          email: form.contract_from.email,
          phone: form.contract_from.phone,
          address: form.contract_from.address,
          country: form.contract_from.country,
          designation: form.contract_from.designation,
          businessName: form.contract_from.businessName,
          businessAddress: form.contract_from.businessAddress,
          businessEmail: form.contract_from.businessEmail,
          businessPhone: form.contract_from.businessPhone,
          signature: form.contract_from.signature,
          facialCapture: form.contract_from.facialCapture,
          companyLogo: form.contract_from.companyLogo
        } : undefined,
        contract_to: form.contract_to ? {
          fullName: form.contract_to.fullName,
          email: form.contract_to.email,
          phone: form.contract_to.phone,
          address: form.contract_to.address,
          user_id: form.contract_to.user_id
        } : undefined,
        contractName: form.contractName,
        contractDescription: form.contractDescription,
        contractContent: form.contractContent,
        contractType: form.contractType,
        createdBy: form.createdBy,
        status: form.status,
        createdAt: form.createdAt.toISOString(),
        updatedAt: form.updatedAt.toISOString()
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch contract form: ${error.message}`);
    }
  }

  /**
   * Submit contract form
   */
  async submitContractForm(formId: string, formData: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Get the form
      const form = await ContractFormModel.findById(formId);
      if (!form) {
        return {
          success: false,
          message: 'Contract form not found'
        };
      }

      // Update form with submitted data
      if (formData.contract_from) {
        form.contract_from = {
          ...form.contract_from,
          ...formData.contract_from
        };
      }

      // Validate and submit
      if (form.status !== 'draft') {
        return {
          success: false,
          message: 'Only draft forms can be submitted'
        };
      }

      form.status = 'submitted';
      await form.save();

      // Send notifications
      await this.sendSubmissionNotifications(form);

      return {
        success: true,
        message: 'Contract submitted successfully',
        data: {
          formId: form._id.toString(),
          status: form.status
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to submit contract form'
      };
    }
  }

  /**
   * Send notifications when contract is submitted
   */
  private async sendSubmissionNotifications(form: any): Promise<void> {
    try {
      // Get contract order for redirect URL
      const contractOrder = await ContractOrderModel.findById(form.contractOrderId);
      
      // Send email notification
      const emailSubject = 'Contract Signed Successfully';
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Contract Signed Successfully</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your contract "${form.contractName}" has been signed successfully.</p>
              <p>Contract Type: ${form.contractType}</p>
              <p>Status: ${form.status}</p>
              ${contractOrder?.redirect_url ? `<p>You will be redirected to: ${contractOrder.redirect_url}</p>` : ''}
            </div>
            <div class="footer">
              <p>This is an automated message from the Contract Management Service.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `
Hello,

Your contract "${form.contractName}" has been signed successfully.

Contract Type: ${form.contractType}
Status: ${form.status}
${contractOrder?.redirect_url ? `You will be redirected to: ${contractOrder.redirect_url}` : ''}

This is an automated message from the Contract Management Service.
      `;

      // Send to the user who signed
      if (form.contract_to?.email) {
        await this.notificationService.sendEmail({
          to: form.contract_to.email,
          subject: emailSubject,
          html: emailHtml,
          text: emailText
        });
      }

      // Send callback to redirect URL if configured
      if (contractOrder?.redirect_url) {
        try {
          const axios = require('axios');
          await axios.post(contractOrder.redirect_url, {
            contractOrderId: form.contractOrderId,
            contractFormId: form._id.toString(),
            status: 'success',
            contractType: form.contractType,
            timestamp: new Date().toISOString(),
            data: {
              formStatus: form.status,
              submittedBy: form.createdBy,
              contractName: form.contractName
            }
          }, {
            timeout: 5000
          });
        } catch (callbackError) {
          console.error('Callback failed:', callbackError);
        }
      }
    } catch (error) {
      console.error('Error sending submission notifications:', error);
    }
  }
}