import { AppService } from '../services/appService';
import { AppModel } from '../models/appModel';
import { ApiError } from '../middleware/errorHandler';

describe('AppService', () => {
  let appService: AppService;

  beforeEach(() => {
    appService = new AppService();
    // Clear the apps array before each test
    (AppModel as any).apps = [];
  });

  describe('createApp', () => {
    it('should create a new app with all required fields', async () => {
      const appData = {
        name: 'Test App',
        websiteUrl: 'https://testapp.com',
        alias: 'test-app',
        description: 'This is a test application for our platform',
        merchantId: 'merchant-123'
      };

      const app = await appService.createApp(appData);

      expect(app).toBeDefined();
      expect(app.id).toBeDefined();
      expect(app.name).toBe(appData.name);
      expect(app.websiteUrl).toBe(appData.websiteUrl);
      expect(app.alias).toBe(appData.alias);
      expect(app.description).toBe(appData.description);
      expect(app.merchantId).toBe(appData.merchantId);
      expect(app.status).toBe('draft');
      expect(app.createdAt).toBeDefined();
      expect(app.updatedAt).toBeDefined();
      expect(app.productKeys).toEqual([]);
    });

    it('should throw an error for invalid website URL', async () => {
      const appData = {
        name: 'Test App',
        websiteUrl: 'invalid-url',
        alias: 'test-app',
        description: 'This is a test application for our platform',
        merchantId: 'merchant-123'
      };

      await expect(appService.createApp(appData)).rejects.toThrow('Invalid website URL format');
    });

    it('should throw an error for missing required fields', async () => {
      const appData = {
        name: '',
        websiteUrl: 'https://testapp.com',
        alias: 'test-app',
        description: 'This is a test application for our platform',
        merchantId: 'merchant-123'
      };

      await expect(appService.createApp(appData)).rejects.toThrow('App name is required');
    });
  });

  describe('getAllApps', () => {
    it('should return all apps', async () => {
      // Create a few test apps
      const appData1 = {
        name: 'Test App 1',
        websiteUrl: 'https://testapp1.com',
        alias: 'test-app-1',
        description: 'This is the first test application',
        merchantId: 'merchant-123'
      };

      const appData2 = {
        name: 'Test App 2',
        websiteUrl: 'https://testapp2.com',
        alias: 'test-app-2',
        description: 'This is the second test application',
        merchantId: 'merchant-456'
      };

      await appService.createApp(appData1);
      await appService.createApp(appData2);

      const apps = await appService.getAllApps();

      expect(apps).toBeDefined();
      expect(apps.length).toBe(2);
      expect(apps[0].name).toBe(appData1.name);
      expect(apps[1].name).toBe(appData2.name);
    });

    it('should return an empty array when no apps exist', async () => {
      const apps = await appService.getAllApps();
      
      expect(apps).toBeDefined();
      expect(apps.length).toBe(0);
    });
  });

  describe('addProductKey', () => {
    it('should add a product key to an app', async () => {
      // First create an app
      const appData = {
        name: 'Test App',
        websiteUrl: 'https://testapp.com',
        alias: 'test-app',
        description: 'This is a test application for our platform',
        merchantId: 'merchant-123'
      };

      const app = await appService.createApp(appData);
      
      // Add a product key
      const productKey = 'product-key-123';
      const updatedApp = await appService.addProductKey(app.id, productKey);

      expect(updatedApp).toBeDefined();
      expect(updatedApp?.productKeys).toContain(productKey);
    });
  });
});