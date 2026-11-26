import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { hashPassword, verifyPassword } from './src/lib/localStore.js';
import { SupabaseDatabase } from './src/lib/supabaseStore.js';
import { Enrollment, PaymentRecord, PaymentStatus, TrackingRecord } from './src/types/elite.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database — Supabase (cloud) atau LocalDatabase (fallback)
const db = new SupabaseDatabase();

const RUNTIME_HMAC_SECRET =
  process.env.SERVER_HMAC_SECRET && process.env.SERVER_HMAC_SECRET.trim().length > 0
    ? process.env.SERVER_HMAC_SECRET.trim()
    : 'elite_course_local_secret_key_2026';

const TRACKING_PEPPER =
  process.env.SERVER_HMAC_SECRET && process.env.SERVER_HMAC_SECRET.trim().length > 0
    ? process.env.SERVER_HMAC_SECRET.trim()
    : 'elite_course_tracking_pepper_local';

function getAllowedAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (raw && raw.trim().length > 0) {
    return raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return ['elitecourse935@gmail.com', 'alfaazhar30@gmail.com'];
}

// Token helper for standalone admin session
interface AdminTokenPayload {
  email: string;
  name: string;
  role: string;
  exp: number;
}

function createAdminToken(payload: { email: string; name: string; role: string }): string {
  const full: AdminTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', RUNTIME_HMAC_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyAdminToken(token: string): AdminTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', RUNTIME_HMAC_SECRET)
    .update(encoded)
    .digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as AdminTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function verifyAdminBearer(req: express.Request): AdminTokenPayload {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Token otentikasi admin tidak ditemukan.');
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyAdminToken(token);
  if (!payload) {
    throw new Error('Token otentikasi tidak valid atau telah kadaluarsa.');
  }
  return payload;
}

function computeTrackingHash(registrationCode: string, pin: string): string {
  const normalizedCode = registrationCode.trim().toUpperCase();
  const normalizedPin = pin.trim();
  return crypto
    .createHash('sha256')
    .update(`${normalizedCode}:${normalizedPin}:${TRACKING_PEPPER}`)
    .digest('hex');
}

function maskParticipantName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 2) return part[0] + '*';
      return part.slice(0, 2) + '*'.repeat(Math.min(part.length - 2, 5));
    })
    .join(' ');
}

function signQuotePayload(payload: {
  registrationCode: string;
  trackingKeyHash: string;
  programId: string;
  levelOrPackageId: string;
  periodId: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
}): string {
  const canonical = JSON.stringify(payload);
  return crypto.createHmac('sha256', RUNTIME_HMAC_SECRET).update(canonical).digest('hex');
}

