import mongoose, { Document, Schema } from 'mongoose';
import type { ConfigurationTemplate } from '../types/appConfiguration';

export interface IConfigurationTemplateDocument extends Document {
  _id: mongoose.Types.ObjectId;
  appId: string;
  name: string;
  description?: string;
  configuration: ConfigurationTemplate['configuration'];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConfigurationTemplateSchema = new Schema<IConfigurationTemplateDocument>(
  {
    appId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    configuration: { type: Schema.Types.Mixed, required: true },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model<IConfigurationTemplateDocument>('ConfigurationTemplate', ConfigurationTemplateSchema);
