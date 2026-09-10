import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../services/audit.service';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

function getFileType(ext: string): string {
  const map: Record<string, string> = {
    '.pdf': 'pdf',
    '.csv': 'csv',
    '.xlsx': 'xlsx',
    '.xls': 'xls',
    '.doc': 'doc',
    '.docx': 'docx',
    '.txt': 'txt',
  };
  return map[ext.toLowerCase()] || 'other';
}

// GET /api/knowledge
export async function listKnowledge(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type, status } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (type) {
      conditions.push(`kf.knowledge_type = $${idx++}`);
      params.push(type);
    }
    if (status) {
      conditions.push(`kf.status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT kf.*, u.name as uploaded_by_name,
        sd.title as sop_title, sd.description as sop_description,
        sd.category as sop_category, sd.machine_type as sop_machine_type,
        sd.version as sop_version
       FROM knowledge_files kf
       LEFT JOIN users u ON u.id = kf.uploaded_by
       LEFT JOIN sop_documents sd ON sd.knowledge_file_id = kf.id
       ${where}
       ORDER BY kf.created_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List knowledge error:', error);
    res.status(500).json({ success: false, error: 'Failed to list knowledge files' });
  }
}

export function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const baseName = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

  return `${baseName || 'file'}_${timestamp}${ext.toLowerCase()}`;
}

// POST /api/knowledge
export async function uploadKnowledge(req: AuthRequest, res: Response): Promise<void> {
  const client = await pool.connect();

  try {
    const userId = req.user!.id;
    const userName = req.user!.name;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: 'File is required' });
      return;
    }

    const { knowledge_type, title, description, category, machine_type, version, dataset_id } = req.body;

    if (!knowledge_type || !['sop', 'ml_dataset'].includes(knowledge_type)) {
      res.status(400).json({ success: false, error: 'Valid knowledge_type is required (sop or ml_dataset)' });
      return;
    }

    const ext = path.extname(file.originalname);
    const fileType = getFileType(ext);
    const uniqueFileName = generateUniqueFileName(file.originalname);
    const uploadWebhookUrl = process.env.N8N_KNOWLEDGE_UPLOAD_WEBHOOK_URL;

    // Send file to n8n upload webhook if configured
    if (uploadWebhookUrl) {
      try {
        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append('file', blob, uniqueFileName);
        formData.append('file_name', uniqueFileName);
        formData.append('original_name', file.originalname);
        formData.append('knowledge_type', knowledge_type);
        formData.append('title', title || file.originalname);
        if (category) formData.append('category', category);
        if (machine_type) formData.append('machine_type', machine_type);
        if (version) formData.append('version', version);
        if (description) formData.append('description', description);
        formData.append('uploaded_by', userName);

        console.log(`📡 Sending file "${uniqueFileName}" to n8n webhook: ${uploadWebhookUrl}`);
        const webhookRes = await fetch(uploadWebhookUrl, {
          method: 'POST',
          body: formData,
        });
        console.log(`📡 n8n upload webhook status: ${webhookRes.status}`);
      } catch (webhookErr) {
        console.error('⚠️  Failed to forward upload to n8n webhook:', webhookErr);
      }
    }

    await client.query('BEGIN');

    // Create knowledge_files record with unique filename and active status
    const kfResult = await client.query(
      `INSERT INTO knowledge_files 
        (uploaded_by, file_name, original_name, file_type, mime_type, file_size, storage_url, knowledge_type, status, activated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', now())
       RETURNING *`,
      [
        userId,
        uniqueFileName,
        file.originalname,
        fileType,
        file.mimetype,
        file.size,
        uploadWebhookUrl || `/webhook/${uniqueFileName}`,
        knowledge_type,
      ]
    );

    const knowledgeFile = kfResult.rows[0];

    // Create SOP or ML Dataset metadata
    if (knowledge_type === 'sop') {
      await client.query(
        `INSERT INTO sop_documents (knowledge_file_id, title, description, category, machine_type, version)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          knowledgeFile.id,
          title || file.originalname,
          description || null,
          category || null,
          machine_type || null,
          version || '1.0',
        ]
      );
    } else if (knowledge_type === 'ml_dataset' && dataset_id) {
      await client.query(
        `INSERT INTO ml_dataset_files (dataset_id, knowledge_file_id)
         VALUES ($1, $2)`,
        [dataset_id, knowledgeFile.id]
      );
    }

    await client.query('COMMIT');

    // Audit log
    await createAuditLog(userId, 'UPLOAD', 'knowledge_file', knowledgeFile.id, null, {
      file_name: uniqueFileName,
      original_name: file.originalname,
      knowledge_type,
      status: 'active',
    });

    res.status(201).json({ success: true, data: knowledgeFile });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload knowledge error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload knowledge file' });
  } finally {
    client.release();
  }
}

