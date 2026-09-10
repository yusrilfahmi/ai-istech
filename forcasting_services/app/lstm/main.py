"""
main.py
-------
Satu endpoint :

    POST /forecast      - melakukan forecast time series

Jalankan:
    uvicorn app:app --host 0.0.0.0 --port 8010

Catatan:
allow_origins di CORS middleware hanya untuk testing lokal, nanti diubah kalau sudah deploy.
"""


from typing import Optional

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from service import ForecastConfig, LSTMForecastingService

app = FastAPI(
    title="LSTM Forecasting Service",
    description="Kirim file CSV + parameter, dapatkan hasil forecast dalam bentuk CSV dan grafik.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = "outputs"
service = LSTMForecastingService(output_dir=OUTPUT_DIR)
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/forecast")
async def forecast(
    file: UploadFile = File(..., description="File CSV berisi data time series"),
    target_col: str = Form(..., description="Nama kolom yang ingin diprediksi"),
    feature_cols: Optional[str] = Form(
        None, description="Nama kolom fitur dipisah koma. Kosongkan untuk pakai semua kolom numerik"
    ),
    date_col: Optional[str] = Form(None, description="Nama kolom tanggal/waktu (opsional, dikecualikan dari fitur)"),
    seq_length: int = Form(20, description="Jumlah timestep ke belakang yang dilihat model (lookback window)"),
    forecast_horizon: int = Form(1, description="Jumlah langkah ke depan yang diprediksi sekaligus"),
    hidden_size: int = Form(64, description="Ukuran hidden state LSTM"),
    num_layers: int = Form(2, description="Jumlah layer LSTM ditumpuk"),
    dropout: float = Form(0.2, description="Dropout antar layer (berlaku jika num_layers > 1)"),
    epochs: int = Form(100, description="Jumlah epoch training"),
    batch_size: int = Form(32, description="Ukuran batch training"),
    learning_rate: float = Form(0.001, description="Learning rate optimizer Adam"),
    train_split: float = Form(0.8, description="Proporsi data untuk training (sisanya untuk test)"),
):
    try:
        df = pd.read_csv(file.file)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal membaca CSV: {exc}")

    if df.empty:
        raise HTTPException(status_code=400, detail="File CSV kosong")

    if target_col not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Kolom target '{target_col}' tidak ditemukan. Kolom tersedia: {list(df.columns)}",
        )

    parsed_features = [c.strip() for c in feature_cols.split(",")] if feature_cols else None

    config = ForecastConfig(
        target_col=target_col,
        feature_cols=parsed_features,
        date_col=date_col,
        seq_length=seq_length,
        forecast_horizon=forecast_horizon,
        hidden_size=hidden_size,
        num_layers=num_layers,
        dropout=dropout,
        epochs=epochs,
        batch_size=batch_size,
        learning_rate=learning_rate,
        train_split=train_split,
    )

    try:
        result = service.run(df, config)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Training gagal: {exc}")

    # base_url = f"/outputs/{result['job_id']}"
    # return {
    #     "job_id": result["job_id"],
    #     "feature_cols_used": result["feature_cols_used"],
    #     "final_train_loss": result["final_train_loss"],
    #     "n_train": result["n_train"],
    #     "n_test": result["n_test"],
    #     "download": {
    #         "forecast_csv": f"{base_url}/forecast_result.csv",
    #         "future_forecast_csv": f"{base_url}/future_forecast.csv",
    #         "chart_png": f"{base_url}/forecast_chart.png",
    #     },
    # }

    boundary = "----forecast-output-boundary"
    parts = []

    for file_name, file_bytes in [
        ("forecast_result.csv", result["csv_bytes"]),
        ("future_forecast.csv", result["future_csv_bytes"]),
        ("forecast_chart.png", result["chart_bytes"]),
    ]:
        content_type = "text/csv" if file_name.endswith(".csv") else "image/png"
        part = (
            f"--{boundary}\r\n"
            f'Content-Disposition: attachment; filename="{file_name}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode("utf-8")
        parts.append(part)
        parts.append(file_bytes)
        parts.append(b"\r\n")

    body = b"".join(parts) + f"--{boundary}--\r\n".encode("utf-8")
    return Response(
        content=body,
        media_type=f"multipart/form-data; boundary={boundary}",
        headers={"Content-Disposition": "attachment; filename=forecast_outputs.multipart"},
    )