function generateRegistrationCode(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ELT-${yy}${mm}-${rand}`;
}

function generateTrackingPin(): string {
  const num = crypto.randomInt(100000, 999999);
  return String(num);
}

interface ComputedPricing {
  programId: string;
  programName: string;
  classCategory: 'offline' | 'online';
  levelOrPackageId: string;
  levelOrPackageName: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  discountApplied: {
    id: string;
    name: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    value: number;
  } | null;
  billingNote: string;
}

function computeAuthoritativePricing(params: {
  programId: string;
  levelOrPackageId?: string;
  promoCode?: string;
}): ComputedPricing {
  const program = db.getDoc<{
    id: string;
    title: string;
    category: string;
    basePrice: number;
    isActive: boolean;
    isDraftIncomplete?: boolean;
    unitBillingMode?: string;
    studentCapacity?: number;
  }>('programs', params.programId);

  if (!program) {
    throw new Error('Program yang dipilih tidak ditemukan.');
  }
  if (program.isActive !== true || program.isDraftIncomplete === true) {
    throw new Error('Program belum aktif atau detail program masih dilengkapi oleh admin.');
  }

  const classCategory = program.category === 'online' ? 'online' : 'offline';
  let basePrice = Number(program.basePrice || 0);
  let levelOrPackageId = '';
  let levelOrPackageName = '';
  let billingNote = '';

  if (classCategory === 'offline') {
    if (params.levelOrPackageId) {
      const level = db.getDoc<{
        id: string;
        programId: string;
        name: string;
        price: number;
        isActive: boolean;
      }>('programLevels', params.levelOrPackageId);
      if (!level || level.programId !== params.programId || level.isActive !== true) {
        throw new Error('Level program yang dipilih tidak valid atau tidak aktif.');
      }
      basePrice = Number(level.price ?? program.basePrice ?? 0);
      levelOrPackageId = String(level.id);
      levelOrPackageName = String(level.name || '');
    }
  } else {
    levelOrPackageId = params.programId;
    levelOrPackageName = String(program.title || '');
    const mode = String(program.unitBillingMode || 'per_student');
    if (mode === 'unconfirmed') {
      billingNote =
        'Nominal Rp300.000 belum dikalikan jumlah peserta karena pengaturan satuan biaya paket ini menunggu konfirmasi admin.';
    } else if (mode === 'per_student') {
      billingNote = `Biaya per siswa (${Number(program.studentCapacity || 1)} slot kapasitas paket).`;
    } else {
      billingNote = 'Biaya total satu paket kelompok.';
    }
  }

  let discountAmount = 0;
  let discountApplied: ComputedPricing['discountApplied'] = null;

  const discounts = db.getCollection<{
    id: string;
    code?: string;
    name: string;
    discountType: string;
    value: number;
    startDate?: string;
    endDate?: string;
    applicableProgramIds?: string[];
    applicableLevelIds?: string[];
    isActive: boolean;
  }>('discounts');

  // Get date string in Asia/Jakarta (WIB) and UTC to prevent timezone boundary mismatch
  let todayWIB = '';
  try {
    todayWIB = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  } catch {
    todayWIB = new Date().toISOString().slice(0, 10);
  }
  const todayUTC = new Date().toISOString().slice(0, 10);

  const isDateValid = (d: { startDate?: string; endDate?: string }) => {
    const start = String(d.startDate || '').trim();
    const end = String(d.endDate || '').trim();
    if (start && todayWIB < start && todayUTC < start) return false;
    if (end && todayWIB > end && todayUTC > end) return false;
    return true;
  };

  const isProgramApplicable = (d: { applicableProgramIds?: string[]; applicableLevelIds?: string[] }) => {
    const applicableLevels = Array.isArray(d.applicableLevelIds) ? d.applicableLevelIds : [];
    if (applicableLevels.length > 0) {
      if (!params.levelOrPackageId) return false;
      return applicableLevels.includes(params.levelOrPackageId);
    }
    const applicable = Array.isArray(d.applicableProgramIds) ? d.applicableProgramIds : [];
    if (applicable.length === 0) return true;
    return applicable.includes(params.programId);
  };

  const trimmedCode = (params.promoCode || '').trim().toUpperCase();

  if (trimmedCode.length > 0) {
    // 1. User entered a promo code
    const matchedByCode = discounts.filter(
      (d) => String(d.code || '').trim().toUpperCase() === trimmedCode
    );

    if (matchedByCode.length === 0) {
      throw new Error(`Kode promo "${trimmedCode}" tidak ditemukan.`);
    }

    // 2. Check if active
    const activeDiscounts = matchedByCode.filter((d) => d.isActive === true);
    if (activeDiscounts.length === 0) {
      throw new Error(`Kode promo "${trimmedCode}" saat ini sedang dinonaktifkan.`);
    }

    // 3. Check date validity (tolerant to WIB/UTC boundary)
    const validDateDiscounts = activeDiscounts.filter(isDateValid);
    if (validDateDiscounts.length === 0) {
      const first = activeDiscounts[0];
      const start = String(first.startDate || '').trim();
      const end = String(first.endDate || '').trim();
      if (start && (todayWIB < start || todayUTC < start)) {
        throw new Error(`Kode promo "${trimmedCode}" baru mulai berlaku pada ${start}.`);
      }
      if (end && (todayWIB > end || todayUTC > end)) {
        throw new Error(`Kode promo "${trimmedCode}" sudah berakhir pada ${end}.`);
      }
      throw new Error(`Kode promo "${trimmedCode}" berada di luar masa berlaku.`);
    }

    // 4. Check program applicability
    const match = validDateDiscounts.find(isProgramApplicable);
    if (!match) {
      throw new Error(
        `Kode promo "${trimmedCode}" hanya berlaku untuk program kursus tertentu, tidak berlaku untuk program ini.`
      );
    }

    const dType = match.discountType === 'percentage' ? 'percentage' : 'fixed';
    const dVal = Number(match.value || 0);
    if (dType === 'percentage') {
      discountAmount = Math.round((basePrice * Math.min(dVal, 100)) / 100);
    } else {
      discountAmount = Math.round(Math.min(dVal, basePrice));
    }

    discountApplied = {
      id: String(match.id),
      name: String(match.name || ''),
      code: String(match.code || ''),
      discountType: dType,
      value: dVal,
    };
  } else {
    // No promo code provided -> check for ACTIVE AUTOMATIC DISCOUNTS (diskon langsung tanpa kode)
    const autoDiscounts = discounts.filter((d) => {
      if (d.isActive !== true) return false;
      const code = String(d.code || '').trim();
      if (code.length > 0) return false; // Has a promo code, so not an automatic discount
      if (!isDateValid(d)) return false;
      if (!isProgramApplicable(d)) return false;
      return true;
    });

    if (autoDiscounts.length > 0) {
      // Pick best automatic discount (highest nominal reduction)
      let bestMatch = autoDiscounts[0];
      let bestAmt = 0;

      for (const d of autoDiscounts) {
        const dType = d.discountType === 'percentage' ? 'percentage' : 'fixed';
        const dVal = Number(d.value || 0);
        let amt = 0;
        if (dType === 'percentage') {
          amt = Math.round((basePrice * Math.min(dVal, 100)) / 100);
        } else {
          amt = Math.round(Math.min(dVal, basePrice));
        }
        if (amt > bestAmt) {
          bestAmt = amt;
          bestMatch = d;
        }
      }

      if (bestAmt > 0) {
        discountAmount = bestAmt;
        discountApplied = {
          id: String(bestMatch.id),
          name: String(bestMatch.name || ''),
          code: '',
          discountType: bestMatch.discountType === 'percentage' ? 'percentage' : 'fixed',
          value: Number(bestMatch.value || 0),
        };
      }
    }
  }

  const finalPrice = Math.max(0, basePrice - discountAmount);

  return {
    programId: String(program.id),
    programName: String(program.title || ''),
    classCategory,
    levelOrPackageId,
    levelOrPackageName,
    basePrice,
    discountAmount,
    finalPrice,
    discountApplied,
    billingNote,
  };
}

// In-memory sliding-window rate limiter
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  const store = new Map<string, RateLimitEntry>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 180000).unref();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const now = Date.now();
    let entry = store.get(clientIp);
    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + options.windowMs };
      store.set(clientIp, entry);
    } else {
      entry.count++;
    }

    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > options.max) {
      res.status(429).json({ error: options.message });
      return;
    }
    next();
  };
}

const trackingRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Terlalu banyak permintaan pelacakan status. Silakan coba kembali dalam 1 menit.',
});

const enrollmentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Terlalu banyak pengiriman pendaftaran. Silakan tunggu 1 menit.',
});

const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 25,
  message: 'Terlalu banyak permintaan konfirmasi pembayaran. Silakan tunggu 1 menit.',
});

// Configure Multer — memory storage untuk upload ke Supabase Storage
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch { /* OK in serverless */ }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const app = express();
app.use(express.json({ limit: '2mb' }));

// Middleware to ensure Supabase DB is initialized before processing requests
app.use(async (_req, _res, next) => {
  try {
    await db.waitForInit();
    next();
  } catch (err) {
    next(err);
  }
});

// Middleware for serverless environments (handles both /api/path and /path)
app.use((req, _res, next) => {
  if (process.env.VERCEL && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

  // Serve static uploads locally with smart subfolder fallback
  app.use('/uploads', (req, res, next) => {
    try {
      const rawPath = decodeURIComponent(req.path).replace(/^\//, '');
      const directPath = path.resolve(uploadsDir, rawPath);
      if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
        return res.sendFile(directPath);
      }
      // Fallback: search by filename in any folder under uploadsDir
      const fileName = path.basename(rawPath);
      const candidate1 = path.resolve(uploadsDir, 'public-media', fileName);
      if (fs.existsSync(candidate1) && fs.statSync(candidate1).isFile()) {
        return res.sendFile(candidate1);
      }
      const candidate2 = path.resolve(uploadsDir, 'public-media', 'branding', fileName);
      if (fs.existsSync(candidate2) && fs.statSync(candidate2).isFile()) {
        return res.sendFile(candidate2);
      }
    } catch {
      // ignore error and proceed
    }
    return express.static(uploadsDir)(req, res, next);
  });

  // --- 1. System & Health Check ---
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'elite-course-standalone-server',
      storage: 'supabase-storage',
      database: 'supabase-postgresql',
    });
  });

  // --- 2. Standalone Admin Authentication ---
  app.post('/api/admin/login', (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: 'Email dan password wajib diisi.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      let admin = db.getAdminByEmail(normalizedEmail);

      // Check fallback against process.env.ADMIN_EMAILS if admin not in DB
      const allowedEmails = getAllowedAdminEmails();
      const defaultPassword = process.env.ADMIN_PASSWORD || 'eliteadmin2026';

      if (!admin && allowedEmails.includes(normalizedEmail)) {
        if (password === defaultPassword) {
          admin = {
            id: `admin_${Date.now()}`,
            email: normalizedEmail,
            name: 'ELITE Administrator',
            role: 'superadmin',
            passwordHash: hashPassword(defaultPassword),
            createdAt: new Date().toISOString(),
          };
        }
      }

      if (!admin || !verifyPassword(password, admin.passwordHash)) {
        res.status(401).json({ error: 'Email atau password administrator salah.' });
        return;
      }

      const token = createAdminToken({
        email: admin.email,
        name: admin.name,
        role: admin.role,
      });

      db.addActivityLog({
        actorEmail: admin.email,
        action: 'ADMIN_LOGIN',
        entityType: 'auth',
        entityId: admin.id,
        summary: `Admin ${admin.email} berhasil login ke dashboard.`,
      });

      res.json({
        token,
        admin: {
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memproses login.' });
    }
  });

  app.get('/api/admin/session', (req, res) => {
    try {
      const payload = verifyAdminBearer(req);
      res.json({
        authorized: true,
        user: {
          email: payload.email,
          name: payload.name,
          role: payload.role,
        },
      });
    } catch (err) {
      res.status(403).json({
        authorized: false,
        error: err instanceof Error ? err.message : 'Sesi admin tidak valid.',
      });
    }
  });

  app.post('/api/admin/logout', (req, res) => {
    res.json({ success: true, message: 'Berhasil keluar.' });
  });

  // --- 3. Public Catalog & Pricing ---
  app.get('/api/catalog', (_req, res) => {
    try {
      res.json({
        isSeededInFirestore: true,
        siteSettings: db.getSiteSettings(),
        programs: db.getCollection('programs'),
        programLevels: db.getCollection('programLevels'),
        programMaterials: db.getCollection('programMaterials'),
        registrationPeriods: db.getCollection('registrationPeriods'),
        discounts: db.getCollection('discounts'),
        paymentMethods: db.getCollection('paymentMethods'),
        tutors: db.getCollection('tutors'),
        certificates: db.getCollection('certificates'),
        galleryItems: db.getCollection('galleryItems'),
        faqs: db.getCollection('faqs'),
      });
    } catch (err) {
      res.status(500).json({ error: 'Gagal memuat katalog data website.' });
    }
  });

  app.post('/api/pricing/calculate', (req, res) => {
    try {
      const { programId, levelOrPackageId, promoCode } = req.body as {
        programId?: string;
        levelOrPackageId?: string;
        promoCode?: string;
      };
      if (!programId || typeof programId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(programId)) {
        res.status(400).json({ error: 'ID program tidak valid.' });
        return;
      }
      if (
        levelOrPackageId &&
        (typeof levelOrPackageId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(levelOrPackageId))
      ) {
        res.status(400).json({ error: 'ID level atau paket tidak valid.' });
        return;
      }
      const pricing = computeAuthoritativePricing({
        programId,
        levelOrPackageId,
        promoCode: typeof promoCode === 'string' ? promoCode : undefined,
      });
      res.json(pricing);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menghitung biaya.' });
    }
  });

  // --- 4. Enrollment Registration ---
  app.post('/api/enrollments', enrollmentRateLimiter, (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const participantName = typeof body.participantName === 'string' ? body.participantName.trim() : '';
      const whatsappNumber = typeof body.whatsappNumber === 'string' ? body.whatsappNumber.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const programId = typeof body.programId === 'string' ? body.programId.trim() : '';
      const levelOrPackageId =
        typeof body.levelOrPackageId === 'string' ? body.levelOrPackageId.trim() : '';
      const periodId = typeof body.periodId === 'string' ? body.periodId.trim() : '';
      const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim() : '';
      const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : '';
      const privacyConsentAccepted = body.privacyConsentAccepted === true;
      const groupMembersRaw = Array.isArray(body.groupMembers) ? body.groupMembers : [];

      if (participantName.length < 2 || participantName.length > 120) {
        res.status(400).json({ error: 'Nama lengkap peserta wajib diisi (2–120 karakter).' });
        return;
      }
      if (whatsappNumber.length < 8 || whatsappNumber.length > 30) {
        res.status(400).json({ error: 'Nomor WhatsApp wajib diisi dengan benar.' });
        return;
      }
      if (!programId || !/^[a-zA-Z0-9_-]+$/.test(programId)) {
        res.status(400).json({ error: 'Program kursus wajib dipilih.' });
        return;
      }
      if (!periodId || !/^[a-zA-Z0-9_-]+$/.test(periodId)) {
        res.status(400).json({ error: 'Periode pendaftaran wajib dipilih.' });
        return;
      }
      if (!privacyConsentAccepted) {
        res.status(400).json({ error: 'Anda wajib menyetujui kebijakan privasi data peserta.' });
        return;
      }

      const period = db.getDoc<{
        id: string;
        title: string;
        isOpen: boolean;
        isActive: boolean;
        quota?: number;
        enrolledCount?: number;
      }>('registrationPeriods', periodId);

      if (!period || period.isActive !== true || period.isOpen !== true) {
        res.status(400).json({
          error: 'Periode pendaftaran yang dipilih sedang ditutup atau tidak aktif.',
        });
        return;
      }
      if (
        typeof period.quota === 'number' &&
        period.quota > 0 &&
        typeof period.enrolledCount === 'number' &&
        period.enrolledCount >= period.quota
      ) {
        res.status(400).json({ error: 'Kuota pendaftaran pada periode ini sudah penuh.' });
        return;
      }

      const pricing = computeAuthoritativePricing({
        programId,
        levelOrPackageId: levelOrPackageId || undefined,
        promoCode: promoCode || undefined,
      });

      const registrationCode = generateRegistrationCode();
      const trackingPin = generateTrackingPin();
      const trackingKeyHash = computeTrackingHash(registrationCode, trackingPin);
      const enrollmentId = `enr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const nowIso = new Date().toISOString();

      const groupMembersClean = groupMembersRaw
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item) => ({
          name: String((item as { name?: unknown }).name || '').trim().slice(0, 120),
          whatsappNumber: String((item as { whatsappNumber?: unknown }).whatsappNumber || '')
            .trim()
            .slice(0, 30),
        }))
        .filter((item) => item.name.length > 0);

      const serverQuoteToken = signQuotePayload({
        registrationCode,
        trackingKeyHash,
        programId: pricing.programId,
        levelOrPackageId: pricing.levelOrPackageId,
        periodId,
        basePrice: pricing.basePrice,
        discountAmount: pricing.discountAmount,
        finalPrice: pricing.finalPrice,
      });

      // Save Enrollment
      const newEnrollment: Enrollment = {
        id: enrollmentId,
        registrationCode,
        trackingKeyHash,
        classCategory: pricing.classCategory,
        programId: pricing.programId,
        programName: pricing.programName,
        levelOrPackageId: pricing.levelOrPackageId,
        levelOrPackageName: pricing.levelOrPackageName,
        periodId,
        periodTitle: String(period.title || ''),
        participantName,
        whatsappNumber,
        email: email || undefined,
        notes: notes || undefined,
        groupMembers: groupMembersClean.length > 0 ? groupMembersClean : undefined,
        basePrice: pricing.basePrice,
        discountAmount: pricing.discountAmount,
        finalPrice: pricing.finalPrice,
        promoCodeApplied: pricing.discountApplied?.code || undefined,
        discountId: pricing.discountApplied?.id || undefined,
        privacyConsentAccepted: true,
        enrollmentStatus: 'Menunggu Pembayaran',
        paymentStatus: 'Belum Bayar',
        adminNote: '',
        statusHistory: [
          {
            status: 'Menunggu Pembayaran',
            note: 'Pendaftaran berhasil dicatat. Menunggu transfer pembayaran.',
            changedBy: 'system',
            changedAt: nowIso,
          },
        ],
        serverQuoteToken,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.setDoc('enrollments', enrollmentId, newEnrollment);

      // Save Tracking Record
      const newTracking: TrackingRecord = {
        enrollmentId,
        registrationCode,
        participantMaskedName: maskParticipantName(participantName),
        classCategory: pricing.classCategory,
        programName: pricing.programName,
        levelOrPackageName: pricing.levelOrPackageName,
        periodTitle: String(period.title || ''),
        basePrice: pricing.basePrice,
        discountAmount: pricing.discountAmount,
        finalPrice: pricing.finalPrice,
        enrollmentStatus: 'Menunggu Pembayaran',
        paymentStatus: 'Belum Bayar',
        adminNote: '',
        updatedAt: nowIso,
      };

      db.setTracking(trackingKeyHash, newTracking);

      // Increment Period enrolled count
      db.setDoc('registrationPeriods', periodId, {
        enrolledCount: (period.enrolledCount || 0) + 1,
      });

      res.status(201).json({
        enrollmentId,
        registrationCode,
        trackingPin,
        classCategory: pricing.classCategory,
        programName: pricing.programName,
        levelOrPackageName: pricing.levelOrPackageName,
        periodTitle: String(period.title || ''),
        participantName,
        basePrice: pricing.basePrice,
        discountAmount: pricing.discountAmount,
        finalPrice: pricing.finalPrice,
        billingNote: pricing.billingNote,
        enrollmentStatus: 'Menunggu Pembayaran',
        paymentStatus: 'Belum Bayar',
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Gagal memproses pendaftaran.',
      });
    }
  });

  // --- 5. Tracking Lookup ---
  app.post('/api/tracking/lookup', trackingRateLimiter, (req, res) => {
    try {
      const { registrationCode, trackingPin } = req.body as {
        registrationCode?: string;
        trackingPin?: string;
      };
      if (
        !registrationCode ||
        typeof registrationCode !== 'string' ||
        !/^ELT-[0-9A-Z-]+$/.test(registrationCode.trim().toUpperCase()) ||
        registrationCode.trim().length > 32
      ) {
        res.status(400).json({ error: 'Kode pendaftaran tidak valid.' });
        return;
      }
      if (!trackingPin || typeof trackingPin !== 'string' || !/^\d{6}$/.test(trackingPin.trim())) {
        res.status(400).json({ error: 'PIN pelacakan harus berupa 6 angka.' });
        return;
      }

      const trackingKeyHash = computeTrackingHash(registrationCode, trackingPin);
      const trackingDoc = db.getTracking(trackingKeyHash);

      if (!trackingDoc) {
        res.status(404).json({
          error: 'Kombinasi Kode Pendaftaran dan PIN tidak cocok atau data tidak ditemukan.',
        });
        return;
      }

      res.json({
        trackingKeyHash,
        registrationCode: trackingDoc.registrationCode,
        participantMaskedName: trackingDoc.participantMaskedName,
        classCategory: trackingDoc.classCategory,
        programName: trackingDoc.programName,
        levelOrPackageName: trackingDoc.levelOrPackageName,
        periodTitle: trackingDoc.periodTitle,
        basePrice: trackingDoc.basePrice,
        discountAmount: trackingDoc.discountAmount,
        finalPrice: trackingDoc.finalPrice,
        enrollmentStatus: trackingDoc.enrollmentStatus,
        paymentStatus: trackingDoc.paymentStatus,
        adminNote: trackingDoc.adminNote,
      });
    } catch (err) {
      res.status(400).json({ error: 'Gagal memeriksa status pendaftaran.' });
    }
  });

  // --- 6. Payment Confirmation ---
  app.post('/api/payments/confirm', paymentRateLimiter, (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const registrationCode =
        typeof body.registrationCode === 'string' ? body.registrationCode.trim().toUpperCase() : '';
      const trackingPin = typeof body.trackingPin === 'string' ? body.trackingPin.trim() : '';
      const paymentMethodId =
        typeof body.paymentMethodId === 'string' ? body.paymentMethodId.trim() : '';
      const senderName = typeof body.senderName === 'string' ? body.senderName.trim() : '';
      const transferTime = typeof body.transferTime === 'string' ? body.transferTime.trim() : '';
      const referenceNumber =
        typeof body.referenceNumber === 'string' ? body.referenceNumber.trim().slice(0, 100) : '';
      const transferAmount = Number(body.transferAmount || 0);
      const proofFilePath = typeof body.proofFilePath === 'string' ? body.proofFilePath.trim() : '';
      const proofFileName = typeof body.proofFileName === 'string' ? body.proofFileName.trim() : '';
      const proofMimeType = typeof body.proofMimeType === 'string' ? body.proofMimeType.trim() : '';
      const proofFileSize = Number(body.proofFileSize || 0);

      if (!registrationCode || !trackingPin) {
        res.status(400).json({ error: 'Kode pendaftaran dan PIN wajib diisi.' });
        return;
      }
      if (!paymentMethodId) {
        res.status(400).json({ error: 'Metode pembayaran wajib dipilih.' });
        return;
      }
      if (senderName.length < 2) {
        res.status(400).json({ error: 'Nama pemilik rekening pengirim wajib diisi.' });
        return;
      }
      if (!transferTime) {
        res.status(400).json({ error: 'Waktu transfer wajib diisi.' });
        return;
      }
      if (transferAmount <= 0) {
        res.status(400).json({ error: 'Nominal transfer tidak valid.' });
        return;
      }
      if (!proofFilePath) {
        res.status(400).json({ error: 'File bukti transfer wajib diunggah.' });
        return;
      }

      const trackingKeyHash = computeTrackingHash(registrationCode, trackingPin);
      const trackingDoc = db.getTracking(trackingKeyHash);
      if (!trackingDoc) {
        res.status(404).json({ error: 'Data pendaftaran tidak ditemukan.' });
        return;
      }

      const paymentMethod = db.getDoc<{
        id: string;
        category: string;
        bankOrWalletName: string;
      }>('paymentMethods', paymentMethodId);

      if (!paymentMethod) {
        res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
        return;
      }

      const paymentId = `pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const nowIso = new Date().toISOString();

      // Create Payment Record
      const newPayment: PaymentRecord = {
        id: paymentId,
        enrollmentId: trackingDoc.enrollmentId,
        registrationCode,
        trackingKeyHash,
        paymentMethodId,
        paymentMethodName: `${paymentMethod.category} - ${paymentMethod.bankOrWalletName}`,
        senderName,
        transferTime,
        referenceNumber,
        transferAmount,
        proofFilePath,
        proofFileName,
        proofMimeType,
        proofFileSize,
        status: 'Menunggu Verifikasi',
        rejectionReason: '',
        verifiedBy: '',
        verifiedAt: '',
        history: [
          {
            status: 'Menunggu Verifikasi',
            note: 'Bukti transfer diunggah oleh peserta.',
            changedBy: 'participant',
            changedAt: nowIso,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.setDoc('payments', paymentId, newPayment);

      // Update Tracking Record
      db.setTracking(trackingKeyHash, {
        ...trackingDoc,
        enrollmentStatus: 'Menunggu Verifikasi',
        paymentStatus: 'Menunggu Verifikasi',
        updatedAt: nowIso,
      });

      // Update Enrollment Record
      if (trackingDoc.enrollmentId) {
        const enr = db.getDoc<Enrollment>('enrollments', trackingDoc.enrollmentId);
        if (enr) {
          db.setDoc('enrollments', trackingDoc.enrollmentId, {
            enrollmentStatus: 'Menunggu Verifikasi',
            paymentStatus: 'Menunggu Verifikasi',
            statusHistory: [
              ...(enr.statusHistory || []),
              {
                status: 'Menunggu Verifikasi',
                note: 'Bukti transfer diunggah oleh peserta.',
                changedBy: 'participant',
                changedAt: nowIso,
              },
            ],
            updatedAt: nowIso,
          });
        }
      }

      res.status(201).json({
        paymentId,
        status: 'Menunggu Verifikasi',
        message: 'Konfirmasi pembayaran berhasil dikirim dan menunggu verifikasi admin.',
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Gagal memproses konfirmasi pembayaran.',
      });
    }
  });

  // --- 7. File Upload Handler (Supabase Storage) ---
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
        return;
      }

      const queryFolder = (req.query.folder as string || req.body?.folder || 'public-media')
        .toString().replace(/[^a-zA-Z0-9_-]/g, '');
      const querySub = (req.query.subFolder as string || req.body?.subFolder || '')
        .toString().replace(/[^a-zA-Z0-9_-]/g, '');

      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}_${safeName}`;
      const storagePath = querySub ? `${querySub}/${fileName}` : fileName;

      // Tentukan bucket: payment-proofs untuk payment, public-media untuk lainnya
      const bucket = queryFolder === 'payment-proofs' ? 'payment-proofs' : 'public-media';

      // Upload ke Supabase Storage
      const publicUrl = await db.uploadToStorage(
        bucket,
        storagePath,
        req.file.buffer,
        req.file.mimetype
      );

      res.json({
        path: publicUrl,
        downloadUrl: publicUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Gagal mengunggah file.' });
    }
  });

  // --- 8. Admin Protected Endpoints ---

  app.get('/api/admin/all-data', (req, res) => {
    try {
      verifyAdminBearer(req);
      res.json({
        siteSettings: db.getSiteSettings(),
        programs: db.getCollection('programs'),
        programLevels: db.getCollection('programLevels'),
        programMaterials: db.getCollection('programMaterials'),
        registrationPeriods: db.getCollection('registrationPeriods'),
        discounts: db.getCollection('discounts'),
        paymentMethods: db.getCollection('paymentMethods'),
        enrollments: db.getCollection('enrollments'),
        payments: db.getCollection('payments'),
        tutors: db.getCollection('tutors'),
        certificates: db.getCollection('certificates'),
        galleryItems: db.getCollection('galleryItems'),
        faqs: db.getCollection('faqs'),
        activityLogs: db.getCollection('activityLogs'),
      });
    } catch (err) {
      res.status(403).json({ error: err instanceof Error ? err.message : 'Akses ditolak.' });
    }
  });

  app.post('/api/admin/documents/:collection', (req, res) => {
    try {
      const admin = verifyAdminBearer(req);
      const { collection } = req.params;
      const { id, data } = req.body as { id?: string; data: Record<string, unknown> };

      // Discounts: code is optional (empty code = automatic discount for all eligible students)
      if (collection === 'discounts') {
        const code = typeof data.code === 'string' ? data.code.trim() : '';
        data.code = code ? code.toUpperCase() : '';
      }

      const docId = id || data.id ? String(id || data.id) : `doc_${Date.now()}`;
      const saved = db.setDoc(collection, docId, data);

      db.addActivityLog({
        actorEmail: admin.email,
        action: `SAVE_${collection.toUpperCase()}`,
        entityType: collection,
        entityId: docId,
        summary: `Menyimpan dokumen ${collection}/${docId}`,
      });

      res.json(saved);
    } catch (err) {
      res.status(403).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan dokumen.' });
    }
  });

  app.delete('/api/admin/documents/:collection/:id', (req, res) => {
    try {
      const admin = verifyAdminBearer(req);
      const { collection, id } = req.params;
      const deleted = db.deleteDoc(collection, id);

      db.addActivityLog({
        actorEmail: admin.email,
        action: `DELETE_${collection.toUpperCase()}`,
        entityType: collection,
        entityId: id,
        summary: `Menghapus dokumen ${collection}/${id}`,
      });

      res.json({ success: deleted });
    } catch (err) {
      res.status(403).json({ error: err instanceof Error ? err.message : 'Gagal menghapus dokumen.' });
    }
  });

  app.post('/api/admin/enrollments/update-tracking', (req, res) => {
    try {
      const admin = verifyAdminBearer(req);
      const { enrollmentId, enrollmentStatus, paymentStatus, adminNote } = req.body as {
        enrollmentId: string;
        enrollmentStatus: string;
        paymentStatus: string;
        adminNote: string;
      };

      const enr = db.getDoc<Enrollment>('enrollments', enrollmentId);
      if (!enr) {
        res.status(404).json({ error: 'Pendaftaran tidak ditemukan.' });
        return;
      }

      const nowIso = new Date().toISOString();
      const updatedEnr = db.setDoc('enrollments', enrollmentId, {
        enrollmentStatus,
        paymentStatus,
        adminNote: adminNote.slice(0, 500),
        statusHistory: [
          ...(enr.statusHistory || []),
          {
            status: `${enrollmentStatus} (${paymentStatus})`,
            note: adminNote || 'Status diperbarui oleh admin.',
            changedBy: admin.email,
            changedAt: nowIso,
          },
        ].slice(-45),
        updatedAt: nowIso,
      });

      if (enr.trackingKeyHash) {
        const tracking = db.getTracking(enr.trackingKeyHash);
        if (tracking) {
          db.setTracking(enr.trackingKeyHash, {
            ...tracking,
            enrollmentStatus: enrollmentStatus as Enrollment['enrollmentStatus'],
            paymentStatus: paymentStatus as Enrollment['paymentStatus'],
            adminNote: adminNote.slice(0, 500),
            updatedAt: nowIso,
          });
        }
      }

      db.addActivityLog({
        actorEmail: admin.email,
        action: 'UPDATE_ENROLLMENT_STATUS',
        entityType: 'enrollments',
        entityId: enrollmentId,
        summary: `Mengubah status ${enr.registrationCode} menjadi ${enrollmentStatus} / ${paymentStatus}.`,
      });

      res.json({ success: true, enrollment: updatedEnr });
    } catch (err) {
      res.status(403).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui status.' });
    }
  });

  // --- 6b. Admin Create Offline Walk-in Enrollment ---
  app.post('/api/admin/enrollments/offline', (req, res) => {
    try {
      const admin = verifyAdminBearer(req);
      const body = req.body as Record<string, unknown>;
      const participantName = typeof body.participantName === 'string' ? body.participantName.trim() : '';
      const whatsappNumber = typeof body.whatsappNumber === 'string' ? body.whatsappNumber.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const programId = typeof body.programId === 'string' ? body.programId : '';
      const levelOrPackageId = typeof body.levelOrPackageId === 'string' ? body.levelOrPackageId : '';
      const periodId = typeof body.periodId === 'string' ? body.periodId : '';
      const isPaymentLunas = body.paymentStatus === 'Lunas';
      const paymentStatus: PaymentStatus = isPaymentLunas ? 'Berhasil' : 'Belum Bayar';
      const paymentMethodName =
        typeof body.paymentMethodName === 'string' && body.paymentMethodName.trim()
          ? body.paymentMethodName.trim()
          : 'Tunai di Kantor (Office Walk-in)';
      const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim() : '';
      const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
      const customFinalPrice = typeof body.customFinalPrice === 'number' ? body.customFinalPrice : undefined;

      if (!participantName) {
        res.status(400).json({ error: 'Nama peserta wajib diisi.' });
        return;
      }
      if (!whatsappNumber) {
        res.status(400).json({ error: 'Nomor WhatsApp wajib diisi.' });
        return;
      }
      if (!programId) {
        res.status(400).json({ error: 'Program wajib dipilih.' });
        return;
      }
      if (!periodId) {
        res.status(400).json({ error: 'Periode pendaftaran wajib dipilih.' });
        return;
      }

      const period = db.getDoc<{
        title?: string;
        enrolledCount?: number;
      }>('registrationPeriods', periodId);

      const pricing = computeAuthoritativePricing({
        programId,
        levelOrPackageId: levelOrPackageId || undefined,
        promoCode: promoCode || undefined,
      });

      const finalBasePrice = pricing.basePrice;
      const finalPrice =
        typeof customFinalPrice === 'number' && !isNaN(customFinalPrice) && customFinalPrice >= 0
          ? customFinalPrice
          : pricing.finalPrice;
      const discountAmount = Math.max(0, finalBasePrice - finalPrice);

      const registrationCode = generateRegistrationCode();
      const trackingPin = generateTrackingPin();
      const trackingKeyHash = computeTrackingHash(registrationCode, trackingPin);
      const enrollmentId = `enr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const nowIso = new Date().toISOString();

      const enrollmentStatus = isPaymentLunas ? 'Dikonfirmasi' : 'Menunggu Pembayaran';
      const adminNote = notes || 'Pendaftaran langsung di kantor (Offline Walk-in).';

      const newEnrollment: Enrollment = {
        id: enrollmentId,
        registrationCode,
        trackingKeyHash,
        classCategory: pricing.classCategory,
        programId: pricing.programId,
        programName: pricing.programName,
        levelOrPackageId: pricing.levelOrPackageId,
        levelOrPackageName: pricing.levelOrPackageName,
        periodId,
        periodTitle: String(period?.title || ''),
        participantName,
        whatsappNumber,
        email: email || undefined,
        notes: notes || undefined,
        basePrice: finalBasePrice,
        discountAmount,
        finalPrice,
        promoCodeApplied: pricing.discountApplied?.code || undefined,
        discountId: pricing.discountApplied?.id || undefined,
        privacyConsentAccepted: true,
        enrollmentStatus,
        paymentStatus,
        adminNote,
        statusHistory: [
          {
            status: `${enrollmentStatus} (${paymentStatus})`,
            note: `Pendaftaran offline dicatat oleh admin ${admin.email}. Metode: ${paymentMethodName}.`,
            changedBy: admin.email,
            changedAt: nowIso,
          },
        ],
        serverQuoteToken: signQuotePayload({
          registrationCode,
          trackingKeyHash,
          programId: pricing.programId,
          levelOrPackageId: pricing.levelOrPackageId,
          periodId,
          basePrice: finalBasePrice,
          discountAmount,
          finalPrice,
        }),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.setDoc('enrollments', enrollmentId, newEnrollment);

      // If paid, create verified payment record
      if (isPaymentLunas) {
        const paymentId = `pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const newPayment: PaymentRecord = {
          id: paymentId,
          enrollmentId,
          registrationCode,
          trackingKeyHash,
          paymentMethodId: 'cash_offline',
          paymentMethodName,
          senderName: participantName,
          transferTime: nowIso,
          transferAmount: finalPrice,
          proofFilePath: '',
          proofFileName: '',
          proofMimeType: '',
          proofFileSize: 0,
          status: 'Berhasil',
          verifiedAt: nowIso,
          verifiedBy: admin.email,
        };
        db.setDoc('payments', paymentId, newPayment);
      }

      // Save Tracking Record
      const newTracking: TrackingRecord = {
        enrollmentId,
        registrationCode,
        participantMaskedName: maskParticipantName(participantName),
        classCategory: pricing.classCategory,
        programName: pricing.programName,
        levelOrPackageName: pricing.levelOrPackageName,
        periodTitle: String(period?.title || ''),
        basePrice: finalBasePrice,
        discountAmount,
        finalPrice,
        enrollmentStatus,
        paymentStatus,
        adminNote,
        updatedAt: nowIso,
      };
      db.setTracking(trackingKeyHash, newTracking);

      // Increment Period count
      if (period) {
        db.setDoc('registrationPeriods', periodId, {
          enrolledCount: (period.enrolledCount || 0) + 1,
        });
      }

      // Log admin activity
      db.addActivityLog({
        actorEmail: admin.email,
        action: 'CREATE_OFFLINE_ENROLLMENT',
        entityType: 'enrollments',
        entityId: enrollmentId,
        summary: `Mendaftarkan peserta offline di kantor: ${participantName} (${registrationCode}), status: ${enrollmentStatus}/${paymentStatus}.`,
      });

      res.status(201).json({
        success: true,
        enrollment: newEnrollment,
        trackingPin,
      });
    } catch (err) {
      res.status(403).json({ error: err instanceof Error ? err.message : 'Gagal membuat pendaftaran offline.' });
    }
  });

  app.post('/api/admin/payments/verify', (req, res) => {
    try {
      const admin = verifyAdminBearer(req);
      const { paymentId, decision, reason } = req.body as {
        paymentId: string;
        decision: 'Berhasil' | 'Ditolak';
        reason: string;
      };

      const payment = db.getDoc<PaymentRecord>('payments', paymentId);
      if (!payment) {
        res.status(404).json({ error: 'Data pembayaran tidak ditemukan.' });
        return;
      }

      const nowIso = new Date().toISOString();
      const nextPaymentStatus = decision === 'Berhasil' ? 'Berhasil' : 'Ditolak';
      const nextEnrollmentStatus = decision === 'Berhasil' ? 'Dikonfirmasi' : 'Ditolak';

      db.setDoc('payments', paymentId, {
        status: nextPaymentStatus,
        rejectionReason: decision === 'Ditolak' ? reason.slice(0, 500) : '',
        verifiedBy: admin.email,
        verifiedAt: nowIso,
        history: [
          ...(payment.history || []),
          {
            status: nextPaymentStatus,
            note:
              decision === 'Berhasil'
                ? 'Pembayaran diverifikasi oleh admin.'
                : reason || 'Pembayaran ditolak oleh admin.',
            changedBy: admin.email,
            changedAt: nowIso,
          },
        ].slice(-25),
        updatedAt: nowIso,
      });

      if (payment.enrollmentId) {
        const enr = db.getDoc<Enrollment>('enrollments', payment.enrollmentId);
        if (enr) {
          db.setDoc('enrollments', payment.enrollmentId, {
            enrollmentStatus: nextEnrollmentStatus,
            paymentStatus: nextPaymentStatus,
            adminNote:
              decision === 'Ditolak'
                ? reason.slice(0, 500)
                : 'Pembayaran telah terverifikasi.',
            statusHistory: [
              ...(enr.statusHistory || []),
              {
                status: `${nextEnrollmentStatus} (${nextPaymentStatus})`,
                note:
                  decision === 'Berhasil'
                    ? 'Pembayaran diverifikasi admin, pendaftaran dikonfirmasi.'
                    : `Pembayaran ditolak: ${reason}`,
                changedBy: admin.email,
                changedAt: nowIso,
              },
            ].slice(-45),
            updatedAt: nowIso,
          });
        }
      }

      const trackingHash = payment.trackingKeyHash;
      if (trackingHash) {
        const tracking = db.getTracking(trackingHash);
        if (tracking) {
          db.setTracking(trackingHash, {
            ...tracking,
            enrollmentStatus: nextEnrollmentStatus,
            paymentStatus: nextPaymentStatus,
            adminNote:
              decision === 'Ditolak'
                ? reason.slice(0, 500)
                : 'Pembayaran telah diverifikasi.',
            updatedAt: nowIso,
          });
        }
      }

      db.addActivityLog({
        actorEmail: admin.email,
        action: `VERIFY_PAYMENT_${decision.toUpperCase()}`,
        entityType: 'payments',
        entityId: paymentId,
        summary: `Admin memverifikasi pembayaran ${payment.registrationCode}: ${decision}`,
      });

      res.json({ success: true, decision });
    } catch (err) {
      res.status(403).json({ error: err instanceof Error ? err.message : 'Gagal memverifikasi pembayaran.' });
    }
  });

  app.post('/api/admin/activity-logs', (req, res) => {
    try {
      const admin = verifyAdminBearer(req);
      const { action, entityType, entityId, summary } = req.body as {
        action: string;
        entityType: string;
        entityId: string;
        summary: string;
      };
      const log = db.addActivityLog({
        actorEmail: admin.email,
        action,
        entityType,
        entityId,
        summary,
      });
      res.json(log);
    } catch (err) {
      res.status(403).json({ error: 'Gagal mencatat log aktivitas.' });
    }
  });

  app.post('/api/admin/seed', (req, res) => {
    try {
      verifyAdminBearer(req);
      res.json({ seeded: true });
    } catch (err) {
      res.status(403).json({ error: 'Akses ditolak.' });
    }
  });

// --- 9. Frontend Serving (Vite dev or production build for standalone) ---
async function startServer() {
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const port = Number(process.env.PORT || 3000);
    app.listen(port, '0.0.0.0', () => {
      console.log(`ELITE Course standalone server listening on http://0.0.0.0:${port}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start ELITE Course server:', err);
    process.exit(1);
  });
}

export default app;
