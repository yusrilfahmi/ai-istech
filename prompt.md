Saya ingin kamu mengerjakan fitur dashboard untuk menampilkan seluruh data telemetry compressor dari PostgreSQL.

WAJIB:
- Baca dan pahami struktur project yang sudah ada terlebih dahulu.
- Jangan membuat arsitektur baru jika project sudah memiliki pola controller/service/routes/database connection.
- Ikuti pola coding, naming, error handling, TypeScript style, dan struktur folder yang sudah digunakan project.
- Jangan mengubah fitur existing yang tidak berhubungan dengan fitur ini.
- Jangan menghapus atau merusak endpoint existing.
- Sebelum mengubah file, inspect file yang relevan terlebih dahulu.

ARSITEKTUR PROJECT:
Next.js frontend → Express backend → PostgreSQL Docker.

Frontend TIDAK BOLEH mengakses PostgreSQL secara langsung.
Frontend hanya boleh mengambil data melalui Express API.

DATABASE:
PostgreSQL database:
- database: mydb
- table: compressor_telemetry

Struktur tabel compressor_telemetry:
- id BIGINT PRIMARY KEY, otomatis
- dataset_id UUID NOT NULL
- machine_id VARCHAR(20) NOT NULL
- timestamp TIMESTAMPTZ NOT NULL
- arus_a NUMERIC(6,2)
- outlet_pressure_bar NUMERIC(5,2)
- outlet_flow_rate_m3h NUMERIC(6,1)
- kwh_per_m3 NUMERIC(6,4)
- created_at TIMESTAMPTZ DEFAULT now()

Index yang sudah tersedia:
- PRIMARY KEY (id)
- idx_telemetry_dataset_time (dataset_id, timestamp)
- idx_telemetry_machine_time (machine_id, timestamp)

Dataset Compressor:
dataset_id = 4e070acb-0e51-4e9f-8c42-9ee7cc8453b0
machine_id = CMP-01

TUJUAN:
Buat dashboard/page yang menampilkan data dari compressor_telemetry dalam tabel yang rapi.

Data yang ditampilkan:
1. Machine ID
2. Timestamp
3. Arus (A)
4. Outlet Pressure (bar)
5. Outlet Flow Rate (m³/h)
6. kWh/m³

JANGAN mengambil seluruh data sekaligus ke browser karena jumlah data besar.
Gunakan SERVER-SIDE PAGINATION.

API yang diinginkan:

GET /api/compressor-telemetry?page=1&limit=50

Response ideal:

{
  "data": [
    {
      "id": 1,
      "dataset_id": "4e070acb-0e51-4e9f-8c42-9ee7cc8453b0",
      "machine_id": "CMP-01",
      "timestamp": "2026-01-01T00:00:00.000Z",
      "arus_a": 100.21,
      "outlet_pressure_bar": 7.35,
      "outlet_flow_rate_m3h": 496.8,
      "kwh_per_m3": 0.121
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000000,
    "totalPages": 20000
  }
}

Catatan:
- Sesuaikan prefix endpoint dengan prefix API yang sudah digunakan project.
- Jika project sudah menggunakan /api/v1, gunakan prefix tersebut.
- Jangan membuat koneksi PostgreSQL baru jika project sudah memiliki database pool/connection.
- Gunakan parameterized query.
- Validasi page dan limit.
- Maximum limit = 100.
- Default limit = 50.
- page minimum = 1.
- Jangan menggunakan SELECT * jika tidak diperlukan.
- Query harus hanya mengambil kolom yang dibutuhkan.
- Gunakan ORDER BY timestamp DESC.
- Gunakan LIMIT dan OFFSET untuk pagination versi pertama.
- COUNT(*) digunakan untuk mendapatkan total data.

BACKEND:

Cari terlebih dahulu:
- database connection/pool yang sudah digunakan project
- contoh service existing
- contoh controller existing
- contoh route existing
- app.ts/server.ts

Kemudian implementasikan endpoint dengan pola project yang sudah ada.

Jika struktur project menggunakan:
src/services
src/controllers
src/routes

buat fitur telemetry mengikuti pola tersebut.

Endpoint harus:
- mengambil data compressor_telemetry
- mendukung page dan limit
- mengembalikan data + pagination
- menggunakan error middleware existing
- tidak merusak endpoint lain

FRONTEND:

Cari page dashboard compressor yang sudah ada.

lokasi:
frontend/app/ admin/dashboard-data

Update page tersebut untuk menampilkan tabel telemetry.

Gunakan komponen/UI library yang SUDAH digunakan project.
Jangan menambahkan library baru jika tidak diperlukan.

Tampilan tabel:
- responsive
- header jelas
- angka diformat rapi
- timestamp diformat agar mudah dibaca
- loading state
- empty state
- error state
- pagination controls

Pagination:
- Previous
- nomor halaman
- Next
- disable Previous pada halaman pertama
- disable Next pada halaman terakhir
- tampilkan informasi seperti:
  "Showing 1–50 of 1,000,000"

Default:
- page = 1
- limit = 50

Sediakan pilihan:
25
50
100

Ketika limit berubah:
- kembali ke page 1
- fetch ulang data

Ketika page berubah:
- fetch data page tersebut saja.

DATA SORTING:

Default:
timestamp DESC

Artinya data terbaru muncul di paling atas.

PERFORMANCE:

Karena tabel compressor_telemetry akan terus bertambah setiap beberapa detik:
- jangan fetch seluruh data
- jangan melakukan client-side pagination
- jangan menyimpan seluruh dataset di state frontend
- gunakan server-side pagination
- gunakan query yang memanfaatkan index yang sudah ada
- jangan melakukan query N+1

IMPORTANT:

Sebelum coding:
1. Inspect struktur backend.
2. Inspect database connection.
3. Inspect existing routes/controllers/services.
4. Inspect compressor page frontend.
5. Ikuti pola existing project.

Setelah coding:
1. Pastikan TypeScript tidak error.
2. Pastikan backend compile.
3. Pastikan frontend compile.
4. Test endpoint dengan:
   GET /api/compressor-telemetry?page=1&limit=50
5. Pastikan response JSON sesuai.
6. Pastikan pagination bekerja.
7. Pastikan page frontend bisa menampilkan data.

Jangan hanya menjelaskan apa yang harus dilakukan.
KERJAKAN LANGSUNG perubahan pada file project.

Setelah selesai, berikan:
1. daftar file yang dibuat/diubah
2. ringkasan perubahan
3. endpoint yang ditambahkan
4. contoh response API
5. hasil test/build
6. jika ada bagian yang tidak bisa dikerjakan, jelaskan penyebabnya dengan jelas.