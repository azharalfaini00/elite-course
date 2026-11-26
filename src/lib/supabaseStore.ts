/**
 * supabaseStore.ts
 * Database adapter yang menggunakan Supabase sebagai persistent storage.
 *
 * STRATEGI:
 * - Saat startup: load semua data dari Supabase ke in-memory cache
 * - Read: dari cache (sinkron, persis seperti LocalDatabase)
 * - Write: update cache + async sync ke Supabase (background, non-blocking)
 * - Upload: ke Supabase Storage, return public URL
 *
 * Interface identik dengan LocalDatabase agar server.ts tidak perlu diubah.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ActivityLog,
  SiteSettings,
  TrackingRecord,
} from '../types/elite.js';
import { AdminUser, DatabaseSchema, hashPassword } from './localStore.js';
import {
  INITIAL_FAQS,
  INITIAL_GALLERY_ITEMS,
  INITIAL_PROGRAM_LEVELS,
  INITIAL_PROGRAMS,
  INITIAL_REGISTRATION_PERIODS,
  INITIAL_SITE_SETTINGS,
  INITIAL_TUTORS,
} from '../data/seedData.js';

// ============================================================
// Supabase Client
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      throw new Error('SUPABASE_URL dan SUPABASE_SECRET_KEY harus diset di .env');
    }
    _client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

// ============================================================
// Table name mapping
// ============================================================

const TABLE_MAP: Record<string, string> = {
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

function tableName(collection: string): string {
  return TABLE_MAP[collection] || collection;
}

// ============================================================
// Default payment methods (same as localStore)
// ============================================================

const DEFAULT_PAYMENT_METHODS = [
  {
    id: 'pm_bca',
    category: 'BCA',
    bankOrWalletName: 'Bank Central Asia',
    accountNumber: '1400012345678',
    accountHolderName: 'ELITE COURSE KEDIRI',
    instructions: 'Transfer via ATM atau BCA Mobile, lalu simpan struk/tangkapan layar bukti transfer.',
    logoUrl: '',
    qrImageUrl: '',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'pm_bni',
    category: 'BNI',
    bankOrWalletName: 'Bank Negara Indonesia',
    accountNumber: '085650809091',
    accountHolderName: 'ELITE COURSE KEDIRI',
    instructions: 'Transfer via ATM, BNI Mobile, atau SMS Banking.',
    logoUrl: '',
    qrImageUrl: '',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'pm_bri',
    category: 'BRI',
    bankOrWalletName: 'Bank Rakyat Indonesia',
    accountNumber: '315201009876532',
    accountHolderName: 'ELITE COURSE KEDIRI',
    instructions: 'Transfer via BRImo atau ATM BRI terdekat.',
    logoUrl: '',
    qrImageUrl: '',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'pm_mandiri',
    category: 'Mandiri',
    bankOrWalletName: 'Bank Mandiri',
    accountNumber: '1710009876543',
    accountHolderName: 'ELITE COURSE KEDIRI',
    instructions: 'Transfer melalui Livin by Mandiri atau ATM Mandiri.',
    logoUrl: '',
    qrImageUrl: '',
    isActive: true,
    sortOrder: 4,
  },
];

// ============================================================
// SupabaseDatabase Class (drop-in replacement for LocalDatabase)
// ============================================================

export class SupabaseDatabase {
  private cache!: DatabaseSchema;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Kick off async init immediately
    this.initPromise = this.init();
  }

  // ---- Initialization ----

  private async init(): Promise<void> {
    try {
      console.log('[SupabaseDB] Loading data from Supabase...');
      this.cache = await this.loadFromSupabase();
      this.initialized = true;
      console.log('[SupabaseDB] Data loaded successfully.');
    } catch (err) {
      console.error('[SupabaseDB] Failed to load from Supabase, using defaults:', err);
      this.cache = this.createDefaultData();
      this.initialized = true;
    }
  }

  public async waitForInit(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
  }

  private async loadFromSupabase(): Promise<DatabaseSchema> {
    const sb = getClient();

    async function loadCollection(table: string): Promise<unknown[]> {
      const { data, error } = await sb
        .from(table)
        .select('id, data, created_at')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn(`[SupabaseDB] Warning loading ${table}:`, error.message);
        return [];
      }
      if (!data || data.length === 0) return [];
      // Merge id into data object
      return data.map((row: { id: string; data: Record<string, unknown>; created_at: string }) => ({
        ...row.data,
        id: row.id,
      }));
    }

    // Load site settings
    const { data: ssData } = await sb.from('site_settings').select('id, data').eq('id', 'main').single();
    const siteSettings = ssData
      ? { main: { ...ssData.data, id: 'main' } as SiteSettings }
      : {
          main: {
            ...INITIAL_SITE_SETTINGS,
            id: 'main',
            updatedAt: new Date().toISOString(),
            updatedBy: 'system',
          } as SiteSettings,
        };

    // Load tracking records
    const { data: trData } = await sb.from('tracking_records').select('id, data');
    const trackingRecords: Record<string, TrackingRecord> = {};
    if (trData) {
      for (const row of trData as Array<{ id: string; data: TrackingRecord }>) {
        trackingRecords[row.id] = { ...row.data };
      }
    }

    const [
      programs,
      programLevels,
      programMaterials,
      registrationPeriods,
      discounts,
      paymentMethods,
      tutors,
      certificates,
      galleryItems,
      faqs,
      enrollments,
      payments,
      activityLogs,
      admins,
    ] = await Promise.all([
      loadCollection('programs'),
      loadCollection('program_levels'),
      loadCollection('program_materials'),
      loadCollection('registration_periods'),
      loadCollection('discounts'),
      loadCollection('payment_methods'),
      loadCollection('tutors'),
      loadCollection('certificates'),
      loadCollection('gallery_items'),
      loadCollection('faqs'),
      loadCollection('enrollments'),
      loadCollection('payments'),
      loadCollection('activity_logs'),
      loadCollection('admins'),
    ]);

    return {
      siteSettings,
      programs: (programs.length > 0 ? programs : INITIAL_PROGRAMS.map((p) => ({ ...p.data, id: p.id }))) as DatabaseSchema['programs'],
      programLevels: (programLevels.length > 0 ? programLevels : INITIAL_PROGRAM_LEVELS.map((l) => ({ ...l.data, id: l.id }))) as DatabaseSchema['programLevels'],
      programMaterials: programMaterials as DatabaseSchema['programMaterials'],
      registrationPeriods: (registrationPeriods.length > 0 ? registrationPeriods : INITIAL_REGISTRATION_PERIODS.map((p) => ({ ...p.data, id: p.id }))) as DatabaseSchema['registrationPeriods'],
      discounts: discounts as DatabaseSchema['discounts'],
      paymentMethods: (paymentMethods.length > 0 ? paymentMethods : DEFAULT_PAYMENT_METHODS) as DatabaseSchema['paymentMethods'],
      tutors: (tutors.length > 0 ? tutors : INITIAL_TUTORS.map((t) => ({ ...t.data, id: t.id }))) as DatabaseSchema['tutors'],
      certificates: certificates as DatabaseSchema['certificates'],
      galleryItems: (galleryItems.length > 0 ? galleryItems : INITIAL_GALLERY_ITEMS.map((g) => ({ ...g.data, id: g.id }))) as DatabaseSchema['galleryItems'],
      faqs: (faqs.length > 0 ? faqs : INITIAL_FAQS.map((f) => ({ ...f.data, id: f.id }))) as DatabaseSchema['faqs'],
      enrollments: enrollments as DatabaseSchema['enrollments'],
      payments: payments as DatabaseSchema['payments'],
      trackingRecords,
      activityLogs: activityLogs as DatabaseSchema['activityLogs'],
      admins: (admins.length > 0 ? admins : this.defaultAdmins()) as DatabaseSchema['admins'],
    };
  }

  private defaultAdmins(): AdminUser[] {
    return [
      {
        id: 'admin_primary',
        email: 'elitecourse935@gmail.com',
        name: 'ELITE Administrator',
        role: 'superadmin',
        passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'eliteadmin2026'),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'admin_backup',
        email: 'alfaazhar30@gmail.com',
        name: 'Owner ELITE Course',
        role: 'superadmin',
        passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'eliteadmin2026'),
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private createDefaultData(): DatabaseSchema {
    return {
      siteSettings: {
        main: {
          ...INITIAL_SITE_SETTINGS,
          id: 'main',
          updatedAt: new Date().toISOString(),
          updatedBy: 'system',
        } as SiteSettings,
      },
      programs: INITIAL_PROGRAMS.map((p) => ({ ...p.data, id: p.id })) as DatabaseSchema['programs'],
      programLevels: INITIAL_PROGRAM_LEVELS.map((l) => ({ ...l.data, id: l.id })) as DatabaseSchema['programLevels'],
      programMaterials: [],
      registrationPeriods: INITIAL_REGISTRATION_PERIODS.map((p) => ({ ...p.data, id: p.id })) as DatabaseSchema['registrationPeriods'],
      discounts: [],
      paymentMethods: DEFAULT_PAYMENT_METHODS as DatabaseSchema['paymentMethods'],
      tutors: INITIAL_TUTORS.map((t) => ({ ...t.data, id: t.id })) as DatabaseSchema['tutors'],
      certificates: [],
      galleryItems: INITIAL_GALLERY_ITEMS.map((g) => ({ ...g.data, id: g.id })) as DatabaseSchema['galleryItems'],
      faqs: INITIAL_FAQS.map((f) => ({ ...f.data, id: f.id })) as DatabaseSchema['faqs'],
      enrollments: [],
      payments: [],
      trackingRecords: {},
      activityLogs: [],
      admins: this.defaultAdmins(),
    };
  }

  // ============================================================
  // Supabase background sync helpers
  // ============================================================

  private syncDoc(collection: string, id: string, docData: Record<string, unknown>): void {
    const table = tableName(collection);
    const sb = getClient();
    const { id: _id, ...rest } = docData;
    const nowIso = new Date().toISOString();

    sb.from(table)
      .upsert(
        { id, data: rest, updated_at: nowIso },
        { onConflict: 'id' }
      )
      .then(({ error }) => {
        if (error) console.error(`[SupabaseDB] Sync error (${table}/${id}):`, error.message);
      });
  }

  private syncDelete(collection: string, id: string): void {
    const table = tableName(collection);
    const sb = getClient();
    sb.from(table)
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error(`[SupabaseDB] Delete error (${table}/${id}):`, error.message);
      });
  }

  private syncSiteSettings(settings: SiteSettings): void {
    const sb = getClient();
    const { id: _id, ...rest } = settings;
    sb.from('site_settings')
      .upsert({ id: 'main', data: { ...rest }, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.error('[SupabaseDB] Site settings sync error:', error.message);
      });
  }

  private syncTracking(hash: string, record: TrackingRecord): void {
    const sb = getClient();
    sb.from('tracking_records')
      .upsert({ id: hash, data: record, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.error('[SupabaseDB] Tracking sync error:', error.message);
      });
  }

  private syncActivityLog(entry: ActivityLog): void {
    const sb = getClient();
    const { id, ...rest } = entry;
    sb.from('activity_logs')
      .insert({ id, data: rest, created_at: entry.createdAt })
      .then(({ error }) => {
        if (error) console.error('[SupabaseDB] Activity log sync error:', error.message);
      });
  }

  // ============================================================
  // Public API — same interface as LocalDatabase
  // ============================================================

  public getSiteSettings(): SiteSettings {
    return this.cache.siteSettings.main || ({ ...INITIAL_SITE_SETTINGS, id: 'main' } as SiteSettings);
  }

  public setSiteSettings(settings: Partial<SiteSettings>): SiteSettings {
    const current = this.getSiteSettings();
    const updated: SiteSettings = {
      ...current,
      ...settings,
      id: 'main',
      updatedAt: new Date().toISOString(),
    };
    this.cache.siteSettings.main = updated;
    this.syncSiteSettings(updated);
    return updated;
  }

  public getCollection<T = unknown>(name: string): T[] {
    const raw = this.cache as unknown as Record<string, unknown>;
    const val = raw[name];
    if (Array.isArray(val)) return val as T[];
    return [];
  }

  public getDoc<T = unknown>(collectionName: string, id: string): (T & { id: string }) | null {
    if (collectionName === 'siteSettings') {
      return (this.getSiteSettings() as unknown as T & { id: string }) || null;
    }
    const items = this.getCollection<T & { id: string }>(collectionName);
    return items.find((item) => item.id === id) || null;
  }

  public setDoc<T = unknown>(
    collectionName: string,
    id: string,
    docData: Partial<T> | Record<string, unknown>
  ): T & { id: string } {
    if (collectionName === 'siteSettings') {
      return this.setSiteSettings(docData as unknown as Partial<SiteSettings>) as unknown as T & { id: string };
    }

    const items = this.getCollection<Record<string, unknown> & { id: string }>(collectionName);
    const existingIndex = items.findIndex((item) => item.id === id);
    const nowIso = new Date().toISOString();
    const cleanDoc = {
      ...docData,
      id,
      updatedAt: nowIso,
    } as Record<string, unknown> & { id: string };

    if (existingIndex >= 0) {
      items[existingIndex] = { ...items[existingIndex], ...cleanDoc };
    } else {
      items.push({ createdAt: nowIso, ...cleanDoc });
    }

    const raw = this.cache as unknown as Record<string, unknown>;
    raw[collectionName] = items;

    // Background sync to Supabase
    this.syncDoc(collectionName, id, existingIndex >= 0 ? items[existingIndex] : items[items.length - 1]);

    return cleanDoc as unknown as T & { id: string };
  }

  public deleteDoc(collectionName: string, id: string): boolean {
    if (collectionName === 'siteSettings') return false;
    const items = this.getCollection<{ id: string }>(collectionName);
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length !== items.length) {
      const raw = this.cache as unknown as Record<string, unknown>;
      raw[collectionName] = filtered;
      this.syncDelete(collectionName, id);
      return true;
    }
    return false;
  }

  public getTracking(hash: string): TrackingRecord | null {
    return this.cache.trackingRecords[hash] || null;
  }

  public setTracking(hash: string, record: TrackingRecord): void {
    this.cache.trackingRecords[hash] = { ...record, updatedAt: new Date().toISOString() };
    this.syncTracking(hash, this.cache.trackingRecords[hash]);
  }

  public addActivityLog(log: {
    actorUid?: string;
    actorEmail: string;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
  }): ActivityLog {
    const entry: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actorUid: log.actorUid || 'admin',
      actorEmail: log.actorEmail,
      action: log.action.slice(0, 80),
      entityType: log.entityType.slice(0, 60),
      entityId: log.entityId.slice(0, 128),
      summary: log.summary.slice(0, 400),
      createdAt: new Date().toISOString(),
    };
    this.cache.activityLogs.unshift(entry);
    if (this.cache.activityLogs.length > 500) {
      this.cache.activityLogs = this.cache.activityLogs.slice(0, 500);
    }
    this.syncActivityLog(entry);
    return entry;
  }

  public getAdminByEmail(email: string): AdminUser | null {
    const normalized = email.trim().toLowerCase();
    return this.cache.admins.find((a) => a.email.toLowerCase() === normalized) || null;
  }

  public getAllAdmins(): AdminUser[] {
    return this.cache.admins;
  }

  public getRawData(): DatabaseSchema {
    return this.cache;
  }

  // ============================================================
  // File upload ke Supabase Storage
  // ============================================================

  public async uploadToStorage(
    bucket: string,
    filePath: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const sb = getClient();
    const { data, error } = await sb.storage.from(bucket).upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) throw new Error(`Upload gagal: ${error.message}`);
    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  public async deleteFromStorage(bucket: string, filePath: string): Promise<void> {
    const sb = getClient();
    await sb.storage.from(bucket).remove([filePath]);
  }
}
