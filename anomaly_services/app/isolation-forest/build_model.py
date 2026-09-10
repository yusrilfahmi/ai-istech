"""
build_model.py
---------------------
Logika inti training model Isolation Forest dari dataset CSV, dan menyimpan model .joblib + metadata ke filesystem.
Metadata berisi daftar fitur yang dipakai, hyperparameter, jumlah sample yang dipakai untuk training, dan timestamp training.
"""

from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from common import machine_dir

DEFAULT_CONTAMINATION = 0.02
DEFAULT_N_ESTIMATORS = 150
DEFAULT_MAX_SAMPLES = "auto"

class BuildModelError(ValueError):
    pass

def _resolve_model_set(df: pd.DataFrame, model_set: dict | None) -> dict:
    model_set = model_set or {}

    features = model_set.get("features") or list(df.columns)
    missing_cols = [f for f in features if f not in df.columns]
    if missing_cols:
        raise BuildModelError(f"Kolom fitur berikut tidak ada di dataset: {missing_cols}")

    contamination = model_set.get("contamination", DEFAULT_CONTAMINATION)
    n_estimators = model_set.get("n_estimators", DEFAULT_N_ESTIMATORS)
    max_samples = model_set.get("max_samples", DEFAULT_MAX_SAMPLES)

    if not (0 < contamination <= 0.5):
        raise BuildModelError("contamination harus di antara 0 dan 0.5")
    if n_estimators <= 0:
        raise BuildModelError("n_estimators harus > 0")

    return {
        "features": features,
        "contamination": float(contamination),
        "n_estimators": int(n_estimators),
        "max_samples": max_samples,
    }

def train_and_save(df: pd.DataFrame, machine_name: str, model_set: dict | None = None) -> dict:
    if df.empty:
        raise BuildModelError("Dataset kosong")

    resolved = _resolve_model_set(df, model_set)
    X = df[resolved["features"]].to_numpy(dtype=np.float64)

    max_samples = resolved["max_samples"]
    if max_samples != "auto":
        max_samples = min(int(max_samples), X.shape[0])

    model = IsolationForest(
        n_estimators=resolved["n_estimators"],
        contamination=resolved["contamination"],
        max_samples=max_samples,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)

    out_dir = machine_dir(machine_name)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"{machine_name}_{timestamp}.joblib"
    model_path = out_dir / filename
    meta_path = out_dir / f"{machine_name}_{timestamp}.meta.json"

    joblib.dump(model, model_path)

    meta = {
        "machine_name": machine_name,
        "features": resolved["features"],
        "contamination": resolved["contamination"],
        "n_estimators": resolved["n_estimators"],
        "max_samples": max_samples,
        "n_samples_trained": int(X.shape[0]),
        "trained_at": timestamp,
    }
    import json

    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    model_train = f"{machine_name}/{filename}"

    return {
        "machine_name": machine_name,
        "model_train": model_train,
        "features_used": resolved["features"],
        "contamination": resolved["contamination"],
        "n_estimators": resolved["n_estimators"],
        "max_samples": max_samples,
        "n_samples_trained": int(X.shape[0]),
    }
