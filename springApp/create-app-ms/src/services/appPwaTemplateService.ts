import { config } from '../config/environment';
import { ApiError } from '../middleware/errorHandler';
import { AppPwaTemplateModel } from '../models/appPwaTemplateModel';
import {
  deleteFromSpaces,
  isSpacesConfigured,
  uploadToSpaces
} from './spacesService';
import {
  AppPwaTemplate,
  CreateAppPwaTemplateRequest,
  UpdateAppPwaTemplateRequest
} from '../types/pwaTemplate';
import {
  coerceAppPwaTemplateConfig,
  mergeAppPwaTemplateConfig,
  normalizeAppPwaTemplateConfigForCreate
} from '../utils/pwaTemplateConfig';

function validateCreateBody(data: CreateAppPwaTemplateRequest): void {
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new ApiError(400, 'Template name is required');
  }
  if (data.name.length > 200) {
    throw new ApiError(400, 'Template name must be at most 200 characters');
  }
  if (data.config === undefined || data.config === null || typeof data.config !== 'object') {
    throw new ApiError(400, 'Template config must be a JSON object');
  }
  if (Array.isArray(data.config)) {
    throw new ApiError(400, 'Template config must be a JSON object, not an array');
  }
}

function validateUpdateBody(data: UpdateAppPwaTemplateRequest): void {
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new ApiError(400, 'Template name cannot be empty');
    }
    if (data.name.length > 200) {
      throw new ApiError(400, 'Template name must be at most 200 characters');
    }
  }
  if (data.config !== undefined) {
    if (data.config === null || typeof data.config !== 'object' || Array.isArray(data.config)) {
      throw new ApiError(400, 'Template config must be a JSON object');
    }
  }
}

