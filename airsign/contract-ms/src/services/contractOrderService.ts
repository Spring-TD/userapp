import { ContractOrderModel, IContractOrder } from '../models/contractOrderModel';
import { ContractOrder, CreateContractOrderRequest } from '../types/contractOrder';
import { getContractTypeRequirements, isValidContractType } from '../types/contractType';
import { config } from '../config/environment';

export class ContractOrderService {
  async createOrder(data: CreateContractOrderRequest, createdBy: string): Promise<ContractOrder> {
    try {
      // Validate contract_to fields if provided
      if (data.contract_to) {
        if (!data.contract_to.email) {
          throw new Error('Email is required in contract_to');
        }
        if (!data.contract_to.user_id) {
          throw new Error('user_id is required in contract_to');
        }
      }

      // Validate contract type
      if (!isValidContractType(data.contract_type)) {
        throw new Error('Invalid contract type');
      }

      // Validate expiration date
      const expirationDate = new Date(data.expiration);
      if (isNaN(expirationDate.getTime())) {
        throw new Error('Invalid expiration date format');
      }

      if (expirationDate <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }

      // Generate unique contract reference
      const contractReference = this.generateContractReference(data.contract_type);

      // Create contract order
      const contractOrder = await ContractOrderModel.create({
        contract_to: data.contract_to,
        contract_id: data.contract_id,
        contract_reference: contractReference,
        contract_type: data.contract_type,
        contract_content: data.contract_content,
        expiration: expirationDate,
        redirect_url: data.redirect_url,
        contract_url: '', // Will be set after creation
        createdBy,
        status: 'pending'
      });

      // Generate and set the contract URL
      contractOrder.contract_url = this.generateContractUrl(contractOrder._id.toString());
      await contractOrder.save();

      return this.mapToContractOrder(contractOrder);
    } catch (error: any) {
      throw new Error(`Failed to create contract order: ${error.message}`);
    }
  }

  async getOrderById(orderId: string): Promise<ContractOrder | null> {
    try {
      const order = await ContractOrderModel.findById(orderId);
      if (!order) {
        return null;
      }
      return this.mapToContractOrder(order);
    } catch (error: any) {
      throw new Error(`Failed to fetch contract order: ${error.message}`);
    }
  }

  async getOrdersByUserId(userId: string): Promise<ContractOrder[]> {
    try {
      const orders = await ContractOrderModel.find({ createdBy: userId }).sort({ createdAt: -1 });
      return orders.map(order => this.mapToContractOrder(order));
    } catch (error: any) {
      throw new Error(`Failed to fetch contract orders: ${error.message}`);
    }
  }

  async getOrdersByContractId(contractId: string): Promise<ContractOrder[]> {
    try {
      const orders = await ContractOrderModel.find({ contract_id: contractId }).sort({ createdAt: -1 });
      return orders.map(order => this.mapToContractOrder(order));
    } catch (error: any) {
      throw new Error(`Failed to fetch contract orders: ${error.message}`);
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired'
  ): Promise<ContractOrder> {
    try {
      const order = await ContractOrderModel.findById(orderId);
      if (!order) {
        throw new Error('Contract order not found');
      }

      order.status = status;
      await order.save();

      return this.mapToContractOrder(order);
    } catch (error: any) {
      throw new Error(`Failed to update contract order status: ${error.message}`);
    }
  }

  async checkExpiredOrders(): Promise<number> {
    try {
      const result = await ContractOrderModel.updateMany(
        {
          expiration: { $lt: new Date() },
          status: { $in: ['pending', 'sent'] }
        },
        {
          $set: { status: 'expired' }
        }
      );

      return result.modifiedCount;
    } catch (error: any) {
      throw new Error(`Failed to check expired orders: ${error.message}`);
    }
  }

  getContractTypeRequirements(contractType: string) {
    if (!isValidContractType(contractType)) {
      throw new Error('Invalid contract type');
    }
    return getContractTypeRequirements(contractType);
  }

  private mapToContractOrder(order: IContractOrder): ContractOrder {
    return {
      id: order._id.toString(),
      contract_to: order.contract_to ? {
        fullName: order.contract_to.fullName,
        email: order.contract_to.email,
        phone: order.contract_to.phone,
        address: order.contract_to.address,
        user_id: order.contract_to.user_id
      } : undefined,
      contract_id: order.contract_id,
      contract_reference: order.contract_reference,
      contract_type: order.contract_type,
      contract_content: order.contract_content,
      expiration: order.expiration.toISOString(),
      redirect_url: order.redirect_url,
      contract_url: order.contract_url,
      createdBy: order.createdBy,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };
  }

  /**
   * Generate unique contract reference code
   * Format: {TYPE_PREFIX}-{YEAR}{MONTH}-{RANDOM}
   * Example: AGR-202412-A1B2C3
   */
  private generateContractReference(contractType: string): string {
    const typePrefixes: { [key: string]: string } = {
      'agreement': 'AGR',
      'disclaimer': 'DIS',
      'indemnity': 'IND',
      'terms_and_conditions': 'TNC'
    };

    const prefix = typePrefixes[contractType] || 'CTR';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    return `${prefix}-${year}${month}-${random}`;
  }

  /**
   * Verify and retrieve contract by reference code
   */
  async verifyContractByReference(reference: string): Promise<ContractOrder | null> {
    try {
      const order = await ContractOrderModel.findOne({ 
        contract_reference: reference.toUpperCase() 
      });
      
      if (!order) {
        return null;
      }

      return this.mapToContractOrder(order);
    } catch (error: any) {
      throw new Error(`Failed to verify contract reference: ${error.message}`);
    }
  }

  private generateContractUrl(orderId: string): string {
    const baseUrl = config.contractBaseUrl.replace(/\/$/, ''); // Remove trailing slash if present
    return `${baseUrl}/contracts/${orderId}`;
  }
}
