import { App, AppListQuery, AppListResult, CreateAppRequest } from '../types/app';
import { AppMongoModel } from './app.mongo';

const DEFAULT_APP_PAGE_SIZE = 20;
const MAX_APP_PAGE_SIZE = 20;

function normalizeAppPagination(query: AppListQuery): { page: number; limit: number; skip: number } {
  const page = Number.isFinite(query.page) && query.page && query.page > 0 ? Math.floor(query.page) : 1;
  const requestedLimit =
    Number.isFinite(query.limit) && query.limit && query.limit > 0 ? Math.floor(query.limit) : DEFAULT_APP_PAGE_SIZE;
  const limit = Math.min(requestedLimit, MAX_APP_PAGE_SIZE);
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

export class AppModel {
  static async getAppBySubdomain(subdomain: string): Promise<App | null> {
    const app = await AppMongoModel.findOne({ subdomain: subdomain.trim().toLowerCase() });
    return app ? (app.toJSON() as unknown as App) : null;
  }

  static async getAllSubdomains(): Promise<string[]> {
    const docs = await AppMongoModel.find({
      subdomain: { $exists: true, $nin: [null, ''] }
    })
      .select('subdomain')
      .lean();
    return docs
      .map((d: { subdomain?: string }) => d.subdomain)
      .filter((s): s is string => Boolean(s));
  }

  static async createApp(appData: CreateAppRequest): Promise<App> {
    // Ensure merchantId is provided (should be guaranteed by controller)
    if (!appData.merchantId) {
      throw new Error('Merchant ID is required');
    }

    const now = new Date().toISOString();
    const newApp = await AppMongoModel.create({
      ...appData,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      productKeys: [],
      manifestUrls: [],
      manifestKeys: []
    });

    return newApp.toJSON() as unknown as App;
  }

  static async getAppById(id: string): Promise<App | null> {
    const app = await AppMongoModel.findById(id);
    return app ? (app.toJSON() as unknown as App) : null;
  }

  static async getAppsByMerchantId(merchantId: string): Promise<App[]> {
    const apps = await AppMongoModel.find({ merchantId });
    return apps.map(app => app.toJSON() as unknown as App);
  }

  static async updateApp(id: string, updateData: Partial<App>): Promise<App | null> {
    const defaultUpdate = { updatedAt: new Date().toISOString() };
    const dataWithTimestamp = { ...updateData, ...defaultUpdate };

    // Using findByIdAndUpdate
    // Mongoose handles validation against schema
    const updatedApp = await AppMongoModel.findByIdAndUpdate(
      id,
      { $set: dataWithTimestamp },
      { new: true, runValidators: true }
    );

    return updatedApp ? (updatedApp.toJSON() as unknown as App) : null;
  }

  static async deleteApp(id: string): Promise<boolean> {
    const result = await AppMongoModel.findByIdAndDelete(id);
    return !!result;
  }

  static async getAllApps(): Promise<App[]> {
    const apps = await AppMongoModel.find();
    return apps.map(app => app.toJSON() as unknown as App);
  }

  static async listApps(query: AppListQuery = {}): Promise<AppListResult> {
    const filter: Record<string, unknown> = {};
    if (query.merchantIds?.length) {
      filter.merchantId = { $in: query.merchantIds };
    }

    const { page, limit, skip } = normalizeAppPagination(query);
    const [total, apps] = await Promise.all([
      AppMongoModel.countDocuments(filter),
      AppMongoModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);
    const totalPages = Math.ceil(total / limit);

    return {
      apps: apps.map((app) => app.toJSON() as unknown as App),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }
}