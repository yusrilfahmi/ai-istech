import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'master' | 'user';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const decoded = jwt.verify(token, secret) as { userId: string };

    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'User not found or inactive' });
      return;
    }

    req.user = result.rows[0] as AuthUser;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
