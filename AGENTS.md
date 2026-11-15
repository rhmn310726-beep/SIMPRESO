# AGENTS.md — SIMPRESO

Panduan ini dibaca oleh AI coding assistant (Cursor, Copilot, Claude Code, dll.) sebelum mengubah kode. Baca dulu, jangan langsung menebak. Kalau ada yang tidak jelas, tanyakan ke user, jangan mengarang.

**PENTING:** Aplikasi ada di dalam folder `SIMPRESO/`, bukan di root workspace. SEMUA command (composer, artisan, npm, phpunit) harus dijalankan dari dalam `SIMPRESO/`.

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
- Route dipecah per file: `web.php` (landing), `auth.php`, `dokter.php`, `farmasi.php`, `admin.php`. Semua di-load di `bootstrap/app.php`, lalu diberi prefix + middleware `role:*`. Health check: `/up`.
- Redirect setelah login memakai `User::dashboardRouteName()`: dokter → `dokter.daftar-pasien`, farmasi → `farmasi.dashboard`, admin → `admin.dashboard`.
- Route farmasi: `GET /farmasi` (`farmasi.dashboard`, `Farmasi\DashboardController@index`) dan `GET /farmasi/antrean-resep` (`farmasi.antrean-resep`, `Farmasi\QueueController@index`; halaman kerja masih placeholder).
- Frontend pakai TypeScript strict — jangan pakai `any` tanpa alasan jelas.
- Tidak ada ESLint/Prettier. Verifikasi frontend = `npm run typecheck`; jangan mengarang script lint.
- Jangan pakai library tambahan tanpa persetujuan user.

### Command wajib (dari folder SIMPRESO/)
- Dev lengkap (HTTP server + queue + logs + Vite): `composer run dev`
- Frontend saja: `npm run dev` · Build: `npm run build`
- Typecheck TSX: `npm run typecheck` — WAJIB lolos setelah ubah file .tsx
- Semua test: `php artisan test` (SQLite :memory:, tidak butuh PostgreSQL nyala)
- Satu file test: `php artisan test tests/Feature/Admin/UserManagementTest.php`
- Lint PHP: `vendor/bin/pint`
- Urutan verifikasi yang benar: `npm run typecheck` → `npm run build` → `php artisan test`

### Akun seed untuk development
`php artisan db:seed` membuat 3 akun (password semua: `Simpreso123!`):
- admin@simpreso.test (admin) · dokter@simpreso.test (dokter) · farmasi@simpreso.test (farmasi)

### Impor dataset awal (CSV)
Dataset contoh ada di `database/data/`: `dataset_data_pasien.csv` dan `dataset_data_obat.csv`.

```bash
# Cek dulu tanpa menulis ke database
php artisan import:patients database/data/dataset_data_pasien.csv --dry-run
php artisan import:medicines database/data/dataset_data_obat.csv --dry-run

# Impor sungguhan (idempotent: No. RM / kode obat yang sudah ada akan dilewati)
php artisan import:patients database/data/dataset_data_pasien.csv
php artisan import:medicines database/data/dataset_data_obat.csv
```

