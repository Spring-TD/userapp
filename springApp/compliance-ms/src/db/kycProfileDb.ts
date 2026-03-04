import mongoose from 'mongoose';
import { KYCProfile } from '../types/kycTypes';
import KYCProfileModel from './KYCProfileModel';

type ProfileWithId = KYCProfile & { _id: string };

function toPlain(doc: mongoose.Document | null): ProfileWithId | null {
  if (!doc) return null;
  const o = doc.toObject() as Record<string, unknown> & { _id: mongoose.Types.ObjectId };
  const { _id, __v, ...rest } = o;
  return { _id: _id.toString(), ...rest } as unknown as ProfileWithId;
}

function toPlainList(docs: mongoose.Document[]): ProfileWithId[] {
  return docs.map(d => toPlain(d)!).filter(Boolean);
}

/**
 * Database layer matching MockKYCProfileModel API - uses MongoDB via Mongoose.
 */
export const KYCProfileDb = {
  async save(profile: KYCProfile): Promise<ProfileWithId> {
    const doc = await KYCProfileModel.create(profile);
    return toPlain(doc)!;
  },

  async findOne(query: { userId?: string; _id?: string }): Promise<ProfileWithId | null> {
    let doc: mongoose.Document | null = null;
    if (query._id && mongoose.Types.ObjectId.isValid(query._id)) {
      doc = await KYCProfileModel.findById(query._id);
    } else if (query.userId) {
      doc = await KYCProfileModel.findOne({ userId: query.userId });
    }
    return toPlain(doc);
  },

  async findById(id: string): Promise<ProfileWithId | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await KYCProfileModel.findById(id);
    return toPlain(doc);
  },

  async find(query: {
    userId?: string;
    userType?: string;
    status?: string;
    submittedAt?: { $gte?: Date; $lte?: Date };
    workflowStatus?: { $in?: string[] };
    riskLevel?: { $in?: string[] };
  } = {}): Promise<ProfileWithId[]> {
    const q: Record<string, unknown> = {};
    if (query.userId) q.userId = query.userId;
    if (query.userType) q.userType = query.userType;
    if (query.status) q.status = query.status;
    if (query.submittedAt) q.submittedAt = query.submittedAt;
    if (query.workflowStatus) q.workflowStatus = query.workflowStatus;
    if (query.riskLevel) q.riskLevel = query.riskLevel;
    const docs = await KYCProfileModel.find(q);
    return toPlainList(docs);
  },

  async findByIdAndUpdate(
    id: string,
    update: Record<string, unknown>,
    options: { new?: boolean } = {}
  ): Promise<ProfileWithId | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await KYCProfileModel.findByIdAndUpdate(id, { $set: update }, { new: options.new !== false });
    return toPlain(doc);
  },

  async deleteOne(query: { userId?: string; _id?: string }): Promise<{ deletedCount: number }> {
    let result: mongoose.mongo.DeleteResult;
    if (query._id && mongoose.Types.ObjectId.isValid(query._id)) {
      result = await KYCProfileModel.deleteOne({ _id: query._id });
    } else if (query.userId) {
      result = await KYCProfileModel.deleteOne({ userId: query.userId });
    } else {
      return { deletedCount: 0 };
    }
    return { deletedCount: result.deletedCount };
  },

  /** Find an embedded document by id (searches across all profiles) */
  async findDocumentById(documentId: string): Promise<(Record<string, unknown> & { _id: string }) | null> {
    if (!mongoose.Types.ObjectId.isValid(documentId)) return null;
    const oid = new mongoose.Types.ObjectId(documentId);
    const profile = await KYCProfileModel.findOne({ 'documents._id': oid }).lean();
    if (!profile || !profile.documents) return null;
    const doc = (profile.documents as unknown[]).find(
      (d: unknown) => String((d as { _id: unknown })._id) === documentId
    );
    if (!doc) return null;
    const d = doc as Record<string, unknown> & { _id: unknown };
    return { ...d, _id: String(d._id) } as Record<string, unknown> & { _id: string };
  },

  /** Update an embedded document by id */
  async findDocumentByIdAndUpdate(
    documentId: string,
    update: Record<string, unknown>,
    _options?: { new?: boolean }
  ): Promise<(Record<string, unknown> & { _id: string }) | null> {
    if (!mongoose.Types.ObjectId.isValid(documentId)) return null;
    const oid = new mongoose.Types.ObjectId(documentId);
    const setObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(update)) {
      setObj[`documents.$.${k}`] = v;
    }
    const profile = await KYCProfileModel.findOneAndUpdate(
      { 'documents._id': oid },
      { $set: setObj },
      { new: true }
    ).lean();
    if (!profile || !profile.documents) return null;
    const doc = (profile.documents as unknown[]).find(
      (d: unknown) => String((d as { _id: unknown })._id) === documentId
    );
    if (!doc) return null;
    const d = doc as Record<string, unknown> & { _id: unknown };
    return { ...d, _id: String(d._id) } as Record<string, unknown> & { _id: string };
  }
};
