import React, { useEffect, useState } from 'react';
import { Camera, Check, Edit2, ExternalLink, Plus, Trash2, Upload, UploadCloud, X } from 'lucide-react';
import { useToast } from '../../components/Toast';
import {
  deleteAdminDocument,
  getAuthorizedFileDownloadUrl,
  logAdminActivity,
  saveAdminDocument,
  uploadFileToStorage,
} from '../../lib/apiService';
import { formatFileSize, formatRupiah } from '../../lib/format';
import {
  Certificate,
  Discount,
  DiscountType,
  FaqItem,
  GalleryItem,
  Program,
  ProgramLevel,
  ScoreFormat,
  SingleScoreSystem,
  SiteSettings,
  Tutor,
} from '../../types/elite';

interface Props {
  activeSection:
    | 'discounts'
    | 'tutors'
    | 'certificates'
    | 'banner'
    | 'gallery'
    | 'faq'
    | 'settings';
  siteSettings: SiteSettings;
  programs: Program[];
  programLevels?: ProgramLevel[];
  discounts: Discount[];
  tutors: Tutor[];
  certificates: Certificate[];
  galleryItems: GalleryItem[];
  faqs: FaqItem[];
  onRefresh: () => Promise<void>;
}

const CERT_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export function AdminMarketingContentPanel({
  activeSection,
  siteSettings,
  programs,
  programLevels = [],
  discounts,
  tutors,
  certificates,
  galleryItems,
  faqs,
  onRefresh,
}: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  // Settings / Banner form copy
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings);

  useEffect(() => {
    setSettingsForm(siteSettings);
  }, [siteSettings]);

  // Discount modal
  const [editingDiscount, setEditingDiscount] = useState<Partial<Discount> | null>(null);
  const [isNewDiscount, setIsNewDiscount] = useState(false);

  // Tutor modal
  const [editingTutor, setEditingTutor] = useState<Partial<Tutor> | null>(null);
  const [isNewTutor, setIsNewTutor] = useState(false);

  // Certificate modal
  const [editingCert, setEditingCert] = useState<Partial<Certificate> | null>(null);
  const [isNewCert, setIsNewCert] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);

  // Gallery modal
  const [editingGallery, setEditingGallery] = useState<Partial<GalleryItem> | null>(null);
  const [isNewGallery, setIsNewGallery] = useState(false);
  const [uploadingGalleryImages, setUploadingGalleryImages] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [manualPhotoUrl, setManualPhotoUrl] = useState('');

  // FAQ modal
  const [editingFaq, setEditingFaq] = useState<Partial<FaqItem> | null>(null);
  const [isNewFaq, setIsNewFaq] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{
    collection: string;
    id: string;
    label: string;
  } | null>(null);

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
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // SAVE SITE SETTINGS / BANNER
  // =========================================================================
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { id: _id, ...rest } = settingsForm;
      await saveAdminDocument('siteSettings', 'main', { ...rest, isActive: true }, false);
      await logAdminActivity({
        action: 'UPDATE_SITE_SETTINGS',
        entityType: 'siteSettings',
        entityId: 'main',
        summary: 'Memperbarui konten/pengaturan website ELITE Course.',
      });
      showToast('success', 'Perubahan website berhasil disimpan ke database.');
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublicMediaUpload = async (
    file: File,
    onSuccessUrl: (url: string) => void,
    subFolder: string
  ) => {
    try {
      const uploaded = await uploadFileToStorage({
        file,
        folder: 'public-media',
        subFolder,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      });
      onSuccessUrl(uploaded.downloadUrl);
      showToast('success', 'Foto berhasil diunggah ke Storage.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengunggah gambar.');
    }
  };

  // =========================================================================
  // DISCOUNTS
  // =========================================================================
  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiscount || !editingDiscount.name) return;
    const docId = editingDiscount.id || `disc_${Date.now()}`;
    setSaving(true);
    try {
      await saveAdminDocument(
        'discounts',
        docId,
        {
          name: editingDiscount.name.trim(),
          code: (editingDiscount.code || '').trim().toUpperCase(),
          applicableProgramIds: Array.isArray(editingDiscount.applicableProgramIds)
            ? editingDiscount.applicableProgramIds
            : [],
          applicableLevelIds: Array.isArray(editingDiscount.applicableLevelIds)
            ? editingDiscount.applicableLevelIds
            : [],
          discountType: (editingDiscount.discountType || 'percentage') as DiscountType,
          value: Number(editingDiscount.value || 0),
          startDate: editingDiscount.startDate || '',
          endDate: editingDiscount.endDate || '',
          isActive: editingDiscount.isActive !== false,
        },
        isNewDiscount
      );
      showToast('success', 'Promo/diskon berhasil disimpan.');
      setEditingDiscount(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan diskon.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // TUTORS
  // =========================================================================
  const handleSaveTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTutor || !editingTutor.name) return;
    const docId = editingTutor.id || `tutor_${Date.now()}`;
    setSaving(true);
    try {
      await saveAdminDocument(
        'tutors',
        docId,
        {
          name: editingTutor.name.trim(),
          photoUrl: (editingTutor.photoUrl || '').trim(),
          experience: (editingTutor.experience || '').trim(),
          origin: (editingTutor.origin || '').trim(),
          bio: (editingTutor.bio || '').trim(),
          isActive: editingTutor.isActive !== false,
          sortOrder: Number(editingTutor.sortOrder ?? tutors.length + 1),
        },
        isNewTutor
      );
      showToast('success', 'Profil tutor berhasil disimpan.');
      setEditingTutor(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan tutor.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // CERTIFICATES
  // =========================================================================
  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCert || !editingCert.studentName || !editingCert.programName) {
      showToast('error', 'Nama siswa dan program wajib diisi.');
      return;
    }
    const docId = editingCert.id || `cert_${Date.now()}`;
    setSaving(true);
    try {
      let filePath = editingCert.filePath || '';
      let fileUrl = editingCert.fileUrl || '';
      let fileName = editingCert.fileName || '';
      let fileMimeType = editingCert.fileMimeType || '';
      let fileSize = editingCert.fileSize || 0;

      if (certFile) {
        const uploaded = await uploadFileToStorage({
          file: certFile,
          folder: 'certificates',
          subFolder: docId,
          maxBytes: 10 * 1024 * 1024,
          allowedMimeTypes: CERT_ALLOWED_MIMES,
        });
        filePath = uploaded.path;
        fileUrl = editingCert.isPublished ? uploaded.downloadUrl : '';
        fileName = certFile.name;
        fileMimeType = certFile.type;
        fileSize = certFile.size;
      }

      await saveAdminDocument(
        'certificates',
        docId,
        {
          studentName: editingCert.studentName.trim(),
          programName: editingCert.programName.trim(),
          originOrProfession: (editingCert.originOrProfession || '').trim(),
          achievementType: (editingCert.achievementType || 'Kelulusan Program').trim(),
          scoreFormat: (editingCert.scoreFormat || 'single') as ScoreFormat,
          singleScoreSystem: (editingCert.singleScoreSystem || '') as SingleScoreSystem,
          singleScoreValue: (editingCert.singleScoreValue || '').trim(),
          detailedScores: editingCert.detailedScores || {},
          filePath,
          fileUrl,
          fileName,
          fileMimeType,
          fileSize,
          issuedDate: (editingCert.issuedDate || '').trim(),
          isActive: editingCert.isActive !== false,
          isPublished: Boolean(editingCert.isPublished),
        },
        isNewCert
      );
      showToast('success', 'Data sertifikat berhasil disimpan.');
      setEditingCert(null);
      setCertFile(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan sertifikat.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCertFile = async (cert: Certificate) => {
    try {
      const target = cert.filePath || cert.fileUrl || '';
      if (!target) {
        showToast('error', 'File sertifikat tidak ditemukan.');
        return;
      }
      const url = await getAuthorizedFileDownloadUrl(target);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal membuka file sertifikat.');
    }
  };

  // =========================================================================
  // GALLERY
  // =========================================================================
  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGallery || !editingGallery.title?.trim()) {
      showToast('error', 'Judul kegiatan galeri wajib diisi.');
      return;
    }
    const currentImages = Array.isArray(editingGallery.images)
      ? editingGallery.images.filter(Boolean)
      : [];
    const coverUrl = currentImages[0] || (editingGallery.imageUrl || '').trim();
    if (!coverUrl) {
      showToast('error', 'Minimal satu foto kegiatan wajib diunggah.');
      return;
    }
    const finalImages = currentImages.length > 0 ? currentImages : [coverUrl];
    const docId = editingGallery.id || `gal_${Date.now()}`;
    setSaving(true);
    try {
      await saveAdminDocument(
        'galleryItems',
        docId,
        {
          title: editingGallery.title.trim(),
          description: (editingGallery.description || '').trim(),
          category: (editingGallery.category || 'Dokumentasi Kelas').trim(),
          imageUrl: coverUrl,
          images: finalImages,
          sortOrder: Number(editingGallery.sortOrder ?? galleryItems.length + 1),
          isActive: editingGallery.isActive !== false,
        },
        isNewGallery
      );
      showToast('success', 'Galeri kegiatan kelas berhasil disimpan.');
      setEditingGallery(null);
      setManualPhotoUrl('');
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan galeri.');
    } finally {
      setSaving(false);
    }
  };

  const handleMultipleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingGalleryImages(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgressText(`Mengunggah foto ${i + 1} dari ${files.length}...`);
        const uploaded = await uploadFileToStorage({
          file: files[i],
          folder: 'public-media',
          subFolder: 'gallery',
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        });
        uploadedUrls.push(uploaded.downloadUrl);
      }
      setEditingGallery((prev) => {
        if (!prev) return prev;
        const current = Array.isArray(prev.images)
          ? [...prev.images]
          : (prev.imageUrl ? [prev.imageUrl] : []);
        const merged = [...current, ...uploadedUrls];
        return {
          ...prev,
          images: merged,
          imageUrl: merged[0] || prev.imageUrl || '',
        };
      });
      showToast('success', `${uploadedUrls.length} foto kegiatan berhasil diunggah.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengunggah foto.');
    } finally {
      setUploadingGalleryImages(false);
      setUploadProgressText('');
      e.target.value = '';
    }
  };

  const handleAddManualPhotoUrl = () => {
    const url = manualPhotoUrl.trim();
    if (!url) return;
    setEditingGallery((prev) => {
      if (!prev) return prev;
      const current = Array.isArray(prev.images)
        ? [...prev.images]
        : (prev.imageUrl ? [prev.imageUrl] : []);
      const merged = [...current, url];
      return {
        ...prev,
        images: merged,
        imageUrl: merged[0] || url,
      };
    });
    setManualPhotoUrl('');
    showToast('success', 'Foto berhasil ditambahkan.');
  };

  const handleRemoveGalleryPhoto = (indexToRemove: number) => {
    setEditingGallery((prev) => {
      if (!prev) return prev;
      const current = Array.isArray(prev.images)
        ? [...prev.images]
        : (prev.imageUrl ? [prev.imageUrl] : []);
      const updated = current.filter((_, i) => i !== indexToRemove);
      return {
        ...prev,
        images: updated,
        imageUrl: updated[0] || '',
      };
    });
  };

  const handleSetCoverPhoto = (indexToCover: number) => {
    setEditingGallery((prev) => {
      if (!prev) return prev;
      const current = Array.isArray(prev.images)
        ? [...prev.images]
        : (prev.imageUrl ? [prev.imageUrl] : []);
      if (indexToCover <= 0 || indexToCover >= current.length) return prev;
      const selected = current[indexToCover];
      const remaining = current.filter((_, i) => i !== indexToCover);
      const reordered = [selected, ...remaining];
      return {
        ...prev,
        images: reordered,
        imageUrl: selected,
      };
    });
    showToast('success', 'Foto utama (sampul) berhasil diubah.');
  };

  // =========================================================================
  // FAQ
  // =========================================================================
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq || !editingFaq.question || !editingFaq.answer) return;
    const docId = editingFaq.id || `faq_${Date.now()}`;
    setSaving(true);
    try {
      await saveAdminDocument(
        'faqs',
        docId,
        {
          question: editingFaq.question.trim(),
          answer: editingFaq.answer.trim(),
          category: (editingFaq.category || 'Umum').trim(),
          sortOrder: Number(editingFaq.sortOrder ?? faqs.length + 1),
          isActive: editingFaq.isActive !== false,
        },
        isNewFaq
      );
      showToast('success', 'FAQ berhasil disimpan.');
      setEditingFaq(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan FAQ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. DISKON DAN PROMO */}
      {activeSection === 'discounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#0D213F]">
              Diskon & Kode Promo
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsNewDiscount(true);
                setEditingDiscount({
                  name: '',
                  code: '',
                  applicableProgramIds: [],
                  applicableLevelIds: [],
                  discountType: 'percentage',
                  value: 10,
                  startDate: new Date().toISOString().slice(0, 10),
                  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                  isActive: true,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Promo</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Nama Promo</th>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Nilai Diskon</th>
                  <th className="px-4 py-3">Berlaku Untuk</th>
                  <th className="px-4 py-3">Periode Berlaku</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Belum ada promo yang dibuat.
                    </td>
                  </tr>
                ) : (
                  discounts.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3 font-semibold text-[#0D213F]">{d.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {!d.code || d.code.trim() === '' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Otomatis (Tanpa Kode)
                          </span>
                        ) : (
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded inline-block">
                            {d.code}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums font-semibold text-[#0F766E]">
                        {d.discountType === 'percentage' ? `${d.value}%` : formatRupiah(d.value)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {d.applicableLevelIds && d.applicableLevelIds.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                            {programLevels
                              .filter((l) => d.applicableLevelIds?.includes(l.id))
                              .map((l) => l.name)
                              .join(', ') || `${d.applicableLevelIds.length} Level`}
                          </span>
                        ) : !d.applicableProgramIds || d.applicableProgramIds.length === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                            Semua Level / Program
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                            {programs
                              .filter((p) => d.applicableProgramIds?.includes(p.id))
                              .map((p) => p.title)
                              .join(', ') || 'Program Tertentu'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {d.startDate} s.d. {d.endDate}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {d.isActive ? (
                          <span className="text-[#0F766E]">Aktif</span>
                        ) : (
                          <span className="text-slate-400">Nonaktif</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewDiscount(false);
                            setEditingDiscount(d);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({ collection: 'discounts', id: d.id, label: d.name })
                          }
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PROFIL TUTOR */}
      {activeSection === 'tutors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#0D213F]">Profil Tutor</h2>
            <button
              type="button"
              onClick={() => {
                setIsNewTutor(true);
                setEditingTutor({
                  name: '',
                  photoUrl: '',
                  experience: '',
                  origin: '',
                  bio: '',
                  isActive: true,
                  sortOrder: tutors.length + 1,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tutor</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tutors.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="font-display font-bold text-[#0D213F]">{t.name}</p>
                  <p className="text-xs text-slate-500">Asal: {t.origin}</p>
                  <p className="text-xs text-slate-600">Pengalaman: {t.experience}</p>
                  <p className="text-xs font-semibold text-[#0F766E]">
                    {t.isActive ? 'Ditampilkan' : 'Disembunyikan'}
                  </p>
                </div>
                <div className="flex items-start gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewTutor(false);
                      setEditingTutor(t);
                    }}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDelete({ collection: 'tutors', id: t.id, label: t.name })
                    }
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SERTIFIKAT ALUMNI */}
      {activeSection === 'certificates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0D213F]">
                Kelola Sertifikat Alumni
              </h2>
              <p className="text-xs text-slate-500">
                Sertifikat hanya muncul di halaman publik jika status Aktif dan Dipublikasikan diaktifkan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsNewCert(true);
                setCertFile(null);
                setEditingCert({
                  studentName: '',
                  programName: '',
                  originOrProfession: '',
                  achievementType: 'Kelulusan Program',
                  scoreFormat: 'single',
                  singleScoreSystem: 'PTE',
                  singleScoreValue: '',
                  detailedScores: { speaking: '', grammar: '', vocabulary: '', pronunciation: '' },
                  issuedDate: '',
                  isActive: true,
                  isPublished: false,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Sertifikat</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Siswa</th>
                  <th className="px-4 py-3">Program & Pencapaian</th>
                  <th className="px-4 py-3">Format Skor</th>
                  <th className="px-4 py-3">Publikasi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Belum ada sertifikat yang diunggah.
                    </td>
                  </tr>
                ) : (
                  certificates.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#0D213F]">{c.studentName}</p>
                        <p className="text-xs text-slate-500">{c.originOrProfession || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.programName}</p>
                        <p className="text-xs text-slate-500">{c.achievementType}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.scoreFormat === 'single'
                          ? `${c.singleScoreSystem}: ${c.singleScoreValue || '-'}`
                          : 'Skor Detail (Speaking/Grammar/Vocab/Pronunciation)'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {c.isPublished && c.isActive ? (
                          <span className="text-[#0F766E]">Publik</span>
                        ) : (
                          <span className="text-slate-500">Privat</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {(c.filePath || c.fileUrl) && (
                          <button
                            type="button"
                            onClick={() => void handleOpenCertFile(c)}
                            className="p-1.5 rounded-lg text-[#0F766E] hover:bg-teal-50"
                            title="Unduh / Lihat File"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewCert(false);
                            setCertFile(null);
                            setEditingCert(c);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({
                              collection: 'certificates',
                              id: c.id,
                              label: `Sertifikat ${c.studentName}`,
                            })
                          }
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BANNER WEBSITE */}
      {activeSection === 'banner' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-3xl"
        >
          <h2 className="font-display text-lg font-bold text-[#0D213F]">
            Banner, Logo & Hero Section
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold mb-1">Logo Website (Upload Gambar)</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={settingsForm.logoUrl || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                  placeholder="URL logo atau kosongkan untuk teks logo ELITE COURSE"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200"
                />
                <label className="px-3 py-2 rounded-lg bg-slate-100 text-xs font-semibold cursor-pointer hover:bg-slate-200">
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        void handlePublicMediaUpload(
                          f,
                          (url) => setSettingsForm((p) => ({ ...p, logoUrl: url })),
                          'branding'
                        );
                      }
                    }}
                  />
                </label>
              </div>
              {settingsForm.logoUrl && (
                <div className="mt-2.5 flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <img
                    src={settingsForm.logoUrl}
                    alt="Preview Logo"
                    className="h-10 w-auto max-w-[120px] object-contain bg-white p-1 rounded border border-slate-200"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs text-slate-500">Pratinjau logo aktif</span>
                  <button
                    type="button"
                    onClick={() => setSettingsForm((p) => ({ ...p, logoUrl: '' }))}
                    className="text-xs text-red-600 hover:underline ml-auto font-medium"
                  >
                    Hapus Logo
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Headline Utama Hero *</label>
              <input
                type="text"
                required
                value={settingsForm.heroHeadline}
                onChange={(e) => setSettingsForm({ ...settingsForm, heroHeadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Deskripsi Hero *</label>
              <textarea
                rows={3}
                required
                value={settingsForm.heroDescription}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, heroDescription: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Teks Tombol CTA Utama</label>
                <input
                  type="text"
                  value={settingsForm.heroPrimaryCtaText || ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, heroPrimaryCtaText: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Keterangan Foto Hero</label>
                <input
                  type="text"
                  value={settingsForm.heroImageCaption || ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, heroImageCaption: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Foto Dokumentasi Hero</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={settingsForm.heroImageUrl || ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, heroImageUrl: e.target.value })
                  }
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200"
                />
                <label className="px-3 py-2 rounded-lg bg-slate-100 text-xs font-semibold cursor-pointer hover:bg-slate-200">
                  Upload Foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        void handlePublicMediaUpload(
                          f,
                          (url) => setSettingsForm((p) => ({ ...p, heroImageUrl: url })),
                          'hero'
                        );
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
          >
            {saving ? 'Menyimpan...' : 'Simpan Banner & Hero'}
          </button>
        </form>
      )}

      {/* 5. GALERI KELAS */}
      {activeSection === 'gallery' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#0D213F]">Galeri Kelas Kami</h2>
            <button
              type="button"
              onClick={() => {
                setIsNewGallery(true);
                setEditingGallery({
                  title: '',
                  description: '',
                  category: 'Dokumentasi Kelas',
                  imageUrl: '',
                  images: [],
                  sortOrder: galleryItems.length + 1,
                  isActive: true,
                });
                setManualPhotoUrl('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold hover:bg-[#0F766E] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Foto Kelas</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleryItems.map((g) => {
              const photos = Array.isArray(g.images) && g.images.length > 0
                ? g.images
                : (g.imageUrl ? [g.imageUrl] : []);
              return (
                <div
                  key={g.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <img
                        src={g.imageUrl || photos[0]}
                        alt={g.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs">
                        <Camera className="w-3.5 h-3.5 text-teal-300" />
                        <span>{photos.length} Foto</span>
                      </span>
                    </div>
                    <div className="p-4 space-y-1">
                      <p className="font-display font-bold text-sm text-[#0D213F]">{g.title}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{g.description}</p>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500">Urutan #{g.sortOrder}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewGallery(false);
                          setEditingGallery({
                            ...g,
                            images: photos,
                          });
                          setManualPhotoUrl('');
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                        title="Edit Album Foto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({ collection: 'galleryItems', id: g.id, label: g.title })
                        }
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                        title="Hapus Album"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. FAQ */}
      {activeSection === 'faq' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#0D213F]">Kelola FAQ</h2>
            <button
              type="button"
              onClick={() => {
                setIsNewFaq(true);
                setEditingFaq({
                  question: '',
                  answer: '',
                  category: 'Umum',
                  sortOrder: faqs.length + 1,
                  isActive: true,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah FAQ</span>
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {faqs.map((f) => (
              <div key={f.id} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-[#0D213F]">
                    #{f.sortOrder} · {f.question}
                  </p>
                  <p className="text-xs text-slate-600">{f.answer}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewFaq(false);
                      setEditingFaq(f);
                    }}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDelete({ collection: 'faqs', id: f.id, label: f.question })
                    }
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. PENGATURAN WEBSITE */}
      {activeSection === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 max-w-4xl text-sm"
        >
          <h2 className="font-display text-lg font-bold text-[#0D213F]">
            Pengaturan Informasi Lembaga, Legalitas, Kontak & Media Sosial
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Nama Merek</label>
              <input
                type="text"
                value={settingsForm.brandName}
                onChange={(e) => setSettingsForm({ ...settingsForm, brandName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Nama Lembaga Lengkap</label>
              <input
                type="text"
                value={settingsForm.instituteFullName}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, instituteFullName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tahun Berdiri</label>
              <input
                type="text"
                value={settingsForm.foundedYear}
                onChange={(e) => setSettingsForm({ ...settingsForm, foundedYear: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">No. Ijin FKB</label>
              <input
                type="text"
                value={settingsForm.fkbPermitNumber}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, fkbPermitNumber: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">NIB</label>
              <input
                type="text"
                value={settingsForm.nibNumber}
                onChange={(e) => setSettingsForm({ ...settingsForm, nibNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Jam Kantor</label>
              <input
                type="text"
                value={settingsForm.officeHours}
                onChange={(e) => setSettingsForm({ ...settingsForm, officeHours: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Telepon</label>
              <input
                type="text"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Nomor WhatsApp (628...)</label>
              <input
                type="text"
                value={settingsForm.whatsappNumber}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email Resmi</label>
              <input
                type="email"
                value={settingsForm.email}
                onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Keterangan Durasi Offline</label>
              <input
                type="text"
                value={settingsForm.offlinePriceNote}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, offlinePriceNote: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">Alamat Lembaga</label>
              <input
                type="text"
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">
                Visi (satu baris per poin)
              </label>
              <textarea
                rows={3}
                value={(settingsForm.visionItems || []).join('\n')}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    visionItems: e.target.value.split('\n').filter(Boolean),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">
                Misi (satu baris per poin)
              </label>
              <textarea
                rows={3}
                value={(settingsForm.missionItems || []).join('\n')}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    missionItems: e.target.value.split('\n').filter(Boolean),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0D213F]">Tautan Media Sosial Resmi</span>
              <button
                type="button"
                onClick={() =>
                  setSettingsForm({
                    ...settingsForm,
                    socialLinks: [
                      ...(settingsForm.socialLinks || []),
                      { platform: 'Instagram', label: '@elitecourse', url: 'https://' },
                    ],
                  })
                }
                className="text-xs font-semibold text-[#0F766E] hover:underline"
              >
                + Tambah Media Sosial
              </button>
            </div>
            {(settingsForm.socialLinks || []).map((soc, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={soc.platform}
                  onChange={(e) => {
                    const next = [...settingsForm.socialLinks];
                    next[idx] = { ...next[idx], platform: e.target.value };
                    setSettingsForm({ ...settingsForm, socialLinks: next });
                  }}
                  placeholder="Platform (Instagram)"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={soc.label}
                  onChange={(e) => {
                    const next = [...settingsForm.socialLinks];
                    next[idx] = { ...next[idx], label: e.target.value };
                    setSettingsForm({ ...settingsForm, socialLinks: next });
                  }}
                  placeholder="Label tampil"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={soc.url}
                    onChange={(e) => {
                      const next = [...settingsForm.socialLinks];
                      next[idx] = { ...next[idx], url: e.target.value };
                      setSettingsForm({ ...settingsForm, socialLinks: next });
                    }}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = settingsForm.socialLinks.filter((_, i) => i !== idx);
                      setSettingsForm({ ...settingsForm, socialLinks: next });
                    }}
                    className="p-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Website'}
          </button>
        </form>
      )}

      {/* MODAL DISKON */}
      {editingDiscount && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDiscount}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-[#0D213F]">
                {isNewDiscount ? 'Tambah Promo' : 'Edit Promo'}
              </h3>
              <button type="button" onClick={() => setEditingDiscount(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Promo *</label>
                <input
                  type="text"
                  required
                  value={editingDiscount.name || ''}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Kode Promo (Opsional)</label>
                <input
                  type="text"
                  value={editingDiscount.code || ''}
                  onChange={(e) =>
                    setEditingDiscount({ ...editingDiscount, code: e.target.value.toUpperCase() })
                  }
                  placeholder="Kosongkan jika diskon otomatis tanpa kode"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono uppercase"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Kosongkan jika ingin promo langsung memotong harga secara otomatis tanpa perlu kode kupon.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Jenis Diskon</label>
                <select
                  value={editingDiscount.discountType || 'percentage'}
                  onChange={(e) =>
                    setEditingDiscount({
                      ...editingDiscount,
                      discountType: e.target.value as DiscountType,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="percentage">Persentase (%)</option>
                  <option value="fixed">Nominal Tetap (Rp)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Nilai Diskon *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editingDiscount.value ?? 0}
                  onChange={(e) =>
                    setEditingDiscount({ ...editingDiscount, value: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tanggal Mulai *</label>
                <input
                  type="date"
                  required
                  value={editingDiscount.startDate || ''}
                  onChange={(e) =>
                    setEditingDiscount({ ...editingDiscount, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tanggal Berakhir *</label>
                <input
                  type="date"
                  required
                  value={editingDiscount.endDate || ''}
                  onChange={(e) =>
                    setEditingDiscount({ ...editingDiscount, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold">
                    Target Level / Paket Kursus (
                    {(!editingDiscount.applicableLevelIds || editingDiscount.applicableLevelIds.length === 0) &&
                    (!editingDiscount.applicableProgramIds || editingDiscount.applicableProgramIds.length === 0)
                      ? 'Berlaku di Semua Level'
                      : `${(editingDiscount.applicableLevelIds?.length || 0) + (editingDiscount.applicableProgramIds?.length || 0)} Target Dipilih`}
                    )
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingDiscount({
                          ...editingDiscount,
                          applicableLevelIds: [],
                          applicableProgramIds: [],
                        })
                      }
                      className="text-[11px] text-[#0F766E] hover:underline"
                    >
                      Semua Level (Default)
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2.5 space-y-2 bg-slate-50/50">
                  {programs.map((p) => {
                    const pLevels = programLevels.filter((l) => l.programId === p.id);
                    if (pLevels.length === 0) {
                      const checked = (editingDiscount.applicableProgramIds || []).includes(p.id);
                      return (
                        <div key={p.id} className="py-1 border-b border-slate-100 last:border-0">
                          <label className="flex items-center justify-between gap-2 text-xs cursor-pointer">
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const curr = editingDiscount.applicableProgramIds || [];
                                  const next = e.target.checked
                                    ? [...curr, p.id]
                                    : curr.filter((id) => id !== p.id);
                                  setEditingDiscount({ ...editingDiscount, applicableProgramIds: next });
                                }}
                              />
                              <span className="font-semibold text-slate-800">{p.title}</span>
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">{formatRupiah(p.basePrice)}</span>
                          </label>
                        </div>
                      );
                    }
                    return (
                      <div key={p.id} className="py-1.5 border-b border-slate-200/80 last:border-0">
                        <div className="text-[11px] font-bold text-[#0F766E] uppercase mb-1">
                          {p.title} <span className="text-slate-400 font-normal">({p.category === 'offline' ? 'Offline' : 'Online'})</span>
                        </div>
                        <div className="pl-3 space-y-1">
                          {pLevels.map((lvl) => {
                            const checked = (editingDiscount.applicableLevelIds || []).includes(lvl.id);
                            return (
                              <label key={lvl.id} className="flex items-center justify-between gap-2 text-xs py-0.5 px-1 rounded hover:bg-white cursor-pointer">
                                <span className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const curr = editingDiscount.applicableLevelIds || [];
                                      const next = e.target.checked
                                        ? [...curr, lvl.id]
                                        : curr.filter((id) => id !== lvl.id);
                                      setEditingDiscount({ ...editingDiscount, applicableLevelIds: next });
                                    }}
                                  />
                                  <span className="text-slate-800">{lvl.name}</span>
                                </span>
                                <span className="text-[11px] font-mono font-medium text-slate-600">
                                  {formatRupiah(lvl.price)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Centang level tertentu agar diskon hanya memotong harga level tersebut. Kosongkan jika ingin berlaku untuk semua level.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={editingDiscount.isActive !== false}
                    onChange={(e) =>
                      setEditingDiscount({ ...editingDiscount, isActive: e.target.checked })
                    }
                  />
                  <span>Promo Aktif</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingDiscount(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                Simpan Promo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL TUTOR */}
      {editingTutor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTutor}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-[#0D213F]">
                {isNewTutor ? 'Tambah Tutor' : `Edit Tutor: ${editingTutor.name}`}
              </h3>
              <button type="button" onClick={() => setEditingTutor(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Tutor *</label>
                <input
                  type="text"
                  required
                  value={editingTutor.name || ''}
                  onChange={(e) => setEditingTutor({ ...editingTutor, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Asal</label>
                <input
                  type="text"
                  value={editingTutor.origin || ''}
                  onChange={(e) => setEditingTutor({ ...editingTutor, origin: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Pengalaman</label>
                <input
                  type="text"
                  value={editingTutor.experience || ''}
                  onChange={(e) =>
                    setEditingTutor({ ...editingTutor, experience: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Foto Tutor</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingTutor.photoUrl || ''}
                    onChange={(e) =>
                      setEditingTutor({ ...editingTutor, photoUrl: e.target.value })
                    }
                    placeholder="URL foto"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200"
                  />
                  <label className="px-3 py-2 rounded-lg bg-slate-100 text-xs font-semibold cursor-pointer">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          void handlePublicMediaUpload(
                            f,
                            (url) => setEditingTutor((p) => (p ? { ...p, photoUrl: url } : p)),
                            'tutors'
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Deskripsi Tambahan</label>
                <textarea
                  rows={2}
                  value={editingTutor.bio || ''}
                  onChange={(e) => setEditingTutor({ ...editingTutor, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={editingTutor.isActive !== false}
                  onChange={(e) => setEditingTutor({ ...editingTutor, isActive: e.target.checked })}
                />
                <span>Tampilkan di Website Publik</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingTutor(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                Simpan Tutor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL SERTIFIKAT */}
      {editingCert && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCert}
            className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-[#0D213F]">
                {isNewCert ? 'Upload Sertifikat Alumni' : `Edit Sertifikat: ${editingCert.studentName}`}
              </h3>
              <button type="button" onClick={() => setEditingCert(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Siswa *</label>
                <input
                  type="text"
                  required
                  value={editingCert.studentName || ''}
                  onChange={(e) =>
                    setEditingCert({ ...editingCert, studentName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Program Diambil *</label>
                <input
                  type="text"
                  required
                  value={editingCert.programName || ''}
                  onChange={(e) =>
                    setEditingCert({ ...editingCert, programName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Asal / Profesi</label>
                <input
                  type="text"
                  value={editingCert.originOrProfession || ''}
                  onChange={(e) =>
                    setEditingCert({ ...editingCert, originOrProfession: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Jenis Pencapaian *</label>
                <input
                  type="text"
                  required
                  value={editingCert.achievementType || ''}
                  onChange={(e) =>
                    setEditingCert({ ...editingCert, achievementType: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Format Penilaian</label>
                <select
                  value={editingCert.scoreFormat || 'single'}
                  onChange={(e) =>
                    setEditingCert({
                      ...editingCert,
                      scoreFormat: e.target.value as ScoreFormat,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="single">A. Skor Tunggal (PTE / IELTS / TOEFL)</option>
                  <option value="detailed">
                    B. Skor Detail (Speaking, Grammar, Vocabulary, Pronunciation)
                  </option>
                </select>
              </div>

              {editingCert.scoreFormat === 'single' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Jenis Tes</label>
                    <select
                      value={editingCert.singleScoreSystem || 'PTE'}
                      onChange={(e) =>
                        setEditingCert({
                          ...editingCert,
                          singleScoreSystem: e.target.value as SingleScoreSystem,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="PTE">PTE</option>
                      <option value="IELTS">IELTS</option>
                      <option value="TOEFL">TOEFL</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nilai Skor</label>
                    <input
                      type="text"
                      value={editingCert.singleScoreValue || ''}
                      onChange={(e) =>
                        setEditingCert({ ...editingCert, singleScoreValue: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Speaking</label>
                    <input
                      type="text"
                      value={editingCert.detailedScores?.speaking || ''}
                      onChange={(e) =>
                        setEditingCert({
                          ...editingCert,
                          detailedScores: {
                            ...editingCert.detailedScores,
                            speaking: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Grammar</label>
                    <input
                      type="text"
                      value={editingCert.detailedScores?.grammar || ''}
                      onChange={(e) =>
                        setEditingCert({
                          ...editingCert,
                          detailedScores: {
                            ...editingCert.detailedScores,
                            grammar: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Vocabulary</label>
                    <input
                      type="text"
                      value={editingCert.detailedScores?.vocabulary || ''}
                      onChange={(e) =>
                        setEditingCert({
                          ...editingCert,
                          detailedScores: {
                            ...editingCert.detailedScores,
                            vocabulary: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Pronunciation</label>
                    <input
                      type="text"
                      value={editingCert.detailedScores?.pronunciation || ''}
                      onChange={(e) =>
                        setEditingCert({
                          ...editingCert,
                          detailedScores: {
                            ...editingCert.detailedScores,
                            pronunciation: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">
                  File Sertifikat (JPG, PNG, WEBP, PDF, DOC/X, XLS/X, PPT/X · Maks 10 MB)
                </label>
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer">
                  <UploadCloud className="w-5 h-5 text-[#0F766E]" />
                  <span className="text-xs text-slate-700">
                    {certFile
                      ? `${certFile.name} (${formatFileSize(certFile.size)})`
                      : editingCert.fileName || 'Pilih file sertifikat'}
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setCertFile(f);
                    }}
                  />
                </label>
              </div>

              <div className="sm:col-span-2 flex gap-5">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={editingCert.isActive !== false}
                    onChange={(e) =>
                      setEditingCert({ ...editingCert, isActive: e.target.checked })
                    }
                  />
                  <span>Aktif</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={Boolean(editingCert.isPublished)}
                    onChange={(e) =>
                      setEditingCert({ ...editingCert, isPublished: e.target.checked })
                    }
                  />
                  <span>Setujui Publikasi di Galeri Alumni</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCert(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                {saving ? 'Menyimpan...' : 'Simpan Sertifikat'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL GALERI */}
      {editingGallery && (() => {
        const currentModalPhotos = Array.isArray(editingGallery.images) && editingGallery.images.length > 0
          ? editingGallery.images
          : (editingGallery.imageUrl ? [editingGallery.imageUrl] : []);
        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <form
              onSubmit={handleSaveGallery}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0D213F]">
                    {isNewGallery ? 'Tambah Kegiatan Galeri Kelas' : 'Edit Kegiatan Galeri Kelas'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Satu judul kegiatan dapat mengunggah beberapa foto kelas sekaligus.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingGallery(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">
                    Judul Kegiatan / Album Foto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Aktivitas Kelas Speaking Booster"
                    value={editingGallery.title || ''}
                    onChange={(e) => setEditingGallery({ ...editingGallery, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">Deskripsi Kegiatan</label>
                  <textarea
                    rows={2}
                    placeholder="Ceritakan gambaran kegiatan belajar ini..."
                    value={editingGallery.description || ''}
                    onChange={(e) =>
                      setEditingGallery({ ...editingGallery, description: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-700">Kategori</label>
                    <input
                      type="text"
                      placeholder="Misal: Dokumentasi Kelas"
                      value={editingGallery.category || ''}
                      onChange={(e) =>
                        setEditingGallery({ ...editingGallery, category: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-700">Urutan Tampilan</label>
                    <input
                      type="number"
                      value={editingGallery.sortOrder ?? 1}
                      onChange={(e) =>
                        setEditingGallery({
                          ...editingGallery,
                          sortOrder: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                </div>

                {/* AREA MULTI-FOTO KEGIATAN */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#0D213F]">
                        Foto Kegiatan ({currentModalPhotos.length} Foto) <span className="text-red-500">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Foto pertama (#1) otomatis menjadi sampul. Anda bisa memilih banyak foto sekaligus saat upload.
                      </p>
                    </div>

                    <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D213F] transition-colors cursor-pointer shrink-0 shadow-xs">
                      <UploadCloud className="w-4 h-4" />
                      <span>{uploadingGalleryImages ? (uploadProgressText || 'Mengunggah...') : '+ Upload Foto (Bisa Banyak)'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        disabled={uploadingGalleryImages}
                        className="hidden"
                        onChange={handleMultipleGalleryUpload}
                      />
                    </label>
                  </div>

                  {/* Input Manual URL / Path */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Atau tempel URL / path foto lokal..."
                      value={manualPhotoUrl}
                      onChange={(e) => setManualPhotoUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualPhotoUrl();
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F766E]"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualPhotoUrl}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                    >
                      + Tambah URL
                    </button>
                  </div>

                  {/* Grid Foto-foto yang diunggah */}
                  {currentModalPhotos.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 space-y-2 bg-slate-50/50">
                      <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-semibold text-slate-700">Belum ada foto kegiatan diunggah</p>
                      <p className="max-w-xs mx-auto">
                        Klik tombol <strong>+ Upload Foto</strong> di atas untuk mengunggah satu atau beberapa foto kegiatan di kelas sekaligus.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/30">
                      {currentModalPhotos.map((url, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs"
                        >
                          <img
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {idx === 0 ? (
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#0F766E] text-white text-[10px] font-bold shadow-xs">
                              Sampul
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetCoverPhoto(idx)}
                              className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 hover:bg-[#0F766E] text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Jadikan Foto Sampul"
                            >
                              Set Sampul
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryPhoto(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-red-600/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Hapus foto ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="absolute bottom-1 right-1.5 text-[10px] font-mono font-bold text-white drop-shadow">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGallery(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingGalleryImages}
                  className="px-5 py-2 rounded-xl bg-[#0D213F] hover:bg-[#0F766E] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Foto Kegiatan'}
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* MODAL FAQ */}
      {editingFaq && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveFaq}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-[#0D213F]">
                {isNewFaq ? 'Tambah FAQ' : 'Edit FAQ'}
              </h3>
              <button type="button" onClick={() => setEditingFaq(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Pertanyaan *</label>
                <input
                  type="text"
                  required
                  value={editingFaq.question || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Jawaban *</label>
                <textarea
                  rows={4}
                  required
                  value={editingFaq.answer || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Urutan Tampilan</label>
                <input
                  type="number"
                  value={editingFaq.sortOrder ?? 1}
                  onChange={(e) =>
                    setEditingFaq({ ...editingFaq, sortOrder: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingFaq(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                Simpan FAQ
              </button>
            </div>
          </form>
        </div>
      )}

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
