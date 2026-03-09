// App Service - Complete API wrapper for app management operations

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Types
export interface App {
  id: string;
  appId?: string;
  name: string;
  websiteUrl: string;
  alias: string;
  description?: string;
  merchantId: string;
  status: 'active' | 'pending' | 'approved' | 'rejected' | 'inactive';
  productKeys?: string[];
  dateCreated?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppTransaction {
  id: string;
  appId: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  userId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AppTransactionStats {
  totalTransactions: number;
  totalCreditAmount: number;
  totalDebitAmount: number;
  pendingTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  netAmount: number;
}

export interface AppDocument {
  id: string;
  appId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  status: 'pending' | 'verified' | 'rejected';
  metadata?: any;
  uploadedAt: string;
}

export interface AppDocumentStats {
  totalDocuments: number;
  pendingDocuments: number;
  verifiedDocuments: number;
  rejectedDocuments: number;
  fileTypeCounts: Record<string, number>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Basic App Operations
export const appApi = {
  /**
   * Create a new app
   */
  async createApp(appData: {
    name: string;
    websiteUrl: string;
    alias: string;
    description?: string;
    merchantId?: string;
  }): Promise<ApiResponse<App>> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    // Try to extract merchantId from token if not provided
    let merchantId = appData.merchantId;
    if (!merchantId && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        merchantId = payload?.user_merchant_id || payload?.userMerchantId ||
          payload?.merchantId || payload?.userId || payload?.id || payload?.sub;
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }

    const response = await fetch('/api/apps', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...appData,
        ...(merchantId && { merchantId }),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create app');
    }

    return data;
  },

  /**
   * Get all apps
   */
  async getAllApps(): Promise<ApiResponse<App[]>> {
    const response = await fetch('/api/apps', {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch apps');
    }

    return data;
  },

  /**
   * Get app by ID
   */
  async getAppById(appId: string): Promise<ApiResponse<App>> {
    const response = await fetch(`/api/apps/${appId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch app');
    }

    return data;
  },

  /**
   * Update app
   */
  async updateApp(appId: string, updates: Partial<App>): Promise<ApiResponse<App>> {
    const response = await fetch(`/api/apps/${appId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update app');
    }

    return data;
  },

  /**
   * Delete app
   */
  async deleteApp(appId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`/api/apps/${appId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete app');
    }

    return data;
  },

  /**
   * Get apps by merchant ID
   */
  async getAppsByMerchantId(merchantId: string): Promise<ApiResponse<App[]>> {
    const response = await fetch(`/api/apps/merchant/${merchantId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch merchant apps');
    }

    return data;
  },
};

// App Lifecycle Operations
export const appLifecycleApi = {
  /**
   * Submit app for review
   */
  async submitApp(appId: string): Promise<ApiResponse<App>> {
    const response = await fetch(`/api/apps/${appId}/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit app');
    }

    return data;
  },

  /**
   * Approve app
   */
  async approveApp(appId: string, approvalData?: any): Promise<ApiResponse<App>> {
    const response = await fetch(`/api/apps/${appId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(approvalData || {}),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to approve app');
    }

    return data;
  },

  /**
   * Reject app
   */
  async rejectApp(appId: string, reason?: string): Promise<ApiResponse<App>> {
    const response = await fetch(`/api/apps/${appId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to reject app');
    }

    return data;
  },
};

// Product Key Management
export const appProductKeyApi = {
  /**
   * Add product key to app
   */
  async addProductKey(appId: string, productKey: string): Promise<ApiResponse<App>> {
    const response = await fetch(`/api/apps/${appId}/product-key`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ productKey }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to add product key');
    }

    return data;
  },

  /**
   * Get product keys for app
   */
  async getProductKeys(appId: string): Promise<ApiResponse<string[]>> {
    const response = await fetch(`/api/apps/${appId}/product-keys`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch product keys');
    }

    return data;
  },

  /**
   * Remove product key from app
   */
  async removeProductKey(appId: string, productKey: string): Promise<ApiResponse<App>> {
    const response = await fetch(`/api/apps/${appId}/product-key`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ productKey }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to remove product key');
    }

    return data;
  },
};

// Transaction Operations
export const appTransactionApi = {
  /**
   * Get app transactions with filtering
   */
  async getTransactions(
    appId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: 'credit' | 'debit';
      status?: 'pending' | 'completed' | 'failed' | 'cancelled';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ApiResponse<AppTransaction[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/api/apps/${appId}/transactions?${queryParams.toString()}`;
    const response = await fetch(url, { headers: getAuthHeaders() });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch transactions');
    }

    return data;
  },

  /**
   * Get app transaction statistics
   */
  async getTransactionStats(appId: string): Promise<ApiResponse<AppTransactionStats>> {
    const response = await fetch(`/api/apps/${appId}/transaction-stats`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch transaction stats');
    }

    return data;
  },
};

// Drive/Document Operations
export const appDriveApi = {
  /**
   * Upload document to app drive
   */
  async uploadDocument(
    appId: string,
    documentData: {
      userId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      url: string;
      status?: 'pending' | 'verified' | 'rejected';
      metadata?: any;
    }
  ): Promise<ApiResponse<AppDocument>> {
    const response = await fetch(`/api/apps/${appId}/drive/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(documentData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload document');
    }

    return data;
  },

  /**
   * Get app documents with filtering
   */
  async getDocuments(
    appId: string,
    params?: {
      page?: number;
      limit?: number;
      userId?: string;
      fileType?: string;
      status?: 'pending' | 'verified' | 'rejected';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ApiResponse<AppDocument[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/api/apps/${appId}/drive/documents?${queryParams.toString()}`;
    const response = await fetch(url, { headers: getAuthHeaders() });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch documents');
    }

    return data;
  },

  /**
   * Get document by ID
   */
  async getDocumentById(appId: string, documentId: string): Promise<ApiResponse<AppDocument>> {
    const response = await fetch(`/api/apps/${appId}/drive/documents/${documentId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch document');
    }

    return data;
  },

  /**
   * Update document
   */
  async updateDocument(
    appId: string,
    documentId: string,
    updates: Partial<AppDocument>
  ): Promise<ApiResponse<AppDocument>> {
    const response = await fetch(`/api/apps/${appId}/drive/documents/${documentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update document');
    }

    return data;
  },

  /**
   * Delete document
   */
  async deleteDocument(appId: string, documentId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`/api/apps/${appId}/drive/documents/${documentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete document');
    }

    return data;
  },

  /**
   * Get document statistics for app
   */
  async getDocumentStats(appId: string): Promise<ApiResponse<AppDocumentStats>> {
    const response = await fetch(`/api/apps/${appId}/drive/document-stats`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch document stats');
    }

    return data;
  },
};

// ============================================
// APP CONFIGURATION TYPES
// ============================================

export interface AppElementsConfig {
  logo?: string;
  splash?: string;
  siteDescription?: string;
  buttons?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
  header?: {
    backgroundColor?: string;
    textColor?: string;
  };
  body?: {
    backgroundColor?: string;
    textColor?: string;
  };
  form?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}

export interface AppProfileConfig {
  textColors?: {
    primary?: string;
    secondary?: string;
    aux?: string;
  };
  elementColors?: {
    primary?: string;
    secondary?: string;
  };
  menuColors?: {
    primary?: string;
    secondary?: string;
    aux?: string;
  };
  auxElementColors?: {
    primary?: string;
    secondary?: string;
  };
  backgroundColors?: {
    primary?: string;
    secondary?: string;
  };
}

export interface OnboardingSplashScreen {
  title?: string;
  subtitle?: string;
  image?: string;
}

export interface OnboardingConfig {
  fontFamily?: string;
  splash1?: OnboardingSplashScreen;
  splash2?: OnboardingSplashScreen;
  splash3?: OnboardingSplashScreen;
  textColors?: {
    primary?: string;
    secondary?: string;
  };
  backgroundColors?: {
    primary?: string;
    secondary?: string;
  };
}

export interface SupportComponent {
  id?: string;
  name: string;
  type: 'link' | 'button' | 'text';
  content: string;
  color?: string;
  order?: number;
}

export interface SupportConfig {
  email?: string;
  phone?: string;
  website?: string;
  linkedinPage?: string;
  socialMedia?: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  privacyPolicyLink?: string;
  termsLink?: string;
  components?: SupportComponent[];
}

export interface PolicySection {
  title?: string;
  content?: string; // Rich text HTML
}

export interface PolicyConfig {
  policySection?: PolicySection;
  termsSection?: PolicySection;
  // Legacy fields
  privacyPolicyUrl?: string;
  termsConditionsUrl?: string;
  indemnityUrl?: string;
}

export interface PublishingConfig {
  isPublished: boolean;
  publishedAt?: string;
}

export interface DNSRecord {
  type: string;
  name: string;
  value: string;
}

export interface DNSConfig {
  useCustomDomain: boolean;
  customDomain?: string;
  baseUrl?: string;
  records?: DNSRecord[];
  verified?: boolean;
}

export interface AppConfiguration {
  id: string;
  appId: string;
  versionReference: string;
  publishing: PublishingConfig;
  appElements?: AppElementsConfig;
  appProfile?: AppProfileConfig;
  onboarding?: OnboardingConfig;
  support?: SupportConfig;
  policy?: PolicyConfig;
  dns?: DNSConfig;
  isActive: boolean;
  updateVariance?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppTemplate {
  id: string;
  appId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  configuration: Partial<AppConfiguration>;
  createdAt: string;
  updatedAt: string;
}

export interface PublishUIResponse {
  unpublished: AppConfiguration[];
  previous: AppConfiguration[];
}

// ============================================
// APP CONFIGURATION API
// ============================================

export const appConfigurationApi = {
  /**
   * Get the currently active configuration for an app
   */
  async getActiveConfiguration(appId: string): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch configuration');
    }

    return data;
  },

  /**
   * Get all configurations (active and inactive) for an app
   */
  async getAllConfigurations(appId: string): Promise<ApiResponse<AppConfiguration[]>> {
    const response = await fetch(`/api/apps/${appId}/configuration/all`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch configurations');
    }

    return data;
  },

  /**
   * Get configurations formatted for publish UI
   */
  async getPublishConfigurations(appId: string): Promise<ApiResponse<PublishUIResponse>> {
    const response = await fetch(`/api/apps/${appId}/configuration/publish`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch publish configurations');
    }

    return data;
  },

  /**
   * Update the active configuration
   */
  async updateConfiguration(
    appId: string,
    config: Partial<AppConfiguration>
  ): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update configuration');
    }

    return data;
  },

  /**
   * Create a new configuration version
   */
  async createConfiguration(
    appId: string,
    config: Partial<AppConfiguration>,
    options?: { skipAutoDeactivate?: boolean; isActive?: boolean }
  ): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ configuration: config, options }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create configuration');
    }

    return data;
  },

  /**
   * Activate a specific configuration
   */
  async activateConfiguration(
    appId: string,
    configurationId: string
  ): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration/${configurationId}/activate`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to activate configuration');
    }

    return data;
  },

  /**
   * Update publishing status
   */
  async updatePublishingStatus(
    appId: string,
    isPublished: boolean
  ): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration/publishing`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPublished }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update publishing status');
    }

    return data;
  },

  // ============================================
  // SECTION-SPECIFIC UPDATE ENDPOINTS
  // ============================================

  /**
   * Update app elements (logo, splash, buttons, colors)
   */
  async updateAppElements(
    appId: string,
    appElements: AppElementsConfig
  ): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration/app-elements`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(appElements),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update app elements');
    }

    return data;
  },

  /**
   * Update app profile (text, element, menu, background colors)
   */
  async updateAppProfile(
    appId: string,
    appProfile: AppProfileConfig
  ): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration/app-profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(appProfile),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update app profile');
    }

    return data;
  },

  /**
   * Update onboarding configuration (splash screens, fonts, colors)
   */
  async updateOnboarding(
    appId: string,
    onboarding: OnboardingConfig
  ): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration/onboarding`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(onboarding),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update onboarding');
    }

    return data;
  },

  /**
   * Update support configuration (contact info, social media)
   */
  async updateSupport(
    appId: string,
    support: SupportConfig
  ): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration/support`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(support),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update support');
    }

