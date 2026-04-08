import mongoose, { Schema, Types } from 'mongoose';

const AppPwaPublishSchema = new Schema(
  {
    appId: { type: Schema.Types.ObjectId, ref: 'App', required: true, index: true },
    templateId: { type: String, required: true, index: true },
    version: { type: String, required: true, index: true },
    manifest: { type: Schema.Types.Mixed, required: true },
    serviceWorkerMeta: { type: Schema.Types.Mixed, required: true },
    artifactUrls: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['pending', 'published', 'failed'],
      required: true,
      default: 'published'
    },
    warnings: { type: [String], default: [] },
    errors: { type: [String], default: [] },
    publishedAt: { type: String, required: true, default: () => new Date().toISOString() },
    updatedAt: { type: String, required: true, default: () => new Date().toISOString() }
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

AppPwaPublishSchema.index({ appId: 1, publishedAt: -1 });

AppPwaPublishSchema.pre('save', function () {
  (this as { updatedAt?: string }).updatedAt = new Date().toISOString();
});

export const AppPwaPublishMongoModel = mongoose.model('AppPwaPublish', AppPwaPublishSchema);

