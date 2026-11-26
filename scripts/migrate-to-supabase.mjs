/**
 * migrate-to-supabase.mjs
 * Script migrasi data dari data/db.json ke Supabase
 *
 * Cara pakai:
 *   node scripts/migrate-to-supabase.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('❌ SUPABASE_URL dan SUPABASE_SECRET_KEY harus diset di .env');
  process.exit(1);
}

const BASE_URL = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_SECRET_KEY,
  'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
  'Prefer': 'resolution=merge-duplicates',
};

// Mapping koleksi db.json -> nama tabel Supabase
const COLLECTION_TABLE_MAP = {
  programs: 'programs',
  programLevels: 'program_levels',
  programMaterials: 'program_materials',
  registrationPeriods: 'registration_periods',
  discounts: 'discounts',
  paymentMethods: 'payment_methods',
  tutors: 'tutors',
  certificates: 'certificates',
  galleryItems: 'gallery_items',
  faqs: 'faqs',
  enrollments: 'enrollments',
  payments: 'payments',
  activityLogs: 'activity_logs',
  admins: 'admins',
};

async function upsertRows(table, rows) {
  if (!rows || rows.length === 0) {
    console.log(`  ⏭ Lewat ${table} (kosong)`);
    return;
  }

  const payload = rows.map(row => {
    const { id, ...rest } = row;
    return {
      id: String(id || `auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
      data: rest,
      created_at: rest.createdAt || new Date().toISOString(),
      updated_at: rest.updatedAt || new Date().toISOString(),
    };
  });

  const res = await fetch(`${BASE_URL}/${table}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  ❌ Error upsert ${table}:`, res.status, text);
  } else {
    console.log(`  ✅ ${table}: ${rows.length} data berhasil dimigrasikan`);
  }
}

async function migrateSiteSettings(settings) {
  if (!settings || !settings.main) {
    console.log(`  ⏭ Lewat site_settings (kosong)`);
    return;
  }
  const payload = [{
    id: 'main',
    data: settings.main,
    created_at: settings.main.updatedAt || new Date().toISOString(),
    updated_at: settings.main.updatedAt || new Date().toISOString(),
  }];

  const res = await fetch(`${BASE_URL}/site_settings`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  ❌ Error upsert site_settings:`, res.status, text);
  } else {
    console.log(`  ✅ site_settings: berhasil dimigrasikan`);
  }
}

async function migrateTrackingRecords(trackingRecords) {
  if (!trackingRecords || Object.keys(trackingRecords).length === 0) {
    console.log(`  ⏭ Lewat tracking_records (kosong)`);
    return;
  }

  const rows = Object.entries(trackingRecords).map(([hash, record]) => ({
    id: hash,
    data: record,
    created_at: record.createdAt || new Date().toISOString(),
    updated_at: record.updatedAt || new Date().toISOString(),
  }));

  const res = await fetch(`${BASE_URL}/tracking_records`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  ❌ Error upsert tracking_records:`, res.status, text);
  } else {
    console.log(`  ✅ tracking_records: ${rows.length} data berhasil dimigrasikan`);
  }
}

async function main() {
  console.log('🚀 Memulai migrasi data ke Supabase...');
  console.log(`📍 Supabase: ${SUPABASE_URL}`);

  // Baca db.json
  const dbPath = join(__dirname, '..', 'data', 'db.json');
  let db;
  try {
    db = JSON.parse(readFileSync(dbPath, 'utf-8'));
    console.log('📂 db.json berhasil dibaca');
  } catch (err) {
    console.error('❌ Gagal baca db.json:', err.message);
    process.exit(1);
  }

  // Migrasi site settings
  console.log('\n📋 Migrasi site_settings...');
  await migrateSiteSettings(db.siteSettings);

  // Migrasi tracking records
  console.log('\n📋 Migrasi tracking_records...');
  await migrateTrackingRecords(db.trackingRecords);

  // Migrasi semua koleksi array
  for (const [collection, table] of Object.entries(COLLECTION_TABLE_MAP)) {
    const data = db[collection];
    if (Array.isArray(data)) {
      console.log(`\n📋 Migrasi ${collection} -> ${table} (${data.length} items)...`);
      await upsertRows(table, data);
    }
  }

  console.log('\n🎉 Migrasi selesai!');
  console.log('🔗 Cek data di: https://supabase.com/dashboard/project/jgpfdshwkywhvlxaieik/editor');
}

main().catch(err => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
