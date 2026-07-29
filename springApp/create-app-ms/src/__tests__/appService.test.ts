import { AppService } from '../services/appService';
import { AppModel } from '../models/appModel';
import type { App, AppListResult } from '../types/app';

jest.mock('../models/appModel');

const mockedAppModel = AppModel as jest.Mocked<typeof AppModel>;

describe('AppService', () => {
  let appService: AppService;

  const baseApp: App = {
    id: 'app-1',
    name: 'Test App',
    websiteUrl: 'https://testapp.com',
    alias: 'test-app',
    description: 'This is a test application for our platform',
    merchantId: 'merchant-123',
    subdomain: 'test-app',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    productKeys: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appService = new AppService();
    mockedAppModel.getAllSubdomains.mockResolvedValue([]);
  });

  describe('createApp', () => {
    it('should create a new app with all required fields', async () => {
      mockedAppModel.createApp.mockResolvedValue(baseApp);

      const appData = {
        name: 'Test App',
        websiteUrl: 'https://testapp.com',
        alias: 'test-app',
        description: 'This is a test application for our platform',
        merchantId: 'merchant-123'
      };

      const app = await appService.createApp(appData);

      expect(mockedAppModel.getAllSubdomains).toHaveBeenCalled();
      expect(mockedAppModel.createApp).toHaveBeenCalledWith(
        expect.objectContaining({
          ...appData,
          subdomain: expect.any(String)
        })
      );
      expect(app).toEqual(baseApp);
      expect(app.id).toBeDefined();
      expect(app.status).toBe('active');
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
      expect(mockedAppModel.createApp).not.toHaveBeenCalled();
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
      expect(mockedAppModel.createApp).not.toHaveBeenCalled();
    });
  });

  describe('listApps', () => {
    it('should return paginated apps from AppModel', async () => {
      const listResult: AppListResult = {
        apps: [
          { ...baseApp, id: 'app-1', name: 'Test App 1', alias: 'test-app-1' },
          {
            ...baseApp,
            id: 'app-2',
            name: 'Test App 2',
            alias: 'test-app-2',
            merchantId: 'merchant-456'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
      mockedAppModel.listApps.mockResolvedValue(listResult);

      const result = await appService.listApps({ page: 1, limit: 20 });

      expect(mockedAppModel.listApps).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toEqual(listResult);
      expect(result.apps).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should return an empty page when no apps exist', async () => {
      const emptyResult: AppListResult = {
        apps: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
      mockedAppModel.listApps.mockResolvedValue(emptyResult);

      const result = await appService.listApps();

      expect(mockedAppModel.listApps).toHaveBeenCalledWith({});
      expect(result.apps).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should forward pagination query to AppModel', async () => {
      const listResult: AppListResult = {
        apps: [baseApp],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
      mockedAppModel.listApps.mockResolvedValue(listResult);

      await appService.listApps({ page: 1, limit: 100 });

      expect(mockedAppModel.listApps).toHaveBeenCalledWith({ page: 1, limit: 100 });
    });
  });

  describe('addProductKey', () => {
    it('should add a product key to an app', async () => {
      mockedAppModel.getAppById.mockResolvedValue(baseApp);
      mockedAppModel.updateApp.mockResolvedValue({
        ...baseApp,
        productKeys: ['product-key-123']
      });

      const updatedApp = await appService.addProductKey('app-1', 'product-key-123');

      expect(mockedAppModel.getAppById).toHaveBeenCalledWith('app-1');
      expect(mockedAppModel.updateApp).toHaveBeenCalledWith('app-1', {
        productKeys: ['product-key-123']
      });
      expect(updatedApp?.productKeys).toContain('product-key-123');
    });
  });
});
