# Kasa POS

Aplikasi point of sales untuk mengelola katalog, stok, pembayaran, riwayat transaksi, dan analisis penjualan. Aplikasi dibuat sebagai proyek pembelajaran: pahami dan uji setiap alur sebelum mempresentasikannya.

## Stack dan arsitektur

- Frontend: React 19, Vite, React Router, Zustand, CSS responsif.
- Backend API: Node.js, Express 5, Zod, JWT, bcrypt.
- Database: PostgreSQL 16 dan Prisma ORM; Neon untuk production.
- Laporan: endpoint laporan berada di API utama agar berjalan sebagai Express server lokal maupun Vercel Function.
- Cache: Redis 7 untuk daftar produk; cache memiliki TTL dan dihapus saat katalog/stok berubah.
- Gambar produk: Cloudinary untuk penyimpanan file; PostgreSQL hanya menyimpan URL dan public ID.
- Database lokal: PostgreSQL melalui Docker Compose. Database MySQL lama di komputer Anda tidak dihapus, tetapi aplikasi tidak lagi menggunakannya.
- Deployment: frontend dan backend dideploy sebagai dua project Vercel terpisah.

```text
React / Zustand
      | HTTP + JWT
Express API ---------------- Redis
      |                         cache katalog
      +---------- PostgreSQL (lokal / Neon)
      +---------- Cloudinary (gambar produk)
```

API memegang autentikasi dan otorisasi. Checkout memakai transaksi database, memvalidasi stok dengan update bersyarat, menyimpan snapshot item, dan mengurangi stok secara atomik. Prisma memakai `DATABASE_URL` untuk koneksi aplikasi dan `DIRECT_URL` untuk perintah Prisma CLI.

## Menjalankan aplikasi

Pilih Docker Compose atau PostgreSQL lokal. Untuk Docker, Docker Desktop dan Docker Compose v2 harus sudah terpasang dan berjalan.

1. Buka terminal di root repository (folder yang berisi `docker-compose.yml`).
2. (Opsional) Salin `.env.example` menjadi `.env` untuk mengubah konfigurasi lokal. Ganti secret/password sebelum penggunaan di luar lokal. Untuk menjalankan backend tanpa Docker, gunakan `backend/.env.example` sebagai basis konfigurasi backend.
3. Jalankan perintah berikut dan tunggu sampai semua layanan selesai dimulai. Pada penggunaan pertama, Docker mungkin perlu mengunduh image dan membangun container:

   ```bash
   docker compose up --build
   ```

4. Buka aplikasi di `http://localhost:5173`. API tersedia di `http://localhost:4000`, dengan health check di `http://localhost:4000/health`.

Saat backend mulai, Compose menjalankan Prisma `db push`, lalu menambahkan akun Admin, kasir demo, kategori, dan produk contoh. Akun lokal default:

- Email: `admin@kasir.local`
- Password: `Admin123!`
- Email kasir: `kasir@kasir.local`
- Password kasir: `Kasir123!`

Ganti nilainya melalui `.env`; jangan gunakan kredensial demo untuk deployment publik.

Untuk menghentikan aplikasi, tekan `Ctrl+C` di terminal, lalu jalankan `docker compose down`. Data PostgreSQL/Redis disimpan pada named volume. PostgreSQL container memakai port `5432`; port host default adalah `5433`. Database MySQL lama di instalasi lokal Anda tidak dihapus. Docker Compose membuat database PostgreSQL lokal baru untuk aplikasi. Untuk menghapus volume Docker gunakan `docker compose down -v` (perintah ini menghapus data PostgreSQL/Redis di Docker).

### Melihat database PostgreSQL

`docker compose up --build` menjalankan PostgreSQL. Database `pos_db` serta tabel dibuat otomatis oleh Prisma saat backend mulai. Untuk melihat data, gunakan `psql` atau aplikasi klien PostgreSQL seperti pgAdmin; phpMyAdmin hanya mendukung MySQL dan tidak dapat digunakan untuk database Neon/PostgreSQL.

Untuk menjalankan schema dan seeder secara manual tanpa Docker:

1. Pastikan PostgreSQL 16 aktif dan database `pos_db` sudah dibuat.
2. Salin `backend/.env.example` menjadi `backend/.env`. Sesuaikan username, password, dan port pada `DATABASE_URL`.
3. Dari terminal, pindah ke folder `backend`, lalu jalankan:

   ```bash
   npm install
   npm run db:generate
   npm run db:push
   npm run db:seed
   npm run dev
   ```

`npm run db:push` membuat/menyamakan tabel dari `backend/prisma/schema.prisma`. `npm run db:seed` mengisi akun Admin, akun kasir, kategori, dan produk contoh. Akun seed bisa diubah lewat `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CASHIER_EMAIL`, dan `CASHIER_PASSWORD` di `backend/.env`. Untuk Compose, proses db push dan seed tersebut dijalankan otomatis saat backend mulai.

Frontend dijalankan di terminal terpisah: masuk ke `frontend`, lalu jalankan `npm install` dan `npm run dev`. Jika ingin Redis, pastikan layanan Redis lokal aktif dan `REDIS_URL` sesuai. Tanpa `REDIS_URL`, API tetap membaca data langsung dari PostgreSQL.

### Upload gambar produk

