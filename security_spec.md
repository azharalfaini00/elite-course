# Security Specification & Threat Model — ELITE Course Standalone

## 1. Arsitektur Keamanan Mandiri (Standalone)
Aplikasi ELITE Course menerapkan prinsip pertahanan berlapis (Defense-in-Depth) pada level Backend Express dan Local Persistent Database (`data/db.json`), menggantikan seluruh mekanisme cloud eksternal.

### Prinsip Utama (Core Invariants):
1. **Default Deny & PII Isolation**:
   - Pengunjung publik tidak memiliki akses baca (`GET`), ubah (`PUT`/`PATCH`), atau hapus (`DELETE`) terhadap data sensitif pendaftar (`enrollments`), pembayaran (`payments`), kredensial admin, atau log audit (`activityLogs`).
   - Seluruh endpoint manajemen sensitif berada di bawah `/api/admin/*` dan wajib menyertakan token HMAC Bearer yang valid.

2. **Server-Authoritative Pricing & Promotions**:
   - Seluruh kalkulasi harga dan pemotongan kode promo dilakukan secara eksklusif di backend via `/api/pricing/calculate`.
   - Client tidak dapat menyisipkan atau merekayasa nilai `finalPrice` secara sepihak saat melakukan pendaftaran.

3. **Non-PII Tracking Lookup**:
   - Endpoint pelacakan `/api/tracking/lookup` mewajibkan kombinasi Kode Pendaftaran unik (`ELT-YYMM-XXXXXX`) dan PIN rahasia 6-digit.
   - Server memverifikasi lookup menggunakan pencocokan SHA-256 keyed hash dengan server secret pepper.
   - Data yang dikembalikan ke client publik telah dimasker (misal: "Ahmad Dani" -> "Ah*** Da**"), dan tidak menyertakan nomor telepon, email, atau path internal file bukti transfer.

4. **Validasi Relasional Pendaftaran & Pembayaran**:
   - Endpoint `/api/enrollments` memverifikasi keberadaan program dan periode pendaftaran yang aktif sebelum data disimpan.
   - Status pendaftaran awal selalu dipaksa menjadi `'Menunggu Pembayaran'` dan status bayar `'Belum Bayar'`.
   - Endpoint `/api/payments/confirm` memverifikasi status pendaftaran yang belum lunas dan memaksa status pembayaran menjadi `'Menunggu Verifikasi'`.

5. **Otentikasi Kriptografis Administrator**:
   - Kata sandi admin diverifikasi menggunakan PBKDF2 (100.000 iterasi SHA-512, 16-byte salt).
   - Sesi admin diterbitkan dalam format token HMAC SHA-256 bertanda tangan dengan waktu kedaluwarsa 7 hari.

6. **Pengendalian Berkas & File Upload**:
   - Unggahan berkas (`/api/upload`) difilter ketat berdasarkan ekstensi dan MIME type yang diizinkan (gambar: JPEG, PNG, WebP; dokumen: PDF).
   - Ukuran maksimal berkas dibatasi maksimal 10 MB per berkas.
   - Nama berkas di-hash dan di-sanitize sebelum disimpan ke disk untuk mencegah path traversal attack (`../`).

7. **Audit Trail Imutabel**:
   - Setiap tindakan administratif (perubahan program, verifikasi pembayaran, perubahan sertifikat, perubahan pengaturan) dicatat secara otomatis ke log audit (`activityLogs`).

---

## 2. Pengujian Skenario Serangan ("The Dirty Dozen" Attack Vectors)

| No | Vektor Serangan | Ekspektasi Keamanan | Implementasi Pertahanan |
|---|---|---|---|
| 1 | Akses unauthenticated ke data pendaftar (`GET /api/admin/all-data`) | **401/403 Akses Ditolak** | Middleware `verifyAdminBearer` menolak tanpa token valid. |
| 2 | Manipulasi harga saat pendaftaran (`POST /api/enrollments` dengan harga palsu) | **Ditolak / Harga dihitung ulang** | Server mengabaikan harga dari client dan menghitung ulang harga resmi program. |
| 3 | Enumerasi kode pendaftaran (`POST /api/tracking/lookup` secara massal) | **Rate limit 429 & Validasi PIN** | Rate limiter sliding-window (maks 15 req/menit) dan hashing SHA-256 + PIN. |
| 4 | Bocornya sertifikat alumni belum rilis | **Hanya sertifikat aktif & terbit** | Public catalog hanya mengekspos sertifikat dengan `isActive: true` & `isPublished: true`. |
| 5 | Self-Approved status pendaftaran dari client | **Status selalu Menunggu** | Server selalu menginisialisasi dengan status `'Menunggu Pembayaran'`. |
| 6 | Penambahan field tersembunyi (`isAdmin: true`) | **Dibersihkan (Sanitized)** | Server hanya mengekstrak field pendaftaran yang sah sesuai schema. |
| 7 | Pendaftaran dengan ID Program fiktif | **400 Bad Request** | Server memvalidasi program ID terhadap katalog lokal sebelum membuat enrollment. |
| 8 | Manipulasi tanggal registrasi ke masa lalu | **Diabaikan** | Server selalu menyematkan `createdAt = new Date().toISOString()`. |
| 9 | Upload bukti bayar melebihi 10 MB atau tipe executable (`.exe`, `.php`) | **400 File Rejected** | Multer fileFilter memeriksa MIME type dan batas ukuran 10 MB. |
| 10 | Modifikasi harga program tanpa login admin | **401/403 Akses Ditolak** | Mutasi program via `/api/admin/documents/programs` dilindungi autentikasi admin. |
| 11 | Login admin dengan password salah / brute-force | **401 Password Salah & Rate Limit** | Verifikasi PBKDF2 dan rate limiting pada `/api/admin/login`. |
| 12 | Penghapusan log audit oleh pihak luar | **401/403 Akses Ditolak** | Log audit tersimpan di database lokal dan tidak menyediakan endpoint public delete. |
