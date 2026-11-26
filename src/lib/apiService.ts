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
  Tutor,
} from '../types/elite';

export function getAdminAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('elite_admin_token');
}

function getAuthHeaders(): HeadersInit {
  const token = getAdminAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError'))) {
      throw new Error('Koneksi ke server terputus. Pastikan server backend sedang aktif (Port 3000).');
    }
    throw err;
  }
}

export async function fetchPublicCatalog() {
  const res = await apiFetch('/api/catalog');
  if (!res.ok) {
    throw new Error('Gagal memuat katalog data website dari server.');
  }
  const data = await res.json();
  return {
    isCatalogReady: true,
    isSeededInFirestore: true, // alias for backwards compatibility
    siteSettings: data.siteSettings as SiteSettings,
    programs: (data.programs || []) as Program[],
    programLevels: (data.programLevels || []) as ProgramLevel[],
    programMaterials: (data.programMaterials || []) as ProgramMaterial[],
    registrationPeriods: (data.registrationPeriods || []) as RegistrationPeriod[],
    discounts: (data.discounts || []) as Discount[],
    paymentMethods: (data.paymentMethods || []) as PaymentMethod[],
    tutors: (data.tutors || []) as Tutor[],
    certificates: (data.certificates || []) as Certificate[],
    galleryItems: (data.galleryItems || []) as GalleryItem[],
    faqs: (data.faqs || []) as FaqItem[],
  };
}

export async function fetchAdminAllData() {
  const res = await apiFetch('/api/admin/all-data', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat data administrasi dari server.');
  }
  const data = await res.json();
  return {
    settingsExists: true,
    siteSettings: data.siteSettings as SiteSettings,
    programs: (data.programs || []) as Program[],
    programLevels: (data.programLevels || []) as ProgramLevel[],
    programMaterials: (data.programMaterials || []) as ProgramMaterial[],
    registrationPeriods: (data.registrationPeriods || []) as RegistrationPeriod[],
    discounts: (data.discounts || []) as Discount[],
    paymentMethods: (data.paymentMethods || []) as PaymentMethod[],
    enrollments: (data.enrollments || []) as Enrollment[],
    payments: (data.payments || []) as PaymentRecord[],
    tutors: (data.tutors || []) as Tutor[],
    certificates: (data.certificates || []) as Certificate[],
    galleryItems: (data.galleryItems || []) as GalleryItem[],
    faqs: (data.faqs || []) as FaqItem[],
    activityLogs: (data.activityLogs || []) as ActivityLog[],
  };
}

export async function logAdminActivity(params: {
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
}) {
  try {
    await apiFetch('/api/admin/activity-logs', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
  } catch (err) {
    console.warn('Gagal mencatat log aktivitas:', err);
  }
}

export async function seedInitialData(): Promise<{ seeded: boolean }> {
  return { seeded: true };
}

// Alias for any remaining references
export const seedInitialFirestoreData = seedInitialData;

export async function saveAdminDocument(
  collectionName: string,
  docId: string | undefined,
  docData: Record<string, unknown>,
  _isUpdate?: boolean
): Promise<string> {
  const id = docId || (docData.id as string) || `doc_${Date.now()}`;
  const res = await apiFetch(`/api/admin/documents/${collectionName}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id, data: { ...docData, id } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Gagal menyimpan dokumen ${collectionName}.`);
  }
  return id;
}

export async function deleteAdminDocument(collectionName: string, docId: string): Promise<void> {
  const res = await apiFetch(`/api/admin/documents/${collectionName}/${docId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Gagal menghapus dokumen ${collectionName}.`);
  }
}

export async function updateEnrollmentAndTracking(params: {
  enrollment: Enrollment;
  enrollmentStatus: Enrollment['enrollmentStatus'];
  paymentStatus: Enrollment['paymentStatus'];
  adminNote: string;
}) {
  const res = await apiFetch('/api/admin/enrollments/update-tracking', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      enrollmentId: params.enrollment.id,
      enrollmentStatus: params.enrollmentStatus,
      paymentStatus: params.paymentStatus,
      adminNote: params.adminNote,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memperbarui status pendaftaran.');
  }
}

export async function verifyOrRejectPayment(params: {
  payment: PaymentRecord;
  enrollment?: Enrollment;
  decision: 'Berhasil' | 'Ditolak';
  reason: string;
}) {
  const res = await apiFetch('/api/admin/payments/verify', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      paymentId: params.payment.id,
      decision: params.decision,
      reason: params.reason,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memverifikasi pembayaran.');
  }
}

export async function uploadFileToStorage(params: {
  file: File;
  folder: 'public-media' | 'payment-proofs' | 'certificates' | string;
  subFolder: string;
  maxBytes?: number;
  allowedMimeTypes: string[];
}): Promise<{ path: string; downloadUrl: string; isPrivate: boolean }> {
  const maxBytes = params.maxBytes ?? 10 * 1024 * 1024;
  if (params.file.size <= 0 || params.file.size > maxBytes) {
    throw new Error(`Ukuran file maksimal ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`);
  }
  if (!params.allowedMimeTypes.includes(params.file.type)) {
    throw new Error(`Format file "${params.file.type || 'tidak dikenal'}" tidak diizinkan.`);
  }

  const formData = new FormData();
  formData.append('folder', params.folder);
  formData.append('subFolder', params.subFolder);
  formData.append('file', params.file);

  const queryParams = new URLSearchParams({
    folder: params.folder,
    subFolder: params.subFolder,
  });

  const res = await apiFetch(`/api/upload?${queryParams.toString()}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal mengunggah file ke server.');
  }

  const data = await res.json();
  return {
    path: data.path,
    downloadUrl: data.downloadUrl || data.path,
    isPrivate: params.folder === 'payment-proofs',
  };
}

export async function getAuthorizedFileDownloadUrl(storagePath: string): Promise<string> {
  if (!storagePath) throw new Error('Path file tidak tersedia.');
  return storagePath;
}

export async function createOfflineEnrollment(payload: {
  participantName: string;
  whatsappNumber: string;
  email?: string;
  classCategory: 'offline' | 'online';
  programId: string;
  levelOrPackageId?: string;
  periodId: string;
  paymentStatus: 'Lunas' | 'Belum Bayar';
  paymentMethodName?: string;
  promoCode?: string;
  notes?: string;
  customFinalPrice?: number;
}): Promise<{ success: boolean; enrollment: Enrollment; trackingPin: string }> {
  const token = getAdminAuthToken();
  const res = await fetch('/api/admin/enrollments/offline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal membuat pendaftaran offline.');
  }
  return res.json();
}
