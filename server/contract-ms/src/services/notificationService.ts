import nodemailer, { Transporter } from 'nodemailer';
import { Twilio } from 'twilio';
import { config } from '../config/environment';

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SMSNotification {
  to: string;
  message: string;
}

export class NotificationService {
  private emailTransporter: Transporter | null = null;
  private twilioClient: Twilio | null = null;
  private emailEnabled: boolean = false;
  private smsEnabled: boolean = false;

  constructor() {
    this.initializeEmailService();
    this.initializeSMSService();
  }

  /**
   * Initialize email service (SMTP)
   */
  private initializeEmailService(): void {
    try {
      if (!config.smtp.host || !config.smtp.user || !config.smtp.password) {
        console.log('[NotificationService] Email service disabled - missing SMTP configuration');
        return;
      }

      this.emailTransporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.password
        }
      });

      this.emailEnabled = true;
      console.log('[NotificationService] Email service initialized successfully');
    } catch (error) {
      console.error('[NotificationService] Failed to initialize email service:', error);
      this.emailEnabled = false;
    }
  }

  /**
   * Initialize SMS service (Twilio)
   */
  private initializeSMSService(): void {
    try {
      if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.phoneNumber) {
        console.log('[NotificationService] SMS service disabled - missing Twilio configuration');
        return;
      }

      this.twilioClient = new Twilio(config.twilio.accountSid, config.twilio.authToken);
      this.smsEnabled = true;
      console.log('[NotificationService] SMS service initialized successfully');
    } catch (error) {
      console.error('[NotificationService] Failed to initialize SMS service:', error);
      this.smsEnabled = false;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    if (!this.emailEnabled || !this.emailTransporter) {
      console.log('[NotificationService] Email service not available, skipping email');
      return false;
    }

    try {
      console.log(`[NotificationService] Sending email to: ${notification.to}`);
      
      const info = await this.emailTransporter.sendMail({
        from: config.smtp.from,
        to: notification.to,
        subject: notification.subject,
        text: notification.text || '',
        html: notification.html
      });

      console.log(`[NotificationService] Email sent successfully. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[NotificationService] Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(notification: SMSNotification): Promise<boolean> {
    if (!this.smsEnabled || !this.twilioClient) {
      console.log('[NotificationService] SMS service not available, skipping SMS');
      return false;
    }

    try {
      console.log(`[NotificationService] Sending SMS to: ${notification.to}`);
      
      const message = await this.twilioClient.messages.create({
        body: notification.message,
        from: config.twilio.phoneNumber,
        to: notification.to
      });

      console.log(`[NotificationService] SMS sent successfully. MessageSid: ${message.sid}`);
      return true;
    } catch (error) {
      console.error('[NotificationService] Failed to send SMS:', error);
      return false;
    }
  }

  /**
   * Send contract submission notification via email
   */
  async sendContractSubmissionEmail(
    recipientEmail: string,
    recipientName: string,
    contractName: string,
    contractType: string
  ): Promise<boolean> {
    const subject = `Contract Submitted: ${contractName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Contract Submitted Successfully</h1>
          </div>
          <div class="content">
            <p>Dear ${recipientName},</p>
            <p>Your contract has been successfully submitted and is now being processed.</p>
            <p><strong>Contract Details:</strong></p>
            <ul>
              <li><strong>Contract Name:</strong> ${contractName}</li>
              <li><strong>Contract Type:</strong> ${contractType}</li>
              <li><strong>Submission Date:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            <p>You will receive further updates regarding your contract status.</p>
            <p>Thank you for using our service!</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Dear ${recipientName},

Your contract has been successfully submitted and is now being processed.

Contract Details:
- Contract Name: ${contractName}
- Contract Type: ${contractType}
- Submission Date: ${new Date().toLocaleString()}

You will receive further updates regarding your contract status.

Thank you for using our service!
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Send contract submission notification via SMS
   */
  async sendContractSubmissionSMS(
    phoneNumber: string,
    recipientName: string,
    contractName: string
  ): Promise<boolean> {
    const message = `Hi ${recipientName}, your contract "${contractName}" has been successfully submitted. You will receive updates shortly. Thank you!`;
    
    return this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  /**
   * Check if email service is available
   */
  isEmailEnabled(): boolean {
    return this.emailEnabled;
  }

  /**
   * Check if SMS service is available
   */
  isSMSEnabled(): boolean {
    return this.smsEnabled;
  }
}
