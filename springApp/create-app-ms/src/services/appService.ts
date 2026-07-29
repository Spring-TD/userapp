import { App, AppListQuery, AppListResult, AppStatus, CreateAppRequest, UpdateAppRequest } from '../types/app';
import { AppModel } from '../models/appModel';
import { AppPwaTemplateModel } from '../models/appPwaTemplateModel';
import { ApiError } from '../middleware/errorHandler';
import { validateCreateAppRequest } from '../utils/validation';
import {
  generateUniqueSubdomain,
  sanitizeSubdomain,
  validateSubdomain
} from '../utils/subdomainUtils';
import { buildDefaultAppUrl, config } from '../config/environment';
import { deleteFromSpaces, isSpacesConfigured, uploadToSpaces } from './spacesService';

export class AppService {
  private static readonly MANIFEST_MIME = new Set<string>([
    'application/json',
    'application/manifest+json',
    'text/json'
  ]);

  private async uploadManifestToSpaces(
    appId: string,
    suffix: string,
    file: { buffer: Buffer; originalname: string }
  ): Promise<{ url: string; key: string }> {
    const prefix = config.doSpaces.pwaKeyPrefix;
    const fileName = (file.originalname || '').trim().toLowerCase();
    const safeName = (fileName || 'manifest.json').replace(/[^a-z0-9._-]/g, '-');
    const objectKey = `${prefix}/${appId}/manifests/${Date.now()}-${suffix}-${safeName}`;
    try {
      return await uploadToSpaces(file.buffer, objectKey, 'application/json');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown upload error';
      throw new ApiError(502, `Failed to upload manifest to file storage: ${message}`);
    }
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

    const existingSubdomains = await AppModel.getAllSubdomains();
    let subdomain: string;
    if (appData.subdomain !== undefined && appData.subdomain !== '') {
      const err = validateSubdomain(appData.subdomain.trim().toLowerCase());
      if (err) {
        throw new ApiError(400, err);
      }
      subdomain = appData.subdomain.trim().toLowerCase();
    } else {
      subdomain = sanitizeSubdomain(appData.name);
    }
    subdomain = generateUniqueSubdomain(subdomain, existingSubdomains);

    const newApp = await AppModel.createApp({
      ...appData,
      subdomain
    });
    return newApp;
  }

  async getAppById(id: string): Promise<App | null> {
    if (!id) {
      throw new ApiError(400, 'App ID is required');
    }

    const app = await AppModel.getAppById(id);
    return app;
  }

  async getAppBySubdomain(subdomain: string): Promise<App | null> {
    if (!subdomain) {
      throw new ApiError(400, 'Subdomain is required');
    }
    const normalizedSubdomain = subdomain.trim().toLowerCase();
    const err = validateSubdomain(normalizedSubdomain);
    if (err) {
      throw new ApiError(400, err);
    }
    const app = await AppModel.getAppBySubdomain(normalizedSubdomain);
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

  async listApps(query: AppListQuery = {}): Promise<AppListResult> {
    return AppModel.listApps(query);
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

  async uploadManifestFiles(
    appId: string,
    files: Array<{ buffer: Buffer; mimetype: string; originalname: string }>
  ): Promise<App> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }
    if (!files.length) {
      throw new ApiError(400, 'At least one manifest file is required (multipart field name: files)');
    }
    if (!isSpacesConfigured()) {
      throw new ApiError(
        503,
        'File storage is not configured. Set DigitalOcean Spaces environment variables (see .env.example).'
      );
    }

    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    const oldKeys = Array.isArray(app.manifestKeys) ? app.manifestKeys : [];
    const uploaded: Array<{ url: string; key: string }> = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const normalizedMime = file.mimetype.toLowerCase().split(';')[0].trim();
      const fileName = (file.originalname || '').trim().toLowerCase();
      if (!AppService.MANIFEST_MIME.has(normalizedMime) && !fileName.endsWith('.json')) {
        throw new ApiError(
          400,
          'Invalid manifest file type. Only JSON files are allowed (application/json or .json)'
        );
      }
      if (file.buffer.length > config.pwaAssetMaxBytes) {
        throw new ApiError(
          400,
          `File too large (max ${Math.floor(config.pwaAssetMaxBytes / (1024 * 1024))}MB)`
        );
      }
      uploaded.push(await this.uploadManifestToSpaces(appId, String(i), file));
    }