    return data;
  },

  /**
   * Update policy configuration (policy and terms content)
   */
  async updatePolicy(
    appId: string,
    policy: PolicyConfig
  ): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration/policy`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(policy),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update policy');
    }

    return data;
  },
};

// ============================================
// TEMPLATE API
// ============================================

export const appTemplateApi = {
  /**
   * Create a template from current configuration
   */
  async createTemplate(
    appId: string,
    data: { name: string; description?: string; isDefault?: boolean }
  ): Promise<ApiResponse<AppTemplate>> {
    const response = await fetch(`/api/apps/${appId}/configuration/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create template');
    }

    return result;
  },

  /**
   * Get all templates for an app
   */
  async getAllTemplates(appId: string): Promise<ApiResponse<AppTemplate[]>> {
    const response = await fetch(`/api/apps/${appId}/configuration/templates`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch templates');
    }

    return data;
  },

  /**
   * Get a specific template
   */
  async getTemplate(appId: string, templateId: string): Promise<ApiResponse<AppTemplate>> {
    const response = await fetch(`/api/apps/${appId}/configuration/templates/${templateId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch template');
    }

    return data;
  },

  /**
   * Apply a template to the app's active configuration
   */
  async applyTemplate(appId: string, templateId: string): Promise<ApiResponse<AppConfiguration>> {
    const response = await fetch(`/api/apps/${appId}/configuration/templates/${templateId}/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to apply template');
    }

    return data;
  },

  /**
   * Update a template
   */
  async updateTemplate(
    appId: string,
    templateId: string,
    data: Partial<AppTemplate>
  ): Promise<ApiResponse<AppTemplate>> {
    const response = await fetch(`/api/apps/${appId}/configuration/templates/${templateId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update template');
    }

    return result;
  },

  /**
   * Delete a template
   */
  async deleteTemplate(appId: string, templateId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`/api/apps/${appId}/configuration/templates/${templateId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete template');
    }

    return data;
  },

  /**
   * Set a template as default
   */
  async setDefaultTemplate(appId: string, templateId: string): Promise<ApiResponse<AppTemplate>> {
    const response = await fetch(`/api/apps/${appId}/configuration/templates/${templateId}/set-default`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to set default template');
    }

    return data;
  },
};

