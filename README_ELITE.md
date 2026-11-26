# ELITE Course — Website Resmi & Sistem Manajemen Mandiri (Standalone)

Aplikasi full-stack 100% mandiri untuk **ELITE Course — English Learning Institute** (Pare, Kediri, Jawa Timur).
Sistem ini beroperasi penuh menggunakan arsitektur **Frontend + Backend murni** tanpa ketergantungan pada layanan cloud pihak ketiga (Zero Firebase / No External Cloud Lock-in).

---

## 1. Arsitektur Sistem

- **Backend (`server.ts`)**:
  - Runtime: Node.js (Express framework).
  - Otentikasi Admin: Token HMAC SHA-256 tersandi dengan masa aktif 7 hari.
  - Keamanan Data: Rate limiting sliding-window berbasis IP, sanitasi input, validasi tipe file MIME, dan isolasi PII (Personally Identifiable Information).
  - Server-Side Pricing Engine: Seluruh perhitungan harga program, diskon promo, dan biaya grup dihitung secara otoritatif di backend (`/api/pricing/calculate`) untuk mencegah manipulasi harga dari sisi client.
  - Tracking Pelacakan: Pencarian status pendaftaran menggunakan kombinasi Kode Pendaftaran + PIN rahasia yang di-hash dengan SHA-256 dan pepper rahasia di server.

- **Frontend (`src/`)**:
  - UI Library: React 19 + React Router v7 + Vite + Tailwind CSS.
  - Client API Service (`src/lib/apiService.ts`): Menghubungkan UI dengan REST API backend.
  - Auth Context (`src/contexts/AuthContext.tsx`): Manajemen sesi login admin berbasis token mandiri.

- **Database Lokal Mandiri (`data/db.json`)**:
  - File JSON persisten dengan operasi atomic write (`.tmp` -> replace) untuk mencegah data corrupt jika server mati mendadak.
  - Otomatis melakukan seeding data resmi ELITE Course saat pertama kali dijalankan (Katalog Program Offline/Online, Periode Pendaftaran, Metode Pembayaran, FAQ, Tutor, Sertifikat, dsb).

- **Penyimpanan Berkas Lokal (`uploads/`)**:
  - Berkas bukti pembayaran dan dokumen media disimpan langsung di direktori lokal `./uploads/` dan dilayani secara aman oleh Express.

---

## 2. Kredensial Akses Administrator

Akses portal admin dilindungi oleh sistem otentikasi mandiri berbasis email dan password:

- **URL Login Admin**: `http://localhost:3000/admin/login`
- **Email Administrator**: `elitecourse935@gmail.com`
- **Password Default**: `eliteadmin2026`
- **Email Alternatif**: `alfaazhar30@gmail.com`

> **Catatan Keamanan**: Kredensial dapat dikonfigurasi melalui berkas `.env` server:
> ```env
> ADMIN_EMAILS="elitecourse935@gmail.com,alfaazhar30@gmail.com"
> ADMIN_PASSWORD="eliteadmin2026"
> SERVER_HMAC_SECRET="elite_course_local_secret_key_2026"
> ```

---

## 3. Panduan Menjalankan Aplikasi

### Kebutuhan Sistem
- **Node.js**: versi 18.0.0 atau lebih baru (disarankan Node.js 20+)
- **NPM**: versi 9+

### Langkah Menjalankan:
1. **Mode Pengembangan (Development)**:
   ```bash
   npm run dev
   ```
   Server backend Express dan Vite development server akan berjalan bersamaan di:
   - **Aplikasi**: `http://localhost:3000`
   - **Portal Admin**: `http://localhost:3000/admin/login`

2. **Membangun untuk Produksi (Production Build)**:
   ```bash
   npm run build
   ```
   Bundle frontend yang dioptimasi akan dibuat di folder `dist/` (ukuran bundle sangat ringan, ~500 kB).

3. **Menjalankan Server Produksi**:
   ```bash
   npm start
   ```
   Express akan langsung melayani API backend sekaligus static asset dari folder `dist/`.

4. **Pemeriksaan Tipe TypeScript**:
   ```bash
   npm run lint
   # atau
   npx tsc --noEmit
   ```

---

## 4. Struktur Halaman & Fitur Website

