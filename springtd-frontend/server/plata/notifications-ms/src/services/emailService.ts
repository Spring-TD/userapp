import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/environment';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize Nodemailer transporter with Mailtrap SMTP config
   */
  private initializeTransporter(): void {
    try {
      const { host, port, user, password } = config.mailtrap;

      if (!host || !user || !password) {
        console.log('[EmailService] Mailtrap not configured - email service disabled');
        this.isEnabled = false;
        return;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false, // Mailtrap uses STARTTLS on port 2525
        auth: {
          user,
          pass: password
        }
      });

      this.isEnabled = true;
      console.log('[EmailService] Mailtrap email service initialized successfully');
    } catch (error) {
      console.error('[EmailService] Failed to initialize email service:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Check if email service is enabled
   */
  isEmailEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Send email notification
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      console.log('[EmailService] Email service not available, skipping email');
      return false;
    }

    try {
      console.log(`[EmailService] Sending email to: ${options.to}`);

      const info = await this.transporter.sendMail({
        from: config.mailtrap.fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html
      });

      console.log(`[EmailService] Email sent successfully. MessageId: ${info.messageId}`);
      
      // In development, log that email went to Mailtrap inbox
      if (config.nodeEnv === 'development') {
        console.log('[EmailService] Email sent to Mailtrap inbox for testing');
      }

      return true;
    } catch (error: any) {
      console.error('[EmailService] Failed to send email:', error.message);
      return false;
    }
  }
}

export default new EmailService();

