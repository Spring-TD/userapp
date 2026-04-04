import { Request, Response } from 'express';
import { AppService } from '../services/appService';
import { AppPwaTemplateService } from '../services/appPwaTemplateService';
import {
  CreateAppPwaTemplateRequest,
  UpdateAppPwaTemplateRequest
} from '../types/pwaTemplate';
import { ApiError } from '../middleware/errorHandler';
import { App } from '../types/app';

declare const console: any;

export class AppPwaTemplateController {
  constructor(
    private readonly appService: AppService,
    private readonly templateService: AppPwaTemplateService
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

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }
      await this.loadAppOrThrow(appId, req);
      const templates = await this.templateService.list(appId);
      res.json({ success: true, data: templates });
    } catch (error) {
      this.handleError(res, error, 'list PWA templates');
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, templateId } = req.params;
      if (!appId || !templateId) {
        throw new ApiError(400, 'App ID and template ID are required');
      }
      await this.loadAppOrThrow(appId, req);
      const template = await this.templateService.getById(templateId, appId);
      if (!template) {
        throw new ApiError(404, 'Template not found');
      }
      res.json({ success: true, data: template });
    } catch (error) {
      this.handleError(res, error, 'get PWA template');
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }
      await this.loadAppOrThrow(appId, req);
      const body = req.body as CreateAppPwaTemplateRequest;
      const template = await this.templateService.create(appId, body);
      res.status(201).json({
        success: true,
        message: 'PWA template created',
        data: template
      });
    } catch (error) {
      this.handleError(res, error, 'create PWA template');
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, templateId } = req.params;
      if (!appId || !templateId) {
        throw new ApiError(400, 'App ID and template ID are required');
      }
      await this.loadAppOrThrow(appId, req);
      const body = req.body as UpdateAppPwaTemplateRequest;
      const template = await this.templateService.update(templateId, appId, body);
      if (!template) {
        throw new ApiError(404, 'Template not found');
      }
      res.json({
        success: true,
        message: 'PWA template updated',
        data: template
      });
    } catch (error) {
      this.handleError(res, error, 'update PWA template');
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, templateId } = req.params;
      if (!appId || !templateId) {
        throw new ApiError(400, 'App ID and template ID are required');
      }
      await this.loadAppOrThrow(appId, req);
      const deleted = await this.templateService.delete(templateId, appId);
      if (!deleted) {
        throw new ApiError(404, 'Template not found');
      }
      res.json({ success: true, message: 'PWA template deleted' });
    } catch (error) {
      this.handleError(res, error, 'delete PWA template');
    }
  };

  apply = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, templateId } = req.params;
      if (!appId || !templateId) {
        throw new ApiError(400, 'App ID and template ID are required');
      }
      await this.loadAppOrThrow(appId, req);
      const template = await this.templateService.apply(templateId, appId);
      if (!template) {
        throw new ApiError(404, 'Template not found');
      }
      res.json({
        success: true,
        message: 'PWA template applied for this app',
        data: template
      });
    } catch (error) {
      this.handleError(res, error, 'apply PWA template');
    }
  };

  uploadAssetLogo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, templateId } = req.params;
      if (!appId || !templateId) {
        throw new ApiError(400, 'App ID and template ID are required');
      }
      await this.loadAppOrThrow(appId, req);
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file?.buffer) {
        throw new ApiError(400, 'Image file is required (multipart field name: file)');
      }
      const template = await this.templateService.uploadPwaAssetImage(
        appId,
        templateId,
        'logo',
        file.buffer,
        file.mimetype
      );
      res.json({
        success: true,
        message: 'Logo uploaded to Spaces and saved on the template',
        data: template
      });
    } catch (error) {
      this.handleError(res, error, 'upload PWA logo');
    }
  };

  uploadAssetSplash = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, templateId } = req.params;
      if (!appId || !templateId) {
        throw new ApiError(400, 'App ID and template ID are required');
      }
      await this.loadAppOrThrow(appId, req);
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file?.buffer) {
        throw new ApiError(400, 'Image file is required (multipart field name: file)');
      }
      const template = await this.templateService.uploadPwaAssetImage(
        appId,
        templateId,
        'splash',
        file.buffer,
        file.mimetype
      );
      res.json({
        success: true,
        message: 'Splash image uploaded to Spaces and saved on the template',
        data: template
      });
    } catch (error) {
      this.handleError(res, error, 'upload PWA splash image');
    }
  };

  uploadOnboardingScreenImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, templateId, screenIndex: screenIndexParam } = req.params;
      if (!appId || !templateId || screenIndexParam === undefined) {
        throw new ApiError(400, 'App ID, template ID, and screen index are required');
      }
      const screenIndex = parseInt(screenIndexParam, 10);
      if (Number.isNaN(screenIndex) || screenIndex < 0) {
        throw new ApiError(400, 'screenIndex must be a non-negative integer');
      }
      await this.loadAppOrThrow(appId, req);
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file?.buffer) {
        throw new ApiError(400, 'Image file is required (multipart field name: file)');
      }
      const template = await this.templateService.uploadOnboardingScreenImage(
        appId,
        templateId,
        screenIndex,
        file.buffer,
        file.mimetype
      );
      res.json({
        success: true,
        message: 'Onboarding screen image uploaded to Spaces and saved on the template',
        data: template
      });
    } catch (error) {
      this.handleError(res, error, 'upload onboarding screen image');
    }
  };

  private handleError(res: Response, error: unknown, context: string): void {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
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
