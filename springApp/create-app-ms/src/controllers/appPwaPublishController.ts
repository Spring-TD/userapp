import { Request, Response } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { AppService } from '../services/appService';
import { AppPwaPublishService } from '../services/appPwaPublishService';
import { PublishPwaRequest } from '../types/pwaPublish';
import { App } from '../types/app';
import { tryGetApiBaseUrl } from '../utils/requestBaseUrl';

declare const console: any;

export class AppPwaPublishController {
  constructor(
    private readonly appService: AppService,
    private readonly publishService: AppPwaPublishService
  ) {}

  private isMerchantUser(req: Request): boolean {
    const userType = (req.user?.userType || '').toLowerCase();
    return userType === 'merchant';
  }

  private assertMerchantOwnsApp(req: Request, app: App): void {
    if (!this.isMerchantUser(req)) {
      return;
    }
    const merchantIds = [req.user?.userMerchantId, req.user?.userId].filter(
      (value): value is string => Boolean(value)
    );
    if (merchantIds.length === 0 || !merchantIds.includes(app.merchantId)) {
      throw new ApiError(403, 'You can only access your own apps');
    }
  }

  private async loadAppOrThrow(appId: string, req: Request): Promise<App> {
    const app = await this.appService.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }
    this.assertMerchantOwnsApp(req, app);
    return app;
  }

  private getApiBaseUrl(req: Request): string {
    const base = tryGetApiBaseUrl(req);
    if (!base) {
      throw new ApiError(400, 'Unable to resolve request host');
    }
    return base;
  }

  publish = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }
      await this.loadAppOrThrow(appId, req);
      const body = (req.body || {}) as PublishPwaRequest;
      const data = await this.publishService.publish(appId, body, this.getApiBaseUrl(req));
      res.json({
        success: true,
        message: 'PWA published successfully',
        data
      });
    } catch (error) {
      this.handleError(res, error, 'publish PWA');
    }
  };

  status = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }
      await this.loadAppOrThrow(appId, req);
      const data = await this.publishService.getStatus(appId);
      res.json({ success: true, data });
    } catch (error) {
      this.handleError(res, error, 'get PWA publish status');
    }
  };

  diagnostics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }
      await this.loadAppOrThrow(appId, req);
      const status = await this.publishService.getStatus(appId);
      const baseUrl = this.getApiBaseUrl(req);
      const manifestUrl = `${baseUrl}/api/v1/apps/${appId}/pwa/manifest.webmanifest`;
      const serviceWorkerUrl = `${baseUrl}/api/v1/apps/${appId}/pwa/sw.js`;
      const servedOverHttps = /^https:\/\//i.test(baseUrl);

      res.json({
        success: true,
        data: {
          appId,
          checks: {
            servedOverHttps,
            manifestReady: status.manifestReady,
            serviceWorkerReady: status.serviceWorkerReady,
            iconsReady: status.iconsReady,
            customDomainReady: status.customDomainReady
          },
          isInstallableCandidate:
            servedOverHttps &&
            status.manifestReady &&
            status.serviceWorkerReady &&
            status.iconsReady,
          artifactUrls: {
            manifestUrl,
            serviceWorkerUrl
          },
          warnings: status.warnings,
          errors: status.errors
        }
      });
    } catch (error) {
      this.handleError(res, error, 'get PWA diagnostics');
    }
  };

  manifest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }
      await this.loadAppOrThrow(appId, req);
      const manifest = await this.publishService.getPublishedManifest(appId);
      res.setHeader('Content-Type', 'application/manifest+json');
      res.json(manifest);
    } catch (error) {
      this.handleError(res, error, 'get PWA manifest');
    }
  };

  serviceWorker = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }
      await this.loadAppOrThrow(appId, req);
      const { script, publish } = await this.publishService.getPublishedServiceWorker(appId);
      res.setHeader('Content-Type', 'application/javascript');
      // Keep SW fresh while still allowing conditional requests via ETag.
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.setHeader('ETag', publish.serviceWorkerMeta.hash);
      res.setHeader('Service-Worker-Allowed', '/');
      res.send(script);
    } catch (error) {
      this.handleError(res, error, 'get PWA service worker');
    }
  };

  private handleError(res: Response, error: unknown, context: string): void {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        ...(error.details ? { details: error.details } : {})
      });
      return;
    }
    console.error(`Error in ${context}:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