- Parser: `App\Support\CsvDatasetReader` — auto-deteksi delimiter (`,`/`;`/tab), buang BOM, perbaiki encoding, dan menerima header Indonesia maupun Inggris (lihat `COLUMN_ALIASES` di masing-masing command). Paksa delimiter dengan `--delimiter=;` bila auto-deteksi keliru.
- `import:patients`: wajib ada No. Rekam Medis, Nama Lengkap, dan Jenis Kelamin (L/P, Laki-laki, Perempuan). Jika kolom tanggal lahir kosong, `date_of_birth` dihitung dari kolom Usia. Kolom alergi dipecah per koma/titik koma; nilai "Tidak ada" diabaikan, alergi duplikat (case-insensitive) tidak dicatat dua kali.
- `import:medicines`: wajib Nama Obat, Bahan Aktif, Kategori, Bentuk Sediaan, dan Stok. Setiap obat baru otomatis dibuatkan batch stok awal lewat `StockService::createInitialBatch`. Status "Ditangguhkan/Suspend/Ditarik" dipetakan menjadi `nonaktif`; kode kosong dibuat otomatis `OBT-###`.
- Laporan akhir menampilkan total baris, dibuat, dilewati (duplikat), dan ditolak beserta alasannya (maksimal 50 baris ditampilkan).

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
1. Dokter login → dashboard "Daftar Pasien" (`GET /dokter`, route `dokter.daftar-pasien`).
2. Dokter memilih pasien dari tabel dashboard, atau membuka menu Detail Pasien (`GET /dokter/pasien`) untuk mencari/memilih pasien → halaman Detail Pasien (`GET /dokter/pasien/{patient}`).
3. Dokter melihat alergi pasien; bisa menambah/menghapus alergi jika belum tercatat.
4. Dokter membuat resep melalui dua jalur:
   - Modal cepat "Buat Resep" di halaman Detail Pasien: satu item obat per submit.
   - Halaman Buat Resep (`GET /dokter/resep`, route `dokter.resep.create`) untuk resep multi-item. Jika belum ada pasien, halaman menampilkan pencarian/pemilihan pasien; pasien terpilih memakai query `?patient={id}`. Halaman memuat formularium obat aktif, stok, alergi pasien, aturan alergi, dan interaksi obat.
   - Dokter memilih obat dari formularium (hanya obat berstatus aktif; stok 0 tampil tetapi tidak bisa dipilih), mengisi dosis, jumlah, aturan pakai, dan catatan farmasi maksimal 250 karakter.
   - Peringatan alergi/interaksi tampil non-blocking; tombol "Simpan sebagai Draft" masih placeholder karena belum ada status draft.
5. Dokter menyimpan resep (`POST /dokter/resep`, `Dokter\PrescriptionController@store`) → status awal: menunggu; stok TIDAK dikurangi. Pembuatan resep dan nomor `RX-###` memakai `App\Services\PrescriptionService` yang juga dipakai modal cepat.
6. Resep otomatis masuk antrean farmasi.
- Dokter dapat memantau resep yang sudah dibuat melalui Riwayat Resep (`GET /dokter/riwayat-resep`, route `dokter.riwayat-resep.index`) dan mengunduh CSV dengan filter yang sama (`GET /dokter/riwayat-resep/export`).

### 4.2 Fase Farmasi
7. Petugas farmasi login → Dashboard Farmasi (`GET /farmasi`, route `farmasi.dashboard`) yang menampilkan KPI dan kanban 4 kolom. Halaman kerja Antrean Resep tersedia di `GET /farmasi/antrean-resep` (`farmasi.antrean-resep`) dan masih placeholder.
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
- Test yang ada saat ini: `tests/Feature/Admin/*`, `tests/Feature/Auth/*`, `tests/Feature/Console/*`, `tests/Feature/Dokter/*`, `tests/Feature/Farmasi/*`, dan dua ExampleTest.
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

## 9. Struktur yang Ada (verifikasi ulang sebelum berasumsi)
```text
app/
├── Console/Commands/ ImportPatientsCommand, ImportMedicinesCommand (impor dataset CSV)
├── Enums/            Gender, InteractionSeverity, MedicineStatus, PrescriptionStatus, Role, StockMovementType
├── Http/Controllers/ Admin/*, Auth/*, Dokter/DashboardController, Dokter/PatientController,
│                     Dokter/PrescriptionController, Farmasi/DashboardController,
│                     Farmasi/QueueController, LandingController
├── Http/Middleware/  EnsureRole (alias `role`), HandleInertiaRequests (share auth.user + flash)
├── Http/Requests/    Admin/*, Auth/*, Dokter/* (termasuk StoreBulkPrescriptionRequest)
├── Models/           User, Patient, Medicine, Allergy, AllergyRule, DrugInteraction,
│                     Prescription, PrescriptionItem, StockBatch, StockMovement
├── Services/         StockService, PrescriptionService (generator nomor + create resep;
│                     AllergyChecker/InteractionChecker/HandoverService BELUM ada)
└── Support/          CsvDatasetReader (parser CSV untuk command impor)

resources/js/
├── components/landing/*
├── layouts/          AdminLayout.tsx (M3 admin), DokterLayout.tsx (M3 dokter),
│                     FarmasiLayout.tsx (M3 farmasi), RoleLayout.tsx (legacy)
├── pages/            admin/*, auth/*, dokter/daftar-pasien.tsx, dokter/pilih-pasien.tsx,
│                     dokter/detail-pasien.tsx, dokter/buat-resep.tsx, dokter/riwayat-resep.tsx,
│                     farmasi/dashboard.tsx, farmasi/antrean-resep.tsx, welcome.tsx
└── types/index.ts    Role, AuthUser, SharedProps

routes/               web.php, auth.php, dokter.php, farmasi.php, admin.php
```

