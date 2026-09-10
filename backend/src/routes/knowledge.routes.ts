import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  listKnowledge,
  uploadKnowledge,
  getKnowledge,
  updateKnowledge,
  confirmKnowledge,
  archiveKnowledge,
  deleteKnowledge,
  listDatasets,
  createDataset,
} from '../controllers/knowledge.controller';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10);

// Use in-memory storage so uploaded files are directly sent to Webhook without saving locally
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.csv', '.xlsx', '.xls', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not allowed`));
    }
  },
});

const router = Router();

// All knowledge routes require auth + admin/master role
router.use(authMiddleware);
router.use(requireRole('admin', 'master'));

router.get('/', listKnowledge);
router.post('/', upload.single('file'), uploadKnowledge);
router.get('/datasets', listDatasets);
router.post('/datasets', createDataset);
router.get('/:id', getKnowledge);
router.patch('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);
router.post('/:id/confirm', confirmKnowledge);
router.post('/:id/archive', archiveKnowledge);

export default router;
