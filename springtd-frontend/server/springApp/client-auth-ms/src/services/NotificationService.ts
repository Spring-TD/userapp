import axios from 'axios';
import { config } from '../config/environment';

export interface SendNotificationRequest {
  channel: 'email' | 'sms';
  recipient: string;
  template: string;
  data: Record<string, any>;
}

export interface SendNotificationResponse {
  success: boolean;
  id?: string;
  error?: string;
  message?: string;
}

export class NotificationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.notificationsServiceUrl;
  }

  async sendNotification(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    try {
      const response = await axios.post<SendNotificationResponse>(
        `${this.baseUrl}/api/v1/notifications/send`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 seconds timeout
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to send notification:', error.message);

      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          error: error.response.data?.error || `Server error: ${error.response.status}`,
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          error: 'Failed to connect to notifications service',
        };
      } else {
        // Something else happened
        return {
          success: false,
          error: error.message || 'Unknown error occurred',
        };
      }
    }
  }

  async sendPasswordResetEmail(email: string, resetUrl: string, userName: string): Promise<SendNotificationResponse> {
    const request: SendNotificationRequest = {
      channel: 'email',
      recipient: email,
      template: 'password-reset',
      data: {
        userName,
        resetUrl,
      },
    };

    return this.sendNotification(request);
  }

  async sendEmailVerificationEmail(email: string, verificationUrl: string, userName: string): Promise<SendNotificationResponse> {
    const request: SendNotificationRequest = {
      channel: 'email',
      recipient: email,
      template: 'email-verification',
      data: {
        userName,
        verificationUrl,
      },
    };

    return this.sendNotification(request);
  }

  async sendInvitationEmail(email: string, invitationUrl: string, merchantName: string, roleName: string): Promise<SendNotificationResponse> {
    const request: SendNotificationRequest = {
      channel: 'email',
      recipient: email,
      template: 'invitation',
      data: {
        merchantName,
        roleName,
        invitationUrl,
      },
    };

    return this.sendNotification(request);
  }

  async sendOTP(email: string, otpCode: string, purpose: string): Promise<SendNotificationResponse> {
    const request: SendNotificationRequest = {
      channel: 'email',
      recipient: email,
      template: 'password-reset', // Using a simple template for OTP
      data: {
        otpCode,
        purpose,
      },
    };

    return this.sendNotification(request);
  }
}

export default new NotificationService();