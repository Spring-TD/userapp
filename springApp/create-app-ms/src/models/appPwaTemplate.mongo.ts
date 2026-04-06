import mongoose, { Schema, Document, Types } from 'mongoose';
import { AppPwaTemplate } from '../types/pwaTemplate';

export interface IAppPwaTemplateDocument
  extends Omit<AppPwaTemplate, 'id' | 'appId'>,
    Document {
  appId: Types.ObjectId;
}

const AppPwaTemplateSchema = new Schema<IAppPwaTemplateDocument>(
  {
    appId: { type: Schema.Types.ObjectId, ref: 'App', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    iconKey: { type: String, trim: true },
    // Seven top-level sections: asset, splash, onboarding, appProfile, policyTerms (privacy + ToS), …
    config: { type: Schema.Types.Mixed, required: true, default: {} },
    isApplied: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        if (ret._id) {
          ret.id = ret._id;
          delete ret._id;
        }
        if (ret.appId && (ret.appId as Types.ObjectId).toString) {
          ret.appId = String(ret.appId);
        }
        if (ret.__v !== undefined) {
          delete ret.__v;
        }
      }
    },
    toObject: { virtuals: true }
  }
);

AppPwaTemplateSchema.pre<IAppPwaTemplateDocument>('save', function () {
  this.updatedAt = new Date().toISOString();
  if (this.isNew && !this.createdAt) {
    this.createdAt = new Date().toISOString();
  }
});

export const AppPwaTemplateMongoModel = mongoose.model<IAppPwaTemplateDocument>(
  'AppPwaTemplate',
  AppPwaTemplateSchema
);
