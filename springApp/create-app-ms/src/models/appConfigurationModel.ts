import mongoose from 'mongoose';
import {
  AppConfiguration,
  ConfigurationTemplate,
  UpdateConfigurationRequest,
  CreateTemplateRequest,
  SupportComponent,
  UpdateVarianceSection
} from '../types/appConfiguration';
import AppConfigurationDocumentModel from '../db/AppConfigurationDocument';
import ConfigurationTemplateDocumentModel from '../db/ConfigurationTemplateDocument';
import type { IAppConfigurationDocument } from '../db/AppConfigurationDocument';
import type { IConfigurationTemplateDocument } from '../db/ConfigurationTemplateDocument';

function configDocToConfig(doc: mongoose.Document | null): AppConfiguration | null {
  if (!doc) return null;
  const o = doc.toObject() as IAppConfigurationDocument & { _id: mongoose.Types.ObjectId };
  const { _id, __v, createdAt, updatedAt, ...rest } = o;
  return {
    ...rest,
    id: _id.toString(),
    createdAt: (createdAt instanceof Date ? createdAt.toISOString() : String(createdAt)) ?? new Date().toISOString(),
    updatedAt: (updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt)) ?? new Date().toISOString()
  } as AppConfiguration;
}

function templateDocToTemplate(doc: mongoose.Document | null): ConfigurationTemplate | null {
  if (!doc) return null;
  const o = doc.toObject() as IConfigurationTemplateDocument & { _id: mongoose.Types.ObjectId };
  const { _id, __v, createdAt, updatedAt, ...rest } = o;
  return {
    ...rest,
    id: _id.toString(),
    createdAt: (createdAt instanceof Date ? createdAt.toISOString() : String(createdAt)) ?? new Date().toISOString(),
    updatedAt: (updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt)) ?? new Date().toISOString()
  } as ConfigurationTemplate;
}

function generateId(): string {
  return new mongoose.Types.ObjectId().toString();
}

function generateVersionReference(): string {
  const randomPart = Math.random().toString(36).substr(2, 6);
  return `App_update_${randomPart}`;
}

function getDefaultAppElements() {
  return {
    buttons: {
      primary: { textColor: '#ffffff', backgroundColor: '#007bff' },
      secondary: { textColor: '#ffffff', backgroundColor: '#6c757d' }
    },
    header: { backgroundColor: '#ffffff', textColor: '#000000' },
    bodyText: { backgroundColor: '#f8f9fa', textColor: '#212529' },
    form: { primaryColor: '#007bff', secondaryColor: '#6c757d' }
  };
}

function getDefaultAppProfile() {
  return {
    textColors: { primary: '#000000', secondary: '#6c757d', aux: '#E8E2D2' },
    elementColors: { primary: '#007bff', secondary: '#6c757d' },
    menuColors: { primary: '#007bff', secondary: '#6c757d', aux: '#E8E2D2' },
    auxiliaryElementColors: { primary: '#007bff', secondary: '#6c757d' },
    backgroundColors: { primary: '#ffffff', secondary: '#f8f9fa' }
  };
}

function getDefaultOnboarding() {
  const defaultSplash = {
    fontFamily: 'Arial',
    textColors: { primary: '#000000', secondary: '#6c757d' },
    backgroundColors: { primary: '#ffffff', secondary: '#f8f9fa' },
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    backgroundColor: '#ffffff',
    textColor: '#000000'
  };
  return {
    appComponent: { backgroundColor: '#ffffff', textColor: '#000000' },
    splash1: { ...defaultSplash },
    splash2: { ...defaultSplash },
    splash3: { ...defaultSplash }
  };
}

function getDefaultSupport() {
  return { components: [], socials: {} };
}

function getDefaultPolicy() {
  return { policy: { title: '', content: '' }, terms: { title: '', content: '' } };
}

function getDefaultDnsConfig() {
  return {
    customDomain: undefined,
    customDomainActive: false,
    customDomainVerified: false,
    customDomainVerifiedAt: undefined,
    dnsConfiguration: undefined
  };
}

function calculateUpdateVariance(updateData: UpdateConfigurationRequest): UpdateVarianceSection[] {
  const variance: UpdateVarianceSection[] = [];
  if (updateData.appElements) variance.push('Asset');
  if (updateData.onboarding) variance.push('Splash');
  if (updateData.appProfile) variance.push('Profile');
  if (updateData.policy) {
    variance.push('Terms');
    variance.push('Policy');
  }
  if (updateData.support) variance.push('Support');
  if (updateData.dnsConfig) variance.push('DNS');
  return variance;
}

