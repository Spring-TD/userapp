import { Request, Response } from 'express';
import { AppConfigurationService } from '../services/appConfigurationService';
import {
  UpdateConfigurationRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateSupportComponentRequest,
  UpdateSupportComponentRequest,
  ReorderComponentsRequest
} from '../types/appConfiguration';
import { ApiError } from '../middleware/errorHandler';

interface TypedRequest<T> extends Request {
  body: T;
}

export class AppConfigurationController {
  private configService: AppConfigurationService;

  constructor() {
    this.configService = new AppConfigurationService();
  }

  /**
   * Get app configuration
   * GET /api/v1/apps/:id/configuration
   */
  getConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const config = await this.configService.getAppConfiguration(id);

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update app configuration
   * PUT /api/v1/apps/:id/configuration
   */
  updateConfiguration = async (req: TypedRequest<UpdateConfigurationRequest>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const config = await this.configService.updateAppConfiguration(id, updateData);

      res.json({
        success: true,
        message: 'Configuration updated successfully',
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updateConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update publishing status
   * PUT /api/v1/apps/:id/configuration/publishing
   */
  updatePublishing = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isPublished } = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (typeof isPublished !== 'boolean') {
        throw new ApiError(400, 'isPublished must be a boolean');
      }

      const config = await this.configService.updatePublishingStatus(id, isPublished);

      res.json({
        success: true,
        message: `App ${isPublished ? 'published' : 'unpublished'} successfully`,
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updatePublishing controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update app elements
   * PUT /api/v1/apps/:id/configuration/app-elements
   */
  updateAppElements = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const appElements = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const config = await this.configService.updateAppConfiguration(id, { appElements });

      res.json({
        success: true,
        message: 'App elements updated successfully',
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updateAppElements controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update app profile
   * PUT /api/v1/apps/:id/configuration/app-profile
   */
  updateAppProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const appProfile = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const config = await this.configService.updateAppConfiguration(id, { appProfile });

      res.json({
        success: true,
        message: 'App profile configuration updated successfully',
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updateAppProfile controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update onboarding
   * PUT /api/v1/apps/:id/configuration/onboarding
   */
  updateOnboarding = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const onboarding = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const config = await this.configService.updateAppConfiguration(id, { onboarding });

      res.json({
        success: true,
        message: 'Onboarding configuration updated successfully',
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updateOnboarding controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update support
   * PUT /api/v1/apps/:id/configuration/support
   */
  updateSupport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const support = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const config = await this.configService.updateAppConfiguration(id, { support });

      res.json({
        success: true,
        message: 'Support configuration updated successfully',
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updateSupport controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update policy
   * PUT /api/v1/apps/:id/configuration/policy
   */
  updatePolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const policy = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const config = await this.configService.updateAppConfiguration(id, { policy });

      res.json({
        success: true,
        message: 'Policy configuration updated successfully',
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updatePolicy controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update DNS configuration
   * PUT /api/v1/apps/:id/configuration/dns
   */
  updateDnsConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dnsConfig = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const config = await this.configService.updateDnsConfiguration(id, dnsConfig);

      res.json({
        success: true,
        message: 'DNS configuration updated successfully',
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updateDnsConfig controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Verify domain
   * POST /api/v1/apps/:id/configuration/dns/verify
   */
  verifyDomain = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const config = await this.configService.verifyDomain(id);

      res.json({
        success: true,
        message: config.dnsConfig?.customDomainVerified 
          ? 'Domain verified successfully' 
          : 'Domain verification pending. Please configure DNS records as shown.',
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in verifyDomain controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Create configuration template
   * POST /api/v1/apps/:id/configuration/templates
   */
  createTemplate = async (req: TypedRequest<CreateTemplateRequest>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const templateData = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!templateData.name) {
        throw new ApiError(400, 'Template name is required');
      }

      const template = await this.configService.createTemplate(id, templateData);

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: template
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in createTemplate controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get all templates
   * GET /api/v1/apps/:id/configuration/templates
   */
  getTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const templates = await this.configService.getTemplates(id);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getTemplates controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get template by ID
   * GET /api/v1/apps/:id/configuration/templates/:templateId
   */
  getTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, templateId } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!templateId) {
        throw new ApiError(400, 'Template ID is required');
      }

      const template = await this.configService.getTemplate(id, templateId);

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getTemplate controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Apply template
   * POST /api/v1/apps/:id/configuration/templates/:templateId/apply
   */
  applyTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, templateId } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!templateId) {
        throw new ApiError(400, 'Template ID is required');
      }

      const config = await this.configService.applyTemplate(id, templateId);

      res.json({
        success: true,
        message: 'Template applied successfully',
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in applyTemplate controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update template
   * PUT /api/v1/apps/:id/configuration/templates/:templateId
   */
  updateTemplate = async (req: TypedRequest<UpdateTemplateRequest>, res: Response): Promise<void> => {
    try {
      const { id, templateId } = req.params;
      const updateData = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!templateId) {
        throw new ApiError(400, 'Template ID is required');
      }

      const template = await this.configService.updateTemplate(id, templateId, updateData);

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: template
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updateTemplate controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Delete template
   * DELETE /api/v1/apps/:id/configuration/templates/:templateId
   */
  deleteTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, templateId } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!templateId) {
        throw new ApiError(400, 'Template ID is required');
      }

      await this.configService.deleteTemplate(id, templateId);

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in deleteTemplate controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Set default template
   * PUT /api/v1/apps/:id/configuration/templates/:templateId/set-default
   */
  setDefaultTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, templateId } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!templateId) {
        throw new ApiError(400, 'Template ID is required');
      }

      const template = await this.configService.setDefaultTemplate(id, templateId);

      res.json({
        success: true,
        message: 'Default template set successfully',
        data: template
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in setDefaultTemplate controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Add support component
   * POST /api/v1/apps/:id/configuration/support/components
   */
  addSupportComponent = async (req: TypedRequest<CreateSupportComponentRequest>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const componentData = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const component = await this.configService.addSupportComponent(id, componentData);

      res.status(201).json({
        success: true,
        message: 'Support component added successfully',
        data: component
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in addSupportComponent controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update support component
   * PUT /api/v1/apps/:id/configuration/support/components/:componentId
   */
  updateSupportComponent = async (req: TypedRequest<UpdateSupportComponentRequest>, res: Response): Promise<void> => {
    try {
      const { id, componentId } = req.params;
      const updateData = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!componentId) {
        throw new ApiError(400, 'Component ID is required');
      }

      const component = await this.configService.updateSupportComponent(id, componentId, updateData);

      res.json({
        success: true,
        message: 'Support component updated successfully',
        data: component
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updateSupportComponent controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Delete support component
   * DELETE /api/v1/apps/:id/configuration/support/components/:componentId
   */
  deleteSupportComponent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, componentId } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!componentId) {
        throw new ApiError(400, 'Component ID is required');
      }

      await this.configService.deleteSupportComponent(id, componentId);

      res.json({
        success: true,
        message: 'Support component deleted successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in deleteSupportComponent controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Reorder support components
   * PUT /api/v1/apps/:id/configuration/support/components/reorder
   */
  reorderSupportComponents = async (req: TypedRequest<ReorderComponentsRequest>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const reorderData = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      await this.configService.reorderSupportComponents(id, reorderData);

      res.json({
        success: true,
        message: 'Support components reordered successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in reorderSupportComponents controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get all configurations for an app
   * GET /api/v1/apps/:id/configuration/all
   */
  getAllConfigurations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const configurations = await this.configService.getAllConfigurations(id);

      res.json({
        success: true,
        data: configurations
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getAllConfigurations controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Activate a specific configuration
   * PUT /api/v1/apps/:id/configuration/:configurationId/activate
   */
  activateConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, configurationId } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!configurationId) {
        throw new ApiError(400, 'Configuration ID is required');
      }

      const config = await this.configService.activateConfiguration(id, configurationId);

      res.json({
        success: true,
        message: 'Configuration activated successfully',
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in activateConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Create a new configuration
   * POST /api/v1/apps/:id/configuration/create
   */
  createConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { configuration, options } = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const newConfig = await this.configService.createConfiguration(id, configuration || {}, options);

      res.status(201).json({
        success: true,
        message: 'Configuration created successfully',
        data: newConfig
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in createConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get configurations formatted for publish UI
   * GET /api/v1/apps/:id/configuration/publish
   */
  getConfigurationsForPublish = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const result = await this.configService.getConfigurationsForPublish(id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getConfigurationsForPublish controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

