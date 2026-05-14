import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IWebhookEventDocument extends Document {
  provider: string;
  transactionId?: string;
  onusReference?: string;
  status: 'received' | 'processed' | 'failed' | 'duplicate';
  payload: Record<string, unknown>;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEventDocument>(
  {
    provider: { type: String, required: true, index: true },
    transactionId: { type: String, index: true, sparse: true },
    onusReference: { type: String, index: true, sparse: true },
    status: {
      type: String,
      enum: ['received', 'processed', 'failed', 'duplicate'],
      default: 'received',
      required: true
    },
    payload: { type: Schema.Types.Mixed, required: true },
    error: { type: String },
    processedAt: { type: Date }
  },
  { timestamps: true }
);

WebhookEventSchema.index({ provider: 1, transactionId: 1 }, { unique: true, sparse: true });
WebhookEventSchema.index({ provider: 1, onusReference: 1 }, { unique: true, sparse: true });

export const WebhookEventModel: Model<IWebhookEventDocument> =
  mongoose.models.WebhookEvent ?? mongoose.model<IWebhookEventDocument>('WebhookEvent', WebhookEventSchema);

