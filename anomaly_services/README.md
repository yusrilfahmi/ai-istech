# Machine Anomaly Detection Service (multi-mesin)

Dua endpoint utama untuk deteksi anomali mesin industri pakai Isolation Forest,
mendukung banyak mesin dengan model terpisah masing-masing.

## Struktur

```
anomaly_service/
├── app/isolation-forest
│   ├── build_model.py         # logika training (pure function)
│   ├── predict.py             # logika scoring (pure function)
│   ├── common.py              # validasi nama & path aman (anti path traversal)
│   ├── main.py                     # FastAPI: /build_model, /predict, /health
├── requirements.txt
├── data/                       # contoh dataset per mesin
│   ├── machine_A.csv
│   └── machine_B.csv
└── models/                     # dibuat otomatis saat build_model dipanggil
    └── {machine_name}/
        ├── {machine_name}_{timestamp}.joblib       # model terlatih
        └── {machine_name}_{timestamp}.meta.json    # config asli saat training
```

`build_model.py` dan `predict.py` sengaja dipisah dari FastAPI
(`main.py` cuma pemanggil HTTP-nya) — jadi kalau nanti kamu mau pecah jadi dua
proses/deployment terpisah, logikanya sudah siap dipindah tanpa perlu ditulis ulang.

## Instalasi

```bash
python -m venv .venv; .\.venv\Scripts\python -V
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Menjalankan Server

```bash
cd app/isolation-forest
uvicorn main:app --host 0.0.0.0 --port 8020
```

Server akan berjalan di `http://0.0.0.0:8010`

## Endpoint

### `POST /build_model`

Multipart form-data:

| Field | Wajib | Keterangan |
|---|---|---|
| `dataset` | ya | File CSV, kolom = nama fitur, baris = window observasi (data kondisi normal) |
| `machine_name` | ya | Nama/seri mesin. Hanya boleh huruf, angka, `-`, `_` |
| `model_set` | tidak | JSON string. Field kosong/hilang otomatis pakai default |

`model_set`:
```json
{
  "features": ["temp_mean", "vib_rms", "current_std"],
  "contamination": 0.02,
  "n_estimators": 150,
  "max_samples": 256
}
```
- `features` kosong/tidak dikirim → pakai SEMUA kolom di dataset
- `contamination` default `0.02`, `n_estimators` default `150`, `max_samples` default `"auto"`

Contoh:
```bash
curl -X POST http://localhost:8020/build_model \
  -F "dataset=@data/machine_A.csv" \
  -F "machine_name=CNC-001" \
  -F 'model_set={"contamination": 0.03}'
```

Response:
```json
{
  "machine_name": "CNC-001",
  "model_train": "CNC-001/CNC-001_20260903_043111.joblib",
  "features_used": ["temp_mean", "vib_rms", "current_std"],
  "contamination": 0.03,
  "n_estimators": 150,
  "max_samples": "auto",
  "n_samples_trained": 800
}
```

**Simpan `model_train`** — itu yang dipakai untuk memanggil `/predict` nanti.
Setiap kali `/build_model` dipanggil, file BARU dibuat (nama pakai timestamp),
model lama tidak tertimpa — jadi kamu bisa punya beberapa versi model per mesin.

### `POST /predict`

JSON body:
```json
{
  "machine_name": "CNC-001",
  "routing_db": "local",
  "timing": "2026-09-03T10:15:00",
  "model_train": "CNC-001/CNC-001_20260903_043111.joblib",
  "model_set": {
    "features": ["temp_mean", "vib_rms", "current_std"],
    "contamination": 0.03,
    "n_estimators": 150,
    "max_samples": "auto"
  },
  "sample": {
    "temp_mean": 95.0,
    "vib_rms": 2.5,
    "current_std": 3.0
  }
}
```

- `sample`: nilai fitur mesin saat ini, dikirim langsung oleh client (bukan diambil dari db)
- `routing_db`, `timing`: **reserved**, sekadar di-echo balik ke response untuk keperluan
  logging/audit di sisi aplikasi kamu — belum dipakai untuk fetch data
- `model_set`: **referensi/logging saja**, TIDAK dipakai untuk scoring (hyperparameter
  asli sudah tersimpan permanen di file `.joblib` dan `.meta.json` saat training).
  Kalau `model_set.features` yang kamu kirim beda dari yang dipakai saat training,
  response akan berisi `"config_mismatch": true` sebagai peringatan (tidak memblokir
  prediksi) — berguna untuk mendeteksi config yang sudah usang di aplikasi kamu.

Response:
```json
{
  "machine_name": "CNC-001",
  "model_train": "CNC-001/CNC-001_20260903_043111.joblib",
  "routing_db": "local",
  "timing": "2026-09-03T10:15:00",
  "anomaly_score": 0.7541,
  "is_anomaly": true,
  "config_mismatch": false
}
```

## Keamanan yang sudah ditangani

- **Path traversal**: `model_train` divalidasi harus tetap berada di dalam folder
  `models/` — request seperti `model_train: "../../etc/passwd"` otomatis ditolak (422)
- **Cross-machine mismatch**: kalau `machine_name` tidak cocok dengan folder model
  yang direferensikan di `model_train`, request ditolak (422) — mencegah salah pakai
  model mesin lain secara tidak sengaja
- **Validasi fitur**: fitur yang dikirim di `sample` harus PERSIS sama dengan yang
  dipakai saat training (bukan dari `model_set` client, tapi dari metadata tersimpan
  di server) — kurang atau kelebihan fitur ditolak (422)

## Retraining / versioning

Setiap `/build_model` menghasilkan file baru, tidak menimpa yang lama. Simpan
`model_train` mana yang sedang aktif dipakai per mesin di aplikasi/config kamu
sendiri, dan update referensinya setelah retraining berhasil divalidasi.