Isi `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan `CLOUDINARY_API_SECRET` pada environment backend untuk mengaktifkan upload gambar produk. Form produk menerima JPG, PNG, atau WebP hingga 4 MB. Jika variabel Cloudinary belum diisi, fitur aplikasi lain tetap berjalan, tetapi upload gambar mengembalikan pesan konfigurasi yang jelas.

## Fitur

- Login, registrasi kasir, sesi JWT 12 jam, dan pembatasan role `ADMIN` / `CASHIER`.
- Admin: tambah/edit/nonaktifkan produk, kategori, harga, stok dan batas stok minimum.
- Kasir/Admin: pencarian SKU/nama, filter kategori, pagination, cart, pilihan pembayaran tunai/kartu/QRIS, validasi pembayaran dan stok, pengurangan stok atomik, serta struk.
- Riwayat transaksi dengan pagination/filter tanggal. Kasir hanya melihat transaksi miliknya; Admin melihat semua.
- Admin: ringkasan revenue, jumlah transaksi, rata-rata nilai order, tren harian, produk terlaris, stok rendah, dan unduh CSV.
- Redis cache untuk daftar produk; koneksi Redis opsional.
- Upload gambar produk ke Cloudinary; database menyimpan URL dan public ID.
- Layout responsif untuk layar desktop dan ponsel.

## Dokumentasi

- ERD dan keputusan database: [docs/ERD.md](docs/ERD.md)
- API Swagger/OpenAPI (endpoint, payload, response, relasi): [docs/openapi.yaml](docs/openapi.yaml)
- Koleksi Postman: [docs/postman_collection.json](docs/postman_collection.json)
- Cara membuka Swagger UI dan panduan pengujian API: [docs/API-TESTING.md](docs/API-TESTING.md)
- Outline presentasi sesuai panduan: [docs/PRESENTATION.md](docs/PRESENTATION.md)

## Struktur folder

```text
backend/
  prisma/                 schema dan data seed
  src/middleware/         autentikasi dan role
  src/modules/            route per domain: auth, katalog, transaksi, laporan
  src/shared/              Prisma, Redis cache, error handling
frontend/
  src/components/         autentikasi
  src/lib/                API client dan format data
  src/pages/               kasir, produk, laporan, riwayat
  src/store/               sesi dan cart Zustand
docs/                      ERD, kontrak API, presentasi
docker-compose.yml
```

## Pemeriksaan

```bash
cd frontend && npm run build
cd ../backend && npm run db:generate && npm test
```

Skenario manual, contoh payload/response, dan hasil yang diharapkan per endpoint tersedia di [docs/API-TESTING.md](docs/API-TESTING.md). Uji integrasi dengan Postman setelah layanan database dan API aktif.

## Deployment Vercel + Neon + Cloudinary

Neon menggunakan PostgreSQL, jadi konfigurasi aplikasi dan Docker lokal sekarang sama-sama PostgreSQL. Data pada MySQL lokal lama tidak dimigrasikan atau dihapus; database Neon baru akan diisi akun dan produk contoh melalui seeder.

### 1. Buat database Neon

1. Buat akun di Neon, lalu buat project PostgreSQL dan database `pos_db` (atau catat nama database default).
2. Dari menu **Connect**, salin kedua connection string. Gunakan URL **pooled** (hostname memuat `-pooler`) untuk `DATABASE_URL`, serta URL **direct/unpooled** untuk `DIRECT_URL`.
3. Jangan menaruh URL tersebut di frontend, commit, dokumentasi publik, atau chat. Masukkan ke Environment Variables project backend di Vercel dan `backend/.env` lokal yang di-ignore Git hanya bila menjalankan perintah Prisma dari komputer.

### 2. Buat asset Cloudinary

Buat akun Cloudinary, lalu ambil Cloud name, API Key, dan API Secret dari dashboard. Simpan sebagai environment variable backend saja. Jangan gunakan ketiga nilai ini di `VITE_*` atau frontend.

### 3. Deploy backend API di Vercel

1. Import repository GitHub ke Vercel dan set **Root Directory** ke `backend`.
2. Backend memakai Express entry point `src/index.js`; endpoint tetap memakai prefix `/api/v1` dan health check tersedia di `/health`. Build command `npm run build`, install command default Vercel.
3. Tambahkan environment variables untuk Production (serta Preview jika diperlukan):
   - `DATABASE_URL`: Neon pooled connection string.
   - `DIRECT_URL`: Neon direct/unpooled connection string, untuk Prisma CLI.
   - `JWT_SECRET`: secret acak kuat minimal 32 karakter.
   - `CLIENT_URL`: URL deployment frontend Vercel.
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CASHIER_EMAIL`, `CASHIER_PASSWORD`: kredensial unik dan kuat untuk akun seed.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: kredensial Cloudinary.
   - `REDIS_URL` opsional; jangan diisi dulu jika belum mempunyai Redis managed.
4. Deploy dan catat URL API (misalnya `https://nama-api.vercel.app`).

### 4. Siapkan schema dan akun awal

Sebelum frontend menggunakan database, jalankan perintah Prisma dari folder `backend` dengan `backend/.env` berisi kedua connection string Neon serta nilai akun Admin/Kasir yang aman:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

Ini membuat schema kosong dan mengisi akun serta produk demo ke Neon baru. Jangan jalankan seeder dengan kredensial default pada database publik. Perintah schema tidak dijalankan otomatis saat setiap deployment.

### 5. Deploy frontend

1. Import repository yang sama sebagai project Vercel kedua dan set **Root Directory** ke `frontend`.
2. Build command `npm run build`, output directory `dist`.
3. Set `VITE_API_URL` ke URL backend lengkap dengan `/api/v1`, misalnya `https://nama-api.vercel.app/api/v1`, kemudian deploy.
4. Pastikan `CLIENT_URL` di project backend cocok persis dengan URL frontend production. Jika mengubahnya, redeploy backend.

Setelah deployment, uji frontend, `/health`, login Admin/Kasir, checkout, laporan, dan upload gambar. Cloudinary hanya menyimpan file gambar; data transaksi dan URL gambar tetap disimpan di Neon.