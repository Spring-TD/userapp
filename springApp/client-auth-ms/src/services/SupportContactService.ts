import mongoose from 'mongoose';
import { SupportContactModel, SupportContactDocument } from '../models/SupportContactModel';

export type SupportContactPublic = {
  id: string;
  title: string;
  link_url: string;
  icon_type?: string;
  sort_order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
};

function toPublicFromLean(doc: {
  _id: mongoose.Types.ObjectId;
  title: string;
  link_url: string;
  icon_type?: string;
  sort_order?: number;
  is_published?: boolean;
  created_at: Date;
  updated_at: Date;
}): SupportContactPublic {
  const row: SupportContactPublic = {
    id: doc._id.toString(),
    title: doc.title,
    link_url: doc.link_url,
    sort_order: doc.sort_order ?? 0,
    is_published: doc.is_published ?? true,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
  if (doc.icon_type) row.icon_type = doc.icon_type;
  return row;
}

function toPublicFromDoc(doc: SupportContactDocument): SupportContactPublic {
  const o = doc.toObject();
  return toPublicFromLean({
    _id: o._id,
    title: o.title,
    link_url: o.link_url,
    icon_type: o.icon_type,
    sort_order: o.sort_order,
    is_published: o.is_published,
    created_at: o.created_at,
    updated_at: o.updated_at,
  });
}

export class SupportContactService {
  static isValidId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
  }

  static async listPublished(search?: string): Promise<SupportContactPublic[]> {
    const filter: Record<string, unknown> = { is_published: true };
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { link_url: { $regex: q, $options: 'i' } },
      ];
    }
    const docs = await SupportContactModel.find(filter)
      .sort({ sort_order: 1, created_at: 1 })
      .lean();
    return docs.map(toPublicFromLean);
  }

  static async listAll(search?: string): Promise<SupportContactPublic[]> {
    const filter: Record<string, unknown> = {};
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { link_url: { $regex: q, $options: 'i' } },
      ];
    }
    const docs = await SupportContactModel.find(filter)
      .sort({ sort_order: 1, created_at: 1 })
      .lean();
    return docs.map(toPublicFromLean);
  }

  static async getById(id: string, allowUnpublished = false): Promise<SupportContactPublic | null> {
    if (!this.isValidId(id)) return null;
    const doc = await SupportContactModel.findById(id).lean();
    if (!doc) return null;
    if (!allowUnpublished && !doc.is_published) return null;
    return toPublicFromLean(doc as Parameters<typeof toPublicFromLean>[0]);
  }

  static async create(data: {
    title: string;
    link_url: string;
    icon_type?: string;
    sort_order?: number;
    is_published?: boolean;
  }): Promise<SupportContactPublic> {
    const created = await SupportContactModel.create({
      title: data.title,
      link_url: data.link_url,
      icon_type: data.icon_type,
      sort_order: data.sort_order ?? 0,
      is_published: data.is_published ?? true,
    });
    return toPublicFromDoc(created);
  }

  static async update(
    id: string,
    data: Partial<{
      title: string;
      link_url: string;
      icon_type: string;
      sort_order: number;
      is_published: boolean;
    }>
  ): Promise<SupportContactPublic | null> {
    if (!this.isValidId(id)) return null;
    const sanitised = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>;
    if (Object.keys(sanitised).length === 0) {
      const existing = await SupportContactModel.findById(id).lean();
      if (!existing) return null;
      return toPublicFromLean(existing as Parameters<typeof toPublicFromLean>[0]);
    }
    const doc = await SupportContactModel.findByIdAndUpdate(id, { $set: sanitised }, { new: true }).lean();
    if (!doc) return null;
    return toPublicFromLean(doc as Parameters<typeof toPublicFromLean>[0]);
  }

  static async remove(id: string): Promise<boolean> {
    if (!this.isValidId(id)) return false;
    const result = await SupportContactModel.findByIdAndDelete(id).lean();
    return result !== null;
  }
}