Catatan: `dokter/daftar-pasien.tsx` adalah dashboard dokter (M3) berbasis data nyata dari `Dokter\DashboardController`; `dokter/pilih-pasien.tsx` adalah halaman cari/pilih pasien untuk masuk ke detail; `dokter/detail-pasien.tsx` adalah detail pasien + aksi alergi/resep dari `Dokter\PatientController`; `dokter/buat-resep.tsx` adalah halaman resep multi-item dari `Dokter\PrescriptionController`; `dokter/riwayat-resep.tsx` adalah riwayat resep dokter dari `Dokter\PrescriptionController@history`; `farmasi/dashboard.tsx` adalah dashboard farmasi M3 berbasis data nyata dari `Farmasi\DashboardController`; `farmasi/antrean-resep.tsx` sudah memakai `FarmasiLayout` tetapi masih placeholder.

---

## 10. Sistem Desain UI (JANGAN CAMPUR)
### Sistem A — Admin shell "e-Resep" (Material 3)
- Dipakai oleh `resources/js/layouts/AdminLayout.tsx`; SEMUA halaman `pages/admin/*` (dashboard, obat, stok, pasien, akun, aturan, laporan) sudah memakainya.
- Token M3 ada di `resources/css/app.css` blok `@theme` (prefix `--color-*`, `--spacing-*`, `--font-*`, `--text-*`). Pakai langsung: `bg-primary`, `text-on-surface-variant`, `bg-surface-container-lowest`, `px-space-md`, `font-body-md`, `text-headline-lg`, `font-label-sm`; jangan menambah token baru di `@theme`.
- Ikon: Material Symbols Outlined — `<span className="material-symbols-outlined">icon_name</span>`. Font Inter + Material Symbols dimuat via link Google Fonts di `resources/views/app.blade.php`.
- Sidebar admin: brand "e-Resep / Farmasi Admin", fixed 260px, item aktif = `bg-primary-container text-on-primary`, logout = POST `/logout` via Inertia `<Link method="post">`.

