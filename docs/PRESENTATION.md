# Outline Presentasi Final Project

Panduan proyek meminta presentasi individu. Gunakan outline ini untuk menyiapkan slide dan demonstrasi; lengkapi bagian personal dengan pengalaman Anda sendiri, bukan teks generik.

1. **Introduction**: profil singkat, minat, nilai kerja, dan tujuan karier.
2. **Education & Working**: pendidikan, spesialisasi, pengalaman/kontribusi kerja yang relevan.
3. **Overview Project**: Kasa POS, target pengguna (pemilik toko dan kasir), masalah pencatatan stok/transaksi, tujuan dan manfaat.
4. **Main Project: Problem & Solution**: pencatatan manual, risiko stok tidak sinkron, kebutuhan laporan; tunjukkan fitur produk, checkout, role dan analitik.
5. **User Flow**: Admin mengelola katalog → Kasir login → pilih produk → validasi cart/pembayaran → stok berkurang → struk tersimpan → Admin menganalisis dan mengunduh laporan.
6. **ERD & API**: jelaskan User, Category, Product, Sale, SaleItem, kunci relasi, snapshot harga; tunjukkan satu request checkout dan respons.
7. **Tech Stack & Architecture**: React/Zustand, Express, Prisma/PostgreSQL (Neon), Redis opsional, Cloudinary, dan Vercel; jelaskan pemisahan frontend/backend saat deployment.
8. **Demo**: login Admin, edit stok, transaksi sebagai kasir, tunjukkan stok/struk/riwayat, buka laporan dan CSV, uji akses role.
9. **Challenges & Problem Solving**: jelaskan sendiri race condition stok, transaksi database, cache invalidation, autentikasi/role, dan cara mengujinya.
10. **Testing, Deployment & Next Steps**: skenario uji, Docker Compose, tautan repository/deployment/API docs, batasan dan rencana pengembangan.

Sebelum presentasi, ganti kredensial demo, isi URL repository/deployment, siapkan akun kasir demo, dan pastikan semua tautan dapat dibuka. Jangan mengklaim deployment publik jika belum benar-benar dilakukan.