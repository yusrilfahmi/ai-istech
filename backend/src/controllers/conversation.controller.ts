import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export async function listConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to list conversations' });
  }
}

export async function createConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const title = req.body.title || 'New Chat';

    const result = await pool.query(
      `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *`,
      [userId, title]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
}

export async function getConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM conversations
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversation' });
  }
}

export async function deleteConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const result = await pool.query(
      `DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete conversation' });
  }
}