### Sistem A' — Doctor shell "e-Resep / Portal Dokter" (Material 3)
- Target: mock HTML "Portal Dokter" dari user. Brand sidebar "e-Resep / Portal Dokter"; menu Dashboard, Detail Pasien, Buat Resep, Riwayat Resep; header breadcrumb "Sistem Resep Elektronik / Rawat Jalan RS"; user + badge "Dokter".
- `resources/js/layouts/DokterLayout.tsx` sudah ada (sidebar + header M3, responsive, logout POST `/logout`). JANGAN mengubah brand `AdminLayout` ("Farmasi Admin") dan jangan memakai kelas legacy `brand-*`/`pharmacy-*` di halaman dokter M3.
- `pages/dokter/daftar-pasien.tsx` adalah dashboard dokter (greeting strip, 3 kartu metrik, tabel pasien, pagination, notifikasi) dan memakai `DokterLayout`. Route `GET /dokter` (`dokter.daftar-pasien`) → `Dokter\DashboardController@index` mengirim props `today`, `stats`, `patients`, `filters`, `status_counts`.
- Sumber data nyata: "pasien hari ini" = `patients.created_at` hari ini (proxy, karena belum ada tabel kunjungan/antrean); status "Sudah Diresepkan" = pasien punya `prescriptions` hari ini dengan `doctor_id` = dokter login; "Belum Diresepkan" = `whereDoesntHave` relasi yang sama; nomor antrean = urutan `created_at, id` pada daftar hari ini. Metrik `stats`: total/done/pending pasien hari ini, progress persen, jumlah resep dokter hari ini, dan `waiting_pharmacy` (status `menunggu` milik dokter).
- Kolom/filter "Poli" pada mock TIDAK ada di DB — sudah dihapus; filter pertama diganti Jenis Kelamin (`gender` L/P). Search server-side pada nama/No. RM/NIK, status `belum|sudah`, pagination 10/halaman via `withQueryString()`, refresh memakai `router.reload`.
- `pages/dokter/pilih-pasien.tsx` (`GET /dokter/pasien`, `Dokter\PatientController@index`) adalah pintu masuk menu "Detail Pasien": daftar semua pasien dengan pencarian server-side (nama/No. RM/NIK), pagination 10, jumlah alergi, dan tombol "Lihat Detail".
- `pages/dokter/detail-pasien.tsx` (`GET /dokter/pasien/{patient}`, `Dokter\PatientController@show`) menampilkan identitas pasien, alergi, dan riwayat resep 12 bulan terakhir. Field mock yang tidak ada di DB (BPJS, Poli, vitals, diagnosa, kunjungan terakhir, severity alergi) TIDAK dibuat/dikarang; "Terdaftar Sejak" memakai `patients.created_at`.
- Aksi detail pasien: `PUT /dokter/pasien/{patient}` (edit demografi), `POST/DELETE .../alergi` (tambah/hapus alergi, duplikat case-insensitive ditolak), `POST .../resep` (buat resep cepat, satu item, nomor `RX-###`, status `menunggu`, stok tidak berkurang). Validasi di `app/Http/Requests/Dokter/*`; sukses memakai flash banner shared props, bukan modal sukses mock.
- `pages/dokter/buat-resep.tsx` (`GET /dokter/resep`, `Dokter\PrescriptionController@create`) adalah halaman resep multi-item. Tanpa `?patient`, halaman menampilkan pencarian/pemilihan pasien (server-side nama/No. RM/NIK, pagination 8). Dengan pasien, halaman menampilkan kartu pasien, alergi, formularium obat aktif, modal pencarian/filter kategori/filter aman alergi, item obat dinamis (dosis/jumlah/signa), catatan maksimal 250 karakter, ringkasan sticky, serta peringatan alergi/interaksi non-blocking. Tombol "Simpan sebagai Draft" disabled karena tidak ada status draft.
- Aksi halaman Buat Resep: `POST /dokter/resep` (`dokter.resep.store`) memvalidasi `patient_id`, 1–20 item, obat aktif, stok cukup, dan obat unik; membuat satu resep + banyak `prescription_items` lewat `PrescriptionService`, status `menunggu`, stok tidak berkurang, lalu redirect ke Detail Pasien dengan flash sukses. Field mock yang tidak ada di DB (BPJS, poli, kunjungan, produsen/FORNAS) TIDAK dibuat.
- `pages/dokter/riwayat-resep.tsx` (`GET /dokter/riwayat-resep`, `Dokter\PrescriptionController@history`) menampilkan statistik bulan berjalan, tabel resep milik dokter login, filter server-side (search No. Resep/nama pasien, status, rentang `created_at`), pagination 10, dan drawer detail. Drawer memuat identitas pasien/dokter, item obat, catatan, serta timeline status. Timeline hanya menampilkan timestamp `created_at` dan `handover_confirmed_at`; waktu transisi status farmasi lainnya TIDAK dikarang karena tidak ada tabel histori status. Tombol "Buka Rekam Pasien" menuju `/dokter/pasien/{patient}`, "Resepkan Ulang" menuju `/dokter/resep?patient={id}`, dan "Export CSV" memakai `GET /dokter/riwayat-resep/export` dengan filter yang sama.
- Sidebar mock: Dashboard ke `route('dokter.daftar-pasien')`; Detail Pasien ke `route('dokter.pasien.index')` (`/dokter/pasien`) dan aktif saat URL diawali `/dokter/pasien`; Buat Resep ke `/dokter/resep` dan aktif saat URL diawali `/dokter/resep`; Riwayat Resep ke `/dokter/riwayat-resep` dan aktif saat URL diawali `/dokter/riwayat-resep`; Keluar tetap POST `/logout`.
- Nama/identitas dokter di header dan greeting diambil dari `auth.user` (shared props `HandleInertiaRequests`), bukan hardcode "dr. Andi Pratama".

