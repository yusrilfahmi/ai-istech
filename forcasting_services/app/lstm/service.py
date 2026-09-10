"""
service.py
--------
Berisi service untuk melakukan training dan forecasting menggunakan model LSTM.

"""


import io
import os
import uuid
from dataclasses import dataclass
from typing import List, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

from data_utils import build_scalers, create_sequences, scale_features
from model import LSTMForecaster

@dataclass
class ForecastConfig:
    target_col: str
    feature_cols: Optional[List[str]] = None
    date_col: Optional[str] = None
    seq_length: int = 20
    forecast_horizon: int = 1
    hidden_size: int = 64
    num_layers: int = 2
    dropout: float = 0.2
    epochs: int = 100
    batch_size: int = 32
    learning_rate: float = 0.001
    train_split: float = 0.8

class LSTMForecastingService:
    def __init__(self, output_dir: str = "outputs"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def run(self, df: pd.DataFrame, config: ForecastConfig) -> dict:
        feature_cols = self._resolve_feature_cols(df, config)
        target_idx = feature_cols.index(config.target_col)

        scalers = build_scalers(df, feature_cols)
        scaled = scale_features(df, feature_cols, scalers)

        X, y = create_sequences(scaled, target_idx, config.seq_length, config.forecast_horizon)
        if len(X) < 2:
            raise ValueError(
                "Data terlalu pendek untuk kombinasi seq_length + forecast_horizon yang diberikan. "
                f"Butuh minimal {config.seq_length + config.forecast_horizon + 1} baris, tersedia {len(df)}."
            )

        split = max(1, int(len(X) * config.train_split))
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]

        model = LSTMForecaster(
            input_size=len(feature_cols),
            hidden_size=config.hidden_size,
            num_layers=config.num_layers,
            dropout=config.dropout,
            forecast_horizon=config.forecast_horizon,
        )
        history = self._train(model, X_train, y_train, config)

        train_pred, test_pred = self._predict(model, X_train, X_test)
        target_scaler = scalers[config.target_col]

        result_df = self._build_result_df(y_train, y_test, train_pred, test_pred, target_scaler)
        future_df = self._forecast_future(model, scaled, config, target_scaler)

        csv_buffer = io.StringIO()
        result_df.to_csv(csv_buffer, index=False)

        future_csv_buffer = io.StringIO()
        future_df.to_csv(future_csv_buffer, index=False)

        chart_buffer = io.BytesIO()
        self._make_chart(result_df, future_df, chart_buffer, config.target_col)

        return {
            "job_id": uuid.uuid4().hex[:10],
            "csv_bytes": csv_buffer.getvalue().encode("utf-8"),
            "future_csv_bytes": future_csv_buffer.getvalue().encode("utf-8"),
            "chart_bytes": chart_buffer.getvalue(),
            "feature_cols_used": feature_cols,
            "final_train_loss": history[-1] if history else None,
            "n_train": int((result_df["set"] == "train").sum()),
            "n_test": int((result_df["set"] == "test").sum()),
        }

    def _resolve_feature_cols(self, df: pd.DataFrame, config: ForecastConfig) -> List[str]:
        if config.feature_cols:
            feature_cols = list(config.feature_cols)
        else:
            feature_cols = [
                c for c in df.columns
                if c != config.date_col and pd.api.types.is_numeric_dtype(df[c])
            ]
        if config.target_col not in feature_cols:
            feature_cols.append(config.target_col)

        missing = [c for c in feature_cols if c not in df.columns]
        if missing:
            raise ValueError(f"Kolom berikut tidak ditemukan di CSV: {missing}")
        return feature_cols

    def _train(self, model, X_train, y_train, config: ForecastConfig) -> List[float]:
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)

        X_train_t = torch.tensor(X_train)
        y_train_t = torch.tensor(y_train)
        n = len(X_train_t)
        history = []

        for _ in range(config.epochs):
            model.train()
            perm = torch.randperm(n)
            epoch_loss = 0.0
            for i in range(0, n, config.batch_size):
                idx = perm[i:i + config.batch_size]
                xb, yb = X_train_t[idx], y_train_t[idx]
                optimizer.zero_grad()
                pred = model(xb)
                loss = criterion(pred, yb)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item() * len(idx)
            history.append(epoch_loss / n)
        return history

    def _predict(self, model, X_train, X_test):
        model.eval()
        with torch.no_grad():
            train_pred = model(torch.tensor(X_train)).numpy()
            if len(X_test):
                test_pred = model(torch.tensor(X_test)).numpy()
            else:
                test_pred = np.empty((0, model.fc.out_features), dtype=np.float32)
        return train_pred, test_pred

    def _build_result_df(self, y_train, y_test, train_pred, test_pred, target_scaler) -> pd.DataFrame:
        def inv(arr):
            if arr.size == 0:
                return np.array([])
            return target_scaler.inverse_transform(arr[:, :1]).flatten()

        train_actual, train_predicted = inv(y_train), inv(train_pred)
        test_actual, test_predicted = inv(y_test), inv(test_pred)

        actual_all = np.concatenate([train_actual, test_actual])
        predicted_all = np.concatenate([train_predicted, test_predicted])
        split_flag = ["train"] * len(train_actual) + ["test"] * len(test_actual)

        return pd.DataFrame({
            "index": np.arange(len(actual_all)),
            "actual": actual_all,
            "predicted": predicted_all,
            "set": split_flag,
        })

    def _forecast_future(self, model, scaled, config: ForecastConfig, target_scaler) -> pd.DataFrame:
        model.eval()
        last_seq = torch.tensor(scaled[-config.seq_length:]).unsqueeze(0)
        with torch.no_grad():
            future_scaled = model(last_seq).numpy()[0]
        future_values = target_scaler.inverse_transform(future_scaled.reshape(-1, 1)).flatten()
        return pd.DataFrame({
            "step_ke_depan": np.arange(1, len(future_values) + 1),
            "prediksi": future_values,
        })

    def _make_chart(self, result_df: pd.DataFrame, future_df: pd.DataFrame, target: io.BytesIO, target_col: str):
        fig, ax = plt.subplots(figsize=(10, 5))
        ax.plot(result_df["index"], result_df["actual"], label="Actual", color="#378ADD", linewidth=1.5)
        ax.plot(result_df["index"], result_df["predicted"], label="Predicted", color="#D85A30",
                linestyle="--", linewidth=1.5)

        last_idx = int(result_df["index"].iloc[-1])
        future_x = np.arange(last_idx + 1, last_idx + 1 + len(future_df))
        ax.plot(future_x, future_df["prediksi"], label="Future forecast", color="#1D9E75",
                linestyle=":", marker="o", markersize=4)

        split_idx = int((result_df["set"] == "train").sum())
        if 0 < split_idx < len(result_df):
            ax.axvline(result_df["index"].iloc[split_idx], color="gray", linestyle=":", linewidth=1)

        ax.set_title(f"Forecast: {target_col}")
        ax.set_xlabel("Timestep")
        ax.set_ylabel(target_col)
        ax.legend()
        fig.tight_layout()
        fig.savefig(target, format="png", dpi=120)
        plt.close(fig)
