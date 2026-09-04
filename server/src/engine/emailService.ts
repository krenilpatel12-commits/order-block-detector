import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create SMTP Transporter
// Defaults to Gmail SMTP if SMTP_USER and SMTP_PASS are provided in environment variables
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpFrom = process.env.SMTP_FROM || `"Order Block Detector" <${smtpUser || 'no-reply@orderblock.com'}>`;

function createTransporter(user: string, pass: string): nodemailer.Transporter {
  if (user.endsWith('@gmail.com') || (process.env.SMTP_HOST || '').includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000
    });
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000
  });
}

let transporter: nodemailer.Transporter | null = null;

if (smtpUser && smtpPass) {
  transporter = createTransporter(smtpUser, smtpPass);
  console.log(`📧 [EmailService] SMTP Transporter configured for: ${smtpUser}`);
} else {
  // Local fallback transporter when SMTP credentials are not yet set
  console.log(`⚠️ [EmailService] No SMTP_USER and SMTP_PASS set in .env. Real emails require Gmail App Password or SMTP credentials.`);
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMailDirect(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const currentUser = process.env.SMTP_USER || smtpUser;
    const currentPass = process.env.SMTP_PASS || smtpPass;

    if (!transporter && currentUser && currentPass) {
      transporter = createTransporter(currentUser, currentPass);
    }

    if (transporter) {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to: options.to,
        subject: options.subject,
        text: options.text || options.subject,
        html: options.html,
      });

      console.log(`✅ [EmailService] Real email dispatched to ${options.to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } else {
      console.log(`ℹ️ [EmailService] Simulated delivery to ${options.to} (Configure SMTP_USER & SMTP_PASS in server/.env for live Gmail dispatch).`);
      return { success: true, messageId: `sim_${Date.now()}` };
    }
  } catch (err: any) {
    console.error(`❌ [EmailService] Failed to send email to ${options.to}:`, err.message);
    return { success: false, error: err.message };
  }
}
