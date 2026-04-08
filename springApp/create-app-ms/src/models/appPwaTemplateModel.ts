import { Types } from 'mongoose';
import {
  AppPwaTemplate,
  CreateAppPwaTemplateRequest,
  UpdateAppPwaTemplateRequest
} from '../types/pwaTemplate';
import { AppPwaTemplateMongoModel } from './appPwaTemplate.mongo';

function toAppPwaTemplate(doc: unknown): AppPwaTemplate {
  return doc as AppPwaTemplate;
}

export class AppPwaTemplateModel {
  static async createForApp(
    appId: string,
    data: CreateAppPwaTemplateRequest
  ): Promise<AppPwaTemplate> {
    const created = await AppPwaTemplateMongoModel.create({
      appId: new Types.ObjectId(appId),
      name: data.name,
      category: data.category,
      description: data.description,
      iconKey: data.iconKey,
      config: data.config ?? {},
      isApplied: false
    });
    return toAppPwaTemplate(created.toJSON());
  }

  static async listByAppId(appId: string): Promise<AppPwaTemplate[]> {
    const docs = await AppPwaTemplateMongoModel.find({ appId: new Types.ObjectId(appId) }).sort({
      updatedAt: -1
    });
    return docs.map((d) => toAppPwaTemplate(d.toJSON()));
  }

  static async getByIdAndAppId(
    templateId: string,
    appId: string
  ): Promise<AppPwaTemplate | null> {
    if (!Types.ObjectId.isValid(templateId) || !Types.ObjectId.isValid(appId)) {
      return null;
    }
    const doc = await AppPwaTemplateMongoModel.findOne({
      _id: new Types.ObjectId(templateId),
      appId: new Types.ObjectId(appId)
    });
    return doc ? toAppPwaTemplate(doc.toJSON()) : null;
  }

  static async getAppliedByAppId(appId: string): Promise<AppPwaTemplate | null> {
    if (!Types.ObjectId.isValid(appId)) {
      return null;
    }
    const doc = await AppPwaTemplateMongoModel.findOne({
      appId: new Types.ObjectId(appId),
      isApplied: true
    }).sort({ updatedAt: -1 });
    return doc ? toAppPwaTemplate(doc.toJSON()) : null;
  }

  static async update(
    templateId: string,
    appId: string,
    data: UpdateAppPwaTemplateRequest
  ): Promise<AppPwaTemplate | null> {
    if (!Types.ObjectId.isValid(templateId) || !Types.ObjectId.isValid(appId)) {
      return null;
    }
    const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) set.name = data.name;
    if (data.category !== undefined) set.category = data.category;
    if (data.description !== undefined) set.description = data.description;
    if (data.iconKey !== undefined) set.iconKey = data.iconKey;
    if (data.config !== undefined) set.config = data.config;

    const updated = await AppPwaTemplateMongoModel.findOneAndUpdate(
      { _id: new Types.ObjectId(templateId), appId: new Types.ObjectId(appId) },
      { $set: set },
      { new: true, runValidators: true }
    );
    return updated ? toAppPwaTemplate(updated.toJSON()) : null;
  }

  static async delete(templateId: string, appId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(templateId) || !Types.ObjectId.isValid(appId)) {
      return false;
    }
    const result = await AppPwaTemplateMongoModel.deleteOne({
      _id: new Types.ObjectId(templateId),
      appId: new Types.ObjectId(appId)
    });
    return result.deletedCount === 1;
  }

  static async deleteByAppId(appId: string): Promise<number> {
    if (!Types.ObjectId.isValid(appId)) {
      return 0;
    }
    const result = await AppPwaTemplateMongoModel.deleteMany({
      appId: new Types.ObjectId(appId)
    });
    return result.deletedCount ?? 0;
  }

  /** Mark one template as applied for the app; clear others. */
  static async setApplied(templateId: string, appId: string): Promise<AppPwaTemplate | null> {
    if (!Types.ObjectId.isValid(templateId) || !Types.ObjectId.isValid(appId)) {
      return null;
    }
    const oidApp = new Types.ObjectId(appId);
    const oidTpl = new Types.ObjectId(templateId);

    await AppPwaTemplateMongoModel.updateMany({ appId: oidApp }, { $set: { isApplied: false } });

    const updated = await AppPwaTemplateMongoModel.findOneAndUpdate(
      { _id: oidTpl, appId: oidApp },
      { $set: { isApplied: true, updatedAt: new Date().toISOString() } },
      { new: true, runValidators: true }
    );
    return updated ? toAppPwaTemplate(updated.toJSON()) : null;
  }
}
