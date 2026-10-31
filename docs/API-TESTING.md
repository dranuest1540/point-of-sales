# Dokumentasi API dan Pengujian Kasa POS

Dokumen ini melengkapi [spesifikasi Swagger/OpenAPI](./openapi.yaml) dan [koleksi Postman](./postman_collection.json) dengan langkah pengujian fungsional. Cakupannya mengikuti poin **Dokumentasi API** pada Fitur Utama guideline: penjelasan endpoint, contoh payload/response, dan penjelasan relasi data.

Untuk melihat Swagger UI tanpa memasang dependency, buka [Swagger Editor](https://editor.swagger.io/) lalu pilih **File → Import File** dan pilih `docs/openapi.yaml`. Di sana endpoint, skema, contoh request/response, dan tombol **Try it out** tersedia. Pastikan API lokal aktif sebelum mencoba request.

## Persiapan 

1. Jalankan aplikasi lokal dengan Docker Compose atau jalankan PostgreSQL, backend, dan frontend secara manual.
2. Pastikan API aktif di `http://localhost:4000`; health check dapat diperiksa di `http://localhost:4000/health`.
3. Import `docs/postman_collection.json` ke Postman.
4. Base URL default koleksi adalah `http://localhost:4000/api/v1`. Setelah request login Admin, koleksi menyimpan bearer token untuk request berikutnya.
5. Untuk data hasil seed default:
   - Admin: `admin@kasir.local` / `Admin123!`
   - Kasir: `kasir@kasir.local` / `Kasir123!`
6. Untuk pengujian role, lakukan login dengan akun yang sesuai. Token dari akun terakhir menggantikan token koleksi sebelumnya.

> Gunakan kredensial lokal hanya untuk development. Ganti password demo sebelum deployment.

## Autentikasi dan otorisasi

Kirim token pada request yang memerlukan login:

```http
Authorization: Bearer <token>
```

- Tanpa token atau token tidak valid: `401 Unauthorized`.
- Role tidak berhak mengakses endpoint: `403 Forbidden`.
- Pendaftaran publik selalu membuat role `CASHIER`; request tidak dapat memilih role Admin.
- Kasir hanya dapat melihat transaksi miliknya. Admin dapat melihat semua transaksi.
- Admin dapat mengakses CRUD produk/kategori dan laporan. Admin dan Kasir sama-sama dapat melihat katalog serta melakukan checkout.

## Daftar endpoint

Semua endpoint berikut memakai prefix `/api/v1`.

| Method dan endpoint | Akses | Fungsi |
|---|---|---|
| `POST /auth/register` | Publik | Daftar akun kasir |
| `POST /auth/login` | Publik | Login Admin/Kasir dan memperoleh JWT |
| `GET /auth/me` | Login | Melihat profil akun dari token aktif |
| `GET /products` | Login | Daftar produk dengan pencarian, filter, dan pagination |
| `GET /products/:id` | Login | Detail produk; Kasir hanya melihat produk aktif |
| `POST /products` | Admin | Membuat produk, opsional dengan gambar |
| `PATCH /products/:id` | Admin | Mengubah sebagian data produk, opsional mengganti gambar |
| `DELETE /products/:id` | Admin | Menonaktifkan produk (soft delete) |
| `GET /categories` | Login | Daftar kategori |
| `POST /categories` | Admin | Membuat kategori |
| `DELETE /categories/:id` | Admin | Menghapus kategori |
| `POST /sales` | Login | Checkout dan membuat transaksi |
| `GET /sales` | Login | Riwayat transaksi dengan filter tanggal dan pagination |
| `GET /sales/:id` | Login | Detail transaksi/struk, dibatasi berdasarkan pemilik untuk Kasir |
| `GET /reports/summary` | Admin | Ringkasan penjualan, tren, produk terlaris, stok rendah |
| `GET /reports/sales.csv` | Admin | Mengunduh transaksi lunas dalam CSV |

### Contoh request dan response

#### Login

Request `POST /auth/login`:

```json
{
  "email": "admin@kasir.local",
  "password": "Admin123!"
}
```

Response `200` (nilai token dan ID di bawah hanya contoh):

```json
{
  "data": {
    "user": {
      "id": "cmexampleadmin",
      "name": "Administrator",
      "email": "admin@kasir.local",
      "role": "ADMIN"
    },
    "token": "<jwt-token>"
  }
}
```

#### Membuat produk

Request `POST /products` sebagai Admin. Untuk data produk tanpa gambar, kirim `application/json`:

```json
{
  "sku": "MIN-010",
  "name": "Kopi Manual Brew",
  "description": "Kopi seduh manual",
  "price": 24000,
  "stock": 20,
  "lowStockAt": 5,
  "categoryId": "<category-id>",
  "isActive": true
}
```

Response `201` berisi `{ "data": <produk> }`, termasuk `id`, atribut produk, dan kategori terkait. Untuk mengunggah gambar, kirim `multipart/form-data`: field `product` berisi JSON string dari data produk di atas, dan field `image` berisi file JPG, PNG, atau WebP maksimal 4 MB. Jika konfigurasi Cloudinary belum tersedia, upload akan gagal dengan pesan konfigurasi.

#### Mencari dan mem-paginate produk

Request `GET /products?page=1&limit=12&search=kopi&categoryId=<category-id>`.

Response `200`:

```json
{
  "data": [
    {
      "id": "<product-id>",
      "sku": "MIN-010",
      "name": "Kopi Manual Brew",
      "price": "24000",
      "stock": 20,
      "isActive": true,
      "category": {
        "id": "<category-id>",
        "name": "Minuman"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Response produk mencakup field lain dari model, seperti `description`, `imageUrl`, `lowStockAt`, dan timestamp; field nullable dapat bernilai `null`. Nilai `Decimal` dari Prisma dapat diserialisasi sebagai string.

#### Checkout

Request `POST /sales` sebagai Admin atau Kasir:

```json
{
  "items": [
    { "productId": "<product-id>", "quantity": 2 }
  ],
  "discount": 2000,
  "amountPaid": 50000,
  "paymentMethod": "CASH"
}
```

Response `201` berisi `data` transaksi, `items` (snapshot nama/SKU/harga dan jumlah saat dibeli), serta nama kasir. Bentuk ringkas:

```json
{
  "data": {
    "id": "<sale-id>",
    "receiptNumber": "POS-<receipt-number>",
    "cashierId": "<cashier-id>",
    "subtotal": "48000",
    "discount": "2000",
    "total": "46000",
    "paymentMethod": "CASH",
    "amountPaid": "50000",
    "change": "4000",
    "status": "PAID",
    "items": [
      {
        "productId": "<product-id>",
        "productName": "Kopi Manual Brew",
        "productSku": "MIN-010",
        "quantity": 2,
        "unitPrice": "24000",
        "lineTotal": "48000"
      }
    ],
    "cashier": { "name": "Kasir Demo" }
  }
}
```

Response nyata menyertakan ID dan timestamp. Properti `tax` juga tersedia pada model transaksi. Harga, subtotal, diskon, total, dan pembayaran adalah contoh; gunakan nilai yang sesuai dengan produk yang dipilih.

#### Riwayat transaksi

Request `GET /sales?page=1&limit=20&startDate=2026-10-01&endDate=2026-10-31`.

Response `200` mempunyai bentuk `{ "data": [<transaksi beserta items dan cashier>], "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 } }`. Untuk Kasir, hasil hanya memuat transaksi milik akun tersebut; Admin dapat melihat transaksi semua kasir.

#### Laporan

Request Admin `GET /reports/summary?startDate=2026-10-01&endDate=2026-10-31`.

Response `200`:

```json
{
  "data": {
    "totalRevenue": 46000,
    "transactionCount": 1,
    "averageOrderValue": 46000,
    "topProducts": [
      {
        "productId": "<product-id>",
        "productName": "Kopi Manual Brew",
        "productSku": "MIN-010",
        "quantity": 2,
        "revenue": 48000
      }
    ],
    "lowStockProducts": [],
    "dailySales": [
      { "date": "2026-10-31", "revenue": 46000 }
    ]
  }
}
```

Request Admin `GET /reports/sales.csv?startDate=2026-10-01&endDate=2026-10-31` mengembalikan file `text/csv`, bukan JSON.

### Format error

Contoh response validasi atau kesalahan akses:

```json
{
  "error": {
    "message": "Input tidak valid.",
    "details": [
      { "field": "email", "message": "Invalid email" }
    ]
  }
}
```

`details` tersedia untuk kesalahan validasi tertentu. Error hak akses menggunakan status `403`; record yang tidak ditemukan umumnya `404`; stok yang tidak cukup atau berubah saat checkout `409`.

## Relasi data

- `User` **1:N** `Sale`: satu kasir memproses banyak transaksi; setiap transaksi memiliki satu kasir (`Sale.cashierId`).
- `Category` **1:N** `Product`: produk dapat tidak memiliki kategori (`Product.categoryId` nullable).
- `Sale` **1:N** `SaleItem`: satu transaksi terdiri dari satu atau lebih item.
- `Product` **1:N** `SaleItem`: produk bisa dijual pada banyak transaksi.
- `Sale` dan `Product` secara konseptual berelasi **M:N** melalui `SaleItem`. Item menyimpan snapshot nama, SKU, harga, jumlah, dan total baris agar struk historis tidak berubah ketika katalog diedit.
- Rincian field, key, dan aturan integritas tersedia di [ERD](./ERD.md).

## Skenario pengujian manual

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| API-01 | Login dengan kredensial valid | `200`; response berisi user dan JWT |
| API-02 | Login dengan password salah | `401`; data akun tidak dikembalikan |
| API-03 | Akses endpoint terlindungi tanpa token | `401` |
| API-04 | Login sebagai Kasir, lalu `POST /products` | `403`; produk tidak dibuat |
| API-05 | Login sebagai Admin, lalu buat produk valid | `201`; produk tampil pada katalog |
| API-06 | Cari produk dengan `search`, kategori, lalu cek page/limit | Hasil sesuai filter; `meta` memuat pagination |
| API-07 | Checkout dengan stok cukup dan pembayaran cukup | `201`; transaksi/struk tersimpan dan stok berkurang sesuai jumlah |
| API-08 | Checkout dengan stok tidak cukup | `409`; transaksi tidak dibuat dan stok tidak berkurang |
| API-09 | Checkout dengan pembayaran di bawah total | `400`; transaksi tidak dibuat dan stok tidak berkurang |
| API-10 | Kasir melihat riwayat transaksi | Hanya transaksi milik Kasir tersebut yang tampil |
| API-11 | Kasir meminta detail transaksi milik Kasir lain | `404`; detail transaksi tidak bocor |
| API-12 | Kasir meminta laporan atau CSV | `403` |
| API-13 | Admin meminta ringkasan laporan dan CSV | Ringkasan `200`; unduhan mengembalikan `text/csv` |
| API-14 | Upload file gambar produk valid sebagai Admin dengan konfigurasi Cloudinary | Produk berisi `imageUrl` dan `imagePublicId` |
| API-15 | Upload file bukan JPG/PNG/WebP atau lebih dari 4 MB | Request ditolak dengan error validasi/upload |

### Urutan smoke test Postman

1. Jalankan `Login admin demo`; token tersimpan di collection variable `token`.
2. Jalankan `List products` dan salin salah satu `id` produk ke collection variable `productId`.
3. Jalankan `Checkout` dengan stok dan `amountPaid` yang cukup. Pastikan response memuat `receiptNumber`, `items`, dan `cashier`.
4. Jalankan `Transaction history`; transaksi baru seharusnya tampil.
5. Jalankan `Summary` dan `Download CSV` sebagai Admin.
6. Login sebagai Kasir dan ulangi request produk/laporan untuk memastikan endpoint Admin ditolak. Untuk checkout dan riwayat, pastikan Kasir hanya melihat transaksi miliknya.
7. Jika menguji `Create product (Admin)`, gunakan SKU unik agar tidak mendapat konflik `409`.

## Pengujian otomatis yang tersedia

Dari folder `backend`, jalankan:

```bash
npm test
```

Tes unit pada `backend/test/sales.service.test.js` mencakup penggabungan product duplikat di cart dan perhitungan kembalian, stok tidak cukup, pembayaran kurang, dan perubahan stok bersamaan. Tes ini menguji service checkout dengan database tiruan; tes ini **bukan** pengganti pengujian integrasi HTTP/Postman terhadap database lokal.