export class AppPwaTemplateService {
  private static readonly PWA_ASSET_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };

  private withCoercedConfig(t: AppPwaTemplate): AppPwaTemplate {
    return { ...t, config: coerceAppPwaTemplateConfig(t.config) };
  }

  /**
   * Upload logo or splash image to DigitalOcean Spaces and merge URLs/keys into `config.asset`.
   */
  async uploadPwaAssetImage(
    appId: string,
    templateId: string,
    kind: 'logo' | 'splash',
    buffer: Buffer,
    mimeType: string
  ): Promise<AppPwaTemplate> {
    if (!isSpacesConfigured()) {
      throw new ApiError(
        503,
        'File storage is not configured. Set DigitalOcean Spaces environment variables (see .env.example).'
      );
    }

    const normalizedMime = mimeType.toLowerCase().split(';')[0].trim();
    const ext = AppPwaTemplateService.PWA_ASSET_MIME[normalizedMime];
    if (!ext) {
      throw new ApiError(400, 'Invalid image type. Allowed: JPEG, PNG, WebP');
    }

    if (buffer.length > config.pwaAssetMaxBytes) {
      throw new ApiError(
        400,
        `File too large (max ${Math.floor(config.pwaAssetMaxBytes / (1024 * 1024))}MB)`
      );
    }

    const existing = await AppPwaTemplateModel.getByIdAndAppId(templateId, appId);
    if (!existing) {
      throw new ApiError(404, 'Template not found');
    }

    const asset = coerceAppPwaTemplateConfig(existing.config).asset;
    const oldKey = kind === 'logo' ? asset.logoKey : asset.splashImageKey;

    const prefix = config.doSpaces.pwaKeyPrefix;
    const objectKey = `${prefix}/${appId}/templates/${templateId}/${kind}-${Date.now()}.${ext}`;

    const { url, key } = await uploadToSpaces(buffer, objectKey, normalizedMime);

    const assetPatch =
      kind === 'logo'
        ? { logoUrl: url, logoKey: key }
        : { splashImageUrl: url, splashImageKey: key };

    const merged = mergeAppPwaTemplateConfig(
      existing.config as unknown as Record<string, unknown>,
      { asset: assetPatch }
    );

    const updated = await AppPwaTemplateModel.update(templateId, appId, {
      config: merged as unknown as Record<string, unknown>
    });

    if (!updated) {
      throw new ApiError(500, 'Failed to update template after upload');
    }

    if (oldKey && oldKey !== key) {
      void deleteFromSpaces(oldKey);
    }

    return this.withCoercedConfig(updated);
  }

  /**
   * Upload an onboarding screen image (PNG/JPG/WebP, same size limits as asset images).
   * Pads `screens` with empty objects until `screenIndex` exists, then sets `screenImageUrl` / `screenImageKey`.
   */
  async uploadOnboardingScreenImage(
    appId: string,
    templateId: string,
    screenIndex: number,
    buffer: Buffer,
    mimeType: string
  ): Promise<AppPwaTemplate> {
    if (!Number.isInteger(screenIndex) || screenIndex < 0) {
      throw new ApiError(400, 'screenIndex must be a non-negative integer');
    }

    if (!isSpacesConfigured()) {
      throw new ApiError(
        503,
        'File storage is not configured. Set DigitalOcean Spaces environment variables (see .env.example).'
      );
    }

    const normalizedMime = mimeType.toLowerCase().split(';')[0].trim();
    const ext = AppPwaTemplateService.PWA_ASSET_MIME[normalizedMime];
    if (!ext) {
      throw new ApiError(400, 'Invalid image type. Allowed: JPEG, PNG, WebP');
    }

    if (buffer.length > config.pwaAssetMaxBytes) {
      throw new ApiError(
        400,
        `File too large (max ${Math.floor(config.pwaAssetMaxBytes / (1024 * 1024))}MB)`
      );
    }

    const existing = await AppPwaTemplateModel.getByIdAndAppId(templateId, appId);
    if (!existing) {
      throw new ApiError(404, 'Template not found');
    }

    const cfg = coerceAppPwaTemplateConfig(existing.config);
    const screens = [...cfg.onboarding.screens];
    while (screens.length <= screenIndex) {
      screens.push({});
    }

    const oldKey = screens[screenIndex]?.screenImageKey;

    const prefix = config.doSpaces.pwaKeyPrefix;
    const objectKey = `${prefix}/${appId}/templates/${templateId}/onboarding/screen-${screenIndex}-${Date.now()}.${ext}`;

    const { url, key } = await uploadToSpaces(buffer, objectKey, normalizedMime);

    screens[screenIndex] = {
      ...screens[screenIndex],
      screenImageUrl: url,
      screenImageKey: key
    };

    const merged = mergeAppPwaTemplateConfig(
      existing.config as unknown as Record<string, unknown>,
      { onboarding: { screens } }
    );

    const updated = await AppPwaTemplateModel.update(templateId, appId, {
      config: merged as unknown as Record<string, unknown>
    });

    if (!updated) {
      throw new ApiError(500, 'Failed to update template after upload');
    }

    if (oldKey && oldKey !== key) {
      void deleteFromSpaces(oldKey);
    }

    return this.withCoercedConfig(updated);
  }

  async create(appId: string, body: CreateAppPwaTemplateRequest): Promise<AppPwaTemplate> {
    validateCreateBody(body);
    const config = normalizeAppPwaTemplateConfigForCreate(
      body.config as Record<string, unknown>
    );
    const created = await AppPwaTemplateModel.createForApp(appId, {
      ...body,
      name: body.name.trim(),
      category: body.category?.trim(),
      description: body.description?.trim(),
      iconKey: body.iconKey?.trim(),
      config: config as unknown as Record<string, unknown>
    });
    return this.withCoercedConfig(created);
  }

  async list(appId: string): Promise<AppPwaTemplate[]> {
    const templates = await AppPwaTemplateModel.listByAppId(appId);
    return templates.map((t) => this.withCoercedConfig(t));
  }

  async getById(templateId: string, appId: string): Promise<AppPwaTemplate | null> {
    const t = await AppPwaTemplateModel.getByIdAndAppId(templateId, appId);
    return t ? this.withCoercedConfig(t) : null;
  }

  async update(
    templateId: string,
    appId: string,
    body: UpdateAppPwaTemplateRequest
  ): Promise<AppPwaTemplate | null> {
    validateUpdateBody(body);
    const existing = await AppPwaTemplateModel.getByIdAndAppId(templateId, appId);
    if (!existing) {
      return null;
    }

    const patch: UpdateAppPwaTemplateRequest = { ...body };
    if (patch.name !== undefined) patch.name = patch.name.trim();
    if (patch.category !== undefined) patch.category = patch.category?.trim();
    if (patch.description !== undefined) patch.description = patch.description?.trim();
    if (patch.iconKey !== undefined) patch.iconKey = patch.iconKey?.trim();
    if (patch.config !== undefined) {
      const merged = mergeAppPwaTemplateConfig(
        existing.config as unknown as Record<string, unknown>,
        patch.config as Record<string, unknown>
      );
      patch.config = merged as unknown as Record<string, unknown>;
    }

    const updated = await AppPwaTemplateModel.update(templateId, appId, patch);
    return updated ? this.withCoercedConfig(updated) : null;
  }

  async delete(templateId: string, appId: string): Promise<boolean> {
    return AppPwaTemplateModel.delete(templateId, appId);
  }

  async apply(templateId: string, appId: string): Promise<AppPwaTemplate | null> {
    const t = await AppPwaTemplateModel.setApplied(templateId, appId);
    return t ? this.withCoercedConfig(t) : null;
  }

  async deleteAllForApp(appId: string): Promise<number> {
    return AppPwaTemplateModel.deleteByAppId(appId);
  }
}
