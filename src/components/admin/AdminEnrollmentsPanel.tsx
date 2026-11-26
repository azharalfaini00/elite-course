import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit2,
  Eye,
  Plus,
  Printer,
  Search,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import {
  createOfflineEnrollment,
  deleteAdminDocument,
  getAuthorizedFileDownloadUrl,
  logAdminActivity,
  saveAdminDocument,
  updateEnrollmentAndTracking,
  uploadFileToStorage,
  verifyOrRejectPayment,
} from '../../lib/apiService';
import { exportToCsv, formatDateTimeID, formatFileSize, formatRupiah } from '../../lib/format';
import {
  ClassCategory,
  Discount,
  Enrollment,
  EnrollmentStatus,
  PaymentMethod,
  PaymentMethodCategory,
  PaymentRecord,
  PaymentStatus,
  Program,
  ProgramLevel,
  RegistrationPeriod,
} from '../../types/elite';

interface Props {
  activeSection: 'enrollments' | 'payments' | 'payment-methods';
  programs: Program[];
  programLevels?: ProgramLevel[];
  registrationPeriods?: RegistrationPeriod[];
  discounts?: Discount[];
  enrollments: Enrollment[];
  payments: PaymentRecord[];
  paymentMethods: PaymentMethod[];
  onRefresh: () => Promise<void>;
}

