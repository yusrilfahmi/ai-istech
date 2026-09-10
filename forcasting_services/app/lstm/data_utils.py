"""
data_utils.py
---------
Berisi utilitas untuk preprocessing data time series, termasuk:
- build_scalers: buat MinMaxScaler untuk tiap kolom fitur
- scale_features: skala tiap kolom fitur menggunakan scaler masing-masing
- create_sequences: ubah data 2D (timestep, fitur) jadi sequence untuk supervised learning (X, y)

"""


from typing import Dict, List

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

def build_scalers(df: pd.DataFrame, feature_cols: List[str]) -> Dict[str, MinMaxScaler]:
    scalers = {}
    for col in feature_cols:
        scaler = MinMaxScaler()
        scaler.fit(df[[col]])
        scalers[col] = scaler
    return scalers

def scale_features(df: pd.DataFrame, feature_cols: List[str], scalers: Dict[str, MinMaxScaler]) -> np.ndarray:
    scaled = np.zeros((len(df), len(feature_cols)), dtype=np.float32)
    for i, col in enumerate(feature_cols):
        scaled[:, i] = scalers[col].transform(df[[col]]).flatten()
    return scaled

def create_sequences(data: np.ndarray, target_idx: int, seq_length: int, forecast_horizon: int):
    X, y = [], []
    max_i = len(data) - seq_length - forecast_horizon + 1
    for i in range(max_i):
        X.append(data[i:i + seq_length])
        y.append(data[i + seq_length: i + seq_length + forecast_horizon, target_idx])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)
