export type ClassCategory = 'offline' | 'online';
export type UnitBillingMode = 'per_student' | 'per_package' | 'unconfirmed';
export type DiscountType = 'percentage' | 'fixed';
export type PaymentMethodCategory = 'BNI' | 'BRI' | 'BCA' | 'Mandiri' | 'E-Wallet';
export type EnrollmentStatus =
  | 'Baru'
  | 'Menunggu Pembayaran'
  | 'Menunggu Verifikasi'
  | 'Dikonfirmasi'
  | 'Ditolak'
  | 'Dibatalkan';
export type PaymentStatus = 'Belum Bayar' | 'Menunggu Verifikasi' | 'Berhasil' | 'Ditolak';
export type ScoreFormat = 'single' | 'detailed';
export type SingleScoreSystem = 'PTE' | 'IELTS' | 'TOEFL' | 'Lainnya' | '';

export interface AdvantageItem {
  title: string;
  description: string;
}

export interface SocialLinkItem {
  platform: string;
  label: string;
  url: string;
}

export interface SiteSettings {
  id: string;
  brandName: string;
  instituteFullName: string;
  tagline: string;
  logoUrl: string;
  heroHeadline: string;
  heroDescription: string;
  heroImageUrl: string;
  heroImageCaption: string;
  heroPrimaryCtaText: string;
  foundedYear: string;
  fkbPermitNumber: string;
  nibNumber: string;
  visionItems: string[];
  missionItems: string[];
  advantages: AdvantageItem[];
  offlinePriceNote: string;
  onlineDescription: string;
  address: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  officeHours: string;
  socialLinks: SocialLinkItem[];
  isActive: boolean;
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface Program {
  id: string;
  title: string;
  slug: string;
  category: ClassCategory;
  shortDescription: string;
  fullDescription: string;
  basePrice: number;
  priceLabel: string;
  durationLabel: string;
  meetingCount?: number;
  durationPerMeetingMinutes?: number;
  tutorCount?: number;
  studentCapacity?: number;
  unitBillingMode?: UnitBillingMode;
  certificateIncluded?: boolean;
  imageUrl?: string;
  isFeatured?: boolean;
  isDraftIncomplete: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface ProgramLevel {
  id: string;
  programId: string;
  name: string;
  materialsSummary: string;
  targetGoal: string;
  scheduleSlot1: string;
  tutorSlot1: string;
  scheduleSlot2: string;
  tutorSlot2: string;
  meetings?: { time: string; tutor: string }[];
  price: number;
  durationLabel: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface ProgramMaterial {
  id: string;
  programId: string;
  levelId?: string;
  title: string;
  description: string;
  category?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface RegistrationPeriod {
  id: string;
  title: string;
  dayOfMonth: number;
  startDate: string;
  endDate: string;
  registrationCloseDate: string;
  quota: number;
  enrolledCount: number;
  programIds: string[];
  notes: string;
  isOpen: boolean;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface Discount {
  id: string;
  name: string;
  code: string;
  applicableProgramIds: string[];
  applicableLevelIds?: string[];
  discountType: DiscountType;
  value: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface PaymentMethod {
  id: string;
  category: PaymentMethodCategory;
  bankOrWalletName: string;
  accountNumber: string;
  accountHolderName: string;
  logoUrl: string;
  qrImageUrl: string;
  instructions: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface GroupMemberInput {
  name: string;
  whatsappNumber?: string;
}

export interface StatusHistoryEntry {
  status: string;
  note: string;
  changedBy: string;
  changedAt: string;
}

export interface Enrollment {
  id: string;
  registrationCode: string;
  trackingKeyHash: string;
  classCategory: ClassCategory;
  programId: string;
  programName: string;
  levelOrPackageId?: string;
  levelOrPackageName?: string;
  periodId: string;
  periodTitle: string;
  participantName: string;
  whatsappNumber: string;
  email?: string;
  groupMembers?: GroupMemberInput[];
  notes?: string;
  promoCodeApplied?: string;
  discountId?: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  privacyConsentAccepted: boolean;
  enrollmentStatus: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  adminNote?: string;
  statusHistory?: StatusHistoryEntry[];
  serverQuoteToken: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TrackingRecord {
  enrollmentId: string;
  registrationCode: string;
  participantMaskedName: string;
  classCategory: ClassCategory;
  programName: string;
  levelOrPackageName?: string;
  periodTitle: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  enrollmentStatus: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  adminNote?: string;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  enrollmentId: string;
  registrationCode: string;
  trackingKeyHash?: string;
  paymentMethodId: string;
  paymentMethodName: string;
  senderName: string;
  transferTime: string;
  referenceNumber?: string;
  transferAmount: number;
  proofFilePath: string;
  proofFileName: string;
  proofMimeType: string;
  proofFileSize: number;
  status: 'Menunggu Verifikasi' | 'Berhasil' | 'Ditolak';
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  history?: StatusHistoryEntry[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Tutor {
  id: string;
  name: string;
  photoUrl: string;
  experience: string;
  origin: string;
  bio: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface DetailedScores {
  speaking?: string;
  grammar?: string;
  vocabulary?: string;
  pronunciation?: string;
}

export interface Certificate {
  id: string;
  studentName: string;
  programName: string;
  originOrProfession: string;
  achievementType: string;
  scoreFormat: ScoreFormat;
  singleScoreSystem?: SingleScoreSystem;
  singleScoreValue?: string;
  detailedScores?: DetailedScores;
  filePath?: string;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  issuedDate?: string;
  isActive: boolean;
  isPublished: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  images?: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface ActivityLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt?: unknown;
}

export interface PriceQuoteResult {
  programId: string;
  programName: string;
  levelOrPackageId?: string;
  levelOrPackageName?: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  discountApplied?: {
    id: string;
    name: string;
    code: string;
    discountType: DiscountType;
    value: number;
  } | null;
  billingNote?: string;
}
