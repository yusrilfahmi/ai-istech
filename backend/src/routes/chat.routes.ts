import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { createMessage } from '../controllers/chat.controller';

const router = Router();

// POST /api/chat — alternative endpoint for quick message sending
router.post('/', authMiddleware, createMessage);

export default router;
