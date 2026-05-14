import mongoose from 'mongoose';
import {
  LegalDocumentDocument,
  LegalDocumentModel,
  LegalDocumentType,
} from '../models/LegalDocumentModel';

export type LegalDocumentPublic = {
  id: string;
  document_type: LegalDocumentType;
  title: string;
  effective_date: Date;
  content: string;
  sort_order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
};

function toPublicFromLean(doc: {
  _id: mongoose.Types.ObjectId;
  document_type: LegalDocumentType;
  title: string;
  effective_date: Date;
  content: string;
  sort_order?: number;
  is_published?: boolean;
  created_at: Date;
  updated_at: Date;
}): LegalDocumentPublic {
  return {
    id: doc._id.toString(),
    document_type: doc.document_type,
    title: doc.title,
    effective_date: doc.effective_date,
    content: doc.content,
    sort_order: doc.sort_order ?? 0,
    is_published: doc.is_published ?? true,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

function toPublicFromDoc(doc: LegalDocumentDocument): LegalDocumentPublic {
  const o = doc.toObject();
  return toPublicFromLean({
    _id: o._id,
    document_type: o.document_type,
    title: o.title,
    effective_date: o.effective_date,
    content: o.content,
    sort_order: o.sort_order,
    is_published: o.is_published,
    created_at: o.created_at,
    updated_at: o.updated_at,
  });
}

export class LegalDocumentService {
  static isValidId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
  }

  static async list(
    type?: LegalDocumentType,
    search?: string,
    includeUnpublished = false
  ): Promise<LegalDocumentPublic[]> {
    const filter: Record<string, unknown> = {};
    if (type) filter.document_type = type;
    if (!includeUnpublished) filter.is_published = true;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
      ];
    }
    const docs = await LegalDocumentModel.find(filter)
      .sort({ document_type: 1, sort_order: 1, created_at: 1 })
      .lean();
    return docs.map(toPublicFromLean);
  }

  static async getById(id: string, allowUnpublished = false): Promise<LegalDocumentPublic | null> {
    if (!this.isValidId(id)) return null;
    const doc = await LegalDocumentModel.findById(id).lean();
    if (!doc) return null;
    if (!allowUnpublished && !doc.is_published) return null;
    return toPublicFromLean(doc as Parameters<typeof toPublicFromLean>[0]);
  }

  static async create(data: {
    document_type: LegalDocumentType;
    title: string;
    effective_date: Date;
    content: string;
    sort_order?: number;
    is_published?: boolean;
  }): Promise<LegalDocumentPublic> {
    const created = await LegalDocumentModel.create({
      ...data,
      sort_order: data.sort_order ?? 0,
      is_published: data.is_published ?? true,
    });
    return toPublicFromDoc(created);
  }

  static async update(
    id: string,
    data: Partial<{
      document_type: LegalDocumentType;
      title: string;
      effective_date: Date;
      content: string;
      sort_order: number;
      is_published: boolean;
    }>
  ): Promise<LegalDocumentPublic | null> {
    if (!this.isValidId(id)) return null;
    const sanitised = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>;

    if (Object.keys(sanitised).length === 0) {
      const existing = await LegalDocumentModel.findById(id).lean();
      if (!existing) return null;
      return toPublicFromLean(existing as Parameters<typeof toPublicFromLean>[0]);
    }

    const doc = await LegalDocumentModel.findByIdAndUpdate(id, { $set: sanitised }, { new: true }).lean();
    if (!doc) return null;
    return toPublicFromLean(doc as Parameters<typeof toPublicFromLean>[0]);
  }

  static async remove(id: string): Promise<boolean> {
    if (!this.isValidId(id)) return false;
    const result = await LegalDocumentModel.findByIdAndDelete(id).lean();
    return result !== null;
  }
}