// GET /api/knowledge/:id
export async function getKnowledge(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const result = await pool.query(
      `SELECT kf.*, u.name as uploaded_by_name,
        sd.title as sop_title, sd.description as sop_description,
        sd.category as sop_category, sd.machine_type as sop_machine_type,
        sd.version as sop_version
       FROM knowledge_files kf
       LEFT JOIN users u ON u.id = kf.uploaded_by
       LEFT JOIN sop_documents sd ON sd.knowledge_file_id = kf.id
       WHERE kf.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Knowledge file not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get knowledge error:', error);
    res.status(500).json({ success: false, error: 'Failed to get knowledge file' });
  }
}

// PATCH /api/knowledge/:id
export async function updateKnowledge(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { title, description, category, machine_type, version } = req.body;

    const existing = await pool.query('SELECT * FROM knowledge_files WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Knowledge file not found' });
      return;
    }

    // Update SOP metadata if applicable
    if (existing.rows[0].knowledge_type === 'sop') {
      await pool.query(
        `UPDATE sop_documents SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          machine_type = COALESCE($4, machine_type),
          version = COALESCE($5, version)
         WHERE knowledge_file_id = $6`,
        [title, description, category, machine_type, version, id]
      );
    }

    await createAuditLog(userId, 'UPDATE', 'knowledge_file', id, existing.rows[0], req.body);

    res.json({ success: true, message: 'Knowledge file updated' });
  } catch (error) {
    console.error('Update knowledge error:', error);
    res.status(500).json({ success: false, error: 'Failed to update knowledge file' });
  }
}

// POST /api/knowledge/:id/confirm
export async function confirmKnowledge(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await pool.query('SELECT * FROM knowledge_files WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Knowledge file not found' });
      return;
    }

    if (existing.rows[0].status !== 'draft') {
      res.status(400).json({ success: false, error: 'Only draft files can be confirmed' });
      return;
    }

    await pool.query(
      `UPDATE knowledge_files SET status = 'active', activated_at = now() WHERE id = $1`,
      [id]
    );

    await createAuditLog(userId, 'ACTIVATE', 'knowledge_file', id,
      { status: 'draft' },
      { status: 'active' }
    );

    res.json({ success: true, message: 'Knowledge file activated' });
  } catch (error) {
    console.error('Confirm knowledge error:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm knowledge file' });
  }
}

// POST /api/knowledge/:id/archive
export async function archiveKnowledge(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await pool.query('SELECT * FROM knowledge_files WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Knowledge file not found' });
      return;
    }

    const oldStatus = existing.rows[0].status;

    await pool.query(
      `UPDATE knowledge_files SET status = 'archived' WHERE id = $1`,
      [id]
    );

    await createAuditLog(userId, 'ARCHIVE', 'knowledge_file', id,
      { status: oldStatus },
      { status: 'archived' }
    );

    res.json({ success: true, message: 'Knowledge file archived' });
  } catch (error) {
    console.error('Archive knowledge error:', error);
    res.status(500).json({ success: false, error: 'Failed to archive knowledge file' });
  }
}

// DELETE /api/knowledge/:id
export async function deleteKnowledge(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const userName = req.user!.name;
    const id = req.params.id as string;

    const existing = await pool.query('SELECT * FROM knowledge_files WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Knowledge file not found' });
      return;
    }

    const fileRecord = existing.rows[0];
    const deleteWebhookUrl = process.env.N8N_KNOWLEDGE_DELETE_WEBHOOK_URL;

    // Send delete notification to n8n delete webhook if configured
    if (deleteWebhookUrl) {
      try {
        console.log(`📡 Sending delete request for "${fileRecord.file_name}" to n8n delete webhook: ${deleteWebhookUrl}`);
        const delRes = await fetch(deleteWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: fileRecord.file_name,
            original_name: fileRecord.original_name,
            id: fileRecord.id,
            knowledge_type: fileRecord.knowledge_type,
            deleted_by: userName,
            deleted_at: new Date().toISOString(),
          }),
        });
        console.log(`📡 n8n delete webhook status: ${delRes.status}`);
      } catch (delErr) {
        console.error('⚠️  Failed to forward delete to n8n webhook:', delErr);
      }
    }

    await pool.query('DELETE FROM knowledge_files WHERE id = $1', [id]);

    await createAuditLog(userId, 'DELETE', 'knowledge_file', id, fileRecord, null);

    res.json({
      success: true,
      message: `Knowledge file "${fileRecord.original_name}" (${fileRecord.file_name}) deleted`,
    });
  } catch (error) {
    console.error('Delete knowledge error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete knowledge file' });
  }
}

// ML Dataset CRUD

// GET /api/knowledge/datasets
export async function listDatasets(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT d.*, u.name as created_by_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', mdf.id,
              'knowledge_file_id', mdf.knowledge_file_id,
              'original_name', kf.original_name,
              'file_size', kf.file_size,
              'status', kf.status
            )
          ) FILTER (WHERE mdf.id IS NOT NULL),
          '[]'
        ) as files
       FROM ml_datasets d
       LEFT JOIN users u ON u.id = d.created_by
       LEFT JOIN ml_dataset_files mdf ON mdf.dataset_id = d.id
       LEFT JOIN knowledge_files kf ON kf.id = mdf.knowledge_file_id
       GROUP BY d.id, u.name
       ORDER BY d.created_at DESC`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List datasets error:', error);
    res.status(500).json({ success: false, error: 'Failed to list datasets' });
  }
}

// POST /api/knowledge/datasets
export async function createDataset(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, description, machine_type, dataset_version } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Dataset name is required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO ml_datasets (name, description, machine_type, dataset_version, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || null, machine_type || null, dataset_version || '1.0', userId]
    );

    await createAuditLog(userId, 'UPLOAD', 'ml_dataset', result.rows[0].id, null, {
      name,
      status: 'draft',
    });

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create dataset error:', error);
    res.status(500).json({ success: false, error: 'Failed to create dataset' });
  }
}
