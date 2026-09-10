import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { getMessages, sendMessage } from '../services/chat.service';

export async function listMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id as string;

    // Verify conversation ownership
    const conv = await pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (conv.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const messages = await getMessages(conversationId);
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to list messages' });
  }
}

export async function createMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id as string;
    const { content } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ success: false, error: 'Message content is required' });
      return;
    }

    // Verify conversation ownership
    const conv = await pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (conv.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const result = await sendMessage(conversationId, userId, content.trim());

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}
