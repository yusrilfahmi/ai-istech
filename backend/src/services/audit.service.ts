import pool from '../config/database';

export async function createAuditLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  oldData?: Record<string, unknown> | null,
  newData?: Record<string, unknown> | null
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw — audit failures should not break the main flow
  }
}

export async function getAuditLogs(
  filters: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.entityType) {
    conditions.push(`al.entity_type = $${paramIndex++}`);
    params.push(filters.entityType);
  }

  if (filters.entityId) {
    conditions.push(`al.entity_id = $${paramIndex++}`);
    params.push(filters.entityId);
  }

  if (filters.userId) {
    conditions.push(`al.user_id = $${paramIndex++}`);
    params.push(filters.userId);
  }

  if (filters.action) {
    conditions.push(`al.action = $${paramIndex++}`);
    params.push(filters.action);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const result = await pool.query(
    `SELECT al.*, u.name as user_name, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return result.rows;
}