export function AdminEnrollmentsPanel({
  activeSection,
  programs,
  programLevels = [],
  registrationPeriods = [],
  discounts = [],
  enrollments,
  payments,
  paymentMethods,
  onRefresh,
}: Props) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'all' | ClassCategory>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Enrollment detail / status modal
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [invoiceEnrollment, setInvoiceEnrollment] = useState<Enrollment | null>(null);
  const [nextEnrStatus, setNextEnrStatus] = useState<EnrollmentStatus>('Baru');
  const [nextPayStatus, setNextPayStatus] = useState<PaymentStatus>('Belum Bayar');
  const [adminNoteInput, setAdminNoteInput] = useState('');

  // Payment detail / reject modal
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);

  // Payment Method modal
  const [editingMethod, setEditingMethod] = useState<Partial<PaymentMethod> | null>(null);
  const [isNewMethod, setIsNewMethod] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{
    collection: string;
    id: string;
    label: string;
  } | null>(null);

  // Offline walk-in registration modal
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [offlineForm, setOfflineForm] = useState({
    participantName: '',
    whatsappNumber: '',
    email: '',
    classCategory: 'offline' as ClassCategory,
    programId: '',
    levelOrPackageId: '',
    periodId: '',
    paymentStatus: 'Lunas' as 'Lunas' | 'Belum Bayar',
    paymentMethodName: 'Tunai di Kantor (Cash)',
    promoCode: '',
    notes: 'Pendaftaran langsung di kantor (Office Walk-in)',
    customFinalPrice: '' as string,
  });
  const [createdOfflineResult, setCreatedOfflineResult] = useState<{
    enrollment: Enrollment;
    trackingPin: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  const handleOpenOfflineModal = () => {
    const firstProg =
      programs.find((p) => p.category === 'offline' && p.isActive !== false) || programs[0];
    const progId = firstProg?.id || '';
    const firstLevel = programLevels.find((l) => l.programId === progId && l.isActive !== false);
    const firstOpenPeriod =
      registrationPeriods.find((p) => p.isOpen && p.isActive !== false) || registrationPeriods[0];

    setOfflineForm({
      participantName: '',
      whatsappNumber: '',
      email: '',
      classCategory: 'offline',
      programId: progId,
      levelOrPackageId: firstLevel?.id || '',
      periodId: firstOpenPeriod?.id || '',
      paymentStatus: 'Lunas',
      paymentMethodName: 'Tunai di Kantor (Cash)',
      promoCode: '',
      notes: 'Pendaftaran langsung di kantor (Office Walk-in)',
      customFinalPrice: '',
    });
    setIsOfflineModalOpen(true);
  };

  const handleOfflineCategoryChange = (cat: ClassCategory) => {
    const firstProg =
      programs.find((p) => p.category === cat && p.isActive !== false) ||
      programs.find((p) => p.category === cat);
    const progId = firstProg?.id || '';
    const firstLevel =
      cat === 'offline'
        ? programLevels.find((l) => l.programId === progId && l.isActive !== false)
        : undefined;
    setOfflineForm((prev) => ({
      ...prev,
      classCategory: cat,
      programId: progId,
      levelOrPackageId: firstLevel?.id || '',
    }));
  };

  const handleOfflineProgramChange = (progId: string) => {
    const firstLevel =
      offlineForm.classCategory === 'offline'
        ? programLevels.find((l) => l.programId === progId && l.isActive !== false)
        : undefined;
    setOfflineForm((prev) => ({
      ...prev,
      programId: progId,
      levelOrPackageId: firstLevel?.id || '',
    }));
  };

  const handleSubmitOfflineEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineForm.participantName.trim()) {
      showToast('error', 'Nama peserta wajib diisi.');
      return;
    }
    if (!offlineForm.whatsappNumber.trim()) {
      showToast('error', 'Nomor WhatsApp wajib diisi.');
      return;
    }
    if (!offlineForm.programId) {
      showToast('error', 'Program wajib dipilih.');
      return;
    }
    if (!offlineForm.periodId) {
      showToast('error', 'Periode pendaftaran wajib dipilih.');
      return;
    }

    setSaving(true);
    try {
      const customPriceNum =
        offlineForm.customFinalPrice.trim() !== ''
          ? Number(offlineForm.customFinalPrice)
          : undefined;

      const res = await createOfflineEnrollment({
        participantName: offlineForm.participantName.trim(),
        whatsappNumber: offlineForm.whatsappNumber.trim(),
        email: offlineForm.email.trim() || undefined,
        classCategory: offlineForm.classCategory,
        programId: offlineForm.programId,
        levelOrPackageId:
          offlineForm.classCategory === 'offline' ? offlineForm.levelOrPackageId : undefined,
        periodId: offlineForm.periodId,
        paymentStatus: offlineForm.paymentStatus,
        paymentMethodName: offlineForm.paymentMethodName,
        promoCode: offlineForm.promoCode.trim() || undefined,
        notes: offlineForm.notes.trim() || undefined,
        customFinalPrice: customPriceNum,
      });

      showToast('success', `Pendaftaran offline untuk ${res.enrollment.participantName} berhasil dicatat!`);
      setIsOfflineModalOpen(false);
      setCreatedOfflineResult({
        enrollment: res.enrollment,
        trackingPin: res.trackingPin,
      });
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal membuat pendaftaran offline.');
    } finally {
      setSaving(false);
    }
  };

  const openEnrollmentDetail = (enr: Enrollment) => {
    setSelectedEnrollment(enr);
    setNextEnrStatus(enr.enrollmentStatus);
    setNextPayStatus(enr.paymentStatus);
    setAdminNoteInput(enr.adminNote || '');
  };

  const handleSaveEnrollmentStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) return;
    setSaving(true);
    try {
      await updateEnrollmentAndTracking({
        enrollment: selectedEnrollment,
        enrollmentStatus: nextEnrStatus,
        paymentStatus: nextPayStatus,
        adminNote: adminNoteInput,
      });
      showToast('success', 'Status pendaftaran berhasil diperbarui.');
      setSelectedEnrollment(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memperbarui status.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Kode Pendaftaran',
      'Nama Peserta',
      'WhatsApp',
      'Email',
      'Jenis Kelas',
      'Program',
      'Level/Paket',
      'Periode',
      'Total Biaya',
      'Status Pendaftaran',
      'Status Pembayaran',
    ];
    const rows = filteredEnrollments.map((e) => {
      const relatedPayment = payments.find((p) => p.enrollmentId === e.id);
      const effectivePaymentStatus =
        relatedPayment?.status === 'Menunggu Verifikasi' && e.paymentStatus === 'Belum Bayar'
          ? 'Menunggu Verifikasi'
          : e.paymentStatus;

      return [
        e.registrationCode,
        e.participantName,
        e.whatsappNumber,
        e.email || '-',
        e.classCategory,
        e.programName,
        e.levelOrPackageName || '-',
        e.periodTitle,
        e.finalPrice,
        e.enrollmentStatus,
        effectivePaymentStatus,
      ];
    });
    exportToCsv(`pendaftar-elite-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('success', 'Data pendaftar berhasil diekspor ke CSV.');
  };

  const handleViewProof = async (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setRejectionReason(payment.rejectionReason || '');
    setProofPreviewUrl(null);
    if (!payment.proofFilePath) {
      showToast('error', 'File bukti transfer tidak ditemukan.');
      return;
    }
    setLoadingProof(true);
    try {
      const url = await getAuthorizedFileDownloadUrl(payment.proofFilePath);
      setProofPreviewUrl(url);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memuat bukti pembayaran.');
    } finally {
      setLoadingProof(false);
    }
  };

  const handleVerifyPayment = async (decision: 'Berhasil' | 'Ditolak') => {
    if (!selectedPayment) return;
    if (decision === 'Ditolak' && !rejectionReason.trim()) {
      showToast('error', 'Alasan penolakan wajib diisi jika pembayaran ditolak.');
      return;
    }
    const matchingEnrollment = enrollments.find((e) => e.id === selectedPayment.enrollmentId);
    setSaving(true);
    try {
      await verifyOrRejectPayment({
        payment: selectedPayment,
        enrollment: matchingEnrollment,
        decision,
        reason: rejectionReason.trim(),
      });
      showToast(
        'success',
        decision === 'Berhasil'
          ? 'Pembayaran diverifikasi dan peserta dikonfirmasi.'
          : 'Pembayaran ditolak dengan alasan tercatat.'
      );
      setSelectedPayment(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memproses verifikasi.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod || !editingMethod.bankOrWalletName || !editingMethod.accountNumber) {
      showToast('error', 'Nama bank/e-wallet dan nomor rekening wajib diisi.');
      return;
    }
    const docId = editingMethod.id || `pm_${Date.now()}`;
    setSaving(true);
    try {
      await saveAdminDocument(
        'paymentMethods',
        docId,
        {
          category: (editingMethod.category || 'BCA') as PaymentMethodCategory,
          bankOrWalletName: editingMethod.bankOrWalletName.trim(),
          accountNumber: editingMethod.accountNumber.trim(),
          accountHolderName: (editingMethod.accountHolderName || '').trim(),
          logoUrl: (editingMethod.logoUrl || '').trim(),
          qrImageUrl: (editingMethod.qrImageUrl || '').trim(),
          instructions: (editingMethod.instructions || '').trim(),
          isActive: editingMethod.isActive !== false,
          sortOrder: Number(editingMethod.sortOrder ?? paymentMethods.length + 1),
        },
        isNewMethod
      );
      await logAdminActivity({
        action: isNewMethod ? 'CREATE_PAYMENT_METHOD' : 'UPDATE_PAYMENT_METHOD',
        entityType: 'paymentMethods',
        entityId: docId,
        summary: `Menyimpan metode pembayaran ${editingMethod.bankOrWalletName}`,
      });
      showToast('success', 'Metode pembayaran berhasil disimpan.');
      setEditingMethod(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan metode pembayaran.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadMethodAsset = async (file: File, field: 'logoUrl' | 'qrImageUrl') => {
    try {
      const uploaded = await uploadFileToStorage({
        file,
        folder: 'public-media',
        subFolder: 'payment-methods',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      });
      setEditingMethod((prev) => (prev ? { ...prev, [field]: uploaded.downloadUrl } : prev));
      showToast('success', 'Gambar berhasil diunggah.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengunggah gambar.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await deleteAdminDocument(confirmDelete.collection, confirmDelete.id);
      await logAdminActivity({
        action: 'DELETE',
        entityType: confirmDelete.collection,
        entityId: confirmDelete.id,
        summary: `Menghapus ${confirmDelete.label}`,
      });
      showToast('success', `${confirmDelete.label} berhasil dihapus.`);
      setConfirmDelete(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus data.');
    } finally {
      setSaving(false);
    }
  };

  const filteredEnrollments = enrollments.filter((enr) => {
    if (catFilter !== 'all' && enr.classCategory !== catFilter) return false;
    if (programFilter !== 'all' && enr.programId !== programFilter) return false;
    if (statusFilter !== 'all' && enr.enrollmentStatus !== statusFilter) return false;
    if (dateFilter) {
      let enrDateStr = '';
      if (typeof enr.createdAt === 'string') {
        enrDateStr = enr.createdAt.slice(0, 10);
      } else if (
        enr.createdAt &&
        typeof enr.createdAt === 'object' &&
        'seconds' in enr.createdAt
      ) {
        enrDateStr = new Date(
          Number((enr.createdAt as { seconds: number }).seconds) * 1000
        )
          .toISOString()
          .slice(0, 10);
      }
      if (enrDateStr && enrDateStr !== dateFilter) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        enr.registrationCode.toLowerCase().includes(q) ||
        enr.participantName.toLowerCase().includes(q) ||
        enr.whatsappNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredPayments = payments.filter((pay) => {
    if (statusFilter !== 'all' && pay.status !== statusFilter) return false;
    if (methodFilter !== 'all' && pay.paymentMethodId !== methodFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        pay.registrationCode.toLowerCase().includes(q) ||
        pay.senderName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {activeSection === 'enrollments' && (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kode / nama / WA..."
                  className="pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                />
              </div>
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value as 'all' | ClassCategory)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value="all">Offline & Online</option>
                <option value="offline">Offline</option>
                <option value="online">Online</option>
              </select>
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value="all">Semua Program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value="all">Semua Status</option>
                <option value="Baru">Baru</option>
                <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                <option value="Dikonfirmasi">Dikonfirmasi</option>
                <option value="Ditolak">Ditolak</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenOfflineModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold hover:bg-[#0F766E] transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Daftar Offline</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Peserta & WA</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Belum ada data pendaftar yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredEnrollments.map((enr) => {
                    const relatedPayment = payments.find((p) => p.enrollmentId === enr.id);
                    const effectivePaymentStatus =
                      relatedPayment?.status === 'Menunggu Verifikasi' &&
                      enr.paymentStatus === 'Belum Bayar'
                        ? 'Menunggu Verifikasi'
                        : enr.paymentStatus;

                    return (
                      <tr key={enr.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0D213F]">
                          {enr.registrationCode}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#0D213F]">{enr.participantName}</p>
                          <p className="text-xs text-slate-500 tabular-nums">{enr.whatsappNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{enr.programName}</p>
                          <p className="text-xs text-slate-500 capitalize">
                            {enr.classCategory}
                            {enr.levelOrPackageName && enr.classCategory === 'offline'
                              ? ` · ${enr.levelOrPackageName}`
                              : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{enr.periodTitle}</td>
                        <td className="px-4 py-3 font-mono tabular-nums font-semibold">
                          {formatRupiah(enr.finalPrice)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-semibold text-[#0D213F]">{enr.enrollmentStatus}</p>
                          <p className="text-slate-500">Bayar: {effectivePaymentStatus}</p>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setInvoiceEnrollment(enr)}
                            className="p-1.5 rounded-lg text-[#0F766E] hover:bg-teal-50"
                            title="Cetak Invoice"
                            aria-label={`Cetak Invoice ${enr.registrationCode}`}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEnrollmentDetail(enr)}
                            className="p-1.5 rounded-lg text-[#0D213F] hover:bg-slate-100"
                            title="Lihat Detail"
                            aria-label={`Detail ${enr.registrationCode}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                collection: 'enrollments',
                                id: enr.id,
                                label: `Pendaftaran ${enr.registrationCode}`,
                              })
                            }
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                            aria-label={`Hapus ${enr.registrationCode}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'payments' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode / pengirim..."
                className="pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
              <option value="Berhasil">Berhasil</option>
              <option value="Ditolak">Ditolak</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
            >
              <option value="all">Semua Metode</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.category} - {m.bankOrWalletName}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Kode Daftar</th>
                  <th className="px-4 py-3">Pengirim & Metode</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3">Waktu Transfer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Belum ada transaksi pembayaran yang masuk.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0D213F]">
                        {pay.registrationCode}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#0D213F]">{pay.senderName}</p>
                        <p className="text-xs text-slate-500">{pay.paymentMethodName}</p>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold tabular-nums">
                        {formatRupiah(pay.transferAmount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{pay.transferTime}</td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        <span
                          className={
                            pay.status === 'Berhasil'
                              ? 'text-[#0F766E]'
                              : pay.status === 'Ditolak'
                                ? 'text-red-600'
                                : 'text-amber-700'
                          }
                        >
                          {pay.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleViewProof(pay)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D213F] text-white text-xs font-semibold hover:bg-[#15325C]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Periksa Bukti</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'payment-methods' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0D213F]">
                Metode Pembayaran Resmi
              </h2>
              <p className="text-xs text-slate-500">
                Hanya rekening/e-wallet yang Anda tambahkan dan aktifkan di sini yang akan ditampilkan ke peserta.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsNewMethod(true);
                setEditingMethod({
                  category: 'BCA',
                  bankOrWalletName: '',
                  accountNumber: '',
                  accountHolderName: '',
                  logoUrl: '',
                  qrImageUrl: '',
                  instructions: '',
                  isActive: true,
                  sortOrder: paymentMethods.length + 1,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Metode</span>
            </button>
          </div>

          {paymentMethods.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-sm text-slate-500">
              Belum ada metode pembayaran resmi. Klik "Tambah Metode" untuk menambahkan rekening BNI, BRI, BCA, Mandiri, atau E-Wallet resmi ELITE Course.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((m) => (
                <div
                  key={m.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#0F766E]">
                      {m.category} · {m.isActive ? 'Aktif' : 'Nonaktif'}
                    </p>
                    <h3 className="font-display font-bold text-base text-[#0D213F]">
                      {m.bankOrWalletName}
                    </h3>
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {m.accountNumber}
                    </p>
                    <p className="text-xs text-slate-600">a.n. {m.accountHolderName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewMethod(false);
                        setEditingMethod(m);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({
                          collection: 'paymentMethods',
                          id: m.id,
                          label: m.bankOrWalletName,
                        })
                      }
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETAIL PENDAFTAR */}
      {selectedEnrollment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEnrollmentStatus}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display font-bold text-lg text-[#0D213F]">
                  Detail Pendaftar: {selectedEnrollment.registrationCode}
                </h3>
                <p className="text-xs text-slate-500">{selectedEnrollment.participantName}</p>
              </div>
              <button type="button" onClick={() => setSelectedEnrollment(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">WhatsApp</span>
                <span className="font-mono font-medium">{selectedEnrollment.whatsappNumber}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Email</span>
                <span>{selectedEnrollment.email || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Program & Level</span>
                <span className="font-semibold">
                  {selectedEnrollment.programName}{' '}
                  {selectedEnrollment.levelOrPackageName
                    ? `(${selectedEnrollment.levelOrPackageName})`
                    : ''}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Periode</span>
                <span>{selectedEnrollment.periodTitle}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Total Biaya</span>
                <div className="space-y-0.5">
                  <span className="font-mono font-bold text-[#0F766E] text-base block">
                    {formatRupiah(selectedEnrollment.finalPrice)}
                  </span>
                  {selectedEnrollment.discountAmount > 0 && (
                    <span className="text-[11px] text-slate-500 block">
                      (Awal: {formatRupiah(selectedEnrollment.basePrice)}, Diskon: -{formatRupiah(selectedEnrollment.discountAmount)})
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Kode Promo</span>
                {selectedEnrollment.promoCodeApplied ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-50 text-emerald-700">
                    {selectedEnrollment.promoCodeApplied}
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
              {selectedEnrollment.notes && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-slate-500 block">Catatan Peserta</span>
                  <span>{selectedEnrollment.notes}</span>
                </div>
              )}
              {selectedEnrollment.groupMembers && selectedEnrollment.groupMembers.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-slate-500 block">Anggota Kelompok</span>
                  <ul className="list-disc list-inside text-xs mt-1">
                    {selectedEnrollment.groupMembers.map((gm, i) => (
                      <li key={i}>
                        {gm.name} ({gm.whatsappNumber || '-'})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Status Pendaftaran</label>
                <select
                  value={nextEnrStatus}
                  onChange={(e) => setNextEnrStatus(e.target.value as EnrollmentStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Baru">Baru</option>
                  <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                  <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                  <option value="Dikonfirmasi">Dikonfirmasi</option>
                  <option value="Ditolak">Ditolak</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Status Pembayaran</label>
                <select
                  value={nextPayStatus}
                  onChange={(e) => setNextPayStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Belum Bayar">Belum Bayar</option>
                  <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                  <option value="Berhasil">Berhasil</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Catatan Admin</label>
                <textarea
                  rows={2}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>

            {selectedEnrollment.statusHistory && selectedEnrollment.statusHistory.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-700">Riwayat Perubahan Status</p>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                  {selectedEnrollment.statusHistory.map((h, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between gap-3">
                      <div>
                        <span className="font-semibold">{h.status}</span> — {h.note}
                      </div>
                      <span className="text-slate-400 shrink-0">{h.changedBy}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const enr = selectedEnrollment;
                  setSelectedEnrollment(null);
                  setInvoiceEnrollment(enr);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-50 text-[#0F766E] hover:bg-teal-100 text-xs font-semibold transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Invoice</span>
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEnrollment(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL VERIFIKASI PEMBAYARAN */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display font-bold text-lg text-[#0D213F]">
                  Verifikasi Pembayaran: {selectedPayment.registrationCode}
                </h3>
                <p className="text-xs text-slate-500">
                  Pengirim: {selectedPayment.senderName} · {selectedPayment.paymentMethodName}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedPayment(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">Nominal Transfer</span>
                <span className="font-mono font-bold text-[#0D213F]">
                  {formatRupiah(selectedPayment.transferAmount)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Waktu Transfer</span>
                <span>{selectedPayment.transferTime}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Referensi</span>
                <span>{selectedPayment.referenceNumber || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">File Bukti</span>
                <span className="text-xs">
                  {selectedPayment.proofFileName || '-'} (
                  {formatFileSize(selectedPayment.proofFileSize || 0)})
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center min-h-[200px]">
              {loadingProof ? (
                <p className="text-sm text-slate-500">Memuat bukti transfer privat...</p>
              ) : proofPreviewUrl ? (
                (selectedPayment.proofMimeType || '').startsWith('image/') ? (
                  <img
                    src={proofPreviewUrl}
                    alt="Bukti transfer"
                    referrerPolicy="no-referrer"
                    className="max-h-72 w-auto rounded-lg"
                  />
                ) : (
                  <a
                    href={proofPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
                  >
                    Buka Bukti Transfer (PDF)
                  </a>
                )
              ) : (
                <p className="text-xs text-slate-500">
                  Preview tidak tersedia untuk berkas ini.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Alasan Penolakan (Wajib diisi jika menolak pembayaran)
              </label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Nominal tidak sesuai / bukti transfer buram..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleVerifyPayment('Ditolak')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak Pembayaran</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleVerifyPayment('Berhasil')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verifikasi Pembayaran</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL METODE PEMBAYARAN */}
      {editingMethod && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePaymentMethod}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-[#0D213F]">
                {isNewMethod ? 'Tambah Metode Pembayaran' : 'Edit Metode Pembayaran'}
              </h3>
              <button type="button" onClick={() => setEditingMethod(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Kategori *</label>
                <select
                  value={editingMethod.category || 'BCA'}
                  onChange={(e) =>
                    setEditingMethod({
                      ...editingMethod,
                      category: e.target.value as PaymentMethodCategory,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="BNI">BNI</option>
                  <option value="BRI">BRI</option>
                  <option value="BCA">BCA</option>
                  <option value="Mandiri">Mandiri</option>
                  <option value="E-Wallet">E-Wallet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Bank / E-Wallet *</label>
                <input
                  type="text"
                  required
                  value={editingMethod.bankOrWalletName || ''}
                  onChange={(e) =>
                    setEditingMethod({ ...editingMethod, bankOrWalletName: e.target.value })
                  }
                  placeholder="Contoh: Bank BCA / Dana / GoPay"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Nomor Rekening / Akun *</label>
                <input
                  type="text"
                  required
                  value={editingMethod.accountNumber || ''}
                  onChange={(e) =>
                    setEditingMethod({ ...editingMethod, accountNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Pemilik Rekening *</label>
                <input
                  type="text"
                  required
                  value={editingMethod.accountHolderName || ''}
                  onChange={(e) =>
                    setEditingMethod({ ...editingMethod, accountHolderName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Instruksi Pembayaran</label>
                <textarea
                  rows={2}
                  value={editingMethod.instructions || ''}
                  onChange={(e) =>
                    setEditingMethod({ ...editingMethod, instructions: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Logo (Opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUploadMethodAsset(f, 'logoUrl');
                  }}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Gambar QR (Opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUploadMethodAsset(f, 'qrImageUrl');
                  }}
                  className="text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={editingMethod.isActive !== false}
                    onChange={(e) =>
                      setEditingMethod({ ...editingMethod, isActive: e.target.checked })
                    }
                  />
                  <span>Aktifkan & Tampilkan ke Peserta</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingMethod(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                Simpan Metode
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL PENDAFTARAN OFFLINE (WALK-IN) */}
      {isOfflineModalOpen && (() => {
        const catPrograms = programs.filter(
          (p) => p.category === offlineForm.classCategory && p.isActive !== false
        );
        const selProg = programs.find((p) => p.id === offlineForm.programId);
        const availLevels = offlineForm.classCategory === 'offline'
          ? programLevels.filter((l) => l.programId === offlineForm.programId && l.isActive !== false)
          : [];
        const selLevel = programLevels.find((l) => l.id === offlineForm.levelOrPackageId);
        const basePrice = selLevel?.price ?? selProg?.basePrice ?? 0;
        const displayPrice = offlineForm.customFinalPrice !== ''
          ? (Number(offlineForm.customFinalPrice) || 0)
          : basePrice;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <form
              onSubmit={handleSubmitOfflineEnrollment}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-display font-bold text-xl text-[#0D213F]">Daftar Peserta Offline / Walk-in</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Untuk peserta yang langsung datang ke kantor / office.</p>
                </div>
                <button type="button" onClick={() => setIsOfflineModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {/* Nama Peserta */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1 text-slate-700">Nama Peserta <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={offlineForm.participantName}
                    onChange={(e) => setOfflineForm((p) => ({ ...p, participantName: e.target.value }))}
                    placeholder="Nama lengkap peserta"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                {/* Nomor WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">No. WhatsApp <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={offlineForm.whatsappNumber}
                    onChange={(e) => setOfflineForm((p) => ({ ...p, whatsappNumber: e.target.value }))}
                    placeholder="6281234567890"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">Email (opsional)</label>
                  <input
                    type="email"
                    value={offlineForm.email}
                    onChange={(e) => setOfflineForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@contoh.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                {/* Kategori Kelas */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">Kategori Kelas <span className="text-red-500">*</span></label>
                  <select
                    value={offlineForm.classCategory}
                    onChange={(e) => handleOfflineCategoryChange(e.target.value as ClassCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="offline">Offline Class</option>
                    <option value="online">Online Class</option>
                  </select>
                </div>

                {/* Program */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">Program <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={offlineForm.programId}
                    onChange={(e) => handleOfflineProgramChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="">-- Pilih Program --</option>
                    {catPrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                {/* Level (offline only) */}
                {offlineForm.classCategory === 'offline' && availLevels.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-700">Level</label>
                    <select
                      value={offlineForm.levelOrPackageId}
                      onChange={(e) => setOfflineForm((p) => ({ ...p, levelOrPackageId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                    >
                      <option value="">-- Pilih Level --</option>
                      {availLevels.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} — {formatRupiah(l.price)}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Periode */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">Periode Pendaftaran <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={offlineForm.periodId}
                    onChange={(e) => setOfflineForm((p) => ({ ...p, periodId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="">-- Pilih Periode --</option>
                    {registrationPeriods.map((per) => (
                      <option key={per.id} value={per.id}>
                        {per.title}{!per.isOpen ? ' (Ditutup)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Pembayaran */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">Status Pembayaran <span className="text-red-500">*</span></label>
                  <select
                    value={offlineForm.paymentStatus}
                    onChange={(e) => setOfflineForm((p) => ({ ...p, paymentStatus: e.target.value as 'Lunas' | 'Belum Bayar' }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="Lunas">Lunas (Sudah Bayar)</option>
                    <option value="Belum Bayar">Belum Bayar</option>
                  </select>
                </div>

                {/* Metode Pembayaran */}
                {offlineForm.paymentStatus === 'Lunas' && (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-700">Metode Pembayaran</label>
                    <input
                      type="text"
                      value={offlineForm.paymentMethodName}
                      onChange={(e) => setOfflineForm((p) => ({ ...p, paymentMethodName: e.target.value }))}
                      placeholder="Tunai di Kantor (Cash)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                )}

                {/* Kode Promo */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">Kode Promo (opsional)</label>
                  <input
                    type="text"
                    value={offlineForm.promoCode}
                    onChange={(e) => setOfflineForm((p) => ({ ...p, promoCode: e.target.value }))}
                    placeholder="Misal: ELITE20"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                {/* Harga Custom */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">
                    Harga Final (opsional override)
                    <span className="ml-1 text-slate-400 font-normal">— kosongkan = harga standar</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={offlineForm.customFinalPrice}
                    onChange={(e) => setOfflineForm((p) => ({ ...p, customFinalPrice: e.target.value }))}
                    placeholder={String(basePrice)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                {/* Catatan */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1 text-slate-700">Catatan Admin</label>
                  <textarea
                    rows={2}
                    value={offlineForm.notes}
                    onChange={(e) => setOfflineForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
              </div>

              {/* Ringkasan Harga */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Program:</span>
                  <span className="font-semibold text-slate-800">{selProg?.title ?? '-'}{selLevel ? ` — ${selLevel.name}` : ''}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Harga Dasar:</span>
                  <span className="tabular-nums">{formatRupiah(basePrice)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#0D213F] border-t border-slate-200 pt-1 mt-1">
                  <span>Total Dibayar:</span>
                  <span className="tabular-nums text-lg">{formatRupiah(displayPrice)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOfflineModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#0D213F] hover:bg-[#0F766E] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : '✓ Daftarkan Sekarang'}
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* MODAL HASIL PENDAFTARAN OFFLINE */}
      {createdOfflineResult && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-display font-bold text-xl text-[#0D213F]">Pendaftaran Berhasil!</h3>
              <p className="text-sm text-slate-600">
                {createdOfflineResult.enrollment.participantName} telah berhasil didaftarkan.
                Berikan kode dan PIN berikut kepada peserta.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Kode Pendaftaran</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-lg text-[#0D213F]">
                    {createdOfflineResult.enrollment.registrationCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(createdOfflineResult.enrollment.registrationCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="p-1.5 rounded-lg text-[#0F766E] hover:bg-teal-50 transition-colors"
                    title="Salin kode"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-600 mb-1 font-semibold">PIN Tracking (Rahasia — berikan ke peserta)</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-2xl tracking-widest text-amber-700">
                    {createdOfflineResult.trackingPin}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(createdOfflineResult.trackingPin);
                      setCopiedPin(true);
                      setTimeout(() => setCopiedPin(false), 2000);
                    }}
                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                    title="Salin PIN"
                  >
                    {copiedPin ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-500">Program</p>
                  <p className="font-semibold text-slate-800">{createdOfflineResult.enrollment.programName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-500">Total</p>
                  <p className="font-semibold text-slate-800">{formatRupiah(createdOfflineResult.enrollment.finalPrice)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-500">Status</p>
                  <p className="font-semibold text-slate-800">{createdOfflineResult.enrollment.enrollmentStatus}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-500">Bayar</p>
                  <p className="font-semibold text-slate-800">{createdOfflineResult.enrollment.paymentStatus}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreatedOfflineResult(null)}
              className="w-full py-2.5 rounded-xl bg-[#0D213F] hover:bg-[#0F766E] text-white text-sm font-semibold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* MODAL CETAK INVOICE / BUKTI PEMBAYARAN */}
      {invoiceEnrollment && (() => {
        const enr = invoiceEnrollment;
        const relPayment = payments.find((p) => p.enrollmentId === enr.id);
        const isLunas = enr.paymentStatus === 'Berhasil' || relPayment?.status === 'Berhasil';

        return (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #invoice-printable, #invoice-printable * {
                  visibility: visible;
                }
                #invoice-printable {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 24px;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>
            <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl overflow-hidden print:shadow-none print:my-0">
              {/* Header Action Buttons (hidden on print) */}
              <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between no-print">
                <span className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#0F766E]" />
                  <span>Pratinjau Invoice / Bukti Pembayaran</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D9488] transition-colors shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak / Simpan PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceEnrollment(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Container */}
              <div id="invoice-printable" className="p-8 space-y-6 text-slate-800 bg-white">
                {/* Header Lembaga */}
                <div className="flex justify-between items-start border-b-2 border-[#0D213F] pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#0D213F] text-white flex items-center justify-center font-bold text-base shadow-xs">
                        E
                      </div>
                      <div>
                        <h1 className="font-display text-xl font-bold tracking-tight text-[#0D213F]">
                          ELITE COURSE
                        </h1>
                        <p className="text-[11px] font-semibold text-[#0F766E]">English Learning Institute</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 pt-1">
                      Jl. Brawijaya, Tulungrejo, Kampung Inggris Pare, Kediri, Jawa Timur 64212
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Izin FKB: 378/SR/PI/SK/FKB/II/2022 · WA: 0856-5080-9091
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-[#0D213F] text-xs font-bold uppercase tracking-wider rounded">
                      INVOICE PENDAFTARAN
                    </span>
                    <p className="font-mono text-sm font-bold text-[#0D213F]">
                      {enr.registrationCode}
                    </p>
                    <p className="text-xs text-slate-500">
                      Tanggal: {formatDateTimeID(enr.createdAt)}
                    </p>
                    <div className="pt-1">
                      {isLunas ? (
                        <span className="inline-block px-3 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ LUNAS
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          BELUM LUNAS
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Data Peserta & Program */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-[#0D213F] uppercase tracking-wider text-[11px]">
                      Data Peserta
                    </p>
                    <p className="text-sm font-bold text-slate-900">{enr.participantName}</p>
                    <p className="text-slate-600">WhatsApp: <span className="font-mono font-medium text-slate-900">{enr.whatsappNumber}</span></p>
                    {enr.email && <p className="text-slate-600">Email: {enr.email}</p>}
                    <p className="text-slate-600">
                      Metode Bayar: <span className="font-semibold text-slate-900">{relPayment?.paymentMethodName || enr.adminNote || 'Tunai / Transfer'}</span>
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-[#0D213F] uppercase tracking-wider text-[11px]">
                      Detail Program Kursus
                    </p>
                    <p className="text-sm font-bold text-slate-900">{enr.programName}</p>
                    {enr.levelOrPackageName && (
                      <p className="text-slate-600">Level: <span className="font-semibold text-slate-900">{enr.levelOrPackageName}</span></p>
                    )}
                    <p className="text-slate-600">
                      Kategori: <span className="font-medium text-slate-900">{enr.classCategory === 'offline' ? 'Offline Class (Tatap Muka)' : 'Online Class'}</span>
                    </p>
                    <p className="text-slate-600">Periode: <span className="font-medium text-slate-900">{enr.periodTitle || '-'}</span></p>
                  </div>
                </div>

                {/* Tabel Rincian Biaya */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0D213F] text-white">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Deskripsi Program & Layanan</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Biaya Satuan</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{enr.programName}</p>
                          <p className="text-slate-500 text-[11px]">
                            {enr.levelOrPackageName ? `Paket Level: ${enr.levelOrPackageName}` : 'Pendaftaran Kelas'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                          {formatRupiah(enr.basePrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-800">
                          {formatRupiah(enr.basePrice)}
                        </td>
                      </tr>
                      {enr.discountAmount > 0 && (
                        <tr className="bg-rose-50/50">
                          <td className="px-4 py-2.5 text-rose-700 font-medium">
                            Potongan Diskon / Kode Promo {enr.promoCodeApplied ? `(${enr.promoCodeApplied})` : ''}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-rose-700">-</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-rose-700">
                            -{formatRupiah(enr.discountAmount)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right text-slate-700">
                          Total Pembayaran:
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-[#0F766E] font-bold">
                          {formatRupiah(enr.finalPrice)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Footer Notes & Tanda Tangan */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 items-end">
                  <div className="space-y-1 text-[11px] text-slate-500">
                    <p className="font-bold text-slate-700">Catatan & Ketentuan:</p>
                    <p>1. Simpan invoice ini sebagai tanda bukti sah pendaftaran di ELITE Course.</p>
                    <p>2. Konfirmasi jadwal kelas dan asrama diinformasikan via WhatsApp resmi.</p>
                    <p>3. Biaya yang telah dibayarkan tidak dapat ditarik kembali sesuai ketentuan.</p>
                  </div>

                  <div className="text-right space-y-10">
                    <div>
                      <p className="text-xs text-slate-500">
                        Pare, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs font-semibold text-[#0D213F]">ELITE Course Official</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 border-t border-slate-300 pt-1 inline-block min-w-[140px] text-center">
                        Bagian Administrasi
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (hidden on print) */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 no-print">
                <button
                  type="button"
                  onClick={() => setInvoiceEnrollment(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-100"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold hover:bg-[#0F766E] transition-colors shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Invoice</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DELETE CONFIRMATION */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-[#0D213F]">Konfirmasi Hapus</h3>
            <p className="text-sm text-slate-600">
              Yakin ingin menghapus <span className="font-semibold">{confirmDelete.label}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
