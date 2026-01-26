import { ContractFormModel, IContractForm } from '../models/contractFormModel';
import { ContractForm, CreateContractFormRequest, UpdateContractFormRequest } from '../types/contractForm';
import { getContractTypeRequirements } from '../types/contractType';
import { CallbackService, CallbackPayload } from './callbackService';
import { ContractOrderModel } from '../models/contractOrderModel';
import { NotificationService } from './notificationService';
import { PDFService } from './pdfService';

export class ContractFormService {
  private callbackService: CallbackService;
  private notificationService: NotificationService;
  private pdfService: PDFService;

  constructor() {
    this.callbackService = new CallbackService();
    this.notificationService = new NotificationService();
    this.pdfService = new PDFService();
  }
  async createForm(data: CreateContractFormRequest, createdBy: string): Promise<ContractForm> {
    try {
      // Validate contract type requirements
      const typeRequirements = getContractTypeRequirements(data.contractType);

      // Special rule for Indemnity: contract_from is optional if contract_to is present
      if (data.contractType === 'indemnity' && data.contract_to && !data.contract_from) {
        // Valid case: Indemnity with contract_to, no contract_from needed
      } else if (data.contract_from) {
        // Validate business fields for business party type
        if (data.contract_from.partyType === 'business') {
          if (!data.contract_from.businessName) {
            throw new Error('Business name is required for business party type');
          }
          if (!data.contract_from.businessAddress) {
            throw new Error('Business address is required for business party type');
          }
          if (!data.contract_from.businessEmail) {
            throw new Error('Business email is required for business party type');
          }
          if (!data.contract_from.businessPhone) {
            throw new Error('Business phone is required for business party type');
          }
        }

        // Check if signature is required but not provided
        // Only validate signature for contract types that require it (Agreement, Indemnity)
        if (typeRequirements.requiresSignature) {
          if (!data.contract_from.signature) {
            throw new Error(`Signature is required for ${data.contractType} contracts`);
          }
          if (!data.contract_from.facialCapture) {
            throw new Error(`Facial capture is required for ${data.contractType} contracts`);
          }
        }

        // For accept-only contract types (Disclaimer, Terms & Condition), remove signature and facial capture if provided
        if (typeRequirements.acceptOnly) {
          if (data.contract_from.signature) {
            delete data.contract_from.signature;
          }
          if (data.contract_from.facialCapture) {
            delete data.contract_from.facialCapture;
          }
        }
      } else if (!data.contract_to) {
        // Neither contract_from nor contract_to provided
        throw new Error('Either contract_from or contract_to must be provided');
      }

      // Check if facial scan is required (this would be handled separately in full implementation)
      if (typeRequirements.requiresFacialScan) {
        // Note: Facial scan validation would happen during the signing process
        // This is just a placeholder for the requirement check
      }

      // Create contract form
      const contractForm = await ContractFormModel.create({
        contractOrderId: data.contractOrderId,
        contract_from: data.contract_from,
        contract_to: data.contract_to,
        contractName: data.contractName,
        contractDescription: data.contractDescription,
        contractContent: data.contractContent,
        contractType: data.contractType,
        createdBy,
        status: 'draft'
      });

      return this.mapToContractForm(contractForm);
    } catch (error: any) {
      throw new Error(`Failed to create contract form: ${error.message}`);
    }
  }

  async getFormById(formId: string): Promise<ContractForm | null> {
    try {
      const form = await ContractFormModel.findById(formId);
      if (!form) {
        return null;
      }
      return this.mapToContractForm(form);
    } catch (error: any) {
      throw new Error(`Failed to fetch contract form: ${error.message}`);
    }
  }

  async getFormByOrderId(orderId: string): Promise<ContractForm | null> {
    try {
      const form = await ContractFormModel.findOne({ contractOrderId: orderId });
      if (!form) {
        return null;
      }
      return this.mapToContractForm(form);
    } catch (error: any) {
      throw new Error(`Failed to fetch contract form by order ID: ${error.message}`);
    }
  }

  async getFormsByUserId(userId: string): Promise<ContractForm[]> {
    try {
      const forms = await ContractFormModel.find({ createdBy: userId }).sort({ createdAt: -1 });
      return forms.map(form => this.mapToContractForm(form));
    } catch (error: any) {
      throw new Error(`Failed to fetch contract forms: ${error.message}`);
    }
  }

  async getFormsByStatus(status: 'draft' | 'submitted' | 'approved' | 'rejected'): Promise<ContractForm[]> {
    try {
      const forms = await ContractFormModel.find({ status }).sort({ createdAt: -1 });
      return forms.map(form => this.mapToContractForm(form));
    } catch (error: any) {
      throw new Error(`Failed to fetch contract forms by status: ${error.message}`);
    }
  }

  async updateForm(formId: string, data: UpdateContractFormRequest): Promise<ContractForm> {
    try {
      const form = await ContractFormModel.findById(formId);
      if (!form) {
        throw new Error('Contract form not found');
      }

      // Update fields if provided
      if (data.contract_from) {
        form.contract_from = { ...form.contract_from, ...data.contract_from };
      }
      if (data.contractName) {
        form.contractName = data.contractName;
      }
      if (data.contractDescription) {
        form.contractDescription = data.contractDescription;
      }
      if (data.contractContent) {
        form.contractContent = data.contractContent;
      }
      if (data.status) {
        form.status = data.status;
      }

      await form.save();
      return this.mapToContractForm(form);
    } catch (error: any) {
      throw new Error(`Failed to update contract form: ${error.message}`);
    }
  }

