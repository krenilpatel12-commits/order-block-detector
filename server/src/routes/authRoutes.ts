import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../db/db.js';
import { authenticateToken, AuthRequest, JWT_SECRET } from '../middleware/authMiddleware.js';
import { sendMailDirect } from '../engine/emailService.js';

export const authRouter = Router();

// Strict RFC-compliant email regex validator
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// 1. Send OTP for Email Verification during Registration
authRouter.post('/send-otp', async (req, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify valid email format & domain structure
    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address (e.g. yourname@gmail.com).' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    // Check if account already exists
    const existing = dbGet<{
      id: number;
      email: string;
      password_hash: string;
      name: string;
      role: 'USER' | 'ADMIN';
      is_owner: number;
      created_at: string;
    }>('SELECT id, email, password_hash, name, role, is_owner, created_at FROM users WHERE email = ?', [cleanEmail]);

    if (existing) {
      const isPasswordMatch = bcrypt.compareSync(password, existing.password_hash);
      if (isPasswordMatch) {
        // Auto-login seamless path
        const isOwner = existing.is_owner === 1 || existing.role === 'ADMIN';
        const token = jwt.sign({ id: existing.id, email: existing.email }, JWT_SECRET, { expiresIn: '30d' });

        res.status(200).json({
          message: 'Welcome back! Logged in to your existing account.',
          alreadyRegistered: true,
          token,
          user: {
            id: existing.id,
            email: existing.email,
            name: existing.name,
            role: existing.role,
            isOwner,
            createdAt: existing.created_at
          }
        });
        return;
      } else {
        res.status(400).json({
          error: 'An account with this email address already exists. Please log in with your password or use a different email.',
          alreadyExists: true
        });
        return;
      }
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const displayName = (name && name.trim()) ? name.trim() : cleanEmail.split('@')[0];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Delete existing pending OTP for this email if any
    dbRun('DELETE FROM email_otps WHERE email = ?', [cleanEmail]);

    // Save pending OTP
    dbRun(
      'INSERT INTO email_otps (email, otp_code, name, password_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanEmail, otpCode, displayName, passwordHash, expiresAt, now.toISOString()]
    );

    // Rendered email template
    const emailSubject = `Your Order Block Detector Verification Code: ${otpCode}`;
    const emailHtml = `
      <div style="background-color: #0b0f19; color: #f8fafc; font-family: sans-serif; padding: 30px; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid #1e293b;">
        <h2 style="color: #10b981; margin-top: 0;">ORDER BLOCK DETECTOR</h2>
        <p style="font-size: 14px; color: #94a3b8;">Email Verification Required</p>
        <p style="font-size: 14px; line-height: 1.5;">Hi <strong>${displayName}</strong>, welcome to Order Block Detector! Use the 6-digit verification code below to activate your free trading account:</p>
        <div style="background-color: #020617; border: 1px solid #334155; padding: 18px; border-radius: 12px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="font-size: 12px; color: #64748b;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `;

    // Save to sent_emails archive
    dbRun(
      'INSERT INTO sent_emails (id, to_email, subject, html_content, text_content, symbol, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`otp_${Date.now()}_${Math.random().toString(36).substring(7)}`, cleanEmail, emailSubject, emailHtml, `Your verification code is ${otpCode}`, 'AUTH', now.toISOString()]
    );

    // Dispatch real email via Nodemailer asynchronously so the user request is never stalled
    sendMailDirect({
      to: cleanEmail,
      subject: emailSubject,
      html: emailHtml,
      text: `Your Order Block Detector verification code is ${otpCode}`
    }).then(() => {
      console.log(`📧 [EMAIL OTP DISPATCHED TO GMAIL] To: ${cleanEmail} | OTP: ${otpCode}`);
    }).catch((err) => {
      console.warn(`⚠️ [EMAIL OTP DISPATCH WARNING] Background email delivery note:`, err.message || err);
    });

    console.log(`\n========================================`);
    console.log(`📧 [EMAIL OTP PREPARED]`);
    console.log(`To: ${cleanEmail}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`Expires: 10 minutes`);
    console.log(`========================================\n`);

    res.json({
      message: `Verification code sent to ${cleanEmail}. Please check your inbox or spam folder.`,
      email: cleanEmail,
      expiresIn: 600
    });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Internal server error sending verification code.' });
  }
});

// 2. Verify OTP and Activate Account
authRouter.post('/verify-otp', async (req, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const pending = dbGet<{
      id: number;
      email: string;
      otp_code: string;
      name: string;
      password_hash: string;
      expires_at: string;
      created_at: string;
    }>('SELECT * FROM email_otps WHERE email = ?', [cleanEmail]);

    if (!pending) {
      res.status(400).json({ error: 'No active verification request found. Please request a new code.' });
      return;
    }

    // Check expiration
    if (new Date() > new Date(pending.expires_at)) {
      dbRun('DELETE FROM email_otps WHERE email = ?', [cleanEmail]);
      res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
      return;
    }

    // Check OTP Match
    if (pending.otp_code !== cleanOtp) {
      res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
      return;
    }

    // Verified! Create or update user in database
    const now = new Date().toISOString();
    let existingUser = dbGet<{ id: number; email: string; name: string; role: 'USER' | 'ADMIN'; is_owner: number; created_at: string }>(
      'SELECT id, email, name, role, is_owner, created_at FROM users WHERE email = ?',
      [cleanEmail]
    );

    let userId: number;
    let userName: string = pending.name;
    let userRole: 'USER' | 'ADMIN' = 'USER';
    let isOwner: boolean = false;
    let createdAt: string = now;

    if (existingUser) {
      userId = existingUser.id;
      userName = existingUser.name || pending.name;
      userRole = existingUser.role;
      isOwner = existingUser.is_owner === 1 || existingUser.role === 'ADMIN';
      createdAt = existingUser.created_at;
      // Update with newly verified password
      dbRun('UPDATE users SET password_hash = ?, name = ? WHERE id = ?', [pending.password_hash, userName, userId]);
    } else {
      dbRun(
        'INSERT INTO users (email, password_hash, name, role, is_owner, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [cleanEmail, pending.password_hash, pending.name, 'USER', 0, now]
      );
      const created = dbGet<{ id: number }>('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      userId = created ? created.id : 1;

      // Initialize notification preferences
      dbRun(
        `INSERT OR IGNORE INTO notification_preferences (user_id, alert_type_pref, daily_enabled, weekly_enabled, app_notifications_enabled, email_notifications_enabled, email_address)
         VALUES (?, 'BOTH', 1, 1, 1, 1, ?)`,
        [userId, cleanEmail]
      );
    }

    // Delete used OTP
    dbRun('DELETE FROM email_otps WHERE email = ?', [cleanEmail]);

    const token = jwt.sign({ id: userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      message: 'Email verified and account activated successfully!',
      token,
      user: {
        id: userId,
        email: cleanEmail,
        name: userName,
        role: userRole,
        isOwner,
        createdAt
      }
    });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error verifying code.' });
  }
});

// 3. Resend OTP
authRouter.post('/resend-otp', async (req, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const pending = dbGet<{
      id: number;
      email: string;
      name: string;
      password_hash: string;
    }>('SELECT * FROM email_otps WHERE email = ?', [cleanEmail]);

    if (!pending) {
      res.status(400).json({ error: 'No pending registration found for this email.' });
      return;
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    dbRun('UPDATE email_otps SET otp_code = ?, expires_at = ? WHERE email = ?', [newOtp, expiresAt, cleanEmail]);

    const emailSubject = `Your New Verification Code: ${newOtp}`;
    const emailHtml = `
      <div style="background-color: #0b0f19; color: #f8fafc; font-family: sans-serif; padding: 30px; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid #1e293b;">
        <h2 style="color: #10b981; margin-top: 0;">ORDER BLOCK DETECTOR</h2>
        <p style="font-size: 14px; color: #94a3b8;">New Email Verification Code</p>
        <p style="font-size: 14px; line-height: 1.5;">Hi <strong>${pending.name}</strong>, here is your new 6-digit verification code:</p>
        <div style="background-color: #020617; border: 1px solid #334155; padding: 18px; border-radius: 12px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${newOtp}</span>
        </div>
        <p style="font-size: 12px; color: #64748b;">This code is valid for 10 minutes.</p>
      </div>
    `;

    dbRun(
      'INSERT INTO sent_emails (id, to_email, subject, html_content, text_content, symbol, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`otp_${Date.now()}_${Math.random().toString(36).substring(7)}`, cleanEmail, emailSubject, emailHtml, `Your new verification code is ${newOtp}`, 'AUTH', now.toISOString()]
    );

    // Dispatch real email via Nodemailer asynchronously so the client request is never stalled
    sendMailDirect({
      to: cleanEmail,
      subject: emailSubject,
      html: emailHtml,
      text: `Your new verification code is ${newOtp}`
    }).then(() => {
      console.log(`📧 [RESENT OTP CODE DISPATCHED TO GMAIL] To: ${cleanEmail} | Code: ${newOtp}`);
    }).catch((err) => {
      console.warn(`⚠️ [RESENT OTP DISPATCH WARNING] Background email delivery note:`, err.message || err);
    });

    res.json({
      message: `A new verification code was sent to ${cleanEmail}. Please check your inbox or spam folder.`,
      expiresIn: 600
    });
  } catch (err: any) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Internal server error resending code.' });
  }
});

// 4. Standard Sign Up (Direct Fallback)
authRouter.post('/signup', async (req, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address (e.g. yourname@gmail.com).' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = dbGet<{
      id: number;
      email: string;
      password_hash: string;
      name: string;
      role: 'USER' | 'ADMIN';
      is_owner: number;
      created_at: string;
    }>('SELECT id, email, password_hash, name, role, is_owner, created_at FROM users WHERE email = ?', [cleanEmail]);

    if (existing) {
      const isPasswordMatch = bcrypt.compareSync(password, existing.password_hash);
      if (isPasswordMatch) {
        const isOwner = existing.is_owner === 1 || existing.role === 'ADMIN';
        const token = jwt.sign({ id: existing.id, email: existing.email }, JWT_SECRET, { expiresIn: '30d' });

        res.status(200).json({
          message: 'Welcome back! Logged in to your existing account.',
          token,
          user: {
            id: existing.id,
            email: existing.email,
            name: existing.name,
            role: existing.role,
            isOwner,
            createdAt: existing.created_at
          }
        });
        return;
      } else {
        res.status(400).json({
          error: 'An account with this email address already exists. Please log in with your password or use a different email.',
          alreadyExists: true
        });
        return;
      }
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();
    const displayName = (name && name.trim()) ? name.trim() : cleanEmail.split('@')[0];

    const insertResult = dbRun(
      'INSERT INTO users (email, password_hash, name, role, is_owner, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanEmail, passwordHash, displayName, 'USER', 0, now]
    );

    const userId = insertResult.lastInsertRowid;

    dbRun(
      `INSERT INTO notification_preferences (user_id, alert_type_pref, daily_enabled, weekly_enabled, app_notifications_enabled, email_notifications_enabled, email_address)
       VALUES (?, 'BOTH', 1, 1, 1, 1, ?)`,
      [userId, cleanEmail]
    );

    const token = jwt.sign({ id: userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: userId,
        email: cleanEmail,
        name: displayName,
        role: 'USER',
        isOwner: false,
        createdAt: now
      }
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error during account creation.' });
  }
});

// 5. Login
authRouter.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address (e.g. yourname@gmail.com).' });
      return;
    }

    const user = dbGet<{
      id: number;
      email: string;
      password_hash: string;
      name: string;
      role: 'USER' | 'ADMIN';
      is_owner: number;
      created_at: string;
    }>('SELECT id, email, password_hash, name, role, is_owner, created_at FROM users WHERE email = ?', [cleanEmail]);

    if (!user) {
      res.status(401).json({ error: 'No account found with this email. Please check your email or click Sign Up.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Incorrect password. Please try again.' });
      return;
    }

    const isOwner = user.is_owner === 1 || user.role === 'ADMIN';
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isOwner,
        createdAt: user.created_at
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 6. Get Current User Profile
authRouter.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = dbGet<{
      id: number;
      email: string;
      name: string;
      role: 'USER' | 'ADMIN';
      is_owner: number;
      created_at: string;
    }>('SELECT id, email, name, role, is_owner, created_at FROM users WHERE id = ?', [userId]);

    if (!user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const isOwner = user.is_owner === 1 || user.role === 'ADMIN';

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isOwner,
        createdAt: user.created_at
      }
    });
  } catch (err: any) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Internal server error fetching profile.' });
  }
});

// 7. Update Profile
authRouter.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const existing = dbGet<{ id: number }>('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, userId]);
    if (existing) {
      res.status(400).json({ error: 'This email is already in use by another account.' });
      return;
    }

    dbRun('UPDATE users SET name = ?, email = ? WHERE id = ?', [name.trim(), cleanEmail, userId]);
    dbRun('UPDATE notification_preferences SET email_address = ? WHERE user_id = ?', [cleanEmail, userId]);

    const updatedUser = dbGet<{
      id: number;
      email: string;
      name: string;
      role: 'USER' | 'ADMIN';
      is_owner: number;
      created_at: string;
    }>('SELECT id, email, name, role, is_owner, created_at FROM users WHERE id = ?', [userId]);

    const isOwner = updatedUser?.is_owner === 1 || updatedUser?.role === 'ADMIN';

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        role: updatedUser!.role,
        isOwner,
        createdAt: updatedUser!.created_at
      }
    });
  } catch (err: any) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error updating profile.' });
  }
});

// 8. Change Password
authRouter.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = dbGet<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ error: 'Incorrect current password.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    res.json({ message: 'Password changed successfully.' });
  } catch (err: any) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Internal server error changing password.' });
  }
});

// 9. Forgot Password - Send 6-Digit Reset Code to User's Gmail
authRouter.post('/forgot-password/send-otp', async (req, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const user = dbGet<{ id: number; name: string; email: string }>('SELECT id, name, email FROM users WHERE email = ?', [cleanEmail]);
    if (!user) {
      res.status(404).json({ error: 'No account found with this email address. Please check your email or Sign Up.' });
      return;
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    dbRun('DELETE FROM password_resets WHERE email = ?', [cleanEmail]);
    dbRun(
      'INSERT INTO password_resets (email, otp_code, expires_at, created_at) VALUES (?, ?, ?, ?)',
      [cleanEmail, otpCode, expiresAt, now.toISOString()]
    );

    const emailSubject = `Order Block Detector — Password Reset Code: ${otpCode}`;
    const emailHtml = `
      <div style="background-color: #0b0f19; color: #f8fafc; font-family: sans-serif; padding: 30px; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid #1e293b;">
        <h2 style="color: #10b981; margin-top: 0;">ORDER BLOCK DETECTOR</h2>
        <p style="font-size: 14px; color: #94a3b8;">Password Reset Verification Code</p>
        <p style="font-size: 14px; line-height: 1.5;">Hi <strong>${user.name}</strong>, we received a request to reset your password. Use the 6-digit code below to set your new password:</p>
        <div style="background-color: #020617; border: 1px solid #334155; padding: 18px; border-radius: 12px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="font-size: 12px; color: #64748b;">This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `;

    dbRun(
      'INSERT INTO sent_emails (id, to_email, subject, html_content, text_content, symbol, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`reset_${Date.now()}_${Math.random().toString(36).substring(7)}`, cleanEmail, emailSubject, emailHtml, `Your password reset code is ${otpCode}`, 'AUTH', now.toISOString()]
    );

    // Dispatch real email via Nodemailer asynchronously so the client request is never stalled
    sendMailDirect({
      to: cleanEmail,
      subject: emailSubject,
      html: emailHtml,
      text: `Your password reset code is ${otpCode}`
    }).then(() => {
      console.log(`🔑 [PASSWORD RESET OTP DISPATCHED] To: ${cleanEmail} | Code: ${otpCode}`);
    }).catch((err) => {
      console.warn(`⚠️ [PASSWORD RESET DISPATCH WARNING] Background email delivery note:`, err.message || err);
    });

    res.json({
      message: `Password reset code sent to ${cleanEmail}. Please check your inbox or spam folder.`,
      email: cleanEmail,
      expiresIn: 600
    });
  } catch (err: any) {
    console.error('Forgot password send-otp error:', err);
    res.status(500).json({ error: 'Internal server error sending password reset code.' });
  }
});

// 10. Forgot Password - Verify Code & Set New Password
authRouter.post('/forgot-password/reset', async (req, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({ error: 'Email, 6-digit verification code, and new password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const pending = dbGet<{ id: number; email: string; otp_code: string; expires_at: string }>(
      'SELECT * FROM password_resets WHERE email = ?',
      [cleanEmail]
    );

    if (!pending) {
      res.status(400).json({ error: 'No active password reset request found. Please request a new code.' });
      return;
    }

    if (new Date() > new Date(pending.expires_at)) {
      dbRun('DELETE FROM password_resets WHERE email = ?', [cleanEmail]);
      res.status(400).json({ error: 'Verification code has expired. Please request a new reset code.' });
      return;
    }

    if (pending.otp_code !== cleanOtp) {
      res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
      return;
    }

    const user = dbGet<{ id: number; name: string; email: string; role: 'USER' | 'ADMIN'; is_owner: number; created_at: string }>(
      'SELECT id, name, email, role, is_owner, created_at FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    // Update password in database
    dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);

    // Delete used reset code
    dbRun('DELETE FROM password_resets WHERE email = ?', [cleanEmail]);

    const isOwner = user.is_owner === 1 || user.role === 'ADMIN';
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Password reset successfully! You are now logged in.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isOwner,
        createdAt: user.created_at
      }
    });
  } catch (err: any) {
    console.error('Forgot password reset error:', err);
    res.status(500).json({ error: 'Internal server error resetting password.' });
  }
});
