"""
predict.py
---------------------
Logika inti prediksi/skoring anomali. Memuat model .joblib + metadata
tersimpan, lalu menilai satu sample.

"""


import json

import joblib
import numpy as np

from common import resolve_model_path

class PredictError(ValueError):
    pass

def _load_meta(model_path):
    meta_path = model_path.with_name(model_path.stem + ".meta.json")
    if not meta_path.exists():
        raise PredictError(f"Metadata untuk model {model_path.name} tidak ditemukan")
    with open(meta_path) as f:
        return json.load(f)

def predict_sample(
    machine_name: str,
    model_train: str,
    sample: dict[str, float],
    model_set: dict | None = None,
    routing_db: str | None = None,
    timing: str | None = None,
    timestamp: str | None = None,
) -> dict:
    model_path = resolve_model_path(machine_name, model_train)
    if not model_path.exists():
        raise PredictError(f"File model tidak ditemukan: {model_train}")

    meta = _load_meta(model_path)
    expected_features = meta["features"]

    missing = [f for f in expected_features if f not in sample]
    if missing:
        raise PredictError(f"Fitur berikut wajib diisi: {missing}")
    extra = [f for f in sample if f not in expected_features]
    if extra:
        raise PredictError(f"Fitur tidak dikenal oleh model ini: {extra}")

    config_mismatch = False
    if model_set and model_set.get("features") is not None:
        if sorted(model_set["features"]) != sorted(expected_features):
            config_mismatch = True

    model = joblib.load(model_path)
    x = np.array([[sample[f] for f in expected_features]], dtype=np.float64)

    raw_score = model.score_samples(x)[0]
    is_anomaly = model.predict(x)[0] == -1
    anomaly_score = float(np.clip(-raw_score, 0.0, 1.0))

    return {
        "machine_name": machine_name,
        "model_train": model_train,
        "routing_db": routing_db,
        "timing": timing,
        "anomaly_score": anomaly_score,
        "is_anomaly": bool(is_anomaly),
        "config_mismatch": config_mismatch,
        "timestamp": timestamp,
    }
