import { App, AppStatus, CreateAppRequest, UpdateAppRequest } from '../types/app';
import { AppModel } from '../models/appModel';
import { AppPwaTemplateModel } from '../models/appPwaTemplateModel';
import { ApiError } from '../middleware/errorHandler';
import { validateCreateAppRequest } from '../utils/validation';

export class AppService {
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

    const newApp = await AppModel.createApp(appData);
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

    const updatedApp = await AppModel.updateApp(id, updateData);
    return updatedApp;
  }

  async deleteApp(id: string): Promise<boolean> {
    if (!id) {
      throw new ApiError(400, 'App ID is required');
    }

    const deleted = await AppModel.deleteApp(id);
    if (deleted) {
      await AppPwaTemplateModel.deleteByAppId(id);
    }
    return deleted;
  }

  async getAllApps(): Promise<App[]> {
    const apps = await AppModel.getAllApps();
    return apps;
  }

  /**
   * Update app status (active | suspended). Merchants can suspend or reactivate their apps.
   */
  async updateAppStatus(id: string, status: AppStatus): Promise<App | null> {
    if (!id) {
      throw new ApiError(400, 'App ID is required');
    }
    if (status !== 'active' && status !== 'suspended') {
      throw new ApiError(400, 'Status must be "active" or "suspended"');
    }
    const app = await AppModel.getAppById(id);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }
    const updatedApp = await AppModel.updateApp(id, { status });
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
}