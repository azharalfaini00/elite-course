import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  INITIAL_FAQS,
  INITIAL_GALLERY_ITEMS,
  INITIAL_PROGRAM_LEVELS,
  INITIAL_PROGRAMS,
  INITIAL_REGISTRATION_PERIODS,
  INITIAL_SITE_SETTINGS,
  INITIAL_TUTORS,
} from '../data/seedData.js';
import {
  ActivityLog,
  Certificate,
  Discount,
  Enrollment,
  FaqItem,
  GalleryItem,
  PaymentMethod,
  PaymentRecord,
  Program,
  ProgramLevel,
  ProgramMaterial,
  RegistrationPeriod,
  SiteSettings,
  TrackingRecord,
  Tutor,
} from '../types/elite.js';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin';
  passwordHash: string;
  createdAt: string;
}

export interface DatabaseSchema {
  siteSettings: Record<string, SiteSettings>;
  programs: Program[];
  programLevels: ProgramLevel[];
  programMaterials: ProgramMaterial[];
  registrationPeriods: RegistrationPeriod[];
  discounts: Discount[];
  paymentMethods: PaymentMethod[];
  tutors: Tutor[];
  certificates: Certificate[];
  galleryItems: GalleryItem[];
  faqs: FaqItem[];
  enrollments: Enrollment[];
  payments: PaymentRecord[];
  trackingRecords: Record<string, TrackingRecord>;
  activityLogs: ActivityLog[];
  admins: AdminUser[];
}