  async submitForm(formId: string): Promise<ContractForm> {
    try {
      const form = await ContractFormModel.findById(formId);
      if (!form) {
        throw new Error('Contract form not found');
      }

      if (form.status !== 'draft') {
        throw new Error('Only draft forms can be submitted');
      }

      // Get contract type requirements
      const typeRequirements = getContractTypeRequirements(form.contractType);

      // Only validate signature and facial capture for contract types that require them
      if (typeRequirements.requiresSignature && !form.validateSignature()) {
        throw new Error('Both signature and facial capture are required for this contract type');
      }

      form.status = 'submitted';
      await form.save();

      // Send callback to redirect_url if available
      await this.sendSuccessCallback(form);

      // Send notifications (email and SMS)
      await this.sendNotifications(form);

      return this.mapToContractForm(form);
    } catch (error: any) {
      throw new Error(`Failed to submit contract form: ${error.message}`);
    }
  }

  async deleteForm(formId: string): Promise<void> {
    try {
      const result = await ContractFormModel.findByIdAndDelete(formId);
      if (!result) {
        throw new Error('Contract form not found');
      }
    } catch (error: any) {
      throw new Error(`Failed to delete contract form: ${error.message}`);
    }
  }

  /**
   * Get all submitted/signed contracts by user ID
   */
  async getSignedContractsByUserId(userId: string): Promise<ContractForm[]> {
    try {
      const forms = await ContractFormModel.find({
        createdBy: userId,
        status: 'submitted'
      }).sort({ createdAt: -1 });

      return forms.map(form => this.mapToContractForm(form));
    } catch (error: any) {
      throw new Error(`Failed to fetch signed contracts: ${error.message}`);
    }
  }

  /**
   * Generate PDF for a single contract form
   */
  async generateContractPDF(formId: string): Promise<PDFKit.PDFDocument> {
    try {
      const form = await ContractFormModel.findById(formId);
      if (!form) {
        throw new Error('Contract form not found');
      }

      return this.pdfService.generateContractPDF(form);
    } catch (error: any) {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Generate combined PDF for all signed contracts by user ID
   */
  async generateUserContractsPDF(userId: string): Promise<PDFKit.PDFDocument> {
    try {
      const forms = await ContractFormModel.find({
        createdBy: userId,
        status: 'submitted'
      }).sort({ createdAt: -1 });

      if (forms.length === 0) {
        throw new Error('No signed contracts found for this user');
      }

      return this.pdfService.generateMultipleContractsPDF(forms, userId);
    } catch (error: any) {
      throw new Error(`Failed to generate contracts PDF: ${error.message}`);
    }
  }

  private mapToContractForm(form: IContractForm): ContractForm {
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
  }

  /**
   * Send success callback to redirect_url after contract form submission
   */
  private async sendSuccessCallback(form: IContractForm): Promise<void> {
    try {
      // Get the contract order to retrieve redirect_url
      const contractOrder = await ContractOrderModel.findOne({ contract_id: form.contractOrderId });
      
      if (!contractOrder || !contractOrder.redirect_url) {
        console.log('[ContractFormService] No redirect_url found for contract order, skipping callback');
        return;
      }

      const payload: CallbackPayload = {
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
      };

      // Send callback with retry mechanism
      const success = await this.callbackService.sendCallbackWithRetry(
        contractOrder.redirect_url,
        payload,
        3 // 3 retry attempts
      );

      if (success) {
        console.log(`[ContractFormService] Callback sent successfully for form ${form._id}`);
      } else {
        console.error(`[ContractFormService] Failed to send callback for form ${form._id}`);
      }
    } catch (error) {
      console.error('[ContractFormService] Error sending callback:', error);
      // Don't throw error - callback failure shouldn't prevent form submission
    }
  }

  /**
   * Send email and SMS notifications after contract form submission
   */
  private async sendNotifications(form: IContractForm): Promise<void> {
    try {
      // Determine recipient information
      let recipientEmail = '';
      let recipientPhone = '';
      let recipientName = '';

      if (form.contract_from) {
        recipientEmail = form.contract_from.email;
        recipientPhone = form.contract_from.phone || '';
        recipientName = form.contract_from.fullName;
      } else if (form.contract_to) {
        recipientEmail = form.contract_to.email;
        recipientPhone = form.contract_to.phone || '';
        recipientName = form.contract_to.fullName || 'User';
      }

      if (!recipientEmail && !recipientPhone) {
        console.log('[ContractFormService] No contact information found, skipping notifications');
        return;
      }

      // Send email notification
      if (recipientEmail) {
        const emailSent = await this.notificationService.sendContractSubmissionEmail(
          recipientEmail,
          recipientName,
          form.contractName,
          form.contractType
        );
        
        if (emailSent) {
          console.log(`[ContractFormService] Email notification sent to ${recipientEmail}`);
        }
      }

      // Send SMS notification
      if (recipientPhone) {
        const smsSent = await this.notificationService.sendContractSubmissionSMS(
          recipientPhone,
          recipientName,
          form.contractName
        );
        
        if (smsSent) {
          console.log(`[ContractFormService] SMS notification sent to ${recipientPhone}`);
        }
      }
    } catch (error) {
      console.error('[ContractFormService] Error sending notifications:', error);
      // Don't throw error - notification failure shouldn't prevent form submission
    }
  }
}
