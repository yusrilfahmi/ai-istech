# LSTM Forecasting Service

REST API berbasis FastAPI + PyTorch untuk melakukan time series forecasting dengan LSTM.
Kirim file CSV beserta parameter yang bisa dikustomisasi, service akan melatih model LSTM
dan mengembalikan 3 file hasil forecast sekaligus dalam satu response multipart:
**`forecast_result.csv`**, **`future_forecast.csv`**, dan **`forecast_chart.png`**.

## Struktur

```
lstm_forecast_service/
├── app/
│   ├── model.py        # definisi arsitektur LSTM
│   ├── data_utils.py   # scaling per kolom + pembuatan sequence
│   ├── service.py      # logika inti: training, prediksi, simpan CSV & chart
│   └── main.py         # endpoint FastAPI
├── dataset
│   ├── sample_data.csv     # data contoh (suhu, kelembaban, penjualan harian)
├── requirements.txt
└── README.md
```

## Instalasi

```bash
python -m venv .venv; .\.venv\Scripts\python -V
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Menjalankan server

```bash
cd app/lstm
uvicorn main:app --host 0.0.0.0 --port 8010
```

Server akan berjalan di `http://0.0.0.0:8010`

## Endpoint

### `POST /forecast`

Menerima `multipart/form-data`: satu file CSV + parameter berikut.

| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `file` | file | **wajib** | File CSV berisi data time series |
| `target_col` | string | **wajib** | Nama kolom yang ingin diprediksi |
| `feature_cols` | string | semua kolom numerik | Nama kolom fitur, dipisah koma (contoh: `"suhu,kelembaban,penjualan"`). Kosongkan untuk pakai semua kolom numerik |
| `date_col` | string | `null` | Nama kolom tanggal/waktu, dikecualikan dari fitur |
| `seq_length` | int | `20` | Lookback window — berapa timestep ke belakang yang dilihat model |
| `forecast_horizon` | int | `1` | Jumlah langkah ke depan yang diprediksi sekaligus |
| `hidden_size` | int | `64` | Ukuran hidden state LSTM |
| `num_layers` | int | `2` | Jumlah layer LSTM ditumpuk |
| `dropout` | float | `0.2` | Dropout antar layer (berlaku jika `num_layers > 1`) |
| `epochs` | int | `100` | Jumlah epoch training |
| `batch_size` | int | `32` | Ukuran batch |
| `learning_rate` | float | `0.001` | Learning rate Adam optimizer |
| `train_split` | float | `0.8` | Proporsi data untuk training, sisanya untuk evaluasi test |

**Catatan:** `bidirectional` sengaja tidak dijadikan parameter dan dikunci `False` di dalam model,
karena bidirectional LSTM butuh "melihat" masa depan — tidak valid untuk forecasting.

### Contoh dengan `curl`

```bash
curl -X POST "http://127.0.0.1:8010/forecast" \
  -F "file=@sample_data.csv" \
  -F "target_col=penjualan" \
  -F "feature_cols=suhu,kelembaban,penjualan" \
  -F "date_col=tanggal" \
  -F "seq_length=14" \
  -F "forecast_horizon=5" \
  -F "epochs=50"
```

### Contoh response

Endpoint terbaru mengembalikan response bertipe `multipart/form-data` dengan 3 attachment terpisah:

```http
Content-Type: multipart/form-data; boundary=----forecast-output-boundary

--xxxx
Content-Disposition: attachment; filename="forecast_result.csv"
Content-Type: text/csv

...isi CSV hasil forecast...

--xxxx
Content-Disposition: attachment; filename="future_forecast.csv"
Content-Type: text/csv

...isi CSV prediksi masa depan...

--xxxx
Content-Disposition: attachment; filename="forecast_chart.png"
Content-Type: image/png

...binary image...
--xxxx--
```

### File output

- **`forecast_result.csv`** — nilai `actual` vs `predicted` untuk seluruh data train + test, plus kolom `set` yang menandai baris itu train atau test (berguna untuk evaluasi akurasi model).
- **`future_forecast.csv`** — prediksi murni untuk `forecast_horizon` langkah setelah data terakhir yang tersedia (data yang belum ada nilai aktualnya).
- **`forecast_chart.png`** — grafik actual vs predicted, dengan garis putus-putus vertikal penanda batas train/test, dan titik-titik hijau untuk future forecast.

## Menjalankan sebagai service produksi

Untuk deployment, jalankan dengan beberapa worker dan tanpa `--reload`:

```bash
uvicorn main.api:app --host 0.0.0.0 --port 8010 --workers 2
```

**Catatan penting untuk produksi:**
- Endpoint ini training secara **synchronous** — request akan menunggu sampai training selesai. Untuk dataset besar / epoch banyak, pertimbangkan memindahkan training ke background job (misal Celery/RQ) dan endpoint hanya mengembalikan `job_id`, dengan endpoint terpisah untuk polling status.
