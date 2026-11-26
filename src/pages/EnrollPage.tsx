import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Tag,
  Users,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useSiteData } from '../contexts/SiteDataContext';
import { formatRupiah } from '../lib/format';
import { ClassCategory, GroupMemberInput, PriceQuoteResult } from '../types/elite';

interface EnrollmentSuccessPayload {
  enrollmentId: string;
  registrationCode: string;
  trackingPin: string;
  classCategory: ClassCategory;
  programName: string;
  levelOrPackageName?: string;
  periodTitle: string;
  participantName: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  billingNote?: string;
  enrollmentStatus: string;
  paymentStatus: string;
}

export function EnrollPage() {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { programs, programLevels, registrationPeriods, isSeededInFirestore } = useSiteData();

  const initialCat = searchParams.get('category') === 'online' ? 'online' : 'offline';
  const initialProg = searchParams.get('program') || '';
  const initialLevel = searchParams.get('level') || '';
  const initialPeriod = searchParams.get('period') || searchParams.get('periode') || '';

  const [classCategory, setClassCategory] = useState<ClassCategory>(initialCat);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(initialProg);
  const [selectedLevelId, setSelectedLevelId] = useState<string>(initialLevel);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(initialPeriod);

  const [participantName, setParticipantName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [groupMembers, setGroupMembers] = useState<GroupMemberInput[]>([]);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [quote, setQuote] = useState<PriceQuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<EnrollmentSuccessPayload | null>(null);

  const availablePrograms = useMemo(
    () =>
      programs.filter(
        (p) => p.category === classCategory && p.isActive && !p.isDraftIncomplete
      ),
    [programs, classCategory]
  );

  const selectedProgram = useMemo(
    () => availablePrograms.find((p) => p.id === selectedProgramId) || null,
    [availablePrograms, selectedProgramId]
  );

  const availableLevels = useMemo(() => {
    if (classCategory !== 'offline' || !selectedProgramId) return [];
    return programLevels.filter((l) => l.programId === selectedProgramId && l.isActive);
  }, [classCategory, selectedProgramId, programLevels]);

  const availablePeriods = useMemo(
    () =>
      registrationPeriods.filter((period) => {
        if (!period.isActive) return false;
        if (
          selectedProgramId &&
          Array.isArray(period.programIds) &&
          period.programIds.length > 0 &&
          !period.programIds.includes(selectedProgramId)
        ) {
          return false;
        }
        return true;
      }),
    [registrationPeriods, selectedProgramId]
  );

  // Sync default program when category changes
  useEffect(() => {
    if (availablePrograms.length === 0) {
      setSelectedProgramId('');
      return;
    }
    if (!availablePrograms.some((p) => p.id === selectedProgramId)) {
      setSelectedProgramId(availablePrograms[0].id);
    }
  }, [availablePrograms, selectedProgramId]);

  // Sync default level when program changes
  useEffect(() => {
    if (classCategory !== 'offline') {
      setSelectedLevelId('');
      return;
    }
    if (availableLevels.length === 0) {
      setSelectedLevelId('');
      return;
    }
    if (!availableLevels.some((l) => l.id === selectedLevelId)) {
      setSelectedLevelId(availableLevels[0].id);
    }
  }, [classCategory, availableLevels, selectedLevelId]);

  // Sync default open period
  useEffect(() => {
    const firstOpen = availablePeriods.find(
      (p) => p.isOpen && (p.quota === 0 || p.enrolledCount < p.quota)
    );
    if (!availablePeriods.some((p) => p.id === selectedPeriodId)) {
      setSelectedPeriodId(firstOpen?.id || '');
    }
  }, [availablePeriods, selectedPeriodId]);

  // Adjust group member fields for online packages > 1 student
  useEffect(() => {
    if (classCategory === 'online' && selectedProgram && (selectedProgram.studentCapacity || 1) > 1) {
      const extraSlots = Math.max(0, (selectedProgram.studentCapacity || 1) - 1);
      setGroupMembers((prev) => {
        const next: GroupMemberInput[] = [];
        for (let i = 0; i < extraSlots; i++) {
          next.push(prev[i] || { name: '', whatsappNumber: '' });
        }
        return next;
      });
    } else {
      setGroupMembers([]);
    }
  }, [classCategory, selectedProgram]);

  // Fetch authoritative server quote whenever selection or applied promo changes
  useEffect(() => {
    if (!selectedProgramId || !isSeededInFirestore) {
      if (selectedProgram) {
        const lvl = availableLevels.find((l) => l.id === selectedLevelId);
        const fallbackPrice = lvl ? lvl.price : selectedProgram.basePrice;
        setQuote({
          programId: selectedProgram.id,
          programName: selectedProgram.title,
          levelOrPackageId: lvl?.id,
          levelOrPackageName: lvl?.name,
          basePrice: fallbackPrice,
          discountAmount: 0,
          finalPrice: fallbackPrice,
          discountApplied: null,
        });
      }
      return;
    }

    let cancelled = false;
    async function loadQuote() {
      setQuoteLoading(true);
      try {
        const res = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programId: selectedProgramId,
            levelOrPackageId: classCategory === 'offline' ? selectedLevelId : undefined,
            promoCode: appliedPromoCode || undefined,
          }),
        });
        const data = (await res.json()) as PriceQuoteResult & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          // If previous promo is not valid for new program selection, revert promo gracefully
          if (appliedPromoCode) {
            setAppliedPromoCode('');
            setPromoInput('');
            setPromoError(data.error || 'Kode promo tidak berlaku untuk program ini.');
            // Re-fetch base price without promo
            const fallbackRes = await fetch('/api/pricing/calculate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                programId: selectedProgramId,
                levelOrPackageId: classCategory === 'offline' ? selectedLevelId : undefined,
              }),
            });
            if (fallbackRes.ok && !cancelled) {
              setQuote((await fallbackRes.json()) as PriceQuoteResult);
            }
          }
          return;
        }
        setQuote(data);
      } catch {
        // Silent fallback if network hiccups
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }
    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [
    selectedProgramId,
    selectedLevelId,
    classCategory,
    appliedPromoCode,
    isSeededInFirestore,
    selectedProgram,
    availableLevels,
  ]);

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (!selectedProgramId) {
      setPromoError('Pilih program terlebih dahulu sebelum menerapkan promo.');
      return;
    }

    setQuoteLoading(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: selectedProgramId,
          levelOrPackageId: classCategory === 'offline' ? selectedLevelId : undefined,
          promoCode: code,
        }),
      });
      const data = (await res.json()) as PriceQuoteResult & { error?: string };
      if (!res.ok) {
        const errMsg = data.error || 'Kode promo tidak berlaku atau tidak ditemukan.';
        setPromoError(errMsg);
        setAppliedPromoCode('');
        showToast('error', errMsg);
        return;
      }
      setQuote(data);
      setAppliedPromoCode(code);
      setPromoError(null);
      showToast(
        'success',
        `Kode promo "${data.discountApplied?.name || code}" berhasil digunakan! Potongan: ${formatRupiah(data.discountAmount || 0)}`
      );
    } catch {
      const errMsg = 'Gagal menghubungi server untuk memvalidasi kode promo.';
      setPromoError(errMsg);
      showToast('error', errMsg);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleRemovePromo = async () => {
    setPromoInput('');
    setAppliedPromoCode('');
    setPromoError(null);
    if (!selectedProgramId) return;

    setQuoteLoading(true);
    try {
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: selectedProgramId,
          levelOrPackageId: classCategory === 'offline' ? selectedLevelId : undefined,
        }),
      });
      const data = (await res.json()) as PriceQuoteResult;
      if (res.ok) {
        setQuote(data);
        showToast('success', 'Kode promo telah dihapus.');
      }
    } catch {
      // fallback
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (participantName.trim().length < 2) {
      setSubmitError('Nama lengkap peserta wajib diisi.');
      return;
    }
    if (whatsappNumber.trim().length < 8) {
      setSubmitError('Nomor WhatsApp aktif wajib diisi.');
      return;
    }
    if (!selectedProgramId || !selectedPeriodId) {
      setSubmitError('Program dan periode pendaftaran wajib dipilih.');
      return;
    }
    if (!privacyConsent) {
      setSubmitError('Harap centang persetujuan privasi data pendaftaran terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: participantName.trim(),
          whatsappNumber: whatsappNumber.trim(),
          email: email.trim(),
          programId: selectedProgramId,
          levelOrPackageId: classCategory === 'offline' ? selectedLevelId : undefined,
          periodId: selectedPeriodId,
          promoCode: appliedPromoCode || undefined,
          groupMembers,
          notes: notes.trim(),
          privacyConsentAccepted: privacyConsent,
        }),
      });
      const data = (await res.json()) as EnrollmentSuccessPayload & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim formulir pendaftaran.');
      }
      setSuccessData(data);
      showToast('success', 'Pendaftaran berhasil! Simpan Kode Pendaftaran dan PIN Anda.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      setSubmitError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    showToast('success', `${label} disalin.`);
  };

  if (successData) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 space-y-6">
          <div className="flex items-center gap-3 text-[#0F766E]">
            <CheckCircle2 className="w-8 h-8 shrink-0" />
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0D213F]">
                Pendaftaran Berhasil Dicatat
              </h1>
              <p className="text-sm text-slate-600">
                Simpan kode pendaftaran dan PIN pelacakan rahasia berikut untuk pembayaran dan pengecekan status.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0D213F] text-white space-y-1">
              <p className="text-xs text-slate-300">Kode Pendaftaran</p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold tracking-wide">
                  {successData.registrationCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(successData.registrationCode, 'Kode pendaftaran')}
                  aria-label="Salin kode pendaftaran"
                  className="p-1.5 rounded bg-white/10 hover:bg-white/20"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <p className="text-xs font-medium text-amber-800">PIN Pelacakan Rahasia</p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold text-[#0D213F] tracking-widest">
                  {successData.trackingPin}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(successData.trackingPin, 'PIN pelacakan')}
                  aria-label="Salin PIN pelacakan"
                  className="p-1.5 rounded bg-amber-200/70 hover:bg-amber-200 text-[#0D213F]"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Nama Peserta</span>
              <span className="font-semibold text-[#0D213F]">{successData.participantName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Program</span>
              <span className="font-semibold text-[#0D213F]">
                {successData.programName}
                {successData.levelOrPackageName && successData.classCategory === 'offline'
                  ? ` — ${successData.levelOrPackageName}`
                  : ''}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Periode</span>
              <span className="font-medium text-slate-800">{successData.periodTitle}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Status Pendaftaran</span>
              <span className="font-semibold text-amber-700">{successData.enrollmentStatus}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between gap-4 items-baseline">
              <span className="font-semibold text-[#0D213F]">Total Biaya</span>
              <span className="font-display text-xl font-bold text-[#0F766E] tabular-nums">
                {formatRupiah(successData.finalPrice)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to={`/cek-status?code=${encodeURIComponent(successData.registrationCode)}&pin=${encodeURIComponent(successData.trackingPin)}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors"
            >
              <span>Lanjut ke Instruksi & Konfirmasi Pembayaran</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 text-center hover:bg-slate-50"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-12 lg:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold text-[#0F766E] uppercase tracking-wider">
            Pendaftaran Peserta
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0D213F]">
            Formulir Pendaftaran ELITE Course
          </h1>
          <p className="text-sm text-slate-600">
            Isi data di bawah ini tanpa perlu membuat akun. Kalkulasi biaya dan validasi promo diproses langsung oleh server.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Fields */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Step 1: Class Category */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#0D213F]">
                1. Jenis Kelas <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setClassCategory('offline')}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    classCategory === 'offline'
                      ? 'border-[#0D213F] bg-[#0D213F]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-display font-bold text-sm text-[#0D213F]">Offline Class</p>
                  <p className="text-xs text-slate-500 mt-0.5">Tatap muka di Pare, Kediri</p>
                </button>
                <button
                  type="button"
                  onClick={() => setClassCategory('online')}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    classCategory === 'online'
                      ? 'border-[#0D213F] bg-[#0D213F]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-display font-bold text-sm text-[#0D213F]">Online Class</p>
                  <p className="text-xs text-slate-500 mt-0.5">Live interaktif 10 pertemuan</p>
                </button>
              </div>
            </div>

            {/* Step 2: Program & Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={classCategory === 'online' ? 'sm:col-span-2' : ''}>
                <label
                  htmlFor="program-select"
                  className="block text-sm font-semibold text-[#0D213F] mb-1.5"
                >
                  2. Program / Paket Pilihan <span className="text-red-600">*</span>
                </label>
                <select
                  id="program-select"
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:border-[#0F766E]"
                  required
                >
                  {availablePrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {classCategory === 'offline' && (
                <div>
                  <label
                    htmlFor="level-select"
                    className="block text-sm font-semibold text-[#0D213F] mb-1.5"
                  >
                    3. Level Pilihan <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="level-select"
                    value={selectedLevelId}
                    onChange={(e) => setSelectedLevelId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:border-[#0F766E]"
                    required={availableLevels.length > 0}
                  >
                    {availableLevels.length === 0 ? (
                      <option value="">Umum</option>
                    ) : (
                      availableLevels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* Step 3: Registration Period */}
            <div>
              <label
                htmlFor="period-select"
                className="block text-sm font-semibold text-[#0D213F] mb-1.5"
              >
                {classCategory === 'offline' ? '4.' : '3.'} Periode Pendaftaran <span className="text-red-600">*</span>
              </label>
              <select
                id="period-select"
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:border-[#0F766E]"
                required
              >
                <option value="">-- Pilih Periode Pendaftaran --</option>
                {availablePeriods.map((period) => {
                  const full = period.quota > 0 && period.enrolledCount >= period.quota;
                  const disabled = !period.isOpen || full;
                  return (
                    <option key={period.id} value={period.id} disabled={disabled}>
                      {period.title}
                      {period.startDate && period.endDate
                        ? ` (${period.startDate} s.d. ${period.endDate})`
                        : ''}
                      {!period.isOpen ? ' — Ditutup' : full ? ' — Kuota Penuh' : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Periode standar tersedia tanggal 10 dan tanggal 25 setiap bulan sesuai pembukaan resmi admin.
              </p>
            </div>

            {/* Step 4: Participant Info */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              <h2 className="font-display text-base font-bold text-[#0D213F]">
                Data Diri Peserta Utama
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="participant-name"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Nama Lengkap Peserta <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="participant-name"
                    type="text"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="Contoh: Ahmad Pratama"
                    maxLength={120}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="participant-wa"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Nomor WhatsApp <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="participant-wa"
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    maxLength={30}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="participant-email"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Email (Opsional)
                  </label>
                  <input
                    id="participant-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    maxLength={120}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
              </div>

              {/* Group Member Fields for Online Group Packages */}
              {groupMembers.length > 0 && (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0D213F]">
                    <Users className="w-4 h-4 text-[#0F766E]" />
                    <span>
                      Data Anggota Kelompok ({groupMembers.length} peserta tambahan sesuai kapasitas paket)
                    </span>
                  </div>
                  {groupMembers.map((member, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => {
                          const next = [...groupMembers];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setGroupMembers(next);
                        }}
                        placeholder={`Nama Anggota ${idx + 2} (opsional jika belum lengkap)`}
                        maxLength={120}
                        className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                      />
                      <input
                        type="tel"
                        value={member.whatsappNumber || ''}
                        onChange={(e) => {
                          const next = [...groupMembers];
                          next[idx] = { ...next[idx], whatsappNumber: e.target.value };
                          setGroupMembers(next);
                        }}
                        placeholder={`WhatsApp Anggota ${idx + 2}`}
                        maxLength={30}
                        className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label
                  htmlFor="participant-notes"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Keterangan Tambahan (Opsional)
                </label>
                <textarea
                  id="participant-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Contoh: Fokus materi Speaking / jadwal yang diinginkan untuk kelas online..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                />
              </div>
            </div>

            {/* Privacy Consent */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                  required
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  Saya menyetujui data pendaftaran ini disimpan secara privat oleh ELITE Course untuk keperluan administrasi kelas dan verifikasi pembayaran, serta tidak dipublikasikan tanpa izin saya.
                </span>
              </label>
            </div>

            {submitError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}
          </div>

          {/* Summary & Promo Sidebar */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <h2 className="font-display text-lg font-bold text-[#0D213F]">
                Ringkasan Pilihan & Biaya
              </h2>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Jenis Kelas</span>
                  <span className="font-medium text-[#0D213F]">
                    {classCategory === 'offline' ? 'Offline Class' : 'Online Class'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Program</span>
                  <span className="font-semibold text-[#0D213F] text-right">
                    {quote?.programName || selectedProgram?.title || '-'}
                  </span>
                </div>
                {classCategory === 'offline' && quote?.levelOrPackageName && (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Level</span>
                    <span className="font-medium text-slate-800">{quote.levelOrPackageName}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Periode</span>
                  <span className="font-medium text-slate-800">
                    {availablePeriods.find((p) => p.id === selectedPeriodId)?.title || '-'}
                  </span>
                </div>
              </div>

              {/* Promo Code */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <label htmlFor="promo-code" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Kode Promo (Opsional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo-code"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleApplyPromo();
                      }
                    }}
                    placeholder="Contoh: KEMERDEKAAN"
                    maxLength={40}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:border-[#0F766E]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleApplyPromo()}
                    disabled={quoteLoading || !promoInput.trim()}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {quoteLoading ? 'Memeriksa...' : 'Terapkan'}
                  </button>
                </div>
                {promoError && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                    {promoError}
                  </p>
                )}
                {quote?.discountApplied && (
                  <div className="flex items-center justify-between text-xs text-[#0F766E] font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                    <span>
                      {quote.discountApplied.code ? (
                        <>
                          Kupon promo aktif: <strong>{quote.discountApplied.name}</strong> ({quote.discountApplied.code})
                        </>
                      ) : (
                        <>
                          Diskon otomatis: <strong>{quote.discountApplied.name}</strong> (-{formatRupiah(quote.discountAmount)})
                        </>
                      )}
                    </span>
                    {quote.discountApplied.code ? (
                      <button
                        type="button"
                        onClick={() => void handleRemovePromo()}
                        className="underline text-slate-600 hover:text-slate-900 font-semibold ml-2"
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="pt-4 border-t border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Harga Program</span>
                  <span className="font-mono text-slate-800 tabular-nums">
                    {formatRupiah(quote?.basePrice ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Potongan Diskon</span>
                  <span className="font-mono text-[#0F766E] tabular-nums">
                    -{formatRupiah(quote?.discountAmount ?? 0)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-semibold text-[#0D213F]">Total Pembayaran</span>
                  <span className="font-display text-2xl font-bold text-[#0D213F] tabular-nums">
                    {quoteLoading ? 'Menghitung...' : formatRupiah(quote?.finalPrice ?? 0)}
                  </span>
                </div>
                {quote?.billingNote && (
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">{quote.billingNote}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-5 rounded-xl bg-[#0D213F] text-white font-semibold text-sm hover:bg-[#15325C] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{submitting ? 'Memproses Pendaftaran...' : 'Kirim Pendaftaran Sekarang'}</span>
              </button>

              <p className="text-xs text-center text-slate-500">
                Sudah mendaftar?{' '}
                <Link to="/cek-status" className="text-[#0F766E] font-semibold hover:underline">
                  Cek Status & Unggah Bukti Pembayaran
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
