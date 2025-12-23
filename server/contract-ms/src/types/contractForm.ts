import { ContractTypeEnum } from './contractType';

export interface ContractFrom {
  partyType: 'individual' | 'business';
  fullName: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  designation: string; // Required for Agreement contracts
  // Business-specific fields (required when partyType = 'business')
  businessName?: string;
  businessAddress?: string;
  businessEmail?: string;
  businessPhone?: string;
  // Signature fields (required for Agreement & Indemnity)
  signature?: string;
  facialCapture?: string;
  companyLogo?: string;
}

export interface ContractForm {
  id: string;
  contractOrderId: string;
  contract_from?: ContractFrom;
  contract_to?: ContractTo;
  contractName: string;
  contractDescription: string;
  contractContent: string;
  contractType: ContractTypeEnum;
  createdBy: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractFormRequest {
  contractOrderId: string;
  contract_from?: ContractFrom; // Optional for Indemnity when contract_to is present
  contract_to?: ContractTo; // From the contract order
  contractName: string;
  contractDescription: string;
  contractContent: string;
  contractType: ContractTypeEnum;
}

export interface ContractTo {
  fullName?: string;
  email: string;
  phone?: string;
  address?: string;
  user_id: string;
}

export interface UpdateContractFormRequest {
  contract_from?: ContractFrom;
  contractName?: string;
  contractDescription?: string;
  contractContent?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
}

export interface ContractFormResponse {
  success: boolean;
  data?: ContractForm;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface ContractFormListResponse {
  success: boolean;
  data?: ContractForm[];
  count?: number;
  message?: string;
  error?: string;
  timestamp: string;
}
