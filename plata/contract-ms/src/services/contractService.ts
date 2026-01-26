import { Contract, ContractStatus } from '../types/contract';
// import { ContractModel } from '../models/contractModel';
// TODO: Replace in-memory storage with MongoDB once ready
// Example:
// const contract = await ContractModel.create(data);
// const contracts = await ContractModel.find();
// const contract = await ContractModel.findById(id);

export class ContractService {
  // In-memory storage for now (replace with database later)
  private contracts: Map<string, Contract> = new Map();

  async createContract(data: Partial<Contract>): Promise<Contract> {
    const contract: Contract = {
      id: this.generateId(),
      title: data.title || '',
      description: data.description || '',
      type: data.type || 'standard',
      status: ContractStatus.DRAFT,
      content: data.content || '',
      parties: data.parties || [],
      createdBy: data.createdBy || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      signatures: []
    };

    this.contracts.set(contract.id, contract);
    return contract;
  }

  async getAllContracts(): Promise<Contract[]> {
    return Array.from(this.contracts.values());
  }

  async getContractById(id: string): Promise<Contract | null> {
    return this.contracts.get(id) || null;
  }

  async updateContract(id: string, data: Partial<Contract>): Promise<Contract> {
    const contract = this.contracts.get(id);
    if (!contract) {
      throw new Error('Contract not found');
    }

    const updatedContract: Contract = {
      ...contract,
      ...data,
      updatedAt: new Date().toISOString(),
      version: contract.version + 1
    };

    this.contracts.set(id, updatedContract);
    return updatedContract;
  }

  async deleteContract(id: string): Promise<void> {
    if (!this.contracts.has(id)) {
      throw new Error('Contract not found');
    }
    this.contracts.delete(id);
  }

  async signContract(id: string, userId: string, signature: string): Promise<Contract> {
    const contract = this.contracts.get(id);
    if (!contract) {
      throw new Error('Contract not found');
    }

    contract.signatures.push({
      userId,
      signature,
      signedAt: new Date().toISOString()
    });

    // Update status if all parties have signed
    if (contract.signatures.length >= contract.parties.length) {
      contract.status = ContractStatus.SIGNED;
    }

    contract.updatedAt = new Date().toISOString();
    this.contracts.set(id, contract);
    return contract;
  }

  async getContractStatus(id: string): Promise<{ status: ContractStatus; signatureCount: number }> {
    const contract = this.contracts.get(id);
    if (!contract) {
      throw new Error('Contract not found');
    }

    return {
      status: contract.status,
      signatureCount: contract.signatures.length
    };
  }

  private generateId(): string {
    return `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
