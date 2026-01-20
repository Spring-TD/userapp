import { App, CreateAppRequest } from '../types/app';

export class AppModel {
  private static apps: App[] = [];

  static async createApp(appData: CreateAppRequest): Promise<App> {
    // Ensure merchantId is provided (should be guaranteed by controller)
    if (!appData.merchantId) {
      throw new Error('Merchant ID is required');
    }

    const newApp: App = {
      id: this.generateId(),
      name: appData.name,
      websiteUrl: appData.websiteUrl,
      alias: appData.alias,
      description: appData.description,
      merchantId: appData.merchantId,
      subdomain: appData.subdomain || '', // Will be set by service layer
      customDomain: undefined,
      customDomainActive: false,
      customDomainVerified: false,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      productKeys: []
    };

    this.apps.push(newApp);
    return newApp;
  }

  static async getAppById(id: string): Promise<App | null> {
    const app = this.apps.find(a => a.id === id);
    return app || null;
  }

  static async getAppsByMerchantId(merchantId: string): Promise<App[]> {
    return this.apps.filter(a => a.merchantId === merchantId);
  }

  static async updateApp(id: string, updateData: Partial<App>): Promise<App | null> {
    const appIndex = this.apps.findIndex(a => a.id === id);
    
    if (appIndex === -1) {
      return null;
    }

    const updatedApp = {
      ...this.apps[appIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.apps[appIndex] = updatedApp as App;
    return updatedApp as App;
  }

  static async deleteApp(id: string): Promise<boolean> {
    const appIndex = this.apps.findIndex(a => a.id === id);
    
    if (appIndex === -1) {
      return false;
    }

    this.apps.splice(appIndex, 1);
    return true;
  }

  static async getAllApps(): Promise<App[]> {
    return this.apps;
  }

  static async getAppBySubdomain(subdomain: string): Promise<App | null> {
    if (!subdomain) {
      return null;
    }
    const app = this.apps.find(a => a.subdomain === subdomain);
    return app || null;
  }

  static async getAllSubdomains(): Promise<string[]> {
    return this.apps
      .map(app => app.subdomain)
      .filter(subdomain => subdomain && subdomain.length > 0);
  }

  static async getAppByCustomDomain(domain: string): Promise<App | null> {
    if (!domain) {
      return null;
    }
    // Normalize domain for comparison
    const normalizedDomain = domain.toLowerCase().trim();
    const app = this.apps.find(a => 
      a.customDomain && a.customDomain.toLowerCase().trim() === normalizedDomain
    );
    return app || null;
  }

  static async getAllCustomDomains(): Promise<string[]> {
    return this.apps
      .map(app => app.customDomain)
      .filter(domain => domain && domain.length > 0) as string[];
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}