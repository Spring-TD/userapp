import { AppConfigurationModel } from '../models/appConfigurationModel';
import { AppModel } from '../models/appModel';
import {
  AppConfiguration,
  ConfigurationTemplate,
  UpdateConfigurationRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateSupportComponentRequest,
  UpdateSupportComponentRequest,
  ReorderComponentsRequest
} from '../types/appConfiguration';
import { ApiError } from '../middleware/errorHandler';
import {
  validateConfigurationUpdate,
  validateSupportComponent,
  validateTemplateName,
  ConfigurationValidationError
} from '../utils/configurationValidation';

export class AppConfigurationService {
  /**
   * Get active configuration for an app
   */
  async getAppConfiguration(appId: string): Promise<AppConfiguration> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    // Verify app exists
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    const config = await AppConfigurationModel.getConfigurationByAppId(appId);
    if (!config) {
      // Create default configuration if none exists
      return await this.createDefaultConfiguration(appId);
    }

    return config;
  }

  /**
   * Create default configuration for an app
   */
  async createDefaultConfiguration(appId: string): Promise<AppConfiguration> {
    const defaultConfig = await AppConfigurationModel.createConfiguration(appId, {});
    
    // Update app with configuration ID reference
    try {
      await AppModel.updateApp(appId, {
        activeConfigurationId: defaultConfig.id
      });
    } catch (error) {
      console.error('Failed to update app with configuration ID:', error);
    }
    
    return defaultConfig;
  }

  /**
   * Update app configuration
   */
  async updateAppConfiguration(appId: string, updateData: UpdateConfigurationRequest): Promise<AppConfiguration> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    // Verify app exists
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    // Validate configuration
    try {
      validateConfigurationUpdate(updateData);
    } catch (error) {
      if (error instanceof ConfigurationValidationError) {
        throw new ApiError(400, error.message);
      }
      throw error;
    }

    // Get or create configuration
    let config = await AppConfigurationModel.getConfigurationByAppId(appId);
    if (!config) {
      config = await this.createDefaultConfiguration(appId);
    }

    // Update configuration
    const updatedConfig = await AppConfigurationModel.updateConfiguration(config.id, updateData);
    if (!updatedConfig) {
      throw new ApiError(500, 'Failed to update configuration');
    }

    // Ensure app has reference to active configuration
    if (app && app.activeConfigurationId !== updatedConfig.id) {
      await AppModel.updateApp(appId, {
        activeConfigurationId: updatedConfig.id
      });
    }

    return updatedConfig;
  }

  /**
   * Update publishing status
   */
  async updatePublishingStatus(appId: string, isPublished: boolean): Promise<AppConfiguration> {
    const config = await this.updateAppConfiguration(appId, {
      publishing: { isPublished }
    });

    // If publishing, set publishedAt timestamp
    if (isPublished && !config.publishing.publishedAt) {
      const updatedConfig = await AppConfigurationModel.updateConfiguration(config.id, {
        publishing: { 
          isPublished: true,
          publishedAt: new Date().toISOString()
        }
      });
      return updatedConfig || config;
    }

    return config;
  }

  /**
   * Get configurations formatted for publish UI
   * Returns unpublished and previous (published) versions
   */
  async getConfigurationsForPublish(appId: string): Promise<{
    unpublished: AppConfiguration[];
    previous: AppConfiguration[];
  }> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    // Verify app exists
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    const allConfigs = await AppConfigurationModel.getAllConfigurationsByAppId(appId);
    
    // Separate unpublished and published configurations
    const unpublished = allConfigs.filter(c => !c.publishing.isPublished);
    const previous = allConfigs
      .filter(c => c.publishing.isPublished)
      .sort((a, b) => {
        // Sort by publishedAt or updatedAt, most recent first
        const dateA = a.publishing.publishedAt || a.updatedAt;
        const dateB = b.publishing.publishedAt || b.updatedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

    return { unpublished, previous };
  }

  /**
   * Create configuration template
   */
  async createTemplate(appId: string, templateData: CreateTemplateRequest): Promise<ConfigurationTemplate> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!validateTemplateName(templateData.name)) {
      throw new ApiError(400, 'Template name must be between 2 and 100 characters');
    }

    // Verify app exists
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    // Get current configuration
    const config = await this.getAppConfiguration(appId);

    // Check if template name already exists for this app
    const existingTemplates = await AppConfigurationModel.getTemplatesByAppId(appId);
    if (existingTemplates.some(t => t.name === templateData.name)) {
      throw new ApiError(400, 'Template name already exists for this app');
    }

    const template = await AppConfigurationModel.createTemplate(appId, templateData, config);
    return template;
  }

  /**
   * Get all templates for an app
   */
  async getTemplates(appId: string): Promise<ConfigurationTemplate[]> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    // Verify app exists
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    return await AppConfigurationModel.getTemplatesByAppId(appId);
  }

  /**
   * Get template by ID
   */
  async getTemplate(appId: string, templateId: string): Promise<ConfigurationTemplate> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!templateId) {
      throw new ApiError(400, 'Template ID is required');
    }

    // Verify app exists
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    const template = await AppConfigurationModel.getTemplateById(templateId);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    if (template.appId !== appId) {
      throw new ApiError(403, 'Template does not belong to this app');
    }

    return template;
  }

  /**
   * Apply template to app
   */
  async applyTemplate(appId: string, templateId: string): Promise<AppConfiguration> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!templateId) {
      throw new ApiError(400, 'Template ID is required');
    }

    // Get template
    const template = await this.getTemplate(appId, templateId);

    // Apply template configuration
    const updatedConfig = await this.updateAppConfiguration(appId, {
      publishing: template.configuration.publishing,
      appElements: template.configuration.appElements,
      onboarding: template.configuration.onboarding,
      support: template.configuration.support,
      policy: template.configuration.policy
    });

    // Update app with configuration ID reference
    try {
      await AppModel.updateApp(appId, {
        activeConfigurationId: updatedConfig.id
      });
    } catch (error) {
      console.error('Failed to update app with configuration ID:', error);
    }

    return updatedConfig;
  }

  /**
   * Update template
   */
  async updateTemplate(appId: string, templateId: string, updateData: UpdateTemplateRequest): Promise<ConfigurationTemplate> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!templateId) {
      throw new ApiError(400, 'Template ID is required');
    }

    // Verify template exists and belongs to app
    await this.getTemplate(appId, templateId);

    // Validate template name if provided
    if (updateData.name && !validateTemplateName(updateData.name)) {
      throw new ApiError(400, 'Template name must be between 2 and 100 characters');
    }

    // Check name uniqueness if name is being updated
    if (updateData.name) {
      const existingTemplates = await AppConfigurationModel.getTemplatesByAppId(appId);
      if (existingTemplates.some(t => t.name === updateData.name && t.id !== templateId)) {
        throw new ApiError(400, 'Template name already exists for this app');
      }
    }

    // If updating configuration, validate it
    if (updateData.configuration) {
      try {
        validateConfigurationUpdate(updateData.configuration);
      } catch (error) {
        if (error instanceof ConfigurationValidationError) {
          throw new ApiError(400, error.message);
        }
        throw error;
      }
    }

    const updatedTemplate = await AppConfigurationModel.updateTemplate(templateId, updateData);
    if (!updatedTemplate) {
      throw new ApiError(500, 'Failed to update template');
    }

    return updatedTemplate;
  }

  /**
   * Delete template
   */
  async deleteTemplate(appId: string, templateId: string): Promise<boolean> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!templateId) {
      throw new ApiError(400, 'Template ID is required');
    }

    // Verify template exists and belongs to app
    await this.getTemplate(appId, templateId);

    const deleted = await AppConfigurationModel.deleteTemplate(templateId);
    if (!deleted) {
      throw new ApiError(500, 'Failed to delete template');
    }

    return true;
  }

  /**
   * Set default template
   */
  async setDefaultTemplate(appId: string, templateId: string): Promise<ConfigurationTemplate> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!templateId) {
      throw new ApiError(400, 'Template ID is required');
    }

    // Verify template exists and belongs to app
    await this.getTemplate(appId, templateId);

    const updatedTemplate = await AppConfigurationModel.updateTemplate(templateId, { isDefault: true });
    if (!updatedTemplate) {
      throw new ApiError(500, 'Failed to set default template');
    }

    return updatedTemplate;
  }

  /**
   * Add support component
   */
  async addSupportComponent(appId: string, componentData: CreateSupportComponentRequest): Promise<any> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    // Validate component
    try {
      validateSupportComponent(componentData);
    } catch (error) {
      if (error instanceof ConfigurationValidationError) {
        throw new ApiError(400, error.message);
      }
      throw error;
    }

    // Get configuration
    const config = await this.getAppConfiguration(appId);

    // Generate component ID
    const componentId = this.generateId();

    // Determine order if not provided
    const order = componentData.order !== undefined 
      ? componentData.order 
      : config.support.components.length + 1;

    const component = {
      id: componentId,
      name: componentData.name,
      type: componentData.type,
      content: componentData.content,
      color: componentData.color,
      order
    };

    await AppConfigurationModel.addSupportComponent(appId, component);
    return component;
  }

  /**
   * Update support component
   */
  async updateSupportComponent(appId: string, componentId: string, updateData: UpdateSupportComponentRequest): Promise<any> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!componentId) {
      throw new ApiError(400, 'Component ID is required');
    }

    // Get configuration
    const config = await this.getAppConfiguration(appId);
    const component = config.support.components.find(c => c.id === componentId);
    if (!component) {
      throw new ApiError(404, 'Support component not found');
    }

    // Validate if creating new component data
    if (updateData.name || updateData.type || updateData.content) {
      const componentToValidate: CreateSupportComponentRequest = {
        name: updateData.name || component.name,
        type: updateData.type || component.type,
        content: updateData.content || component.content,
        color: updateData.color || component.color,
        order: updateData.order !== undefined ? updateData.order : component.order
      };

      try {
        validateSupportComponent(componentToValidate);
      } catch (error) {
        if (error instanceof ConfigurationValidationError) {
          throw new ApiError(400, error.message);
        }
        throw error;
      }
    }

    const updatedComponent = await AppConfigurationModel.updateSupportComponent(appId, componentId, updateData);
    if (!updatedComponent) {
      throw new ApiError(500, 'Failed to update support component');
    }

    return updatedComponent;
  }

  /**
   * Delete support component
   */
  async deleteSupportComponent(appId: string, componentId: string): Promise<boolean> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!componentId) {
      throw new ApiError(400, 'Component ID is required');
    }

    // Get configuration to verify component exists
    const config = await this.getAppConfiguration(appId);
    const component = config.support.components.find(c => c.id === componentId);
    if (!component) {
      throw new ApiError(404, 'Support component not found');
    }

    const deleted = await AppConfigurationModel.deleteSupportComponent(appId, componentId);
    if (!deleted) {
      throw new ApiError(500, 'Failed to delete support component');
    }

    return true;
  }

  /**
   * Reorder support components
   */
  async reorderSupportComponents(appId: string, reorderData: ReorderComponentsRequest): Promise<boolean> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!reorderData.componentIds || !Array.isArray(reorderData.componentIds)) {
      throw new ApiError(400, 'Component IDs array is required');
    }

    const reordered = await AppConfigurationModel.reorderSupportComponents(appId, reorderData.componentIds);
    if (!reordered) {
      throw new ApiError(400, 'Failed to reorder components. Ensure all component IDs are valid.');
    }

    return true;
  }

  /**
   * Get all configurations for an app (active and inactive)
   */
  async getAllConfigurations(appId: string): Promise<AppConfiguration[]> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    // Verify app exists
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    return await AppConfigurationModel.getAllConfigurationsByAppId(appId);
  }

  /**
   * Activate a specific configuration for an app
   */
  async activateConfiguration(appId: string, configurationId: string): Promise<AppConfiguration> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    if (!configurationId) {
      throw new ApiError(400, 'Configuration ID is required');
    }

    // Verify app exists
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    // Activate the configuration
    const activatedConfig = await AppConfigurationModel.activateConfiguration(appId, configurationId);
    if (!activatedConfig) {
      throw new ApiError(404, 'Configuration not found or does not belong to this app');
    }

    // Update app with active configuration ID reference
    try {
      await AppModel.updateApp(appId, {
        activeConfigurationId: activatedConfig.id
      });
    } catch (error) {
      console.error('Failed to update app with configuration ID:', error);
    }

    return activatedConfig;
  }

  /**
   * Create a new configuration for an app
   */
  async createConfiguration(
    appId: string,
    config: Partial<AppConfiguration>,
    options?: { skipAutoDeactivate?: boolean; isActive?: boolean }
  ): Promise<AppConfiguration> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    // Verify app exists
    const app = await AppModel.getAppById(appId);
    if (!app) {
      throw new ApiError(404, 'App not found');
    }

    // Validate configuration if provided
    if (config.publishing || config.appElements || config.appProfile || 
        config.onboarding || config.support || config.policy) {
      try {
        validateConfigurationUpdate({
          publishing: config.publishing,
          appElements: config.appElements,
          appProfile: config.appProfile,
          onboarding: config.onboarding,
          support: config.support,
          policy: config.policy
        });
      } catch (error) {
        if (error instanceof ConfigurationValidationError) {
          throw new ApiError(400, error.message);
        }
        throw error;
      }
    }

    // Create the configuration
    const newConfig = await AppConfigurationModel.createConfiguration(appId, config, options);

    // Update app with active configuration ID reference if this is the active one
    if (newConfig.isActive) {
      try {
        await AppModel.updateApp(appId, {
          activeConfigurationId: newConfig.id
        });
      } catch (error) {
        console.error('Failed to update app with configuration ID:', error);
      }
    }

    return newConfig;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

