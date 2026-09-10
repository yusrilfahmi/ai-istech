import { Router } from 'express';

import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

import {
  listMLTrainings,
  getMLTraining,
  createMLTraining,
  unlockMLTraining,
  updateMLTraining,
  deleteMLTraining,
} from '../controllers/ml-training.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('admin', 'master'));

router.get('/', listMLTrainings);
router.post('/', createMLTraining);

router.get('/:id', getMLTraining);

router.patch('/:id/unlock', unlockMLTraining);
router.patch('/:id', updateMLTraining);

router.delete('/:id', deleteMLTraining);

export default router;