import nodemailer from 'nodemailer';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * Email Service for sending notifications
 * Currently uses mock implementation, ready for SMTP integration
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  private async initializeTransporter(): Promise<void> {
    try {
      // For development, we'll use a mock transporter
      // In production, this would use the SMTP configuration
      if (config.env === 'production') {
        this.transporter = nodemailer.createTransport({
          host: config.email.smtp.host,
          port: config.email.smtp.port,
          secure: config.email.smtp.secure,
          auth: config.email.smtp.auth,
        });

        // Verify connection
        if (this.transporter) {
          await this.transporter.verify();
        }
        this.isConfigured = true;
        logger.info('Email service configured successfully');
      } else {
        // Mock transporter for development
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
        this.isConfigured = true;
        logger.info('Email service configured (mock mode)');
      }
    } catch (error) {
      logger.error('Failed to initialize email service', { error: error instanceof Error ? error.message : 'Unknown error' });
      this.isConfigured = false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    try {
      if (!this.isConfigured || !this.transporter) {
        logger.warn('Email service not configured, logging password reset token');
        logger.info('Password Reset Token', { 
          email, 
          userName, 
          resetToken: resetToken.substring(0, 20) + '...',
          resetUrl: `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password?token=${resetToken}`
        });
        return true;
      }

      const resetUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: 'Password Reset Request',
        html: this.getPasswordResetEmailTemplate(userName, resetUrl),
        text: this.getPasswordResetEmailText(userName, resetUrl)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (config.env === 'production') {
        logger.info('Password reset email sent', { 
          email, 
          messageId: info.messageId 
        });
      } else {
        logger.info('Password reset email (mock)', { 
          email, 
          resetUrl,
          messageId: info.messageId 
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to send password reset email', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email 
      });
      return false;
    }
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(email: string, verificationToken: string, userName: string): Promise<boolean> {
    try {
      if (!this.isConfigured || !this.transporter) {
        logger.warn('Email service not configured, logging verification token');
        logger.info('Email Verification Token', { 
          email, 
          userName, 
          verificationToken: verificationToken.substring(0, 20) + '...',
          verificationUrl: `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
        });
        return true;
      }

      const verificationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: 'Verify Your Email Address',
        html: this.getEmailVerificationTemplate(userName, verificationUrl),
        text: this.getEmailVerificationText(userName, verificationUrl)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (config.env === 'production') {
        logger.info('Email verification sent', { 
          email, 
          messageId: info.messageId 
        });
      } else {
        logger.info('Email verification (mock)', { 
          email, 
          verificationUrl,
          messageId: info.messageId 
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to send email verification', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email 
      });
      return false;
    }
  }

  /**
   * Send password change notification email
   */
  async sendPasswordChangeNotification(email: string, userName: string): Promise<boolean> {
    try {
      if (!this.isConfigured || !this.transporter) {
        logger.warn('Email service not configured, logging password change notification');
        logger.info('Password Change Notification', { email, userName });
        return true;
      }

      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: 'Password Changed Successfully',
        html: this.getPasswordChangeTemplate(userName),
        text: this.getPasswordChangeText(userName)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (config.env === 'production') {
        logger.info('Password change notification sent', { 
          email, 
          messageId: info.messageId 
        });
      } else {
        logger.info('Password change notification (mock)', { 
          email, 
          messageId: info.messageId 
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to send password change notification', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email 
      });
      return false;
    }
  }

  /**
   * Get password reset email HTML template
   */
  private getPasswordResetEmailTemplate(userName: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f4f4f4; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password. Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
            <p>If you didn't request this password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get password reset email text template
   */
  private getPasswordResetEmailText(userName: string, resetUrl: string): string {
    return `
Password Reset Request

Hello ${userName},

We received a request to reset your password. Click the link below to reset your password:

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

This is an automated message, please do not reply to this email.
    `;
  }

  /**
   * Get email verification HTML template
   */
  private getEmailVerificationTemplate(userName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f4f4f4; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Welcome! Please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #28a745;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get email verification text template
   */
  private getEmailVerificationText(userName: string, verificationUrl: string): string {
    return `
Email Verification

Hello ${userName},

Welcome! Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

This is an automated message, please do not reply to this email.
    `;
  }

  /**
   * Get password change notification HTML template
   */
  private getPasswordChangeTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Changed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f4f4f4; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed Successfully</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get password change notification text template
   */
  private getPasswordChangeText(userName: string): string {
    return `
Password Changed Successfully

Hello ${userName},

Your password has been successfully changed.

If you didn't make this change, please contact our support team immediately.

This is an automated message, please do not reply to this email.
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();
