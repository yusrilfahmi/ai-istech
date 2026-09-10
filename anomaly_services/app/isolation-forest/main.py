"""
main.py
-------
Dua endpoint :

  POST /build_model  - training model baru per mesin dari dataset
  POST /predict      - skoring anomali dari satu sample

Jalankan:
    uvicorn app:app --host 0.0.0.0 --port 8020

Catatan:
allow_origins di CORS middleware hanya untuk testing lokal, nanti diubah kalau sudah deploy.
"""


from datetime import datetime
import io
import json

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import build_model as build_model_service
import predict as predict_service
from common import InvalidModelPathError, InvalidNameError

app = FastAPI(title="Machine Anomaly Detection Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BuildModelResponse(BaseModel):
    machine_name: str
    model_train: str
    features_used: list[str]
    contamination: float
    n_estimators: int
    max_samples: int | str
    n_samples_trained: int

@app.post("/build_model", response_model=BuildModelResponse)
async def build_model(
    dataset: UploadFile = File(..., description="File CSV data sensor (kondisi normal)"),
    machine_name: str = Form(..., description="Nama mesin/seri mesin"),
    model_set: str = Form(
        default="{}",
        description=(
            'JSON string, contoh: {"features": ["temp_mean","vib_rms"], '
            '"contamination": 0.02, "n_estimators": 150, "max_samples": 256}'
        ),
    ),
):
    try:
        model_set_dict = json.loads(model_set) if model_set else {}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"model_set bukan JSON valid: {e}")

    raw = await dataset.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Gagal membaca dataset CSV: {e}")

    try:
        result = build_model_service.train_and_save(df, machine_name, model_set_dict)
    except (InvalidNameError, build_model_service.BuildModelError) as e:
        raise HTTPException(status_code=422, detail=str(e))

    return result

class ModelSetConfig(BaseModel):
    features: list[str] | None = None
    contamination: float | None = None
    n_estimators: int | None = None
    max_samples: int | str | None = None

class PredictRequest(BaseModel):
    machine_name: str
    routing_db: str = Field(default="local", description="Reserved untuk multi-DB di masa depan")
    timing: str | None = Field(default=None, description="Timestamp sample, mis. ISO 8601")
    model_train: str = Field(..., description="Path model .joblib hasil /build_model")
    model_set: ModelSetConfig | None = Field(
        default=None, description="Referensi/logging saja, tidak dipakai untuk scoring"
    )
    sample: dict[str, float] = Field(..., description="Nilai fitur mesin saat ini")

class PredictResponse(BaseModel):
    machine_name: str
    model_train: str
    routing_db: str | None = None
    timing: str | None = None
    anomaly_score: float
    is_anomaly: bool
    config_mismatch: bool = Field(
        default=False,
        description="True kalau model_set dari client beda dengan config asli saat training",
    )
    timestamp: str = Field(..., description="Timestamp prediksi dibuat, mis. ISO 8601")

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        result = predict_service.predict_sample(
            machine_name=req.machine_name,
            model_train=req.model_train,
            sample=req.sample,
            model_set=req.model_set.model_dump() if req.model_set else None,
            routing_db=req.routing_db,
            timing=req.timing,
            timestamp=datetime.now().isoformat(),
        )
    except (InvalidNameError, InvalidModelPathError, predict_service.PredictError) as e:
        raise HTTPException(status_code=422, detail=str(e))

    return result

@app.get("/health")
def health():
    return {"status": "ok"}
