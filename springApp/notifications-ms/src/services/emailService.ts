import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/environment';

const MAILTRAP_SEND_URL = 'https://send.api.mailtrap.io/api/send';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private useEmailApi: boolean = false;
  private isEnabled: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Prefer Mailtrap Email API (HTTP) when API token is set; otherwise use SMTP.
   */
  private initialize(): void {
    const { apiToken, host, port, secure, user, password } = config.mailtrap;

    if (apiToken && apiToken.trim() !== '') {
      this.useEmailApi = true;
      this.isEnabled = true;
      console.log('[EmailService] Mailtrap Email API (HTTP) enabled');
      return;
    }

    if (!host || !user || !password) {
      console.log('[EmailService] Mailtrap not configured - email service disabled');
      this.isEnabled = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: password },
        ...(port === 587 && { requireTLS: true })
      });
      this.isEnabled = true;
      console.log('[EmailService] Mailtrap SMTP initialized successfully');
    } catch (error) {
      console.error('[EmailService] Failed to initialize SMTP:', error);
      this.isEnabled = false;
    }
  }

  isEmailEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Send via Mailtrap Email API (POST send.api.mailtrap.io).
   */
  private async sendViaEmailApi(options: EmailOptions): Promise<boolean> {
    const token = config.mailtrap.apiToken;
    const fromEmail = config.mailtrap.fromEmail;
    const fromName = options.fromName || config.mailtrap.fromName;

    try {
      const body = {
        from: { email: fromEmail, name: fromName },
        to: [{ email: options.to }],
        subject: options.subject,
        text: options.text || (options.html ? options.html.replace(/<[^>]*>/g, '').trim() : ''),
        html: options.html
      };

      const res = await fetch(MAILTRAP_SEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': token
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('[EmailService] Mailtrap API error:', res.status, err);
        return false;
      }

      console.log(`[EmailService] Email sent via API to: ${options.to}`);
      return true;
    } catch (error: any) {
      console.error('[EmailService] Mailtrap API request failed:', error.message);
      return false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('[EmailService] Email service not available, skipping email');
      return false;
    }

    if (this.useEmailApi) {
      return this.sendViaEmailApi(options);
    }

    if (!this.transporter) return false;

    try {
      console.log(`[EmailService] Sending email to: ${options.to}`);

      const info = await this.transporter.sendMail({
        from: {
          address: config.mailtrap.fromEmail,
          name: options.fromName || config.mailtrap.fromName
        },
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html
      });

      console.log(`[EmailService] Email sent successfully. MessageId: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[EmailService] Failed to send email:', error.message);
      return false;
    }
  }
}

export default new EmailService();

