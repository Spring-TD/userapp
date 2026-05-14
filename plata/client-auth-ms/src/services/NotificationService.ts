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

export interface SendEmailAndInAppPayload {
  userId: string;
  email: string;
  template: string;
  data: Record<string, unknown>;
}

export interface SendEmailAndInAppResponse {
  success: boolean;
  data?: {
    inApp?: { success?: boolean; id?: string; error?: string };
    email?: { success?: boolean; id?: string; error?: string };
  };
  error?: string;
}

export class NotificationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.notificationsServiceUrl;
  }

  /**
   * Email + in-app inbox (same template + data). Fire-and-forget safe: failures are logged by caller.
   */
  async sendEmailAndInApp(payload: SendEmailAndInAppPayload): Promise<SendEmailAndInAppResponse> {
    try {
      const response = await axios.post<SendEmailAndInAppResponse>(
        `${this.baseUrl}/api/v1/notifications/send-dual`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 12000
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to send email+in-app notification:', error.message);
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.error || `Server error: ${error.response.status}`
        };
      }
      return {
        success: false,
        error: error.message || 'Failed to connect to notifications service'
      };
    }
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

  async sendOTP(recipient: string, otpCode: string, purpose: string, channel: 'email' | 'sms' = 'email'): Promise<SendNotificationResponse> {
    const request: SendNotificationRequest = {
      channel,
      recipient,
      template: 'otp',
      data: {
        otpCode,
        purpose,
      },
    };

    return this.sendNotification(request);
  }
}

export default new NotificationService();