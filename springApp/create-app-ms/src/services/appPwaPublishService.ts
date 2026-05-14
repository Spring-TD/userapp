import { ApiError } from '../middleware/errorHandler';
import { AppModel } from '../models/appModel';
import { AppPwaPublishModel } from '../models/appPwaPublishModel';
import { AppPwaTemplateModel } from '../models/appPwaTemplateModel';
import { AppPwaTemplate } from '../types/pwaTemplate';
import {
  AppPwaPublish,
  PublicPwaInstallBundle,
  PublishPwaRequest,
  RuntimeManifest
} from '../types/pwaPublish';
import { buildRuntimeManifest, resolvePwaBaseUrl } from '../utils/pwaManifestBuilder';
import {
  buildServiceWorkerMeta,
  buildServiceWorkerScript
} from '../utils/pwaServiceWorkerBuilder';
import { validatePwaPublishReadiness } from '../utils/pwaPublishValidation';

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export class AppPwaPublishService {
  private async resolveTemplateForPublish(
    appId: string,
    templateId?: string
  ): Promise<AppPwaTemplate | null> {
    if (templateId) {
      const selected = await AppPwaTemplateModel.getByIdAndAppId(templateId, appId);
      if (!selected) return null;
      const applied = await AppPwaTemplateModel.setApplied(templateId, appId);
      return applied || selected;
    }
    return AppPwaTemplateModel.getAppliedByAppId(appId);
  }

  async publish(
    appId: string,
    body: PublishPwaRequest,
    apiBaseUrl: string
  ): Promise<{
    publishId: string;
    appId: string;
    templateId: string;
    version: string;
    manifestUrl: string;
    serviceWorkerUrl: string;
    pwaEntryUrl: string;
    publishedAt: string;
  }> {
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    const template = await this.resolveTemplateForPublish(appId, body.templateId);
    const readiness = validatePwaPublishReadiness(app, template);
    if (!template || readiness.errors.length > 0) {
      console.warn('PWA publish validation failed', {
        appId,
        templateId: body.templateId || null,
        errors: readiness.errors
      });
      throw new ApiError(422, 'PWA publish validation failed', readiness.errors);
    }

    const version = new Date().toISOString();
    const manifest = buildRuntimeManifest(app, template);
    const serviceWorkerMeta = buildServiceWorkerMeta(appId, version);
    const base = trimSlash(apiBaseUrl);
    const manifestUrl = `${base}/api/v1/apps/${appId}/pwa/manifest.webmanifest`;
    const serviceWorkerUrl = `${base}/api/v1/apps/${appId}/pwa/sw.js`;
    const pwaEntryUrl = resolvePwaBaseUrl(app, template) || manifest.start_url;

    const publish = await AppPwaPublishModel.createForApp(appId, {
      templateId: template.id,
      version,
      manifest,
      serviceWorkerMeta,
      artifactUrls: { manifestUrl, serviceWorkerUrl, pwaEntryUrl },
      status: 'published',
      warnings: readiness.warnings,
      errors: [],
      publishedAt: version
    });

    console.info('PWA published', {
      appId,
      templateId: template.id,
      publishId: publish.id,
      version
    });

    return {
      publishId: publish.id,
      appId: publish.appId,
      templateId: publish.templateId,
      version: publish.version,
      manifestUrl,
      serviceWorkerUrl,
      pwaEntryUrl,
      publishedAt: publish.publishedAt
    };
  }

  async getStatus(appId: string): Promise<{
    isPublished: boolean;
    appId: string;
    templateId?: string;
    version?: string;
    manifestReady: boolean;
    serviceWorkerReady: boolean;
    iconsReady: boolean;
    httpsReady: boolean;
    customDomainReady: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }
    const latest = await AppPwaPublishModel.getLatestByAppId(appId);
    const template = latest
      ? await AppPwaTemplateModel.getByIdAndAppId(latest.templateId, appId)
      : await AppPwaTemplateModel.getAppliedByAppId(appId);

    const readiness = validatePwaPublishReadiness(app, template);
    const statusWarnings = [...(latest?.warnings || []), ...readiness.warnings];
    const statusErrors = [...(latest?.errors || []), ...readiness.errors];
    if (!latest) {
      statusWarnings.push('No published PWA version yet');
    }
    return {
      isPublished: !!latest && latest.status === 'published',
      appId,
      templateId: latest?.templateId,
      version: latest?.version,
      manifestReady: readiness.manifestReady,
      serviceWorkerReady: readiness.serviceWorkerReady,
      iconsReady: readiness.iconsReady,
      httpsReady: readiness.httpsReady,
      customDomainReady: readiness.customDomainReady,
      warnings: Array.from(new Set(statusWarnings)),
      errors: Array.from(new Set(statusErrors))
    };
  }

  /**
   * Absolute manifest / SW URLs for embedding on the merchant storefront.
   * `pwaEntryUrl` is the app’s public site (from publish); artifact URLs use this API’s host.
   */
  async getPublicInstallBundle(
    appId: string,
    apiBaseUrl: string
  ): Promise<PublicPwaInstallBundle | null> {
    const latest = await AppPwaPublishModel.getLatestByAppId(appId);
    if (!latest || latest.status !== 'published') {
      return null;
    }
    const base = trimSlash(apiBaseUrl);
    return {
      manifestUrl: `${base}/api/v1/apps/${appId}/pwa/manifest.webmanifest`,
      serviceWorkerUrl: `${base}/api/v1/apps/${appId}/pwa/sw.js`,
      pwaEntryUrl: latest.artifactUrls.pwaEntryUrl,
      version: latest.version
    };
  }

  async getPublishedManifest(appId: string): Promise<RuntimeManifest> {
    const latest = await AppPwaPublishModel.getLatestByAppId(appId);
    if (!latest || latest.status !== 'published') {
      throw new ApiError(404, 'No published PWA artifact found');
    }
    return latest.manifest;
  }

  async getPublishedServiceWorker(appId: string): Promise<{ script: string; publish: AppPwaPublish }> {
    const latest = await AppPwaPublishModel.getLatestByAppId(appId);
    if (!latest || latest.status !== 'published') {
      throw new ApiError(404, 'No published PWA artifact found');
    }
    return {
      script: buildServiceWorkerScript(appId, latest.version),
      publish: latest
    };
  }
}

