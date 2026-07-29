import { AppModel } from '../models/appModel';
import { AppMongoModel } from '../models/app.mongo';
import type { App } from '../types/app';

jest.mock('../models/app.mongo', () => ({
  AppMongoModel: {
    countDocuments: jest.fn(),
    find: jest.fn()
  }
}));

const mockedMongo = AppMongoModel as jest.Mocked<typeof AppMongoModel>;

function makeAppDoc(overrides: Partial<App> = {}) {
  const app: App = {
    id: 'app-1',
    name: 'Test App',
    websiteUrl: 'https://testapp.com',
    alias: 'test-app',
    description: 'Test description',
    merchantId: 'merchant-123',
    subdomain: 'test-app',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    productKeys: [],
    ...overrides
  };

  return {
    toJSON: () => app
  };
}

function mockFindChain(docs: ReturnType<typeof makeAppDoc>[]) {
  const limit = jest.fn().mockResolvedValue(docs);
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  mockedMongo.find.mockReturnValue({ sort } as never);
  return { sort, skip, limit };
}

describe('AppModel.listApps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to page 1 with limit 20', async () => {
    mockedMongo.countDocuments.mockResolvedValue(1);
    const { sort, skip, limit } = mockFindChain([makeAppDoc()]);

    const result = await AppModel.listApps();

    expect(mockedMongo.countDocuments).toHaveBeenCalledWith({});
    expect(mockedMongo.find).toHaveBeenCalledWith({});
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(20);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false
    });
    expect(result.apps).toHaveLength(1);
  });

  it('caps requested limit at 20', async () => {
    mockedMongo.countDocuments.mockResolvedValue(1);
    const { limit } = mockFindChain([makeAppDoc()]);

    const result = await AppModel.listApps({ page: 1, limit: 100 });

    expect(limit).toHaveBeenCalledWith(20);
    expect(result.pagination.limit).toBe(20);
  });

  it('filters by merchantIds', async () => {
    mockedMongo.countDocuments.mockResolvedValue(0);
    mockFindChain([]);

    await AppModel.listApps({ merchantIds: ['merchant-a', 'merchant-b'] });

    expect(mockedMongo.countDocuments).toHaveBeenCalledWith({
      merchantId: { $in: ['merchant-a', 'merchant-b'] }
    });
    expect(mockedMongo.find).toHaveBeenCalledWith({
      merchantId: { $in: ['merchant-a', 'merchant-b'] }
    });
  });

  it('applies skip for later pages', async () => {
    mockedMongo.countDocuments.mockResolvedValue(45);
    const { skip, limit } = mockFindChain([makeAppDoc({ id: 'app-21' })]);

    const result = await AppModel.listApps({ page: 2, limit: 20 });

    expect(skip).toHaveBeenCalledWith(20);
    expect(limit).toHaveBeenCalledWith(20);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true
    });
  });

  it('returns an empty page when no apps exist', async () => {
    mockedMongo.countDocuments.mockResolvedValue(0);
    mockFindChain([]);

    const result = await AppModel.listApps();

    expect(result.apps).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasNextPage).toBe(false);
  });
});
