import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  listUsers,
  createUser,
  updateUser,
  listAuditLogs,
} from '../controllers/user.controller';

const router = Router();

router.use(authMiddleware);

// Audit logs — accessible by admin and master
router.get('/audit-logs', requireRole('admin', 'master'), listAuditLogs);

// User management — admin only
router.get('/', requireRole('admin'), listUsers);
router.post('/', requireRole('admin'), createUser);
router.patch('/:id', requireRole('admin'), updateUser);

export default router;