export class AppConfigurationModel {
  static async createConfiguration(
    appId: string,
    config: Partial<AppConfiguration>,
    options?: { skipAutoDeactivate?: boolean; isActive?: boolean }
  ): Promise<AppConfiguration> {
    if (!options?.skipAutoDeactivate) {
      await AppConfigurationDocumentModel.updateMany({ appId, isActive: true }, { $set: { isActive: false } });
    }

    const doc = await AppConfigurationDocumentModel.create({
      appId,
      versionReference: config.versionReference ?? generateVersionReference(),
      publishing: config.publishing ?? { isPublished: false },
      appElements: config.appElements ?? getDefaultAppElements(),
      appProfile: config.appProfile ?? getDefaultAppProfile(),
      onboarding: config.onboarding ?? getDefaultOnboarding(),
      support: config.support ?? getDefaultSupport(),
      policy: config.policy ?? getDefaultPolicy(),
      dnsConfig: config.dnsConfig ?? getDefaultDnsConfig(),
      isActive: options?.isActive !== undefined ? options.isActive : true,
      updateVariance: config.updateVariance ?? []
    });

    return configDocToConfig(doc)!;
  }

  static async getConfigurationByAppId(appId: string): Promise<AppConfiguration | null> {
    const doc = await AppConfigurationDocumentModel.findOne({ appId, isActive: true });
    return configDocToConfig(doc);
  }

  static async getAllConfigurationsByAppId(appId: string): Promise<AppConfiguration[]> {
    const docs = await AppConfigurationDocumentModel.find({ appId }).sort({ updatedAt: -1 });
    return docs.map((d) => configDocToConfig(d)).filter((c): c is AppConfiguration => c != null);
  }

