export interface DnsConfiguration {
  aRecord?: {
    type: 'A';
    name: string; // Usually "@" or root domain
    value: string; // IP address
  };
  cnameRecords: Array<{
    type: 'CNAME';
    name: string; // e.g., "www" or root domain
    value: string; // Points to platform domain (e.g., "domain.useinclude.com")
  }>;
  baseUrl: string; // The base URL to use (e.g., "https://yourDomain.com/")
}

export interface App {
  id: string;
  name: string;
  websiteUrl: string;
  alias: string;
  description: string;
  merchantId: string;
  subdomain: string;
  customDomain?: string; // Custom domain, e.g., "www.customdomain.com"
  customDomainActive?: boolean; // Toggle to activate/deactivate custom domain
  customDomainVerified?: boolean; // Whether DNS is verified
  customDomainVerifiedAt?: string; // Verification timestamp
  dnsConfiguration?: DnsConfiguration; // DNS records to configure
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'incomplete';
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  productKeys?: string[]; // Array of product keys associated with this app
  activeConfigurationId?: string; // ID of the active configuration
}

export interface CreateAppRequest {
  name: string;
  websiteUrl: string;
  alias: string;
  description: string;
  merchantId?: string; // Made optional since it can be extracted from authenticated user
  subdomain?: string; // Optional custom subdomain, otherwise auto-generated from name
}

export interface UpdateAppRequest {
  name?: string;
  websiteUrl?: string;
  alias?: string;
  description?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'incomplete';
  rejectionReason?: string;
  productKeys?: string[];
  subdomain?: string; // Optional subdomain update (requires uniqueness validation)
  customDomain?: string; // Optional custom domain update
  customDomainActive?: boolean; // Optional custom domain activation toggle
}

export interface AppResponse {
  success: boolean;
  message?: string;
  data?: App;
  error?: string;
}

// Transaction interface
export interface Transaction {
  id: string;
  appId: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
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