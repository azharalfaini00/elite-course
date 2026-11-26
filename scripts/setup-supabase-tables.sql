-- ============================================================
-- ELITE Course - Setup Tabel Supabase
-- Jalankan script ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jgpfdshwkywhvlxaieik/sql
-- ============================================================

-- Strategi: 1 tabel per koleksi, kolom id TEXT PRIMARY KEY + data JSONB
-- RLS dinonaktifkan karena akses selalu via service role key di server

-- ===== PROGRAMS =====
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE programs DISABLE ROW LEVEL SECURITY;

-- ===== PROGRAM LEVELS =====
CREATE TABLE IF NOT EXISTS program_levels (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE program_levels DISABLE ROW LEVEL SECURITY;

-- ===== PROGRAM MATERIALS =====
CREATE TABLE IF NOT EXISTS program_materials (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE program_materials DISABLE ROW LEVEL SECURITY;

-- ===== REGISTRATION PERIODS =====
CREATE TABLE IF NOT EXISTS registration_periods (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE registration_periods DISABLE ROW LEVEL SECURITY;

-- ===== DISCOUNTS =====
CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE discounts DISABLE ROW LEVEL SECURITY;

-- ===== PAYMENT METHODS =====
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;

-- ===== TUTORS =====
CREATE TABLE IF NOT EXISTS tutors (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tutors DISABLE ROW LEVEL SECURITY;

-- ===== CERTIFICATES =====
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;

-- ===== GALLERY ITEMS =====
CREATE TABLE IF NOT EXISTS gallery_items (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE gallery_items DISABLE ROW LEVEL SECURITY;

-- ===== FAQS =====
CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE faqs DISABLE ROW LEVEL SECURITY;

-- ===== ENROLLMENTS =====
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;

-- ===== PAYMENTS =====
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- ===== TRACKING RECORDS =====
CREATE TABLE IF NOT EXISTS tracking_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tracking_records DISABLE ROW LEVEL SECURITY;

-- ===== ACTIVITY LOGS =====
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- ===== ADMINS =====
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;

-- ===== SITE SETTINGS =====
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;

-- ===== INDEX untuk performa =====
CREATE INDEX IF NOT EXISTS idx_enrollments_created ON enrollments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- Konfirmasi
SELECT 'Setup tabel Supabase berhasil!' AS status;
