import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  CreditCard,
  FileCheck2,
  Lock,
  Search,
  UploadCloud,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useSiteData } from '../contexts/SiteDataContext';
import { uploadFileToStorage } from '../lib/apiService';
import { formatFileSize, formatRupiah } from '../lib/format';
import { TrackingRecord } from '../types/elite';

interface LookupResponse extends TrackingRecord {
  trackingKeyHash: string;
}

const ALLOWED_PROOF_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function TrackingPaymentPage() {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { paymentMethods, siteSettings } = useSiteData();

  const [code, setCode] = useState(searchParams.get('code') || '');
  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [record, setRecord] = useState<LookupResponse | null>(null);

  // Payment form state
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [transferTime, setTransferTime] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingPayment, setUploadingPayment] = useState(false);
  const [paymentSubmittedMsg, setPaymentSubmittedMsg] = useState<string | null>(null);

  const performLookup = async (regCode: string, regPin: string) => {
    setSearching(true);
    setLookupError(null);
    setPaymentSubmittedMsg(null);
    try {
      const res = await fetch('/api/tracking/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationCode: regCode.trim().toUpperCase(),
          trackingPin: regPin.trim(),
        }),
      });
      const data = (await res.json()) as LookupResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Data pendaftaran tidak ditemukan.');
      }
      setRecord(data);
      setTransferAmount(String(data.finalPrice || ''));
    } catch (err) {
      setRecord(null);
      setLookupError(err instanceof Error ? err.message : 'Gagal memeriksa status.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const qCode = searchParams.get('code');
    const qPin = searchParams.get('pin');
    if (qCode && qPin) {
      void performLookup(qCode, qPin);
    }
  }, [searchParams]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethodId) {
      setSelectedMethodId(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedMethodId]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performLookup(code, pin);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_PROOF_MIMES.includes(file.type)) {
      showToast('error', 'Format file harus JPG, JPEG, PNG, WEBP, atau PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Ukuran bukti pembayaran maksimal 10 MB.');
      return;
    }
    setProofFile(file);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    if (!selectedMethodId) {
      showToast('error', 'Pilih metode pembayaran terlebih dahulu.');
      return;
    }
    if (!proofFile) {
      showToast('error', 'Silakan unggah bukti pembayaran terlebih dahulu.');
      return;
    }

    setUploadingPayment(true);
    try {
      const uploaded = await uploadFileToStorage({
        file: proofFile,
        folder: 'payment-proofs',
        subFolder: record.trackingKeyHash,
        maxBytes: 10 * 1024 * 1024,
        allowedMimeTypes: ALLOWED_PROOF_MIMES,
      });

      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationCode: record.registrationCode,
          trackingPin: pin.trim(),
          paymentMethodId: selectedMethodId,
          senderName: senderName.trim(),
          transferTime: transferTime.trim(),
          referenceNumber: referenceNumber.trim(),
          transferAmount: Number(transferAmount),
          proofFilePath: uploaded.path,
          proofFileName: proofFile.name,
          proofMimeType: proofFile.type,
          proofFileSize: proofFile.size,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim konfirmasi pembayaran.');
      }

      setPaymentSubmittedMsg(
        data.message || 'Konfirmasi pembayaran diterima dan menunggu verifikasi admin.'
      );
      showToast('success', 'Bukti pembayaran berhasil dikirim.');
      setProofFile(null);
      await performLookup(record.registrationCode, pin);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengirim pembayaran.');
    } finally {
      setUploadingPayment(false);
    }
  };

  const copyAccount = (val: string) => {
    void navigator.clipboard.writeText(val);
    showToast('success', 'Nomor rekening/akun disalin.');
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-12 lg:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold text-[#0F766E] uppercase tracking-wider">
            Pelacakan & Pembayaran
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0D213F]">
            Cek Status Pendaftaran & Konfirmasi Pembayaran
          </h1>
          <p className="text-sm text-slate-600">
            Masukkan Kode Pendaftaran dan PIN pelacakan rahasia Anda. Demi privasi, informasi pribadi lain tidak ditampilkan di halaman publik.
          </p>
        </div>

        {/* Lookup Card */}
        <form
          onSubmit={handleLookupSubmit}
          autoComplete="off"
          className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="flex-1 min-w-0">
            <label htmlFor="track-code" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kode Pendaftaran
            </label>
            <input
              id="track-code"
              name="tracking_code"
              type="text"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: ELT-2611-A1B2C3"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm uppercase focus:outline-none focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/30"
            />
          </div>

          <div className="w-full md:w-44">
            <label htmlFor="track-pin" className="block text-xs font-semibold text-slate-700 mb-1.5">
              PIN Pelacakan (6 Digit)
            </label>
            <input
              id="track-pin"
              name="tracking_pin"
              type="password"
              autoComplete="new-password"
              data-1p-ignore="true"
              data-lpignore="true"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN rahasia"
              required
              maxLength={6}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/30"
            />
          </div>

          <div className="w-full md:w-auto md:shrink-0">
            <button
              type="submit"
              disabled={searching}
              className="w-full md:w-auto py-2.5 px-5 rounded-xl bg-[#0D213F] text-white text-sm font-semibold hover:bg-[#15325C] disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              <span>{searching ? 'Mencari...' : 'Periksa Status'}</span>
            </button>
          </div>
        </form>

        {lookupError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {record && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Status Ringkas */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-500">Kode Pendaftaran</p>
                  <p className="font-mono text-lg font-bold text-[#0D213F]">
                    {record.registrationCode}
                  </p>
                </div>
                <Lock className="w-4 h-4 text-[#0F766E]" />
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Peserta</span>
                  <span className="font-medium text-slate-800">{record.participantMaskedName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Program</span>
                  <span className="font-semibold text-[#0D213F] text-right">
                    {record.programName}
                    {record.levelOrPackageName && record.classCategory === 'offline'
                      ? ` (${record.levelOrPackageName})`
                      : ''}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Periode</span>
                  <span className="font-medium text-slate-800">{record.periodTitle}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Status Pendaftaran</span>
                  <span className="font-semibold text-[#0D213F]">{record.enrollmentStatus}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Status Pembayaran</span>
                  <span className="font-semibold text-[#0F766E]">{record.paymentStatus}</span>
                </div>
                {record.adminNote && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <span className="font-semibold block">Catatan Admin:</span>
                    {record.adminNote}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Biaya Program</span>
                  <span className="font-mono tabular-nums">{formatRupiah(record.basePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Diskon</span>
                  <span className="font-mono text-[#0F766E] tabular-nums">
                    -{formatRupiah(record.discountAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                  <span className="font-semibold text-[#0D213F]">Total Tagihan</span>
                  <span className="font-display text-xl font-bold text-[#0D213F] tabular-nums">
                    {formatRupiah(record.finalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Instructions & Proof Upload */}
            <div className="lg:col-span-7 space-y-6">
              {/* Official Methods */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0F766E]" />
                  <h2 className="font-display text-lg font-bold text-[#0D213F]">
                    Rekening & Metode Pembayaran Resmi
                  </h2>
                </div>

                {paymentMethods.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 space-y-1">
                    <p className="font-semibold">Metode Pembayaran Belum Diaktifkan Admin</p>
                    <p className="text-xs leading-relaxed">
                      Saat ini belum ada rekening bank atau e-wallet yang ditambahkan melalui dashboard admin. Silakan hubungi WhatsApp resmi {siteSettings.phone} sebelum melakukan transfer.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentMethods.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMethodId(m.id)}
                        className={`cursor-pointer p-4 rounded-xl border transition-colors space-y-2 ${
                          selectedMethodId === m.id
                            ? 'border-[#0F766E] bg-teal-50/40'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#0F766E]">
                            {m.category} · {m.bankOrWalletName}
                          </span>
                          {m.logoUrl && (
                            <img
                              src={m.logoUrl}
                              alt={m.bankOrWalletName}
                              referrerPolicy="no-referrer"
                              className="h-5 w-auto object-contain"
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm font-bold text-[#0D213F] tabular-nums">
                            {m.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyAccount(m.accountNumber);
                            }}
                            aria-label="Salin nomor rekening"
                            className="p-1 rounded hover:bg-slate-200/70 text-slate-600"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-600">a.n. {m.accountHolderName}</p>
                        {m.instructions && (
                          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                            {m.instructions}
                          </p>
                        )}
                        {m.qrImageUrl && (
                          <img
                            src={m.qrImageUrl}
                            alt={`QR ${m.bankOrWalletName}`}
                            referrerPolicy="no-referrer"
                            className="w-28 h-28 object-contain rounded border border-slate-200 mt-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Confirmation Form */}
              {paymentMethods.length > 0 && record.paymentStatus !== 'Berhasil' && (
                <form
                  onSubmit={handlePaymentSubmit}
                  className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
                >
                  <h3 className="font-display text-lg font-bold text-[#0D213F]">
                    Formulir Konfirmasi Pembayaran
                  </h3>

                  {paymentSubmittedMsg && (
                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-sm text-[#0F766E] flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{paymentSubmittedMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Metode Transfer <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={selectedMethodId}
                        onChange={(e) => setSelectedMethodId(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                      >
                        {paymentMethods.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.category} — {m.bankOrWalletName} ({m.accountNumber})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Nama Pengirim <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Nama pemilik rekening pengirim"
                        required
                        maxLength={120}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Waktu Transfer <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={transferTime}
                        onChange={(e) => setTransferTime(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Nominal Transfer (Rp) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tabular-nums"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Nomor Referensi Transfer (Opsional)
                      </label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="Kode referensi / berita transfer jika ada"
                        maxLength={100}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Unggah Bukti Pembayaran (JPG, JPEG, PNG, WEBP, PDF · Maks 10 MB){' '}
                        <span className="text-red-600">*</span>
                      </label>
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-[#0F766E] cursor-pointer transition-colors">
                        <UploadCloud className="w-6 h-6 text-[#0F766E] mb-2" />
                        <span className="text-sm font-medium text-slate-700">
                          {proofFile ? proofFile.name : 'Pilih file bukti transfer'}
                        </span>
                        <span className="text-xs text-slate-500 mt-1">
                          {proofFile
                            ? `${formatFileSize(proofFile.size)} · Siap dikirim privat`
                            : 'File disimpan secara privat dan hanya dapat diakses admin'}
                        </span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingPayment}
                    className="w-full py-3.5 px-5 rounded-xl bg-[#0F766E] text-white font-semibold text-sm hover:bg-[#0D9488] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {uploadingPayment
                        ? 'Mengunggah & Mengirim Konfirmasi...'
                        : 'Kirim Konfirmasi Pembayaran'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