### Halaman Publik
- **Beranda (`HomePage.tsx`)**:
  - Hero Banner dengan CTA interaktif.
  - Profil Singkat Lembaga, Legalitas FKB (Forum Kampung Bahasa) & NIB resmi.
  - Visi & Misi lembaga.
  - Keunggulan ELITE Course (Metode Praktik Intensif, Tutor Berpengalaman Pare).
  - Galeri Dokumentasi Kelas dengan Lightbox interaktif.
  - Sorotan Program Unggulan (Speaking Starter, Speaking Booster, dsb).
  - Profil Tutor Pengajar Pare.
  - Galeri Sertifikat Alumni yang telah dipublikasikan.
  - FAQ (Pertanyaan yang Sering Diajukan).
  - Kontak WhatsApp resmi, Alamat Pare Kediri, dan Footer.

- **Katalog Offline Class (`OfflineProgramsPage.tsx`)**:
  - Speaking Starter, Speaking Booster, TED Talk, Public Speaking, dan status persiapan program PTE.

- **Katalog Online Class (`OnlineProgramsPage.tsx`)**:
  - Paket 1 Murid (Privat Intensif 1-on-1).
  - Paket 2 Murid (Semi-Privat Duet).
  - Paket 3 Murid (Small Group 3 Orang).
  - Paket 4 Murid (Group Interactive 4 Orang).

- **Formulir Pendaftaran Siswa (`EnrollPage.tsx`)**:
  - Pendaftaran fleksibel tanpa wajib memiliki akun.
  - Validasi program, periode pendaftaran, dan data siswa.
  - Input anggota kelompok otomatis untuk paket online berkelompok (2-4 orang).
  - Pengecekan kode promo eksklusif di backend.
  - Penerbitan otomatis Kode Pendaftaran (`ELT-YYMM-XXXXXX`) dan 6-Digit PIN Pelacakan Rahasia.

- **Pelacakan & Konfirmasi Pembayaran (`TrackingPaymentPage.tsx`)**:
  - Login pelacakan menggunakan Kode Pendaftaran + PIN Rahasia (PII terlindungi dengan masking nama).
  - Menampilkan daftar metode pembayaran resmi aktif (Rekening Bank & E-Wallet).
  - Formulir konfirmasi pembayaran dengan unggah bukti transfer langsung ke backend.

### Dashboard Manajemen Admin (15 Modul Terintegrasi)
1. **Ringkasan**: Statistik pendaftar, pembayaran menunggu verifikasi, total pendapatan, dan grafik aktivitas.
2. **Kelola Program Offline**: Tambah, edit materi, ubah harga, durasi, jadwal, dan status aktif.
3. **Kelola Program Online**: Konfigurasi 4 paket online, rasio tutor:murid, dan harga.
4. **Materi & Level**: Manajemen silabus per program (Starter, Booster, TED Talk, dsb).
5. **Periode Pendaftaran**: Pengaturan tanggal mulai, batas akhir pendaftaran, dan kuota gelombang 10 & 25.
6. **Data Pendaftar**: Filter status, pencarian kode/nama, detail lengkap data peserta dan anggota grup.
7. **Verifikasi Pembayaran**: Tinjau bukti transfer, verifikasi berhasil, atau tolak dengan alasan.
8. **Rekening Pembayaran**: Kelola nomor rekening bank resmi, nama penerima, logo, dan QRIS.
9. **Diskon & Promo**: Kode kupon promo, tipe potongan (persentase/nominal tetap), kuota, dan masa berlaku.
10. **Kelola Tutor**: Profil tutor pengajar, spesialisasi, pengalaman, dan foto pengajar.
11. **Sertifikat Alumni**: Terbitkan sertifikat resmi, kelola nomor SK, dan persetujuan publikasi di web.
12. **Banner Promosi**: Pengaturan banner promo dinamis di halaman depan.
13. **Galeri Dokumentasi**: Unggah foto kegiatan belajar dan suasana kelas Pare.
14. **Kelola FAQ**: Daftar pertanyaan dan jawaban interaktif untuk calon pendaftar.
15. **Pengaturan Website**: Brand name, alamat resmi Pare, nomor WhatsApp CS, email, dan media sosial.

---

## 5. Keamanan & Kepatuhan Data

1. **Zero External Dependence**: Tidak ada data yang dikirim ke cloud eksternal pihak ketiga tanpa izin pemilik.
2. **Proteksi PII Publik**: Publik tidak dapat melihat nomor telepon, email, atau bukti transfer peserta lain.
3. **Anti-Manipulasi Pembayaran**: Verifikasi status pembayaran dan konfirmasi penerimaan pendaftar hanya dapat dieksekusi oleh sesi administrator yang valid.
4. **Penyimpanan Kata Sandi Aman**: Kata sandi admin diverifikasi menggunakan hashing PBKDF2 dengan salt kriptografis 16-byte dan 100.000 iterasi.
5. **Session Token Kriptografis**: Token login admin menggunakan HMAC SHA-256 yang ditandatangani dengan secret key server.
