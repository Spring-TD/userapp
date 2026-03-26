import { App, CreateAppRequest } from '../types/app';
import { AppMongoModel } from './app.mongo';

export class AppModel {
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
      productKeys: []
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
}