import pool from "../config/database";

export interface MLTrainingRecord {
  id: string;
  machine_name: string;
  file_name: string;
  features: string[];
  contamination: number;
  n_estimators: number;
  max_samples: string;
  model_name: string | null;
  locked: boolean;
  status: string;
  trained_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMLTrainingData {
  machine_name: string;
  file_name: string;
  features: string[];
  contamination: number;
  n_estimators: number;
  max_samples: string;
  model_name?: string | null;
  status?: string;
}

export interface UpdateMLTrainingData {
  machine_name?: string;
  file_name?: string;
  features?: string[];
  contamination?: number;
  n_estimators?: number;
  max_samples?: string;
  model_name?: string | null;
  status?: string;
}

export async function getAllTrainings(): Promise<MLTrainingRecord[]> {
  const result = await pool.query(
    `SELECT
      id,
      machine_name,
      file_name,
      features,
      contamination,
      n_estimators,
      max_samples,
      model_name,
      locked,
      status,
      trained_at,
      created_at,
      updated_at
    FROM ml_model_trainings
    ORDER BY trained_at DESC`,
  );

  return result.rows;
}

export async function getTrainingById(
  id: string,
): Promise<MLTrainingRecord | null> {
  const result = await pool.query(
    `SELECT
      id,
      machine_name,
      file_name,
      features,
      contamination,
      n_estimators,
      max_samples,
      model_name,
      locked,
      status,
      trained_at,
      created_at,
      updated_at
    FROM ml_model_trainings
    WHERE id = $1`,
    [id],
  );

  return result.rows[0] || null;
}

export async function createTraining(
  data: CreateMLTrainingData,
): Promise<MLTrainingRecord> {
  const result = await pool.query(
    `INSERT INTO ml_model_trainings (
      machine_name,
      file_name,
      features,
      contamination,
      n_estimators,
      max_samples,
      model_name,
      locked,
      status,
      trained_at,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3::jsonb,
      $4,
      $5,
      $6,
      $7,
      TRUE,
      $8,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING *`,
    [
      data.machine_name,
      data.file_name,
      JSON.stringify(data.features),
      data.contamination,
      data.n_estimators,
      data.max_samples,
      data.model_name
        ? data.model_name.replace(/\\/g, "/").split("/").pop() || null
        : null,
      data.status || "ready",
    ],
  );

  return result.rows[0];
}

export async function unlockTraining(
  id: string,
): Promise<MLTrainingRecord | null> {
  const result = await pool.query(
    `UPDATE ml_model_trainings
     SET
       locked = FALSE,
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  );

  return result.rows[0] || null;
}

export async function updateTraining(
  id: string,
  data: UpdateMLTrainingData,
): Promise<MLTrainingRecord | null> {
  const result = await pool.query(
    `UPDATE ml_model_trainings
     SET
       machine_name = COALESCE($1, machine_name),
       file_name = COALESCE($2, file_name),
       features = COALESCE($3::jsonb, features),
       contamination = COALESCE($4, contamination),
       n_estimators = COALESCE($5, n_estimators),
       max_samples = COALESCE($6, max_samples),
       model_name = COALESCE($7, model_name),
       status = COALESCE($8, status),
       locked = TRUE,
       trained_at = NOW(),
       updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [
      data.machine_name ?? null,
      data.file_name ?? null,
      data.features !== undefined ? JSON.stringify(data.features) : null,
      data.contamination ?? null,
      data.n_estimators ?? null,
      data.max_samples ?? null,
      data.model_name
        ? data.model_name.replace(/\\/g, "/").split("/").pop() || null
        : null,
      data.status ?? null,
      id,
    ],
  );

  return result.rows[0] || null;
}

export async function deleteTraining(
  id: string,
): Promise<MLTrainingRecord | null> {
  const result = await pool.query(
    `DELETE FROM ml_model_trainings
     WHERE id = $1
     RETURNING *`,
    [id],
  );

  return result.rows[0] || null;
}
