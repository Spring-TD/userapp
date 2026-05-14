export type SubMerchantProductActivationStatus = 'active' | 'deactivated';

/** Whether the sub-merchant finished compliance on the integrator's platform (separate from catalog activation `status`). */
export type SubMerchantComplianceStatus = 'not_started' | 'pending' | 'completed';

export interface SubMerchantComplianceDocument {
  url: string;
  name?: string;
  /** ISO 8601 when the integrator recorded the upload */
  uploadedAt?: string;
}

export interface SubMerchantProductActivation {
  id: string;
  plataMerchantId: string;
  apiKeyId?: string;
  gatewayEnvironment?: string;
  appId: string;
  productId: string;
  productNameSnapshot?: string;
  /** Merchant (your platform) that the sub-merchant belongs to — distinct from plataMerchantId when the API key tenant differs */
  merchantId: string;
  merchantName: string;
  subMerchantId: string;
  subMerchantName: string;
  subMerchantEmail: string;
  subMerchantPhone: string;
  status: SubMerchantProductActivationStatus;
  complianceStatus: SubMerchantComplianceStatus;
  complianceDocuments: SubMerchantComplianceDocument[];
  createdAt: Date;
  updatedAt: Date;
}
