/**
 * create-tables-and-migrate.mjs
 * Script untuk membuat tabel Supabase dan migrasi data dari db.json
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://jgpfdshwkywhvlxaieik.supabase.co';
const SVC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpncGZkc2h3a3l3aHZseGFpZWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NTcxMjAwOSwiZXhwIjoyMTExMjg4MDA5fQ.68sZS54feWmexihEBpiXweNTBW_5m0bAA92nec0LC24';

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SVC_KEY,
  'Authorization': `Bearer ${SVC_KEY}`,
  'Prefer': 'resolution=merge-duplicates',
};

// Helper: HTTP request menggunakan node https (tanpa fetch dependency)
function request(url, method, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        ...HEADERS,
        ...extraHeaders,
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Jalankan SQL via Supabase pg executer (Management API)
async function execSQL(sql) {
  // Supabase Management API — butuh project ref dan service role
  // Gunakan rpc jika tersedia, atau buat via REST upsert per tabel
  const projectRef = 'jgpfdshwkywhvlxaieik';
  const managementKey = SVC_KEY;
  
  const r = await request(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    'POST',
    { query: sql },
    {
      'Authorization': `Bearer ${managementKey}`,
      'Content-Type': 'application/json',
    }
  );
  return r;
}

// Buat satu tabel
async function createTable(tableName) {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.${tableName} (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.${tableName} DISABLE ROW LEVEL SECURITY;
  `;
  const r = await execSQL(sql);
  if (r.status === 200 || r.status === 201) {
    console.log(`  ✅ Tabel ${tableName} berhasil dibuat`);
  } else {
    console.log(`  ⚠️ ${tableName}: ${r.status} ${r.body.slice(0, 100)}`);
  }
}

// Upsert rows ke tabel Supabase via REST API
async function upsertRows(table, rows) {
  if (!rows || rows.length === 0) {
    console.log(`  ⏭ Lewat ${table} (kosong)`);
    return;
  }

  // Batch per 50 rows
  const batchSize = 50;
  let success = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map(row => {
      const { id, createdAt, updatedAt, ...rest } = row;
      return {
        id: String(id || `auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
        data: rest,
        created_at: createdAt || new Date().toISOString(),
        updated_at: updatedAt || new Date().toISOString(),
      };
    });

    const r = await request(`${SUPABASE_URL}/rest/v1/${table}`, 'POST', batch, {
      'Prefer': 'resolution=merge-duplicates',
    });

    if (r.status >= 200 && r.status < 300) {
      success += batch.length;
    } else {
      console.log(`  ❌ Error batch ${table}: ${r.status} ${r.body.slice(0, 150)}`);
    }
  }
  if (success > 0) console.log(`  ✅ ${table}: ${success} data berhasil`);
}

async function upsertSiteSettings(settings) {
  if (!settings?.main) return;
  const { id, ...rest } = settings.main;
  const r = await request(`${SUPABASE_URL}/rest/v1/site_settings`, 'POST', [{
    id: 'main',
    data: rest,
    created_at: settings.main.updatedAt || new Date().toISOString(),
    updated_at: settings.main.updatedAt || new Date().toISOString(),
  }], { 'Prefer': 'resolution=merge-duplicates' });
  
  if (r.status >= 200 && r.status < 300) {
    console.log(`  ✅ site_settings berhasil`);
  } else {
    console.log(`  ❌ site_settings: ${r.status} ${r.body.slice(0, 150)}`);
  }
}

async function upsertTrackingRecords(tr) {
  if (!tr || Object.keys(tr).length === 0) {
    console.log('  ⏭ Lewat tracking_records (kosong)');
    return;
  }
  const rows = Object.entries(tr).map(([hash, rec]) => ({
    id: hash,
    data: rec,
    created_at: rec.createdAt || new Date().toISOString(),
    updated_at: rec.updatedAt || new Date().toISOString(),
  }));
  const r = await request(`${SUPABASE_URL}/rest/v1/tracking_records`, 'POST', rows, {
    'Prefer': 'resolution=merge-duplicates'
  });
  if (r.status >= 200 && r.status < 300) {
    console.log(`  ✅ tracking_records: ${rows.length} data`);
  } else {
    console.log(`  ❌ tracking_records: ${r.status} ${r.body.slice(0, 150)}`);
  }
}

const TABLES = [
  'programs', 'program_levels', 'program_materials', 'registration_periods',
  'discounts', 'payment_methods', 'tutors', 'certificates', 'gallery_items',
  'faqs', 'enrollments', 'payments', 'activity_logs', 'admins',
  'tracking_records', 'site_settings',
];

const COLLECTION_MAP = {
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

async function main() {
  console.log('🚀 STEP 1: Membuat tabel di Supabase...');
  
  for (const table of TABLES) {
    await createTable(table);
  }

  console.log('\n🚀 STEP 2: Migrasi data dari db.json...');
  
  const dbPath = join(__dirname, '..', 'data', 'db.json');
  let db;
  try {
    db = JSON.parse(readFileSync(dbPath, 'utf-8'));
    console.log('📂 db.json berhasil dibaca');
  } catch (err) {
    console.error('❌ Gagal baca db.json:', err.message);
    process.exit(1);
  }

  console.log('\n📋 Migrasi site_settings...');
  await upsertSiteSettings(db.siteSettings);

  console.log('\n📋 Migrasi tracking_records...');
  await upsertTrackingRecords(db.trackingRecords);

  for (const [collection, table] of Object.entries(COLLECTION_MAP)) {
    const data = db[collection];
    if (Array.isArray(data)) {
      console.log(`\n📋 Migrasi ${collection} (${data.length} items) → ${table}...`);
      await upsertRows(table, data);
    }
  }

  console.log('\n🎉 Selesai! Cek di: https://supabase.com/dashboard/project/jgpfdshwkywhvlxaieik/editor');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
