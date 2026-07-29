export type AppStatus = 'active' | 'suspended';

export interface App {
  id: string;
  name: string;
  websiteUrl: string;
  alias: string;
  description: string;
  merchantId: string;
  /**
   * Unique hostname label for the default app URL on the platform domain
   * (`{subdomain}.{APP_PLATFORM_BASE_DOMAIN}`), assigned at creation (Shopify-style).
   */
  subdomain?: string;
  status: AppStatus;
  createdAt: string;
  updatedAt: string;
  productKeys?: string[]; // Array of product keys associated with this app
  /** App-level manifest file public URLs (independent from PWA templates). */
  manifestUrls?: string[];
  /** App-level manifest file object keys in DigitalOcean Spaces. */
  manifestKeys?: string[];
}

export interface CreateAppRequest {
  name: string;
  websiteUrl: string;
  alias: string;
  description: string;
  merchantId?: string; // Made optional since it can be extracted from authenticated user
  /** Optional; if omitted, a unique slug is generated from `name`. */
  subdomain?: string;
}

export interface UpdateAppRequest {
  name?: string;
  websiteUrl?: string;
  alias?: string;
  description?: string;
  status?: AppStatus;
  productKeys?: string[];
}

export interface AppResponse {
  success: boolean;
  message?: string;
  data?: App;
  error?: string;
}

/** Query filters for listing apps. */
export interface AppListQuery {
  merchantIds?: string[];
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AppListResult {
  apps: App[];
  pagination: PaginationMeta;
}

// Transaction interface
export interface Transaction {
  id: string;
  appId: string;
  /** When set, ties ledger rows to a merchant product (local catalog id or upstream id). */
  productId?: string;
  userId?: string;
  walletId?: string;
  reference?: string;
  metaRef?: string;
  provider?: string;
  providerReference?: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  metadata?: Record<string, any>;
  senderDetails?: {
    name?: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Transaction query parameters
export interface TransactionQueryParams {
  page?: number;
  limit?: number;
  type?: 'credit' | 'debit';
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  productId?: string;
}

// Drive Document interface
export interface DriveDocument {
  id: string;
  appId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  metadata?: Record<string, any>;
}

// Drive document query parameters
export interface DriveDocumentQueryParams {
  page?: number;
  limit?: number;
  userId?: string;
  fileType?: string;
  status?: 'pending' | 'verified' | 'rejected';
  startDate?: string;
  endDate?: string;
}