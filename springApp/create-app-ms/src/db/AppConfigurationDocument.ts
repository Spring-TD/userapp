import mongoose, { Document, Schema } from 'mongoose';
import type { AppConfiguration } from '../types/appConfiguration';

export interface IAppConfigurationDocument extends Document {
  _id: mongoose.Types.ObjectId;
  appId: string;
  versionReference?: string;
  publishing: AppConfiguration['publishing'];
  appElements: AppConfiguration['appElements'];
  appProfile?: AppConfiguration['appProfile'];
  onboarding: AppConfiguration['onboarding'];
  support: AppConfiguration['support'];
  policy: AppConfiguration['policy'];
  dnsConfig?: AppConfiguration['dnsConfig'];
  isActive: boolean;
  updateVariance?: AppConfiguration['updateVariance'];
  createdAt: Date;
  updatedAt: Date;
}

const AppConfigurationSchema = new Schema<IAppConfigurationDocument>(
  {
    appId: { type: String, required: true, index: true },
    versionReference: { type: String },
    publishing: { type: Schema.Types.Mixed, default: () => ({ isPublished: false }) },
    appElements: { type: Schema.Types.Mixed, required: true },
    appProfile: { type: Schema.Types.Mixed },
    onboarding: { type: Schema.Types.Mixed, required: true },
    support: { type: Schema.Types.Mixed, required: true },
    policy: { type: Schema.Types.Mixed, required: true },
    dnsConfig: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    updateVariance: { type: [String], default: [] }
  },
  { timestamps: true }
);

AppConfigurationSchema.index({ appId: 1, isActive: 1 });

export default mongoose.model<IAppConfigurationDocument>('AppConfiguration', AppConfigurationSchema);
