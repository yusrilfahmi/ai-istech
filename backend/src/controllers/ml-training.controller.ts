import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../services/audit.service';

import {
  getAllTrainings,
  getTrainingById,
  createTraining,
  unlockTraining,
  updateTraining,
  deleteTraining,
} from '../services/ml-training.service';

export async function listMLTrainings(
  _req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const trainings = await getAllTrainings();

    res.json({
      success: true,
      data: trainings,
    });
  } catch (error) {
    console.error('List ML trainings error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to list ML training records',
    });
  }
}

export async function getMLTraining(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;

    const training = await getTrainingById(id);

    if (!training) {
      res.status(404).json({
        success: false,
        error: 'ML training record not found',
      });
      return;
    }

    res.json({
      success: true,
      data: training,
    });
  } catch (error) {
    console.error('Get ML training error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get ML training record',
    });
  }
}

export async function createMLTraining(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;

    const {
      machine_name,
      file_name,
      features,
      contamination,
      n_estimators,
      max_samples,
      model_name,
      status,
    } = req.body;

    if (!machine_name || typeof machine_name !== 'string') {
      res.status(400).json({
        success: false,
        error: 'machine_name is required',
      });
      return;
    }

    if (!file_name || typeof file_name !== 'string') {
      res.status(400).json({
        success: false,
        error: 'file_name is required',
      });
      return;
    }

    if (!Array.isArray(features) || features.length === 0) {
      res.status(400).json({
        success: false,
        error: 'features must be a non-empty array',
      });
      return;
    }

    if (
      contamination === undefined ||
      contamination === null ||
      Number.isNaN(Number(contamination))
    ) {
      res.status(400).json({
        success: false,
        error: 'Valid contamination is required',
      });
      return;
    }

    if (
      n_estimators === undefined ||
      n_estimators === null ||
      Number.isNaN(Number(n_estimators))
    ) {
      res.status(400).json({
        success: false,
        error: 'Valid n_estimators is required',
      });
      return;
    }

    if (!max_samples || typeof max_samples !== 'string') {
      res.status(400).json({
        success: false,
        error: 'max_samples is required',
      });
      return;
    }

    const training = await createTraining({
      machine_name: machine_name.trim(),
      file_name,
      features,
      contamination: Number(contamination),
      n_estimators: Number(n_estimators),
      max_samples: max_samples.trim(),
      model_name: model_name || null,
      status: status || 'ready',
    });

    await createAuditLog(
      userId,
      'CREATE',
      'ml_model_training',
      training.id,
      null,
      training as unknown as Record<string, unknown>
    );

    res.status(201).json({
      success: true,
      data: training,
    });
  } catch (error: any) {
    console.error('Create ML training error:', error);

    if (error?.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'Training record for this machine already exists',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create ML training record',
    });
  }
}

export async function unlockMLTraining(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await getTrainingById(id);

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'ML training record not found',
      });
      return;
    }

    // if (!existing.locked) {
    //   res.status(400).json({
    //     success: false,
    //     error: 'Training record is already unlocked',
    //   });
    //   return;
    // }

    const training = await unlockTraining(id);

    await createAuditLog(
      userId,
      'UNLOCK',
      'ml_model_training',
      id,
      existing as unknown as Record<string, unknown>,
      training as unknown as Record<string, unknown>
    );

    res.json({
      success: true,
      data: training,
    });
  } catch (error) {
    console.error('Unlock ML training error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to unlock ML training record',
    });
  }
}

export async function updateMLTraining(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await getTrainingById(id);

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'ML training record not found',
      });
      return;
    }

    if (existing.locked) {
      res.status(423).json({
        success: false,
        error: 'Training record is locked. Unlock it before updating.',
      });
      return;
    }

    const {
      machine_name,
      file_name,
      features,
      contamination,
      n_estimators,
      max_samples,
      model_name,
      status,
    } = req.body;

    if (features !== undefined && !Array.isArray(features)) {
      res.status(400).json({
        success: false,
        error: 'features must be an array',
      });
      return;
    }

    const training = await updateTraining(id, {
      machine_name,
      file_name,
      features,
      contamination:
        contamination !== undefined
          ? Number(contamination)
          : undefined,
      n_estimators:
        n_estimators !== undefined
          ? Number(n_estimators)
          : undefined,
      max_samples,
      model_name,
      status,
    });

    if (!training) {
      res.status(404).json({
        success: false,
        error: 'ML training record not found',
      });
      return;
    }

    await createAuditLog(
      userId,
      'UPDATE',
      'ml_model_training',
      id,
      existing as unknown as Record<string, unknown>,
      training as unknown as Record<string, unknown>
    );

    res.json({
      success: true,
      data: training,
    });
  } catch (error: any) {
    console.error('Update ML training error:', error);

    if (error?.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'Another training record already exists for this machine',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update ML training record',
    });
  }
}

export async function deleteMLTraining(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await getTrainingById(id);

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'ML training record not found',
      });
      return;
    }

    const training = await deleteTraining(id);

    await createAuditLog(
      userId,
      'DELETE',
      'ml_model_training',
      id,
      existing as unknown as Record<string, unknown>,
      null
    );

    res.json({
      success: true,
      message: 'ML training record deleted successfully',
      data: training,
    });
  } catch (error) {
    console.error('Delete ML training error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to delete ML training record',
    });
  }
}