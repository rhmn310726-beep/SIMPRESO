# AGENTS.md — SIMPRESO

Panduan ini dibaca oleh AI coding assistant (Cursor, Copilot, Claude Code, dll.) sebelum mengubah kode. Baca dulu, jangan langsung menebak. Kalau ada yang tidak jelas, tanyakan ke user, jangan mengarang.

---

## 1. Tentang Proyek
SIMPRESO (Sistem Informasi Manajemen Preskripsi dan Stok Obat) adalah aplikasi web untuk alur pelayanan resep elektronik di rumah sakit/klinik. Aplikasi menghubungkan tiga peran: Dokter, Petugas Farmasi, dan Admin Sistem.

Tujuan utama sistem:
1. Menggantikan resep kertas dengan resep elektronik.
2. Mencegah kesalahan obat akibat alergi dan interaksi obat.
3. Memastikan serah terima obat idempoten (tidak dobel).
4. Menjaga akurasi stok obat secara otomatis.

---

## 2. Stack Teknis (WAJIB DIPATUHI)
### Backend
- Laravel 13 (laravel/framework ^13.17), PHP 8.3+
- Inertia Laravel ^3.7
- PostgreSQL lokal, database: db-simpreso
- Queue driver: database
- Test: PHPUnit 12 (BUKAN Pest), DB test: SQLite :memory:
- Code style: Laravel Pint
- Debug: Laravel Pail

### Frontend
- React 19 + TypeScript (tsconfig.json)
- Inertia React ^3.11
- Vite 8 + laravel-vite-plugin
- Tailwind CSS 4
- Alias import: @ → resources/js

### Catatan stack
- Hanya rute GET / yang me-render resources/js/pages/welcome.tsx. Health check: /up.
- Frontend pakai TypeScript strict — jangan pakai `any` tanpa alasan jelas.
- Jangan pakai library tambahan tanpa persetujuan user.

---

## 3. Peran Pengguna & Hak Akses
Sistem punya 3 role, dan TIDAK ADA registrasi publik.

| Role | Deskripsi |
|------|-----------|
| dokter | Membuat resep elektronik untuk pasien |
| farmasi | Memverifikasi, menyiapkan, dan menyerahkan obat |
| admin | Mengelola master data, stok, dan akun pengguna |

Aturan role (PENTING):
- Role disimpan di kolom users.role (enum: dokter, farmasi, admin).
- Role ditentukan oleh Admin, bukan dipilih user saat login.
- Akun Admin pertama dibuat via seeder, bukan lewat UI.
- Login: satu pintu (/login) → setelah sukses, sistem redirect ke dashboard sesuai role.
- Tidak boleh ada form registrasi publik di route mana pun.
- Middleware role wajib dipasang di setiap route group yang sensitif.

---

## 4. Alur Sistem End-to-End (Domain Flow)
Ini alur yang WAJIB diikuti. Jangan mengubah urutan tanpa persetujuan user.

### 4.1 Fase Dokter
1. Dokter login → dashboard "Daftar Pasien".
2. Dokter memilih pasien → halaman Detail Pasien.
3. Dokter melihat alergi pasien; bisa menambah alergi jika belum tercatat.
4. Dokter membuat resep di halaman Buat Resep:
   - Pilih obat dari formularium (hanya obat berstatus aktif).
   - Isi dosis, jumlah, aturan pakai.
   - Sistem menampilkan peringatan alergi (merah) dan peringatan interaksi obat (oranye) secara real-time.
5. Dokter menyimpan resep → status awal: menunggu.
6. Resep otomatis masuk antrean farmasi.

### 4.2 Fase Farmasi
7. Petugas farmasi melihat Antrean Resep (kanban 4 kolom).
8. Petugas membuka Detail & Verifikasi Resep:
   - Melihat info pasien, daftar obat, stok, alergi, interaksi.
   - Checklist verifikasi wajib dicentang sebelum bisa menerima resep.
9. Petugas menerima resep → status: diterima.
10. Petugas menyiapkan obat → status: disiapkan.
11. Obat siap di loket → status: siap_diambil.
12. Obat diserahkan ke pasien → petugas membuka Konfirmasi Serah Terima:
    - Isi nama penerima + hubungan dengan pasien.
    - Centang pernyataan konfirmasi.
    - Klik "Konfirmasi Serah Terima".

### 4.3 Efek Samping Konfirmasi (KRITIS)
Saat konfirmasi serah terima berhasil, dalam satu transaksi database:
1. Status resep berubah menjadi diserahkan.
2. Stok obat berkurang sesuai jumlah yang diserahkan.
3. Transaksi pengeluaran dicatat (tabel stock_movements atau sejenis).
4. Timestamp diserahkan_at diisi.

### 4.4 Idempotensi (WAJIB)
- Serah terima tidak boleh diproses lebih dari sekali.
- Gunakan DB transaction + row lock (lockForUpdate()).
- Cek diserahkan_at IS NULL sebelum memproses.
- Kalau sudah diserahkan, tolak dengan pesan jelas — jangan diam-diam sukses.
- Idealnya pakai idempotency key di request (opsional, kalau user minta).

### 4.5 Fase Admin
- Mengelola master data obat (CRUD).
- Mengatur stok dan stok minimum per obat.
- Mengelola data pasien.
- Membuat akun dokter, farmasi, dan admin (tidak ada registrasi publik).
- Mengelola aturan alergi (bahan aktif → alergen) dan aturan interaksi obat (obat A + obat B → tingkat + saran).
- Melihat peringatan stok minimum.
- Melihat riwayat stok masuk/keluar.
- Mencetak laporan persediaan.

