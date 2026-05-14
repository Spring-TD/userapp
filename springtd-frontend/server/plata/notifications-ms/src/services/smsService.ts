import { Twilio } from 'twilio';
import { config } from '../config/environment';

export interface SMSOptions {
  to: string;
  message: string;
}

export class SMSService {
  private twilioClient: Twilio | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client
   */
  private initializeTwilio(): void {
    try {
      const { accountSid, authToken, phoneNumber } = config.twilio;

      if (!accountSid || !authToken || !phoneNumber) {
        console.log('[SMSService] Twilio not configured - SMS service disabled');
        this.isEnabled = false;
        return;
      }

      this.twilioClient = new Twilio(accountSid, authToken);
      this.isEnabled = true;
      console.log('[SMSService] Twilio SMS service initialized successfully');
    } catch (error) {
      console.error('[SMSService] Failed to initialize SMS service:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Check if SMS service is enabled
   */
  isSMSEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Send SMS notification
   */
  async sendSMS(options: SMSOptions): Promise<boolean> {
    if (!this.isEnabled || !this.twilioClient) {
      console.log('[SMSService] SMS service not available, skipping SMS');
      return false;
    }

    try {
      console.log(`[SMSService] Sending SMS to: ${options.to}`);

      const message = await this.twilioClient.messages.create({
        body: options.message,
        from: config.twilio.phoneNumber,
        to: options.to
      });

      console.log(`[SMSService] SMS sent successfully. MessageSid: ${message.sid}`);
      return true;
    } catch (error: any) {
      console.error('[SMSService] Failed to send SMS:', error.message);
      return false;
    }
  }
}

export default new SMSService();

