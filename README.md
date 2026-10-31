# Kasa POS

Aplikasi point of sales untuk mengelola katalog, stok, pembayaran, riwayat transaksi, dan analisis penjualan. Aplikasi dibuat sebagai proyek pembelajaran: pahami dan uji setiap alur sebelum mempresentasikannya.

## Stack dan arsitektur

- Frontend: React 19, Vite, React Router, Zustand, CSS responsif.
- Backend API: Node.js, Express 5, Zod, JWT, bcrypt.
- Database: MySQL 8.4 dan Prisma ORM.
- Laporan: endpoint laporan berada di API utama agar berjalan sebagai Express server lokal maupun Vercel Function.
- Cache: Redis 7 untuk daftar produk; cache memiliki TTL dan dihapus saat katalog/stok berubah.
- Gambar produk: Cloudinary untuk penyimpanan file; MySQL hanya menyimpan URL dan public ID.
- Database lokal: MySQL, dikelola melalui phpMyAdmin. Untuk production, gunakan penyedia MySQL managed yang mendukung koneksi dari Vercel.
- Deployment: frontend dan backend dideploy sebagai dua project Vercel terpisah.

```text
React / Zustand
      | HTTP + JWT
Express API ---------------- Redis
      |                         cache katalog
      +---------- MySQL (lokal / managed)
      +---------- Cloudinary (gambar produk)
```

API memegang autentikasi dan otorisasi. Checkout memakai transaksi database, memvalidasi stok dengan update bersyarat, menyimpan snapshot item, dan mengurangi stok secara atomik. Prisma terhubung ke MySQL melalui `DATABASE_URL`.

## Menjalankan aplikasi

Pilih Docker Compose atau MySQL lokal. Untuk Docker, Docker Desktop dan Docker Compose v2 harus sudah terpasang dan berjalan.

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

Untuk menghentikan aplikasi, tekan `Ctrl+C` di terminal, lalu jalankan `docker compose down`. Data MySQL/Redis disimpan pada named volume. MySQL container menggunakan port `3306`; port host default adalah `3307` agar tidak bertabrakan dengan MySQL dari Laragon/XAMPP. phpMyAdmin tersedia di `http://localhost:8080`; login dengan server `db`, username `pos`, dan password `pos_dev_password` (atau nilai yang Anda atur di `.env`). Tabel/schema PostgreSQL lama tidak otomatis dipindahkan ke MySQL; database MySQL baru dibuat terpisah. Untuk menghapus data lokal MySQL/Redis sepenuhnya gunakan `docker compose down -v`.

### Melihat database dengan phpMyAdmin

`docker compose up --build` menjalankan MySQL dan phpMyAdmin. Buka `http://localhost:8080`, masukkan server `db`, username `pos`, dan password `pos_dev_password`. Database `pos_db` serta tabel dibuat otomatis oleh Prisma saat backend mulai. **phpMyAdmin dipakai untuk melihat/mengelola isi MySQL, bukan menjalankan Prisma migration.** Jika memakai phpMyAdmin dari instalasi XAMPP untuk mengakses container MySQL, koneksikan ke host `127.0.0.1`, port host `3307` (atau nilai `MYSQL_PORT` di `.env`), username `pos`, dan password yang diatur di `.env`.

Untuk menjalankan schema dan seeder secara manual tanpa Docker:

1. Pastikan MySQL 8.4 aktif dan database `pos_db` sudah dibuat.
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

Frontend dijalankan di terminal terpisah: masuk ke `frontend`, lalu jalankan `npm install` dan `npm run dev`. Jika ingin Redis, pastikan layanan Redis lokal aktif dan `REDIS_URL` sesuai. Tanpa `REDIS_URL`, API tetap membaca data langsung dari MySQL.

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
- API OpenAPI: [docs/openapi.yaml](docs/openapi.yaml)
- Koleksi Postman: [docs/postman_collection.json](docs/postman_collection.json)
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
cd ../backend && npm run db:generate
```

Uji manual setelah layanan aktif: login kedua role, uji checkout dengan stok cukup/tidak cukup, cek stok setelah checkout, akses halaman Admin sebagai kasir, filter riwayat/laporan, dan buka CSV hasil unduhan.

## Deployment Vercel + MySQL managed + Cloudinary

Deploy frontend dan backend sebagai **dua project Vercel** dari repository yang sama:

1. Buat project Vercel frontend dengan Root Directory `frontend` (build command `npm run build`, output `dist`).
2. Buat project Vercel backend dengan Root Directory `backend`. Express app diekspor dari `src/index.js` dan berjalan sebagai Vercel Function; endpoint API tetap memakai prefix `/api/v1`.
3. Buat database MySQL managed yang dapat diakses dari Vercel. Ambil connection string MySQL dari provider dan set sebagai `DATABASE_URL` pada backend.
   - `JWT_SECRET`: secret acak kuat, tidak sama dengan nilai development.
   - `CLIENT_URL`: URL production frontend Vercel.
   - `ADMIN_EMAIL` dan `ADMIN_PASSWORD`: kredensial awal Admin yang aman.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: kredensial Cloudinary.
   - `REDIS_URL` opsional; tanpa Redis, cache dinonaktifkan dan query tetap memakai database.
4. Pada project frontend, atur `VITE_API_URL` menjadi URL backend + `/api/v1` (contoh: `https://nama-api.vercel.app/api/v1`), lalu redeploy.
5. Sebelum memakai API production, jalankan `npm run db:push` dari folder backend dengan `DATABASE_URL` production. Jalankan `npm run db:seed` hanya jika ingin membuat akun Admin dan data demo. Jangan gunakan password demo di production.

Set variabel backend dari Vercel Project Settings → Environment Variables. Jangan meletakkan `DATABASE_URL`, `JWT_SECRET`, atau secret Cloudinary pada frontend maupun commit file `.env`. Neon hanya menyediakan PostgreSQL dan tidak dapat digunakan oleh konfigurasi MySQL ini. Setelah deployment, uji `/health`, login Admin/Kasir, checkout, laporan, dan upload gambar. Cloudinary adalah penyimpanan gambar; ia tidak menggantikan database.