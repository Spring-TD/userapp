export enum ContractStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SIGNED = 'signed',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated'
}

export interface ContractParty {
  userId: string;
  role: string;
  name?: string;
  email?: string;
}

export interface ContractSignature {
  userId: string;
  signature: string;
  signedAt: string;
}

export interface Contract {
  id: string;
  title: string;
  description: string;
  type: string;
  status: ContractStatus;
  content: string;
  parties: ContractParty[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  signatures: ContractSignature[];
  startDate?: string;
  endDate?: string;
  terms?: Record<string, any>;
  attachments?: string[];
}
