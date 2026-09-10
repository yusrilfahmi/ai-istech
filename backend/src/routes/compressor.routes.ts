import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { listCompressorTelemetry } from '../controllers/compressor.controller';

const router = Router();

router.use(authMiddleware);

// GET /api/compressor-telemetry?page=1&limit=50
router.get('/', requireRole('admin', 'master'), listCompressorTelemetry);

export default router;
