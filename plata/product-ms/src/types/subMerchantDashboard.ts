import type {
  SubMerchantComplianceDocument,
  SubMerchantComplianceStatus,
  SubMerchantProductActivationStatus
} from './subMerchantProductActivation';

export interface SubMerchantDashboardProduct {
  productId: string;
  productNameSnapshot?: string;
  status: SubMerchantProductActivationStatus;
  updatedAt: Date;
}

export interface SubMerchantMerchantDashboardRow {
  subMerchantId: string;
  subMerchantName: string;
  subMerchantEmail: string;
  subMerchantPhone: string;
  merchantId: string;
  merchantName: string;
  plataMerchantId: string;
  status: SubMerchantProductActivationStatus;
  /** Compliance on the integrator's platform (for UI vs catalog `status`). */
  complianceStatus: SubMerchantComplianceStatus;
  complianceDocuments: SubMerchantComplianceDocument[];
  activeProductsCount: number;
  productsCount: number;
  products: SubMerchantDashboardProduct[];
  usageEventsCount: number;
  latestStartedAt?: Date;
  latestUsageAt?: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSubMerchantMerchantDashboardResponse {
  items: SubMerchantMerchantDashboardRow[];
  total: number;
}

export interface SubMerchantCustomerDashboardProduct {
  productId: string;
  productNameSnapshot?: string;
  startedAt: Date;
  updatedAt: Date;
}

export interface SubMerchantCustomerDashboardRow {
  externalUserId: string;
  externalUserName: string;
  externalUserEmail: string;
  externalUserPhone: string;
  subMerchantId: string;
  subMerchantName: string;
  subMerchantEmail: string;
  subMerchantPhone: string;
  merchantId: string;
  merchantName: string;
  plataMerchantId: string;
  /** Same sub-merchant compliance snapshot as merchant-dashboard (from activations). */
  complianceStatus: SubMerchantComplianceStatus;
  complianceDocuments: SubMerchantComplianceDocument[];
  usageEventsCount: number;
  productsCount: number;
  products: SubMerchantCustomerDashboardProduct[];
  latestStartedAt: Date;
  latestUsageAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSubMerchantCustomerDashboardResponse {
  items: SubMerchantCustomerDashboardRow[];
  total: number;
}