### Sistem A'' — Pharmacy shell "e-Resep / Portal Farmasi" (Material 3)
- `resources/js/layouts/FarmasiLayout.tsx` adalah shell M3 farmasi: brand "e-Resep / Portal Farmasi", menu Dashboard (`/farmasi`), Antrean Resep (`/farmasi/antrean-resep`), Stok Obat & Laporan (disabled, "Segera hadir"), header breadcrumb "Sistem Resep Elektronik / Instalasi Farmasi", user + badge "Petugas Farmasi", logout POST `/logout`.
- `pages/farmasi/dashboard.tsx` (`GET /farmasi`, `Farmasi\DashboardController@index`) menampilkan KPI, filter server-side (search No. Resep/nama pasien/No. RM/dokter dan filter dokter), toggle Kanban/Tabel, refresh, drawer detail, dan cetak rekap. Props: `today`, `stats`, `queue`, `doctor_options`, `filters`, `last_updated_at`.
- Sumber data nyata: KPI `waiting` (menunggu), `received` (diterima), `preparing` (disiapkan), `processing` (diterima+disiapkan), `ready` (siap_diambil), `handed_over_today` (status diserahkan dengan `handover_confirmed_at` hari ini), `active_total` (4 status aktif), `created_today` (`created_at` hari ini). Kanban hanya memuat 4 status aktif; `diserahkan`/`dibatalkan` tidak masuk antrean.
- Kartu menampilkan nomor `RX-###`, `created_at`, identitas pasien (No. RM/umur/gender), dokter, jumlah item, alergi pasien, dan interaksi obat antar-item. "Alergi terdata" berarti daftar alergi pasien, bukan klaim obat aman. Interaksi dihitung dari tabel `drug_interactions` untuk kombinasi obat pada resep. Field mock yang TIDAK ada di DB (nomor `R-####`, loket, prioritas, racikan, shift, poli, BPJS, timestamp transisi status) tidak dibuat/dikarang.
- Aksi ubah status belum diimplementasikan di dashboard; tombol kartu membuka drawer detail dan tombol "Buka Antrean Resep" menuju halaman antrean yang masih placeholder.

### Sistem B — Legacy (brand-* / pharmacy-* / slate)
- Dipakai oleh landing, auth, dan `RoleLayout.tsx`.
- Font Plus Jakarta Sans (bunny fonts di `vite.config.js`), ikon SVG inline di dalam file .tsx.
- `RoleLayout.tsx` adalah shell legacy untuk halaman role yang belum dimigrasi; jangan dipakai untuk halaman dokter/farmasi baru yang M3.

### Aturan konversi mock HTML dari user
User sering memberi mock HTML hasil generator AI (satu file HTML utuh dengan Tailwind CDN config, placeholder `{{DATA:SCREEN:SCREEN_X}}`, dan gambar `lh3.googleusercontent.com/aida-public/...`). Cara konversi yang benar:
1. Token dari `tailwind.config` di mock sudah ada di `app.css` @theme — pakai langsung, JANGAN pasang Tailwind CDN atau tulis config JS.
2. Placeholder `{{DATA:SCREEN:SCREEN_X}}` → ganti dengan route Inertia nyata. Route dokter yang ada: `/dokter` (dashboard), `/dokter/pasien` (pilih pasien), `/dokter/pasien/{patient}` (detail), `/dokter/resep` (buat resep), dan aksi alergi/resep di bawahnya; route farmasi: `/farmasi` (dashboard) dan `/farmasi/antrean-resep` (placeholder); route admin ada di `routes/admin.php`.
3. JANGAN hotlink gambar dari mock — ganti dengan avatar inisial atau asset lokal.
4. Fungsionalitas existing (form Inertia `useForm`, modal, flash message) WAJIB dipertahankan; mock hanya visual.
5. Data yang tidak dikirim controller (mis. SIP, unit, status akun, last login) jangan dikarang — render props yang nyata ada dan adaptasi kolom tabel.
6. Tombol/item tanpa backend route boleh dibiarkan sebagai placeholder visual — sebutkan sebagai TODO ke user, jangan hapus diam-diam. Yang sudah fungsional di akun.tsx: "+ Tambah Pengguna Baru" (`POST /admin/akun`), edit ikon edit_note (`PUT /admin/akun/{user}`), dan reset password (`POST /admin/akun/{user}/reset-password`).
7. Setelah konversi selesai: jalankan `npm run typecheck` → `npm run build` → `php artisan test`.