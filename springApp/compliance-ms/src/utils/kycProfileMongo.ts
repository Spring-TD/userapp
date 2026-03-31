/**
 * MongoDB-backed KYC profile and document models with the same static API as MockKYCProfileModel / MockKYCDocumentModel.
 */
import mongoose from 'mongoose';
import { KYCProfile, KYCDocument, KYCStatus, UserType } from '../types/kycTypes';
import { KYCProfileModel, toPlainProfile } from '../models/KYCProfileModel';
import type { IKYCProfileDocument } from '../models/KYCProfileModel';

function toDocId(id: string): mongoose.Types.ObjectId | string {
  if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id) {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
}

function toDoc(d: any): KYCDocument & { _id: string } {
  const id = d._id?.toString?.() ?? d._id;
  return {
    type: d.type,
    fileName: d.fileName,
    fileType: d.fileType,
    fileSize: d.fileSize,
    uploadDate: d.uploadDate,
    status: d.status,
    rejectionReason: d.rejectionReason,
    _id: id
  } as KYCDocument & { _id: string };
}

export class KYCProfileModelMongo {
  static async save(profile: KYCProfile): Promise<KYCProfile & { _id: string }> {
    const doc = await KYCProfileModel.create(profile);
    return toPlainProfile(doc)!;
  }

  static async findOne(query: { userId?: string; _id?: string }): Promise<(KYCProfile & { _id: string }) | null> {
    const q: any = {};
    if (query.userId) q.userId = query.userId;
    if (query._id) q._id = query._id;
    const doc = await KYCProfileModel.findOne(q).lean();
    return doc ? toPlainProfile(doc as IKYCProfileDocument) : null;
  }

  static async findById(id: string): Promise<(KYCProfile & { _id: string }) | null> {
    const doc = await KYCProfileModel.findById(id).lean();
    return doc ? toPlainProfile(doc as IKYCProfileDocument) : null;
  }

  static async find(query: any = {}): Promise<(KYCProfile & { _id: string })[]> {
    const q: any = {};
    if (query.userId) q.userId = query.userId;
    if (query.userType) q.userType = query.userType;
    if (query.status) q.status = query.status;
    if (query.submittedAt) {
      if (query.submittedAt.$gte) q.submittedAt = { ...q.submittedAt, $gte: query.submittedAt.$gte };
      if (query.submittedAt.$lte) q.submittedAt = { ...q.submittedAt, $lte: query.submittedAt.$lte };
    }
    const docs = await KYCProfileModel.find(q).lean();
    return docs.map((d) => toPlainProfile(d as IKYCProfileDocument)!);
  }

  static async findByIdAndUpdate(
    id: string,
    update: any,
    options: { new?: boolean } = {}
  ): Promise<(KYCProfile & { _id: string }) | null> {
    const doc = await KYCProfileModel.findByIdAndUpdate(id, { $set: update }, { new: options.new !== false }).lean();
    return doc ? toPlainProfile(doc as IKYCProfileDocument) : null;
  }

  static async deleteOne(query: { userId?: string; _id?: string }): Promise<{ deletedCount: number }> {
    const q: any = {};
    if (query.userId) q.userId = query.userId;
    if (query._id) q._id = query._id;
    const result = await KYCProfileModel.deleteOne(q);
    return { deletedCount: result.deletedCount ?? 0 };
  }
}

export class KYCDocumentModelMongo {
  static async findById(id: string): Promise<(KYCDocument & { _id: string; userId?: string }) | null> {
    const profile = await KYCProfileModel.findOne({ 'documents._id': toDocId(id) }).lean();
    if (!profile || !profile.documents) return null;
    const doc = (profile.documents as any[]).find((d) => d._id?.toString?.() === id || d._id === id);
    if (!doc) return null;
    return { ...toDoc(doc), userId: (profile as any).userId };
  }

  static async find(query: { userId?: string; type?: string; status?: string }): Promise<(KYCDocument & { _id: string; userId: string })[]> {
    const q: any = {};
    if (query.userId) q.userId = query.userId;
    const profiles = await KYCProfileModel.find(q).lean();
    const out: (KYCDocument & { _id: string; userId: string })[] = [];
    for (const p of profiles) {
      const userId = (p as any).userId;
      for (const d of (p as any).documents || []) {
        if (query.type && d.type !== query.type) continue;
        if (query.status && d.status !== query.status) continue;
        out.push({ ...toDoc(d), userId });
      }
    }
    return out;
  }

  static async findByIdAndUpdate(
    id: string,
    update: Partial<KYCDocument>,
    options: { new?: boolean } = {}
  ): Promise<(KYCDocument & { _id: string }) | null> {
    const setObj: any = {};
    for (const [k, v] of Object.entries(update)) {
      if (v !== undefined) setObj[`documents.$.${k}`] = v;
    }
    const doc = await KYCProfileModel.findOneAndUpdate(
      { 'documents._id': toDocId(id) },
      { $set: setObj },
      { new: options.new !== false }
    ).lean();
    if (!doc) return null;
    const sub = (doc.documents as any[]).find((d) => d._id?.toString?.() === id || d._id === id);
    return sub ? toDoc({ ...sub, ...update }) : null;
  }

  static async deleteOne(query: { _id: string }): Promise<{ deletedCount: number }> {
    const oid = toDocId(query._id);
    const result = await KYCProfileModel.updateOne(
      { 'documents._id': oid },
      { $pull: { documents: { _id: oid } } }
    );
    return { deletedCount: result.modifiedCount ? 1 : 0 };
  }

  static async save(document: KYCDocument & { userId: string }): Promise<KYCDocument & { _id: string; userId: string }> {
    const profile = await KYCProfileModel.findOne({ userId: document.userId });
    if (!profile) throw new Error('KYC profile not found for userId');
    const newDoc = {
      type: document.type,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      uploadDate: document.uploadDate,
      status: document.status,
      rejectionReason: document.rejectionReason
    };
    profile.documents.push(newDoc as any);
    await profile.save();
    const added = profile.documents[profile.documents.length - 1];
    return { ...toDoc(added), userId: document.userId };
  }
}

export async function getKycDbStats(): Promise<{
  kycProfiles: number;
  documents: number;
  statuses: Record<string, number>;
  userTypes: Record<string, number>;
}> {
  const kycProfiles = await KYCProfileModel.countDocuments();
  const profiles = await KYCProfileModel.find({}).lean();
  let documents = 0;
  const statuses: Record<string, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    approved: 0,
    rejected: 0
  };
  const userTypes: Record<string, number> = {
    individual: 0,
    merchant: 0
  };
  for (const p of profiles as any[]) {
    documents += (p.documents || []).length;
    if (p.status) statuses[p.status] = (statuses[p.status] ?? 0) + 1;
    if (p.userType === UserType.INDIVIDUAL) userTypes.individual++;
    if (p.userType === UserType.MERCHANT) userTypes.merchant++;
  }
  return { kycProfiles, documents, statuses, userTypes };
}
