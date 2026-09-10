import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/compressor-telemetry?page=1&limit=50
export async function listCompressorTelemetry(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Parse and validate query params
    const rawPage = parseInt((req.query.page as string) || '1', 10);
    const rawLimit = parseInt((req.query.limit as string) || '50', 10);

    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit =
      isNaN(rawLimit) || rawLimit < 1
        ? 50
        : rawLimit > 100
          ? 100
          : rawLimit;

    const offset = (page - 1) * limit;

    // Run count and data queries in parallel for performance
    const [countResult, dataResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total FROM compressor_telemetry`
      ),
      pool.query(
        `SELECT
           id,
           dataset_id,
           machine_id,
           timestamp,
           arus_a,
           outlet_pressure_bar,
           outlet_flow_rate_m3h,
           kwh_per_m3
         FROM compressor_telemetry
         ORDER BY timestamp DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('List compressor telemetry error:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch compressor telemetry' });
  }
}