### 4.6 Laporan Farmasi
- Laporan stok: total item, stok aman/kritis/habis.
- Top 10 obat paling sering keluar (berdasarkan stock_movements keluar).
- Daftar stok kritis (stok ≤ stok minimum).
- Tren penggunaan bulanan.

---

## 5. Status Resep (Enum — JANGAN DIUBAH TANPA IZIN)
menunggu → diterima → disiapkan → siap_diambil → diserahkan → dibatalkan (dari status mana pun sebelum diserahkan)

Aturan transisi:
- Hanya farmasi yang boleh mengubah status.
- Tidak boleh melompati urutan (misal menunggu → disiapkan).
- Setelah diserahkan, status terkunci permanen.
- dibatalkan hanya bisa dari status sebelum diserahkan.

---

## 6. Aturan Domain yang Tidak Boleh Dilanggar
### 6.1 Alergi
- Saat dokter memilih obat, sistem wajib mengecek apakah obat mengandung bahan aktif yang ada di daftar alergi pasien.
- Kalau ada match → tampilkan peringatan merah.
- Peringatan bersifat blocking warning, bukan blocking action: dokter tetap bisa lanjut, tapi harus sadar risikonya.

### 6.2 Interaksi Obat
- Saat dokter menambah obat, cek semua kombinasi dengan obat yang sudah ada.
- Kalau ada interaksi → tampilkan peringatan oranye dengan tingkat (ringan/sedang/berat) dan saran.

### 6.3 Stok
- Stok tidak boleh negatif. Kalau stok kurang dari jumlah yang diminta, tolak dengan pesan jelas.
- Pengurangan stok hanya terjadi saat konfirmasi serah terima, bukan saat resep dibuat atau disiapkan.
- Penambahan stok hanya lewat menu Tambah Stok (farmasi/admin) atau penerimaan supplier (admin).

### 6.4 Formularium
- Hanya obat dengan status aktif yang muncul di formularium dokter.
- Obat dengan stok 0 tetap tampil, tapi tidak bisa dipilih.

---

## 7. Konvensi Kode
### 7.1 Backend (Laravel)
- Gunakan Form Request untuk validasi — jangan validasi di controller.
- Gunakan Service Class untuk logika bisnis kompleks (misal HandoverService untuk serah terima).
- Gunakan DB Transaction untuk operasi multi-tabel.
- Gunakan route model binding kalau memungkinkan.
- Nama tabel: snake_case plural (prescriptions, stock_movements).
- Nama model: PascalCase singular (Prescription, StockMovement).
- Enum: gunakan PHP 8.1 backed enum (misal PrescriptionStatus).
- Jangan pakai DB::raw() kalau bisa pakai query builder/Eloquent.
- Semua response ke Inertia harus lewat controller, bukan closure di route.

### 7.2 Frontend (React + TypeScript)
- Halaman ada di resources/js/pages/ (lowercase, kebab-case).
- Komponen reusable ada di resources/js/components/.
- Gunakan Inertia useForm untuk form — jangan pakai fetch/axios manual kecuali ada alasan kuat.
- Gunakan @ alias untuk import: import Foo from '@/components/Foo'.
- TypeScript strict — jangan pakai any tanpa komentar alasan.
- Tailwind 4: pakai utility class, hindari @apply kecuali terpaksa.
- Nama file komponen: PascalCase (PatientCard.tsx).
- Nama file halaman: kebab-case (daftar-pasien.tsx).

### 7.3 Testing
- PHPUnit 12, bukan Pest. Jangan buat file *.pest.php.
- Test ada di tests/Feature/ dan tests/Unit/.
- Test pakai SQLite :memory: — jangan hardcode PostgreSQL di test.
- Setiap fitur kritis (serah terima, pengurangan stok, alergi, interaksi) wajib punya feature test.

### 7.4 Git & Commit
- Commit message: Conventional Commits (feat:, fix:, chore:, docs:, test:, refactor:).
- Jangan commit file .env, node_modules, vendor, storage/*.log.
- Jalankan Laravel Pint sebelum commit.

---

## 8. Yang TIDAK Boleh Dilakukan AI
❌ Menambah role baru (misal super_admin) tanpa persetujuan user.
❌ Membuat form registrasi publik.
❌ Mengubah nama status enum tanpa update semua tempat terkait.
❌ Mengurangi stok di luar alur serah terima.
❌ Menghapus atau menonaktifkan pengecekan alergi/interaksi.
❌ Mengganti stack (misal ganti Pest, ganti Vite, ganti Tailwind versi lain).
❌ Menambah dependency baru (composer/npm) tanpa persetujuan user.
❌ Menghapus test yang sudah ada.
❌ Mengubah struktur folder resources/js/pages atau resources/js/components.
❌ Commit langsung ke main — selalu buat branch baru.

---

## 9. Struktur Folder yang Diharapkan
```text
app/
├── Enums/
│   └── PrescriptionStatus.php
├── Http/
│   ├── Controllers/
│   │   ├── Dokter/
│   │   ├── Farmasi/
│   │   └── Admin/
│   ├── Middleware/
│   │   └── EnsureRole.php
│   └── Requests/
├── Models/
│   ├── User.php
│   ├── Patient.php
│   ├── Medicine.php
│   ├── Prescription.php
│   ├── PrescriptionItem.php
│   ├── Allergy.php
│   ├── DrugInteraction.php
│   └── StockMovement.php
└── Services/
    ├── AllergyChecker.php
    ├── InteractionChecker.php
    └── HandoverService.php

resources/js/
├── components/
├── layouts/
├── pages/
│   ├── auth/
│   │   ├── login.tsx
│   │   └── forgot-password.tsx
│   ├── dokter/
│   ├── farmasi/
│   └── admin/
└── types/

routes/
├── web.php
├── auth.php
├── dokter.php
├── farmasi.php
└── admin.php