export function hashPassword(password: string): string {
  const salt = 'elite_course_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
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
    instructions: 'Transfer via ATM, BNI Mobile, atau SMS Banking. Masukkan nomor referensi bila ada.',
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

export class LocalDatabase {
  private filePath: string;
  private data!: DatabaseSchema;

  constructor(filePath?: string) {
    this.filePath = filePath || path.resolve(process.cwd(), 'data', 'db.json');
    this.init();
  }

  private init(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8').replace(/^\uFEFF/, '');
        this.data = JSON.parse(raw) as DatabaseSchema;
        this.ensureCollections();
        return;
      } catch (err) {
        console.warn('Failed to parse existing db.json, creating initial backup and fresh DB:', err);
        const backupPath = `${this.filePath}.backup_${Date.now()}`;
        try {
          fs.copyFileSync(this.filePath, backupPath);
        } catch {}
      }
    }

    this.data = this.createDefaultData();
    this.save();
  }

  private ensureCollections(): void {
    if (!this.data.siteSettings) this.data.siteSettings = {};
    if (!this.data.programs) this.data.programs = [];
    if (!this.data.programLevels) this.data.programLevels = [];
    if (!this.data.programMaterials) this.data.programMaterials = [];
    if (!this.data.registrationPeriods) this.data.registrationPeriods = [];
    if (!this.data.discounts) this.data.discounts = [];
    if (!this.data.paymentMethods || this.data.paymentMethods.length === 0) {
      this.data.paymentMethods = [...DEFAULT_PAYMENT_METHODS];
    }
    if (!this.data.tutors) this.data.tutors = [];
    if (!this.data.certificates) this.data.certificates = [];
    if (!this.data.galleryItems) this.data.galleryItems = [];
    if (!this.data.faqs) this.data.faqs = [];
    if (!this.data.enrollments) this.data.enrollments = [];
    if (!this.data.payments) this.data.payments = [];
    if (!this.data.trackingRecords) this.data.trackingRecords = {};
    if (!this.data.activityLogs) this.data.activityLogs = [];
    if (!this.data.admins || this.data.admins.length === 0) {
      this.data.admins = [
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
  }

  private createDefaultData(): DatabaseSchema {
    return {
      siteSettings: {
        main: {
          ...INITIAL_SITE_SETTINGS,
          id: 'main',
          updatedAt: new Date().toISOString(),
          updatedBy: 'system',
        },
      },
      programs: INITIAL_PROGRAMS.map((p) => ({ ...p.data, id: p.id })),
      programLevels: INITIAL_PROGRAM_LEVELS.map((l) => ({ ...l.data, id: l.id })),
      programMaterials: [],
      registrationPeriods: INITIAL_REGISTRATION_PERIODS.map((p) => ({ ...p.data, id: p.id })),
      discounts: [],
      paymentMethods: [...DEFAULT_PAYMENT_METHODS],
      tutors: INITIAL_TUTORS.map((t) => ({ ...t.data, id: t.id })),
      certificates: [],
      galleryItems: INITIAL_GALLERY_ITEMS.map((g) => ({ ...g.data, id: g.id })),
      faqs: INITIAL_FAQS.map((f) => ({ ...f.data, id: f.id })),
      enrollments: [],
      payments: [],
      trackingRecords: {},
      activityLogs: [
        {
          id: `log_init_${Date.now()}`,
          actorUid: 'system',
          actorEmail: 'system',
          action: 'INITIAL_SEED',
          entityType: 'system',
          entityId: 'init',
          summary: 'Inisialisasi database lokal ELITE Course.',
          createdAt: new Date().toISOString(),
        },
      ],
      admins: [
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
      ],
    };
  }

  public save(): void {
    const tempPath = `${this.filePath}.tmp_${Date.now()}`;
    const json = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(tempPath, json, 'utf-8');
    fs.renameSync(tempPath, this.filePath);
  }

  // --- Collection Accessors ---

  public getSiteSettings(): SiteSettings {
    return this.data.siteSettings.main || { ...INITIAL_SITE_SETTINGS, id: 'main' };
  }

  public setSiteSettings(settings: Partial<SiteSettings>): SiteSettings {
    const current = this.getSiteSettings();
    const updated: SiteSettings = {
      ...current,
      ...settings,
      id: 'main',
      updatedAt: new Date().toISOString(),
    };
    this.data.siteSettings.main = updated;
    this.save();
    return updated;
  }

  public getCollection<T = unknown>(name: string): T[] {
    const raw = this.data as unknown as Record<string, unknown>;
    const val = raw[name];
    if (Array.isArray(val)) {
      return val as T[];
    }
    return [];
  }

  public getDoc<T = unknown>(collectionName: string, id: string): (T & { id: string }) | null {
    if (collectionName === 'siteSettings') {
      return (this.getSiteSettings() as unknown as T & { id: string }) || null;
    }
    const items = this.getCollection<T & { id: string }>(collectionName);
    return items.find((item) => item.id === id) || null;
  }

  public setDoc<T = any>(
    collectionName: string,
    id: string,
    docData: Partial<T> | Record<string, any>
  ): any {
    if (collectionName === 'siteSettings') {
      return this.setSiteSettings(docData as unknown as Partial<SiteSettings>) as unknown as T & {
        id: string;
      };
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
      items.push({
        createdAt: nowIso,
        ...cleanDoc,
      });
    }

    const raw = this.data as unknown as Record<string, unknown>;
    raw[collectionName] = items;
    this.save();
    return cleanDoc as unknown as T & { id: string };
  }

  public deleteDoc(collectionName: string, id: string): boolean {
    if (collectionName === 'siteSettings') return false;
    const items = this.getCollection<{ id: string }>(collectionName);
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length !== items.length) {
      const raw = this.data as unknown as Record<string, unknown>;
      raw[collectionName] = filtered;
      this.save();
      return true;
    }
    return false;
  }

  public getTracking(hash: string): TrackingRecord | null {
    return this.data.trackingRecords[hash] || null;
  }

  public setTracking(hash: string, record: TrackingRecord): void {
    this.data.trackingRecords[hash] = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    this.save();
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
    this.data.activityLogs.unshift(entry);
    if (this.data.activityLogs.length > 500) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 500);
    }
    this.save();
    return entry;
  }

  public getAdminByEmail(email: string): AdminUser | null {
    const normalized = email.trim().toLowerCase();
    return this.data.admins.find((a) => a.email.toLowerCase() === normalized) || null;
  }

  public getAllAdmins(): AdminUser[] {
    return this.data.admins;
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }
}
