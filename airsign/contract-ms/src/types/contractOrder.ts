import { ContractTypeEnum } from './contractType';

export interface ContractTo {
  fullName?: string;
  email: string;
  phone?: string;
  address?: string;
  user_id: string;
}

export interface ContractOrder {
  id: string;
  contract_to?: ContractTo;
  contract_id: string;
  contract_reference: string; // Unique human-readable reference code
  contract_type: ContractTypeEnum;
  contract_content?: string; // Contract content/template
  expiration: string; // ISO timestamp
  redirect_url?: string;
  contract_url: string; // Auto-generated URL to access the contract
  createdBy: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractOrderRequest {
  contract_to?: ContractTo;
  contract_id: string;
  contract_type: ContractTypeEnum;
  contract_content?: string; // Contract content/template
  expiration: string | Date;
  redirect_url?: string;
}

export interface ContractOrderResponse {
  success: boolean;
  data?: ContractOrder;
  message?: string;
  error?: string;
  timestamp: string;
}
