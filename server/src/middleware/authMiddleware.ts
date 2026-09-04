import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbGet } from '../db/db.js';
import { UserProfile } from '../types/index.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'order-block-project-secure-jwt-secret-key-2026';

export interface AuthRequest extends Request {
  user?: UserProfile;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.query.token as string);

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    const user = dbGet<{
      id: number;
      email: string;
      name: string;
      role: 'USER' | 'ADMIN';
      is_owner: number;
      created_at: string;
    }>('SELECT id, email, name, role, is_owner, created_at FROM users WHERE id = ?', [payload.id]);

    if (!user) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }

    const isOwner = user.is_owner === 1 || user.role === 'ADMIN';

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isOwner,
      createdAt: user.created_at
    };

    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || (!req.user.isOwner && req.user.role !== 'ADMIN')) {
    res.status(403).json({ error: 'Master Account / Owner privileges required.' });
    return;
  }
  next();
}
