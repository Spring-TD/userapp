import mongoose, { Document, Schema } from 'mongoose';
import { NotificationChannel, NotificationStatus } from '../types/notification';

export interface INotification extends Document {
  channel: NotificationChannel;
  recipient: string;
  template: string;
  data: Record<string, any>;
  status: NotificationStatus;
  retryCount: number;
  error?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema({
  channel: {
    type: String,
    enum: ['email', 'sms'],
    required: true,
    index: true
  },
  recipient: {
    type: String,
    required: true,
    index: true
  },
  template: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
    index: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  error: {
    type: String,
    required: false
  },
  sentAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Add indexes
NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);

