export enum ContractTypeEnum {
  DISCLAIMER = 'disclaimer',
  AGREEMENT = 'agreement',
  INDEMNITY = 'indemnity',
  TERMS_AND_CONDITION = 'terms_and_condition'
}

export interface ContractTypeRequirements {
  type: ContractTypeEnum;
  requiresSignature: boolean;
  requiresFacialScan: boolean;
  acceptOnly: boolean;
}

export const CONTRACT_TYPE_CONFIGS: Record<ContractTypeEnum, ContractTypeRequirements> = {
  [ContractTypeEnum.DISCLAIMER]: {
    type: ContractTypeEnum.DISCLAIMER,
    requiresSignature: false,
    requiresFacialScan: false,
    acceptOnly: true
  },
  [ContractTypeEnum.AGREEMENT]: {
    type: ContractTypeEnum.AGREEMENT,
    requiresSignature: true,
    requiresFacialScan: true,
    acceptOnly: false
  },
  [ContractTypeEnum.INDEMNITY]: {
    type: ContractTypeEnum.INDEMNITY,
    requiresSignature: true,
    requiresFacialScan: true,
    acceptOnly: false
  },
  [ContractTypeEnum.TERMS_AND_CONDITION]: {
    type: ContractTypeEnum.TERMS_AND_CONDITION,
    requiresSignature: false,
    requiresFacialScan: false,
    acceptOnly: true
  }
};

export const getContractTypeRequirements = (type: ContractTypeEnum): ContractTypeRequirements => {
  return CONTRACT_TYPE_CONFIGS[type];
};

export const isValidContractType = (type: string): type is ContractTypeEnum => {
  return Object.values(ContractTypeEnum).includes(type as ContractTypeEnum);
};