  static async getConfigurationById(id: string): Promise<AppConfiguration | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await AppConfigurationDocumentModel.findById(id);
    return configDocToConfig(doc);
  }

  static async activateConfiguration(appId: string, configurationId: string): Promise<AppConfiguration | null> {
    if (!mongoose.Types.ObjectId.isValid(configurationId)) return null;
    const config = await AppConfigurationDocumentModel.findOne({ _id: configurationId, appId });
    if (!config) return null;

    await AppConfigurationDocumentModel.updateMany({ appId }, { $set: { isActive: false } });
    const updated = await AppConfigurationDocumentModel.findByIdAndUpdate(
      configurationId,
      { $set: { isActive: true } },
      { new: true }
    );
    return configDocToConfig(updated);
  }

  static async updateConfiguration(id: string, updateData: UpdateConfigurationRequest): Promise<AppConfiguration | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const existing = await AppConfigurationDocumentModel.findById(id);
    if (!existing) return null;

    const existingObj = existing.toObject() as IAppConfigurationDocument;
    const updateVariance = calculateUpdateVariance(updateData);
    const existingVariance = existingObj.updateVariance ?? [];
    const combinedVariance = [...new Set([...existingVariance, ...updateVariance])];

    const publishingUpdate = updateData.publishing ?? {};
    const isNowPublished =
      publishingUpdate.isPublished === true ||
      (publishingUpdate.isPublished === undefined && existingObj.publishing?.isPublished);
    const publishedAt =
      isNowPublished && !existingObj.publishing?.isPublished
        ? new Date().toISOString()
        : existingObj.publishing?.publishedAt;

    const set: Record<string, unknown> = {
      updateVariance: combinedVariance,
      publishing: {
        ...existingObj.publishing,
        ...updateData.publishing,
        publishedAt: publishedAt ?? existingObj.publishing?.publishedAt
      },
      appElements: { ...existingObj.appElements, ...updateData.appElements },
      appProfile: updateData.appProfile
        ? { ...(existingObj.appProfile ?? getDefaultAppProfile()), ...updateData.appProfile }
        : existingObj.appProfile,
      onboarding: { ...existingObj.onboarding, ...updateData.onboarding },
      support: { ...existingObj.support, ...updateData.support },
      policy: { ...existingObj.policy, ...updateData.policy },
      dnsConfig: updateData.dnsConfig
        ? { ...(existingObj.dnsConfig ?? getDefaultDnsConfig()), ...updateData.dnsConfig }
        : existingObj.dnsConfig
    };

    const doc = await AppConfigurationDocumentModel.findByIdAndUpdate(id, { $set: set }, { new: true });
    return configDocToConfig(doc);
  }

  static async deleteConfiguration(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await AppConfigurationDocumentModel.findByIdAndDelete(id);
    return !!result;
  }

  // Template Methods
  static async createTemplate(
    appId: string,
    templateData: CreateTemplateRequest,
    configuration: AppConfiguration
  ): Promise<ConfigurationTemplate> {
    if (templateData.isDefault) {
      await ConfigurationTemplateDocumentModel.updateMany({ appId }, { $set: { isDefault: false } });
    }

    const doc = await ConfigurationTemplateDocumentModel.create({
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
      isDefault: templateData.isDefault ?? false
    });

    return templateDocToTemplate(doc)!;
  }

  static async getTemplatesByAppId(appId: string): Promise<ConfigurationTemplate[]> {
    const docs = await ConfigurationTemplateDocumentModel.find({ appId });
    return docs.map((d) => templateDocToTemplate(d)).filter((t): t is ConfigurationTemplate => t != null);
  }

  static async getTemplateById(id: string): Promise<ConfigurationTemplate | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await ConfigurationTemplateDocumentModel.findById(id);
    return templateDocToTemplate(doc);
  }

  static async updateTemplate(id: string, updateData: Partial<ConfigurationTemplate>): Promise<ConfigurationTemplate | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    if (updateData.isDefault === true) {
      const t = await ConfigurationTemplateDocumentModel.findById(id);
      if (t) await ConfigurationTemplateDocumentModel.updateMany({ appId: (t as unknown as { appId: string }).appId }, { $set: { isDefault: false } });
    }
    const { id: _omitId, ...safe } = updateData as Partial<ConfigurationTemplate> & { id?: string };
    const doc = await ConfigurationTemplateDocumentModel.findByIdAndUpdate(id, { $set: safe }, { new: true });
    return templateDocToTemplate(doc);
  }

  static async deleteTemplate(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await ConfigurationTemplateDocumentModel.findByIdAndDelete(id);
    return !!result;
  }

  static async getDefaultTemplate(appId: string): Promise<ConfigurationTemplate | null> {
    const doc = await ConfigurationTemplateDocumentModel.findOne({ appId, isDefault: true });
    return templateDocToTemplate(doc);
  }

  // Support Component Methods
  static async addSupportComponent(appId: string, component: SupportComponent): Promise<SupportComponent> {
    const config = await this.getConfigurationByAppId(appId);
    if (!config) throw new Error('Configuration not found for app');
    const activeDoc = await AppConfigurationDocumentModel.findOne({ appId, isActive: true });
    if (!activeDoc) throw new Error('Configuration not found for app');
    const support = activeDoc.toObject().support ?? { components: [], socials: {} };
    support.components = support.components ?? [];
    support.components.push(component);
    await AppConfigurationDocumentModel.findByIdAndUpdate(activeDoc._id, { $set: { support } });
    return component;
  }

  static async updateSupportComponent(appId: string, componentId: string, updateData: Partial<SupportComponent>): Promise<SupportComponent | null> {
    const config = await this.getConfigurationByAppId(appId);
    if (!config) return null;
    const idx = config.support.components.findIndex((c) => c.id === componentId);
    if (idx === -1) return null;
    const updated = { ...config.support.components[idx], ...updateData };
    config.support.components[idx] = updated;
    const activeDoc = await AppConfigurationDocumentModel.findOne({ appId, isActive: true });
    if (!activeDoc) return null;
    await AppConfigurationDocumentModel.findByIdAndUpdate(activeDoc._id, { $set: { support: config.support } });
    return updated;
  }

  static async deleteSupportComponent(appId: string, componentId: string): Promise<boolean> {
    const config = await this.getConfigurationByAppId(appId);
    if (!config) return false;
    const idx = config.support.components.findIndex((c) => c.id === componentId);
    if (idx === -1) return false;
    config.support.components.splice(idx, 1);
    const activeDoc = await AppConfigurationDocumentModel.findOne({ appId, isActive: true });
    if (!activeDoc) return false;
    await AppConfigurationDocumentModel.findByIdAndUpdate(activeDoc._id, { $set: { support: config.support } });
    return true;
  }

  static async reorderSupportComponents(appId: string, componentIds: string[]): Promise<boolean> {
    const config = await this.getConfigurationByAppId(appId);
    if (!config) return false;
    const existingIds = config.support.components.map((c) => c.id);
    if (!componentIds.every((id) => existingIds.includes(id)) || componentIds.length !== existingIds.length) return false;
    const reordered = componentIds.map((id, index) => {
      const c = config.support.components.find((x) => x.id === id);
      if (!c) throw new Error(`Component ${id} not found`);
      return { ...c, order: index + 1 };
    });
    config.support.components = reordered;
    const activeDoc = await AppConfigurationDocumentModel.findOne({ appId, isActive: true });
    if (!activeDoc) return false;
    await AppConfigurationDocumentModel.findByIdAndUpdate(activeDoc._id, { $set: { support: config.support } });
    return true;
  }
}
