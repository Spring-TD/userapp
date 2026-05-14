import mongoose from 'mongoose';
import { FaqModel, FaqDocument } from '../models/FaqModel';

export type FaqPublic = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
};

function toPublicFromLean(doc: {
  _id: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  sort_order?: number;
  is_published?: boolean;
  created_at: Date;
  updated_at: Date;
}): FaqPublic {
  return {
    id: doc._id.toString(),
    question: doc.question,
    answer: doc.answer,
    sort_order: doc.sort_order ?? 0,
    is_published: doc.is_published ?? true,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

function toPublicFromDoc(doc: FaqDocument): FaqPublic {
  const o = doc.toObject();
  return toPublicFromLean({
    _id: o._id,
    question: o.question,
    answer: o.answer,
    sort_order: o.sort_order,
    is_published: o.is_published,
    created_at: o.created_at,
    updated_at: o.updated_at,
  });
}

export class FaqService {
  static isValidId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
  }

  static async listPublished(search?: string): Promise<FaqPublic[]> {
    const filter: Record<string, unknown> = { is_published: true };
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { question: { $regex: q, $options: 'i' } },
        { answer: { $regex: q, $options: 'i' } },
      ];
    }
    const docs = await FaqModel.find(filter).sort({ sort_order: 1, created_at: 1 }).lean();
    return docs.map(toPublicFromLean);
  }

  static async listAll(search?: string): Promise<FaqPublic[]> {
    const filter: Record<string, unknown> = {};
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { question: { $regex: q, $options: 'i' } },
        { answer: { $regex: q, $options: 'i' } },
      ];
    }
    const docs = await FaqModel.find(filter).sort({ sort_order: 1, created_at: 1 }).lean();
    return docs.map(toPublicFromLean);
  }

  static async getById(id: string, allowUnpublished = false): Promise<FaqPublic | null> {
    if (!this.isValidId(id)) return null;
    const doc = await FaqModel.findById(id).lean();
    if (!doc) return null;
    if (!allowUnpublished && !doc.is_published) return null;
    return toPublicFromLean(doc as Parameters<typeof toPublicFromLean>[0]);
  }

  static async create(data: {
    question: string;
    answer: string;
    sort_order?: number;
    is_published?: boolean;
  }): Promise<FaqPublic> {
    const created = await FaqModel.create({
      question: data.question,
      answer: data.answer,
      sort_order: data.sort_order ?? 0,
      is_published: data.is_published ?? true,
    });
    return toPublicFromDoc(created);
  }

  static async update(
    id: string,
    data: Partial<{ question: string; answer: string; sort_order: number; is_published: boolean }>
  ): Promise<FaqPublic | null> {
    if (!this.isValidId(id)) return null;
    const sanitised = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>;
    if (Object.keys(sanitised).length === 0) {
      const existing = await FaqModel.findById(id).lean();
      if (!existing) return null;
      return toPublicFromLean(existing as Parameters<typeof toPublicFromLean>[0]);
    }
    const doc = await FaqModel.findByIdAndUpdate(id, { $set: sanitised }, { new: true }).lean();
    if (!doc) return null;
    return toPublicFromLean(doc as Parameters<typeof toPublicFromLean>[0]);
  }

  static async remove(id: string): Promise<boolean> {
    if (!this.isValidId(id)) return false;
    const result = await FaqModel.findByIdAndDelete(id).lean();
    return result !== null;
  }
}
