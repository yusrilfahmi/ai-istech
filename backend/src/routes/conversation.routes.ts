import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
} from '../controllers/conversation.controller';
import { listMessages, createMessage } from '../controllers/chat.controller';

const router = Router();

// All conversation routes require authentication
router.use(authMiddleware);

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.delete('/:id', deleteConversation);

// Messages within a conversation
router.get('/:id/messages', listMessages);
router.post('/:id/messages', createMessage);

export default router;
