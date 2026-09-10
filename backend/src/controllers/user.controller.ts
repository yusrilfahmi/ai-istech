import { Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { getAuditLogs } from '../services/audit.service';

// GET /api/users
export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
}

// POST /api/users
export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'Name, email, and password are required' });
      return;
    }

    // Check duplicate email
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, error: 'Email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const validRole = ['admin', 'master', 'user'].includes(role) ? role : 'user';

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, passwordHash, validRole]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
}

// PATCH /api/users/:id
export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, role, is_active, password } = req.body;

    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Prevent admin from accidentally demoting or disabling own account
    if (req.user!.id === id && role !== undefined && role !== 'admin') {
      res.status(400).json({ success: false, error: 'You cannot demote your own admin account.' });
      return;
    }
    if (req.user!.id === id && is_active === false) {
      res.status(400).json({ success: false, error: 'You cannot disable your own admin account.' });
      return;
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(name);
    }
    if (role !== undefined && ['admin', 'master', 'user'].includes(role)) {
      updates.push(`role = $${idx++}`);
      params.push(role);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(is_active);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${idx++}`);
      params.push(hash);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, is_active, created_at, updated_at`,
      params
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
}

// GET /api/users/audit-logs
export async function listAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { entity_type, entity_id, user_id, action, limit, offset } = req.query;

    const logs = await getAuditLogs({
      entityType: entity_type as string,
      entityId: entity_id as string,
      userId: user_id as string,
      action: action as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to list audit logs' });
  }
}