// ============================================
// SUPPORT COMPONENT API
// ============================================

export const appSupportComponentApi = {
  /**
   * Add a support component
   */
  async addComponent(
    appId: string,
    component: Omit<SupportComponent, 'id'>
  ): Promise<ApiResponse<SupportComponent>> {
    const response = await fetch(`/api/apps/${appId}/configuration/support/components`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(component),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to add support component');
    }

    return data;
  },

  /**
   * Update a support component
   */
  async updateComponent(
    appId: string,
    componentId: string,
    updates: Partial<SupportComponent>
  ): Promise<ApiResponse<SupportComponent>> {
    const response = await fetch(`/api/apps/${appId}/configuration/support/components/${componentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update support component');
    }

    return data;
  },

  /**
   * Delete a support component
   */
  async deleteComponent(appId: string, componentId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`/api/apps/${appId}/configuration/support/components/${componentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete support component');
    }

    return data;
  },

  /**
   * Reorder support components
   */
  async reorderComponents(
    appId: string,
    componentIds: string[]
  ): Promise<ApiResponse<SupportComponent[]>> {
    const response = await fetch(`/api/apps/${appId}/configuration/support/components/reorder`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ componentIds }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to reorder support components');
    }

    return data;
  },
};

// ============================================
// PREDEFINED TEMPLATES (For Template Selection UI)
// ============================================

