import { App, CreateAppRequest, UpdateAppRequest, DnsConfiguration } from '../types/app';
import { AppModel } from '../models/appModel';
import { ApiError } from '../middleware/errorHandler';
import { validateCreateAppRequest } from '../utils/validation';
import { AppConfigurationService } from './appConfigurationService';
import { sanitizeSubdomain, generateUniqueSubdomain, validateSubdomain } from '../utils/subdomainUtils';
import { validateCustomDomain, normalizeDomain, isDomainUnique } from '../utils/domainUtils';
import { DnsService } from './dnsService';
import { VercelService } from './vercelService';
import { config } from '../config/environment';

export class AppService {
  private configService: AppConfigurationService;

  constructor() {
    this.configService = new AppConfigurationService();
  }

  async createApp(appData: CreateAppRequest): Promise<App> {
    // Validate the request using our validation utility
    const validationError = validateCreateAppRequest(appData);
    if (validationError) {
      throw new ApiError(400, validationError);
    }

    // Validate merchantId
    if (!appData.merchantId) {
      throw new ApiError(400, 'Merchant ID is required');
    }

    // Generate or validate subdomain
    let subdomain: string;
    if (appData.subdomain) {
      // Use provided custom subdomain (already validated in validateCreateAppRequest)
      subdomain = appData.subdomain;
    } else {
      // Auto-generate subdomain from app name
      subdomain = sanitizeSubdomain(appData.name);
    }

    // Get all existing subdomains to ensure uniqueness
    const existingSubdomains = await AppModel.getAllSubdomains();
    
    // Generate unique subdomain
    subdomain = generateUniqueSubdomain(subdomain, existingSubdomains);

    // Create app data with subdomain
    const appDataWithSubdomain = {
      ...appData,
      subdomain
    };

    const newApp = await AppModel.createApp(appDataWithSubdomain);
    
    // Create default configuration for the new app
    try {
      const defaultConfig = await this.configService.createDefaultConfiguration(newApp.id);
      // Update app with configuration ID reference
      await AppModel.updateApp(newApp.id, {
        activeConfigurationId: defaultConfig.id
      });
      newApp.activeConfigurationId = defaultConfig.id;
    } catch (error) {
      // Log error but don't fail app creation if configuration creation fails
      console.error('Failed to create default configuration for app:', error);
    }
    
    return newApp;
  }

  async getAppById(id: string): Promise<App | null> {
    if (!id) {
      throw new ApiError(400, 'App ID is required');
    }

    const app = await AppModel.getAppById(id);
    return app;
  }

  async getAppsByMerchantId(merchantId: string): Promise<App[]> {
    if (!merchantId) {
      throw new ApiError(400, 'Merchant ID is required');
    }

    const apps = await AppModel.getAppsByMerchantId(merchantId);
    return apps;
  }

  async updateApp(id: string, updateData: UpdateAppRequest): Promise<App | null> {
    if (!id) {
      throw new ApiError(400, 'App ID is required');
    }

    // Validate the update data if any fields are provided
    const validationError = validateCreateAppRequest(updateData);
    if (validationError) {
      throw new ApiError(400, validationError);
    }

    // Validate subdomain uniqueness if subdomain is being updated
    if (updateData.subdomain) {
      const subdomainError = validateSubdomain(updateData.subdomain);
      if (subdomainError) {
        throw new ApiError(400, `Invalid subdomain: ${subdomainError}`);
      }

      // Check if subdomain is already taken by another app
      const existingApp = await AppModel.getAppBySubdomain(updateData.subdomain);
      if (existingApp && existingApp.id !== id) {
        throw new ApiError(400, 'Subdomain is already taken by another app');
      }
    }

    // Handle custom domain updates if provided
    if (updateData.customDomain !== undefined) {
      // If customDomain is being set to null/empty, remove it
      if (!updateData.customDomain) {
        updateData.customDomainActive = false;
      }
    }

    // Validate status transitions
    if (updateData.status) {
      const app = await AppModel.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }

      // Validate status transitions
      if (updateData.status === 'submitted' && app.status !== 'draft' && app.status !== 'incomplete') {
        throw new ApiError(400, 'Only draft or incomplete apps can be submitted');
      }

      if (updateData.status === 'approved' && app.status !== 'submitted') {
        throw new ApiError(400, 'Only submitted apps can be approved');
      }

      if (updateData.status === 'rejected' && app.status !== 'submitted') {
        throw new ApiError(400, 'Only submitted apps can be rejected');
      }
    }

