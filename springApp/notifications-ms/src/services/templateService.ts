import { NotificationChannel } from '../types/notification';
import * as fs from 'fs';
import * as path from 'path';

export interface TemplateData {
  [key: string]: any;
}

export class TemplateService {
  private templatesDir: string;

  constructor() {
    // Templates directory - can be configured via env or use default
    this.templatesDir = process.env.TEMPLATES_DIR || path.join(__dirname, '../../templates');

    // Ensure templates directory exists
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
      console.log(`[TemplateService] Created templates directory: ${this.templatesDir}`);
    }
  }

  /**
   * Render template with data
   */
  private renderTemplate(template: string, data: TemplateData): string {
    let rendered = template;
    const templateData: TemplateData = {
      ...data,
      appName: typeof data.appName === 'string' && data.appName.trim() ? data.appName.trim() : 'SpringTD',
      year: data.year ?? new Date().getFullYear()
    };

    // Simple variable substitution: {{variableName}}
    Object.keys(templateData).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const value = templateData[key] !== null && templateData[key] !== undefined ? String(templateData[key]) : '';
      rendered = rendered.replace(regex, value);
    });

    return rendered;
  }

  /**
   * Load template from file
   */
  private loadTemplate(templateName: string, channel: NotificationChannel): string {
    const templatePath = path.join(this.templatesDir, `${templateName}.${channel}.txt`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    return fs.readFileSync(templatePath, 'utf-8');
  }

  /**
   * Get email template (HTML)
   */
  getEmailTemplate(templateName: string, data: TemplateData): { html: string; text: string } {
    try {
      // Try to load HTML template
      const htmlPath = path.join(this.templatesDir, `${templateName}.email.html`);
      const textPath = path.join(this.templatesDir, `${templateName}.email.txt`);

      let html = '';
      let text = '';

      if (fs.existsSync(htmlPath)) {
        html = this.renderTemplate(fs.readFileSync(htmlPath, 'utf-8'), data);
      }

      if (fs.existsSync(textPath)) {
        text = this.renderTemplate(fs.readFileSync(textPath, 'utf-8'), data);
      } else if (html) {
        // Generate plain text from HTML if no text template exists
        text = html.replace(/<[^>]*>/g, '').trim();
      }

      return { html, text };
    } catch (error: any) {
      throw new Error(`Failed to load email template ${templateName}: ${error.message}`);
    }
  }

  /**
   * Get SMS template
   */
  getSMSTemplate(templateName: string, data: TemplateData): string {
    try {
      const template = this.loadTemplate(templateName, 'sms');
      return this.renderTemplate(template, data);
    } catch (error: any) {
      throw new Error(`Failed to load SMS template ${templateName}: ${error.message}`);
    }
  }

  /**
   * In-app title + body from `{name}.in-app.json`: { "title": "...", "body": "..." } with {{placeholders}}.
   */
  getInAppPayload(templateName: string, data: TemplateData): { title: string; body: string } {
    const jsonPath = path.join(this.templatesDir, `${templateName}.in-app.json`);
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`In-app template not found: ${jsonPath}`);
    }
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as { title?: string; body?: string };
    if (raw.title === undefined || raw.body === undefined) {
      throw new Error(`In-app template ${templateName} must include "title" and "body"`);
    }
    return {
      title: this.renderTemplate(String(raw.title), data),
      body: this.renderTemplate(String(raw.body), data)
    };
  }

  /**
   * Get email subject from template or default
   */
  getEmailSubject(templateName: string, data: TemplateData): string {
    try {
      const subjectPath = path.join(this.templatesDir, `${templateName}.email.subject.txt`);
      if (fs.existsSync(subjectPath)) {
        return this.renderTemplate(fs.readFileSync(subjectPath, 'utf-8'), data);
      }
    } catch (error) {
      // Fall through to default
    }

    // Default subjects based on template name
    const defaultSubjects: Record<string, string> = {
      'email-verification': 'Verify Your Email Address',
      'password-reset': 'Password Reset Request',
      'otp': 'Your SpringTD One-Time Code',
      'contract-submission': 'Contract Submitted Successfully',
      'kyc-approved': 'KYC Verification Approved',
      'kyc-rejected': 'KYC Verification Status Update',
      'app-created': 'App created successfully',
      'product-created': 'Product created successfully',
      'merchant-registered': 'New merchant registered',
      'compliance-incomplete': 'Compliance incomplete',
      'withdrawal-alert': 'Withdrawal alert',
      'support-ticket-new': 'New support ticket',
      'merchant-account-status': 'Merchant account update',
      'merchant-product-status': 'Product status update',
      'password-change': 'Password changed',
      'app-deactivated': 'App update',
      'app-reactivated': 'App active again',
      'product-configuration': 'Product configuration update',
      'commodity-enrolled': 'Payment Confirmed for Your Order',
      'commodity-withdrawn': 'Payout Processed for Your Commodity Sale',
      'commodity-payout-processed': 'Payout Processed for Your Commodity Sale',
      'loan-repayment-reminder': 'Upcoming Loan Repayment Due',
      'loan-closure': 'Loan Fully Repaid — Congratulations',
      'mortgage-application-submitted': "We've Received Your Mortgage Application",
      'loan-application-submitted': "We've Received Your Loan Application",
      'mortgage-disbursed': 'Your Loan Has Been Disbursed',
      'loan-disbursed': 'Your Loan Has Been Disbursed',
      'savings-plan-created': 'Your Savings Plan is Live',
      'investment-active': 'Your Investment is Now Active'
    };

    return defaultSubjects[templateName] || 'Notification from SpringTD';
  }
}

export default new TemplateService();
