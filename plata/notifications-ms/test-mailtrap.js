const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testMailtrap() {
  console.log('Setting up Mailtrap transporter...');
  
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    secure: process.env.MAILTRAP_SECURE === 'true', // false for port 587
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASSWORD
    }
  });

  // Verify connection configuration
  try {
    await transporter.verify();
    console.log('Server is ready to take our messages!');
  } catch (error) {
    console.error('Failed to verify connection to Mailtrap:', error);
    return;
  }

  // Define email options
  // Note: Since this is live.smtp.mailtrap.io (Mailtrap Sending), this will attempt to actually send the email.
  // We recommend changing the 'to' parameter to your personal email address to verify receipt.
  const mailOptions = {
    from: process.env.MAILTRAP_FROM_EMAIL || 'support@buildwithplatter.io',
    to: 'test@example.com', // ⚠️ CHANGE THIS TO YOUR REAL EMAIL ADDRESS ⚠️
    subject: 'Mailtrap Test from notifications-ms',
    text: 'Hello! This is a test email sent directly from a Node script to verify the Mailtrap integration.',
    html: '<h3>Hello!</h3><p>This is a test email sent directly from a Node script to verify the Mailtrap integration.</p>'
  };

  console.log('Attempting to send an email to', mailOptions.to, '...');

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error occurred while sending email:', error);
  }
}

testMailtrap();
