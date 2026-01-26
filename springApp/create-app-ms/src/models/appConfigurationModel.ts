import {
  AppConfiguration,
  ConfigurationTemplate,
  UpdateConfigurationRequest,
  CreateTemplateRequest,
  SupportComponent,
  UpdateVarianceSection
} from '../types/appConfiguration';

export class AppConfigurationModel {
  private static configurations: AppConfiguration[] = [];
  private static templates: ConfigurationTemplate[] = [];

  // Configuration Methods
  static async createConfiguration(
    appId: string, 
    config: Partial<AppConfiguration>,
    options?: { skipAutoDeactivate?: boolean; isActive?: boolean }
  ): Promise<AppConfiguration> {
    const newConfig: AppConfiguration = {
      id: this.generateId(),
      appId,
      versionReference: config.versionReference || this.generateVersionReference(),
      publishing: config.publishing || { isPublished: false },
      appElements: config.appElements || this.getDefaultAppElements(),
      appProfile: config.appProfile || this.getDefaultAppProfile(),
      onboarding: config.onboarding || this.getDefaultOnboarding(),
      support: config.support || this.getDefaultSupport(),
      policy: config.policy || this.getDefaultPolicy(),
      dnsConfig: config.dnsConfig || this.getDefaultDnsConfig(),
      isActive: options?.isActive !== undefined ? options.isActive : true,
      updateVariance: config.updateVariance || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Deactivate other configurations for this app (unless skipAutoDeactivate is true)
    if (!options?.skipAutoDeactivate) {
      this.configurations.forEach(c => {
        if (c.appId === appId && c.isActive) {
          c.isActive = false;
        }
      });
    }

    this.configurations.push(newConfig);
    return newConfig;
  }

  static async getConfigurationByAppId(appId: string): Promise<AppConfiguration | null> {
    const config = this.configurations.find(c => c.appId === appId && c.isActive);
    return config || null;
  }

  static async getAllConfigurationsByAppId(appId: string): Promise<AppConfiguration[]> {
    return this.configurations.filter(c => c.appId === appId);
  }

  static async getConfigurationById(id: string): Promise<AppConfiguration | null> {
    const config = this.configurations.find(c => c.id === id);
    return config || null;
  }

  static async activateConfiguration(appId: string, configurationId: string): Promise<AppConfiguration | null> {
    // Verify the configuration exists and belongs to the app
    const config = this.configurations.find(c => c.id === configurationId && c.appId === appId);
    if (!config) {
      return null;
    }

    // Deactivate all other configurations for this app
    this.configurations.forEach(c => {
      if (c.appId === appId && c.id !== configurationId && c.isActive) {
        c.isActive = false;
        c.updatedAt = new Date().toISOString();
      }
    });

    // Activate the specified configuration
    config.isActive = true;
    config.updatedAt = new Date().toISOString();

    return config;
  }

  static async updateConfiguration(id: string, updateData: UpdateConfigurationRequest): Promise<AppConfiguration | null> {
    const configIndex = this.configurations.findIndex(c => c.id === id);
    
    if (configIndex === -1) {
      return null;
    }

    const existingConfig = this.configurations[configIndex];
    
    // Calculate update variance from the update data
    const updateVariance = this.calculateUpdateVariance(updateData);
    const existingVariance = existingConfig.updateVariance || [];
    const combinedVariance = [...new Set([...existingVariance, ...updateVariance])];

    // Update publishedAt if publishing status changes to true
    const publishingUpdate = updateData.publishing || {};
    const isNowPublished = publishingUpdate.isPublished === true || 
      (publishingUpdate.isPublished === undefined && existingConfig.publishing.isPublished);
    const publishedAt = isNowPublished && !existingConfig.publishing.isPublished
      ? new Date().toISOString()
      : existingConfig.publishing.publishedAt;

    const updatedConfig: AppConfiguration = {
      ...existingConfig,
      publishing: { 
        ...existingConfig.publishing, 
        ...updateData.publishing,
        publishedAt: publishedAt || existingConfig.publishing.publishedAt
      },
      appElements: { ...existingConfig.appElements, ...updateData.appElements },
      appProfile: updateData.appProfile 
        ? { ...(existingConfig.appProfile || this.getDefaultAppProfile()), ...updateData.appProfile }
        : existingConfig.appProfile,
      onboarding: { ...existingConfig.onboarding, ...updateData.onboarding },
      support: { ...existingConfig.support, ...updateData.support },
      policy: { ...existingConfig.policy, ...updateData.policy },
      dnsConfig: updateData.dnsConfig
        ? { ...(existingConfig.dnsConfig || this.getDefaultDnsConfig()), ...updateData.dnsConfig }
        : existingConfig.dnsConfig,
      updateVariance: combinedVariance,
      updatedAt: new Date().toISOString()
    };

    this.configurations[configIndex] = updatedConfig;
    return updatedConfig;
  }

  /**
   * Calculate update variance from update request
   */
  private static calculateUpdateVariance(updateData: UpdateConfigurationRequest): UpdateVarianceSection[] {
    const variance: UpdateVarianceSection[] = [];

    if (updateData.appElements) {
      variance.push('Asset');
    }
    if (updateData.onboarding) {
      variance.push('Splash');
    }
    if (updateData.appProfile) {
      variance.push('Profile');
    }
    if (updateData.policy) {
      variance.push('Terms');
      variance.push('Policy');
    }
    if (updateData.support) {
      variance.push('Support');
    }
    if (updateData.dnsConfig) {
      variance.push('DNS');
    }

    return variance;
  }

  /**
   * Generate version reference (e.g., "App_update_1aa344")
   */
  private static generateVersionReference(): string {
    const randomPart = Math.random().toString(36).substr(2, 6);
    return `App_update_${randomPart}`;
  }

  static async deleteConfiguration(id: string): Promise<boolean> {
    const configIndex = this.configurations.findIndex(c => c.id === id);
    
    if (configIndex === -1) {
      return false;
    }

    this.configurations.splice(configIndex, 1);
    return true;
  }

  // Template Methods
  static async createTemplate(appId: string, templateData: CreateTemplateRequest, configuration: AppConfiguration): Promise<ConfigurationTemplate> {
    // If this is set as default, unset other defaults for this app
    if (templateData.isDefault) {
      this.templates.forEach(t => {
        if (t.appId === appId && t.isDefault) {
          t.isDefault = false;
        }
      });
    }

    const newTemplate: ConfigurationTemplate = {
      id: this.generateId(),
      appId,
      name: templateData.name,
      description: templateData.description,
      configuration: {
        publishing: configuration.publishing,
        appElements: configuration.appElements,
        appProfile: configuration.appProfile,
        onboarding: configuration.onboarding,
        support: configuration.support,
        policy: configuration.policy,
        dnsConfig: configuration.dnsConfig
      },
      isDefault: templateData.isDefault || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.templates.push(newTemplate);
    return newTemplate;
  }

  static async getTemplatesByAppId(appId: string): Promise<ConfigurationTemplate[]> {
    return this.templates.filter(t => t.appId === appId);
  }

  static async getTemplateById(id: string): Promise<ConfigurationTemplate | null> {
    const template = this.templates.find(t => t.id === id);
    return template || null;
  }

  static async updateTemplate(id: string, updateData: any): Promise<ConfigurationTemplate | null> {
    const templateIndex = this.templates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      return null;
    }

    // If setting as default, unset other defaults for this app
    if (updateData.isDefault === true) {
      const template = this.templates[templateIndex];
      this.templates.forEach(t => {
        if (t.appId === template.appId && t.id !== id && t.isDefault) {
          t.isDefault = false;
        }
      });
    }

    const updatedTemplate: ConfigurationTemplate = {
      ...this.templates[templateIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.templates[templateIndex] = updatedTemplate;
    return updatedTemplate;
  }

  static async deleteTemplate(id: string): Promise<boolean> {
    const templateIndex = this.templates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      return false;
    }

    this.templates.splice(templateIndex, 1);
    return true;
  }

  static async getDefaultTemplate(appId: string): Promise<ConfigurationTemplate | null> {
    const template = this.templates.find(t => t.appId === appId && t.isDefault);
    return template || null;
  }

  // Support Component Methods
  static async addSupportComponent(appId: string, component: SupportComponent): Promise<SupportComponent> {
    const config = await this.getConfigurationByAppId(appId);
    if (!config) {
      throw new Error('Configuration not found for app');
    }

    config.support.components.push(component);
    config.updatedAt = new Date().toISOString();
    return component;
  }

  static async updateSupportComponent(appId: string, componentId: string, updateData: Partial<SupportComponent>): Promise<SupportComponent | null> {
    const config = await this.getConfigurationByAppId(appId);
    if (!config) {
      return null;
    }

    const componentIndex = config.support.components.findIndex(c => c.id === componentId);
    if (componentIndex === -1) {
      return null;
    }

    const updatedComponent: SupportComponent = {
      ...config.support.components[componentIndex],
      ...updateData
    };

    config.support.components[componentIndex] = updatedComponent;
    config.updatedAt = new Date().toISOString();
    return updatedComponent;
  }

  static async deleteSupportComponent(appId: string, componentId: string): Promise<boolean> {
    const config = await this.getConfigurationByAppId(appId);
    if (!config) {
      return false;
    }

    const componentIndex = config.support.components.findIndex(c => c.id === componentId);
    if (componentIndex === -1) {
      return false;
    }

    config.support.components.splice(componentIndex, 1);
    config.updatedAt = new Date().toISOString();
    return true;
  }

  static async reorderSupportComponents(appId: string, componentIds: string[]): Promise<boolean> {
    const config = await this.getConfigurationByAppId(appId);
    if (!config) {
      return false;
    }

    // Validate all component IDs exist
    const existingIds = config.support.components.map(c => c.id);
    if (!componentIds.every(id => existingIds.includes(id)) || componentIds.length !== existingIds.length) {
      return false;
    }

    // Reorder components
    const reorderedComponents = componentIds.map((id, index) => {
      const component = config.support.components.find(c => c.id === id);
      if (!component) {
        throw new Error(`Component ${id} not found`);
      }
      return { ...component, order: index + 1 };
    });

    config.support.components = reorderedComponents;
    config.updatedAt = new Date().toISOString();
    return true;
  }

  // Default Configuration Helpers
  private static getDefaultAppElements() {
    return {
      buttons: {
        primary: {
          textColor: '#ffffff',
          backgroundColor: '#007bff'
        },
        secondary: {
          textColor: '#ffffff',
          backgroundColor: '#6c757d'
        }
      },
      header: {
        backgroundColor: '#ffffff',
        textColor: '#000000'
      },
      bodyText: {
        backgroundColor: '#f8f9fa',
        textColor: '#212529'
      },
      form: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d'
      }
    };
  }

  private static getDefaultAppProfile() {
    return {
      textColors: {
        primary: '#000000',
        secondary: '#6c757d',
        aux: '#E8E2D2'
      },
      elementColors: {
        primary: '#007bff',
        secondary: '#6c757d'
      },
      menuColors: {
        primary: '#007bff',
        secondary: '#6c757d',
        aux: '#E8E2D2'
      },
      auxiliaryElementColors: {
        primary: '#007bff',
        secondary: '#6c757d'
      },
      backgroundColors: {
        primary: '#ffffff',
        secondary: '#f8f9fa'
      }
    };
  }

  private static getDefaultOnboarding() {
    const defaultSplash = {
      fontFamily: 'Arial',
      textColors: {
        primary: '#000000',
        secondary: '#6c757d'
      },
      backgroundColors: {
        primary: '#ffffff',
        secondary: '#f8f9fa'
      },
      primaryColor: '#007bff', // Kept for backward compatibility
      secondaryColor: '#6c757d', // Kept for backward compatibility
      backgroundColor: '#ffffff', // Kept for backward compatibility
      textColor: '#000000' // Kept for backward compatibility
    };

    return {
      appComponent: {
        backgroundColor: '#ffffff',
        textColor: '#000000'
      },
      splash1: { ...defaultSplash },
      splash2: { ...defaultSplash },
      splash3: { ...defaultSplash }
    };
  }

  private static getDefaultSupport() {
    return {
      components: [],
      socials: {}
    };
  }

  private static getDefaultPolicy() {
    return {
      policy: {
        title: '',
        content: ''
      },
      terms: {
        title: '',
        content: ''
      }
    };
  }

  private static getDefaultDnsConfig() {
    return {
      customDomain: undefined,
      customDomainActive: false,
      customDomainVerified: false,
      customDomainVerifiedAt: undefined,
      dnsConfiguration: undefined
    };
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