export interface PredefinedTemplate {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  category: 'banking' | 'fintech' | 'wallet' | 'blank';
  configuration: Partial<AppConfiguration>;
}

export const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [
  {
    id: 'mobile-v1',
    name: 'Classic Banking',
    description: 'Traditional banking app with a clean, professional design',
    previewImage: '/templates/mobile-v1-preview.png',
    category: 'banking',
    configuration: {
      appElements: {
        buttons: { primaryColor: '#7C3AED', secondaryColor: '#E5E7EB' },
        header: { backgroundColor: '#FFFFFF', textColor: '#1F2937' },
        body: { backgroundColor: '#F9FAFB', textColor: '#374151' },
      },
      appProfile: {
        textColors: { primary: '#1F2937', secondary: '#6B7280', aux: '#9CA3AF' },
        elementColors: { primary: '#7C3AED', secondary: '#A78BFA' },
        backgroundColors: { primary: '#FFFFFF', secondary: '#F3F4F6' },
      },
      onboarding: {
        fontFamily: 'Inter',
        splash1: { title: 'Welcome to Your Bank', subtitle: 'Manage your finances with ease' },
        splash2: { title: 'Secure Transactions', subtitle: 'Bank-level security for your peace of mind' },
        splash3: { title: 'Get Started', subtitle: 'Create your account in minutes' },
        textColors: { primary: '#FFFFFF', secondary: '#E5E7EB' },
        backgroundColors: { primary: '#7C3AED', secondary: '#6D28D9' },
      },
    },
  },
  {
    id: 'mobile-v2',
    name: 'Modern Fintech',
    description: 'Contemporary fintech design with bold colors and smooth animations',
    previewImage: '/templates/mobile-v2-preview.png',
    category: 'fintech',
    configuration: {
      appElements: {
        buttons: { primaryColor: '#2563EB', secondaryColor: '#DBEAFE' },
        header: { backgroundColor: '#2563EB', textColor: '#FFFFFF' },
        body: { backgroundColor: '#FFFFFF', textColor: '#1E293B' },
      },
      appProfile: {
        textColors: { primary: '#1E293B', secondary: '#64748B', aux: '#94A3B8' },
        elementColors: { primary: '#2563EB', secondary: '#3B82F6' },
        backgroundColors: { primary: '#FFFFFF', secondary: '#F1F5F9' },
      },
      onboarding: {
        fontFamily: 'Inter',
        splash1: { title: 'Smart Banking', subtitle: 'Your money, your way' },
        splash2: { title: 'Instant Transfers', subtitle: 'Send money in seconds, not days' },
        splash3: { title: 'Start Now', subtitle: 'Join millions of happy users' },
        textColors: { primary: '#FFFFFF', secondary: '#DBEAFE' },
        backgroundColors: { primary: '#2563EB', secondary: '#1D4ED8' },
      },
    },
  },
  {
    id: 'coming-soon',
    name: 'Coming Soon',
    description: 'More amazing templates are in the works!',
    previewImage: '/templates/blank-preview.png',
    category: 'blank',
    configuration: {
      appElements: {
        buttons: { primaryColor: '#9CA3AF', secondaryColor: '#E5E7EB' },
        header: { backgroundColor: '#F3F4F6', textColor: '#9CA3AF' },
        body: { backgroundColor: '#F9FAFB', textColor: '#9CA3AF' },
      },
      appProfile: {
        textColors: { primary: '#9CA3AF', secondary: '#D1D5DB', aux: '#E5E7EB' },
        elementColors: { primary: '#9CA3AF', secondary: '#D1D5DB' },
        backgroundColors: { primary: '#F9FAFB', secondary: '#F3F4F6' },
      },
      onboarding: {
        fontFamily: 'Arial',
        splash1: { title: 'Coming Soon', subtitle: 'New templates arriving shortly' },
        splash2: { title: 'Stay Tuned', subtitle: 'We are working hard' },
        splash3: { title: 'Be Ready', subtitle: 'For the next update' },
        textColors: { primary: '#9CA3AF', secondary: '#D1D5DB' },
        backgroundColors: { primary: '#E5E7EB', secondary: '#D1D5DB' },
      },
    },
  },
];

// ============================================
// COMBINED EXPORT
// ============================================

export const appService = {
  ...appApi,
  lifecycle: appLifecycleApi,
  productKeys: appProductKeyApi,
  transactions: appTransactionApi,
  drive: appDriveApi,
  configuration: appConfigurationApi,
  templates: appTemplateApi,
  supportComponents: appSupportComponentApi,
};

export default appService;
