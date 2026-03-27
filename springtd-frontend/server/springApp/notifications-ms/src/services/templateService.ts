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
    
    // Simple variable substitution: {{variableName}}
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const value = data[key] !== null && data[key] !== undefined ? String(data[key]) : '';
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
      'contract-submission': 'Contract Submitted Successfully',
      'kyc-approved': 'KYC Verification Approved',
      'kyc-rejected': 'KYC Verification Status Update'
    };

    return defaultSubjects[templateName] || 'Notification from SpringTD';
  }
}

export default new TemplateService();