    const updatedApp = await AppModel.updateApp(id, updateData);
    return updatedApp;
  }

  async deleteApp(id: string): Promise<boolean> {
    if (!id) {
      throw new ApiError(400, 'App ID is required');
    }

    const deleted = await AppModel.deleteApp(id);
    return deleted;
  }

  async getAllApps(): Promise<App[]> {
    const apps = await AppModel.getAllApps();
    return apps;
  }

  async submitApp(id: string): Promise<App | null> {
    if (!id) {
      throw new ApiError(400, 'App ID is required');
    }

    const app = await AppModel.getAppById(id);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    // Only draft or incomplete apps can be submitted
    if (app.status !== 'draft' && app.status !== 'incomplete') {
      throw new ApiError(400, 'Only draft or incomplete apps can be submitted');
    }

    const updatedApp = await AppModel.updateApp(id, {
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });

    return updatedApp;
  }

  async approveApp(id: string): Promise<App | null> {
    if (!id) {
      throw new ApiError(400, 'App ID is required');
    }

    const app = await AppModel.getAppById(id);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    // Only submitted apps can be approved
    if (app.status !== 'submitted') {
      throw new ApiError(400, 'Only submitted apps can be approved');
    }

    const updatedApp = await AppModel.updateApp(id, {
      status: 'approved',
      approvedAt: new Date().toISOString()
    });

    return updatedApp;
  }

  async rejectApp(id: string, rejectionReason: string): Promise<App | null> {
    if (!id) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!rejectionReason) {
      throw new ApiError(400, 'Rejection reason is required');
    }

    const app = await AppModel.getAppById(id);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    // Only submitted apps can be rejected
    if (app.status !== 'submitted') {
      throw new ApiError(400, 'Only submitted apps can be rejected');
    }

    const updatedApp = await AppModel.updateApp(id, {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason
    });

    return updatedApp;
  }

  /**
   * Add a product key to an app
   * @param appId The ID of the app
   * @param productKey The product key to add
   * @returns The updated app
   */
  async addProductKey(appId: string, productKey: string): Promise<App | null> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!productKey) {
      throw new ApiError(400, 'Product key is required');
    }

    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    // Add product key if it doesn't already exist
    const productKeys = app.productKeys || [];
    if (!productKeys.includes(productKey)) {
      productKeys.push(productKey);
      const updatedApp = await AppModel.updateApp(appId, {
        productKeys
      });
      return updatedApp;
    }

    return app;
  }

  /**
   * Get all product keys for an app
   * @param appId The ID of the app
   * @returns Array of product keys
   */
  async getProductKeys(appId: string): Promise<string[]> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    return app.productKeys || [];
  }

  /**
   * Get app by subdomain
   * @param subdomain The subdomain to look up
   * @returns The app with the matching subdomain, or null if not found
   */
  async getAppBySubdomain(subdomain: string): Promise<App | null> {
    if (!subdomain) {
      throw new ApiError(400, 'Subdomain is required');
    }

    const app = await AppModel.getAppBySubdomain(subdomain);
    return app;
  }

  /**
   * Get all apps with additional metadata (special endpoint)
   */
  async getAllAppsWithMetadata(): Promise<App[]> {
    // In a real implementation, this would return additional metadata
    // that regular users shouldn't have access to
    const apps = await AppModel.getAllApps();
    return apps;
  }

  /**
   * Bulk update apps (special endpoint)
   */
  async bulkUpdateApps(updates: Array<{id: string, data: UpdateAppRequest}>): Promise<{ 
    successCount: number; 
    failedCount: number; 
    results: Array<{id: string; success: boolean; error?: string}> 
  }> {
    let successCount = 0;
    let failedCount = 0;
    const results = [];

    for (const update of updates) {
      try {
        const app = await this.updateApp(update.id, update.data);
        if (app) {
          successCount++;
          results.push({ id: update.id, success: true });
        } else {
          failedCount++;
          results.push({ id: update.id, success: false, error: 'App not found' });
        }
      } catch (error) {
        failedCount++;
        results.push({ 
          id: update.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return { successCount, failedCount, results };
  }

  /**
   * Update custom domain for an app
   * @param appId The ID of the app
   * @param customDomain The custom domain to set
   * @returns The updated app
   */
  async updateCustomDomain(appId: string, customDomain: string): Promise<App | null> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!customDomain) {
      throw new ApiError(400, 'Custom domain is required');
    }

    // Validate app exists
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    // Validate domain format
    const domainError = validateCustomDomain(customDomain, config.baseDomain);
    if (domainError) {
      throw new ApiError(400, domainError);
    }

    // Normalize domain
    const normalizedDomain = normalizeDomain(customDomain);

    // Check uniqueness
    const existingDomains = await AppModel.getAllCustomDomains();
    if (!isDomainUnique(normalizedDomain, existingDomains, appId)) {
      throw new ApiError(400, 'Domain already exist in our database!');
    }

    // Use Vercel API to generate DNS configuration
    const vercelService = new VercelService();
    
    if (!vercelService.isConfigured()) {
      throw new ApiError(500, 'Vercel API is not configured. Please set VERCEL_API_TOKEN environment variable.');
    }

    if (!config.vercelDefaultProjectId) {
      throw new ApiError(400, 'Vercel project ID is required. Please set VERCEL_DEFAULT_PROJECT_ID environment variable.');
    }

    let dnsConfig: DnsConfiguration;
    try {
      // Add domain to Vercel project
      const vercelDomainResponse = await vercelService.addDomain(
        normalizedDomain,
        config.vercelDefaultProjectId,
        config.vercelTeamId
      );

      // Convert Vercel response to DNS configuration
      dnsConfig = DnsService.convertVercelToDnsConfiguration(
        vercelDomainResponse,
        normalizedDomain
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to add domain to Vercel: ${error.message}`);
    }

    // Update app with custom domain
    const updatedApp = await AppModel.updateApp(appId, {
      customDomain: normalizedDomain,
      customDomainActive: false, // Start as inactive
      customDomainVerified: false, // Not verified yet
      customDomainVerifiedAt: undefined,
      dnsConfiguration: dnsConfig
    });

    return updatedApp;
  }

  /**
   * Activate or deactivate custom domain
   * @param appId The ID of the app
   * @param active Whether to activate the custom domain
   * @param allowUnverified Whether to allow activation without verification (manual override)
   * @returns The updated app
   */
  async activateCustomDomain(
    appId: string,
    active: boolean,
    allowUnverified: boolean = false
  ): Promise<App | null> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    if (!app.customDomain) {
      throw new ApiError(400, 'No custom domain set for this app');
    }

    // If activating, check if domain is verified (unless manual override)
    if (active && !app.customDomainVerified && !allowUnverified) {
      throw new ApiError(400, 'Cannot activate custom domain without verification. Please verify DNS configuration first.');
    }

    const updatedApp = await AppModel.updateApp(appId, {
      customDomainActive: active
    });

    return updatedApp;
  }

  /**
   * Verify custom domain DNS configuration
   * @param appId The ID of the app
   * @param manualOverride Whether to mark as verified without DNS check
   * @returns Verification result
   */
  async verifyCustomDomain(
    appId: string,
    manualOverride: boolean = false
  ): Promise<{ verified: boolean; errors: string[] }> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    if (!app.customDomain) {
      throw new ApiError(400, 'No custom domain set for this app');
    }

    if (!app.dnsConfiguration) {
      throw new ApiError(400, 'No DNS configuration found for this app');
    }

    let verificationResult: { verified: boolean; errors: string[] };

    if (manualOverride) {
      // Manual override - mark as verified without DNS check
      verificationResult = { verified: true, errors: [] };
    } else {
      // Perform actual DNS verification
      verificationResult = await DnsService.verifyDnsConfiguration(
        app.customDomain,
        app.dnsConfiguration
      );
    }

    // Update app with verification status
    await AppModel.updateApp(appId, {
      customDomainVerified: verificationResult.verified,
      customDomainVerifiedAt: verificationResult.verified ? new Date().toISOString() : undefined
    });

    return verificationResult;
  }

  /**
   * Get DNS configuration for an app
   * @param appId The ID of the app
   * @returns DNS configuration or null
   */
  async getDnsConfiguration(appId: string): Promise<DnsConfiguration | null> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    if (!app.customDomain || !app.dnsConfiguration) {
      return null;
    }

    return app.dnsConfiguration;
  }

  /**
   * Remove custom domain and revert to subdomain
   * @param appId The ID of the app
   * @returns The updated app
   */
  async removeCustomDomain(appId: string): Promise<App | null> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    const updatedApp = await AppModel.updateApp(appId, {
      customDomain: undefined,
      customDomainActive: false,
      customDomainVerified: false,
      customDomainVerifiedAt: undefined,
      dnsConfiguration: undefined
    });

    return updatedApp;
  }
}