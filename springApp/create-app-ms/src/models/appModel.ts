import mongoose from 'mongoose';
import { App, CreateAppRequest } from '../types/app';
import AppDocumentModel from '../db/AppDocument';
import type { IAppDocument } from '../db/AppDocument';

function docToApp(doc: mongoose.Document | null): App | null {
  if (!doc) return null;
  const o = doc.toObject() as IAppDocument & { _id: mongoose.Types.ObjectId; createdAt?: Date; updatedAt?: Date };
  const { _id, __v, createdAt, updatedAt, ...rest } = o;
  return {
    ...rest,
    id: _id.toString(),
    createdAt: (createdAt instanceof Date ? createdAt.toISOString() : (o as unknown as { createdAt: string }).createdAt) ?? new Date().toISOString(),
    updatedAt: (updatedAt instanceof Date ? updatedAt.toISOString() : (o as unknown as { updatedAt: string }).updatedAt) ?? new Date().toISOString()
  } as App;
}

function docsToApps(docs: mongoose.Document[]): App[] {
  return docs.map((d) => docToApp(d)).filter((a): a is App => a != null);
}

export class AppModel {
  static async createApp(appData: CreateAppRequest): Promise<App> {
    if (!appData.merchantId) {
      throw new Error('Merchant ID is required');
    }

    const doc = await AppDocumentModel.create({
      name: appData.name,
      websiteUrl: appData.websiteUrl,
      alias: appData.alias,
      description: appData.description,
      merchantId: appData.merchantId,
      subdomain: appData.subdomain ?? '',
      status: 'draft',
      productKeys: []
    });

    return docToApp(doc)!;
  }

  static async getAppById(id: string): Promise<App | null> {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await AppDocumentModel.findById(id);
    return docToApp(doc);
  }

  static async getAppsByMerchantId(merchantId: string): Promise<App[]> {
    const docs = await AppDocumentModel.find({ merchantId });
    return docsToApps(docs);
  }

  static async updateApp(id: string, updateData: Partial<App>): Promise<App | null> {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    const { id: _omitId, ...safe } = updateData as Partial<App> & { id?: string };
    const doc = await AppDocumentModel.findByIdAndUpdate(id, { $set: safe }, { new: true });
    return docToApp(doc);
  }

  static async deleteApp(id: string): Promise<boolean> {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await AppDocumentModel.findByIdAndDelete(id);
    return !!result;
  }

  static async getAllApps(): Promise<App[]> {
    const docs = await AppDocumentModel.find({});
    return docsToApps(docs);
  }

  static async getAppBySubdomain(subdomain: string): Promise<App | null> {
    if (!subdomain) return null;
    const doc = await AppDocumentModel.findOne({ subdomain });
    return docToApp(doc);
  }

  static async getAllSubdomains(): Promise<string[]> {
    const docs = await AppDocumentModel.find({ subdomain: { $exists: true, $ne: '' } }).select('subdomain');
    return docs.map((d) => (d as unknown as { subdomain: string }).subdomain).filter(Boolean);
  }

  static async getAppByCustomDomain(domain: string): Promise<App | null> {
    if (!domain) return null;
    const normalized = domain.toLowerCase().trim();
    const doc = await AppDocumentModel.findOne({ customDomain: normalized });
    return docToApp(doc);
  }

  static async getAllCustomDomains(): Promise<string[]> {
    const docs = await AppDocumentModel.find({ customDomain: { $exists: true, $ne: '' } }).select('customDomain');
    return docs.map((d) => (d as unknown as { customDomain: string }).customDomain).filter(Boolean);
  }
}