    const manifestUrls = uploaded.map((item) => item.url);
    const manifestKeys = uploaded.map((item) => item.key);
    const updated = await AppModel.updateApp(appId, { manifestUrls, manifestKeys });
    if (!updated) {
      throw new ApiError(500, 'Failed to update app after manifest upload');
    }

    for (const key of oldKeys) {
      if (!manifestKeys.includes(key)) {
        void deleteFromSpaces(key);
      }
    }
    return updated;
  }

  async replaceManifestFile(
    appId: string,
    manifestIndex: number,
    file: { buffer: Buffer; mimetype: string; originalname: string }
  ): Promise<App> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }
    if (!Number.isInteger(manifestIndex) || manifestIndex < 0) {
      throw new ApiError(400, 'manifestIndex must be a non-negative integer');
    }
    if (!isSpacesConfigured()) {
      throw new ApiError(
        503,
        'File storage is not configured. Set DigitalOcean Spaces environment variables (see .env.example).'
      );
    }

    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }
    const manifestUrls = Array.isArray(app.manifestUrls) ? [...app.manifestUrls] : [];
    const manifestKeys = Array.isArray(app.manifestKeys) ? [...app.manifestKeys] : [];
    if (manifestIndex >= manifestUrls.length || manifestIndex >= manifestKeys.length) {
      throw new ApiError(404, 'Manifest index not found');
    }

    const normalizedMime = file.mimetype.toLowerCase().split(';')[0].trim();
    const fileName = (file.originalname || '').trim().toLowerCase();
    if (!AppService.MANIFEST_MIME.has(normalizedMime) && !fileName.endsWith('.json')) {
      throw new ApiError(
        400,
        'Invalid manifest file type. Only JSON files are allowed (application/json or .json)'
      );
    }
    if (file.buffer.length > config.pwaAssetMaxBytes) {
      throw new ApiError(
        400,
        `File too large (max ${Math.floor(config.pwaAssetMaxBytes / (1024 * 1024))}MB)`
      );
    }

    const uploaded = await this.uploadManifestToSpaces(appId, String(manifestIndex), file);

    const oldKey = manifestKeys[manifestIndex];
    manifestUrls[manifestIndex] = uploaded.url;
    manifestKeys[manifestIndex] = uploaded.key;

    const updated = await AppModel.updateApp(appId, { manifestUrls, manifestKeys });
    if (!updated) {
      throw new ApiError(500, 'Failed to update app after manifest replace');
    }
    if (oldKey && oldKey !== uploaded.key) {
      void deleteFromSpaces(oldKey);
    }
    return updated;
  }

  async deleteManifestFile(appId: string, manifestIndex: number): Promise<App> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }
    if (!Number.isInteger(manifestIndex) || manifestIndex < 0) {
      throw new ApiError(400, 'manifestIndex must be a non-negative integer');
    }

    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }
    const manifestUrls = Array.isArray(app.manifestUrls) ? [...app.manifestUrls] : [];
    const manifestKeys = Array.isArray(app.manifestKeys) ? [...app.manifestKeys] : [];
    if (manifestIndex >= manifestUrls.length || manifestIndex >= manifestKeys.length) {
      throw new ApiError(404, 'Manifest index not found');
    }

    const oldKey = manifestKeys[manifestIndex];
    manifestUrls.splice(manifestIndex, 1);
    manifestKeys.splice(manifestIndex, 1);

    const updated = await AppModel.updateApp(appId, { manifestUrls, manifestKeys });
    if (!updated) {
      throw new ApiError(500, 'Failed to update app after manifest delete');
    }
    if (oldKey) {
      void deleteFromSpaces(oldKey);
    }
    return updated;
  }

  getDefaultAppUrl(app: App): string | undefined {
    return app.subdomain ? buildDefaultAppUrl(app.subdomain) : undefined;
  }
}