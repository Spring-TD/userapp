import nodemailer from 'nodemailer';
import { config } from '../config';

// Create reusable transporter object using Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env['MAILTRAP_HOST'] || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env['MAILTRAP_PORT'] || '2525'),
  auth: {
    user: process.env['MAILTRAP_USER'],
    pass: process.env['MAILTRAP_PASS'],
  },
});

export const sendOtpEmail = async (to: string, otp: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"Airsign Team" <${process.env['SMTP_FROM'] || 'no-reply@airsign.com'}>`,
      to,
      subject: "Your Airsign Login Code",
      text: `Your login code is: ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome back!</h2>
          <p>Here is your 6-digit code to log in to Airsign:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="letter-spacing: 5px; color: #333;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
