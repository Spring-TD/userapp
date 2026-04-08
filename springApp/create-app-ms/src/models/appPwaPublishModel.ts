import { Types } from 'mongoose';
import { AppPwaPublish } from '../types/pwaPublish';
import { AppPwaPublishMongoModel } from './appPwaPublish.mongo';

function toPublish(doc: unknown): AppPwaPublish {
  return doc as AppPwaPublish;
}

export class AppPwaPublishModel {
  static async createForApp(
    appId: string,
    data: Omit<AppPwaPublish, 'id' | 'appId' | 'updatedAt'>
  ): Promise<AppPwaPublish> {
    const created: any = await AppPwaPublishMongoModel.create({
      ...data,
      appId: new Types.ObjectId(appId),
      updatedAt: data.publishedAt
    });
    return toPublish(created.toJSON());
  }

  static async getLatestByAppId(appId: string): Promise<AppPwaPublish | null> {
    if (!Types.ObjectId.isValid(appId)) {
      return null;
    }
    const doc: any = await AppPwaPublishMongoModel.findOne({
      appId: new Types.ObjectId(appId)
    }).sort({ publishedAt: -1 });
    return doc ? toPublish(doc.toJSON()) : null;
  }
}

