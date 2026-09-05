import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create SMTP Transporter
// Defaults to Gmail SMTP if SMTP_USER and SMTP_PASS are provided in environment variables
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpUser = process.env.SMTP_USER || 'orderblockdetector@gmail.com';
const smtpPass = (process.env.SMTP_PASS || 'ifdufnaxxqacomvx').replace(/\s+/g, '');
const smtpFrom = process.env.SMTP_FROM || `"Order Block Detector" <${smtpUser}>`;

function createTransporter(user: string, pass: string): nodemailer.Transporter {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
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
    // 1. Check for Brevo HTTP API (Port 443 - Never blocked by cloud firewalls)
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'Order Block Detector', email: process.env.SMTP_USER || smtpUser || 'orderblockdetector@gmail.com' },
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text || options.subject
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          console.log(`✅ [EmailService - Brevo HTTPS] Email dispatched to ${options.to} (Message ID: ${data.messageId})`);
          return { success: true, messageId: data.messageId };
        } else {
          const errText = await response.text();
          console.warn(`⚠️ [EmailService - Brevo HTTPS] Response error:`, errText);
        }
      } catch (err: any) {
        console.warn(`⚠️ [EmailService - Brevo HTTPS] Network exception:`, err.message);
      }
    }

    // 2. Check for Resend HTTP API (Port 443)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Order Block Detector <onboarding@resend.dev>',
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text || options.subject
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          console.log(`✅ [EmailService - Resend HTTPS] Email dispatched to ${options.to} (ID: ${data.id})`);
          return { success: true, messageId: data.id };
        } else {
          const errText = await response.text();
          console.warn(`⚠️ [EmailService - Resend HTTPS] Response error:`, errText);
        }
      } catch (err: any) {
        console.warn(`⚠️ [EmailService - Resend HTTPS] Network exception:`, err.message);
      }
    }

    // 3. Fallback to Gmail SMTP Transporter (Localhost & environments where outbound SMTP is allowed)
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

      console.log(`✅ [EmailService - SMTP] Real email dispatched to ${options.to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } else {
      console.log(`ℹ️ [EmailService] Simulated delivery to ${options.to}.`);
      return { success: true, messageId: `sim_${Date.now()}` };
    }
  } catch (err: any) {
    console.error(`❌ [EmailService] Failed to send email to ${options.to}:`, err.message);
    return { success: false, error: err.message };
  }
}
