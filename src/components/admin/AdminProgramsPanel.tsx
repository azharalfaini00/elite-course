import React, { useState } from 'react';
import { Edit2, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { useToast } from '../../components/Toast';
import {
  deleteAdminDocument,
  logAdminActivity,
  saveAdminDocument,
  uploadFileToStorage,
} from '../../lib/apiService';
import { formatRupiah, slugify } from '../../lib/format';
import {
  ClassCategory,
  Program,
  ProgramLevel,
  ProgramMaterial,
  RegistrationPeriod,
  UnitBillingMode,
} from '../../types/elite';

interface Props {
  activeSection: 'programs' | 'materials' | 'periods';
  programs: Program[];
  programLevels: ProgramLevel[];
  programMaterials: ProgramMaterial[];
  registrationPeriods: RegistrationPeriod[];
  onRefresh: () => Promise<void>;
}

export function AdminProgramsPanel({
  activeSection,
  programs,
  programLevels,
  programMaterials,
  registrationPeriods,
  onRefresh,
}: Props) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'all' | ClassCategory>('all');
  const [saving, setSaving] = useState(false);

  // Program modal state
  const [editingProgram, setEditingProgram] = useState<Partial<Program> | null>(null);
  const [isNewProgram, setIsNewProgram] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Level modal state
  const [editingLevel, setEditingLevel] = useState<Partial<ProgramLevel> | null>(null);
  const [isNewLevel, setIsNewLevel] = useState(false);
  const [levelMeetings, setLevelMeetings] = useState<{ time: string; tutor: string }[]>([]);

  // Material modal state
  const [editingMaterial, setEditingMaterial] = useState<Partial<ProgramMaterial> | null>(null);
  const [isNewMaterial, setIsNewMaterial] = useState(false);

  // Period modal state
  const [editingPeriod, setEditingPeriod] = useState<Partial<RegistrationPeriod> | null>(null);
  const [isNewPeriod, setIsNewPeriod] = useState(false);

  // Delete confirmation modal
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
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus data.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // 1. KELOLA PROGRAM
  // =========================================================================
  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;
    const title = (editingProgram.title || '').trim();
    if (!title) {
      showToast('error', 'Nama program wajib diisi.');
      return;
    }
    const slug = slugify(editingProgram.slug || title) || `prog-${Date.now()}`;
    const docId = editingProgram.id || slug;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        slug,
        category: editingProgram.category === 'online' ? 'online' : 'offline',
        shortDescription: (editingProgram.shortDescription || '').trim(),
        fullDescription: (editingProgram.fullDescription || '').trim(),
        basePrice: Number(editingProgram.basePrice || 0),
        priceLabel: (editingProgram.priceLabel || formatRupiah(Number(editingProgram.basePrice || 0))).trim(),
        durationLabel: (editingProgram.durationLabel || '2 minggu').trim(),
        meetingCount: Number(editingProgram.meetingCount || 0),
        durationPerMeetingMinutes: Number(editingProgram.durationPerMeetingMinutes || 0),
        tutorCount: Number(editingProgram.tutorCount || 1),
        studentCapacity: Number(editingProgram.studentCapacity || 1),
        unitBillingMode: (editingProgram.unitBillingMode || 'per_student') as UnitBillingMode,
        certificateIncluded: Boolean(editingProgram.certificateIncluded),
        imageUrl: (editingProgram.imageUrl || '').trim(),
        isFeatured: Boolean(editingProgram.isFeatured),
        isDraftIncomplete: Boolean(editingProgram.isDraftIncomplete),
        isActive: Boolean(editingProgram.isActive),
        sortOrder: Number(editingProgram.sortOrder ?? programs.length + 1),
      };

      await saveAdminDocument('programs', docId, payload, isNewProgram);
      await logAdminActivity({
        action: isNewProgram ? 'CREATE_PROGRAM' : 'UPDATE_PROGRAM',
        entityType: 'programs',
        entityId: docId,
        summary: `${isNewProgram ? 'Menambahkan' : 'Memperbarui'} program ${title}`,
      });
      showToast('success', 'Data program berhasil disimpan.');
      setEditingProgram(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan program.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // 2. KELOLA LEVEL & MATERI
  // =========================================================================
  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLevel || !editingLevel.programId || !editingLevel.name) {
      showToast('error', 'Program dan nama level wajib diisi.');
      return;
    }
    const docId = editingLevel.id || `lvl_${Date.now()}`;
    setSaving(true);
    try {
      const cleanedMeetings = levelMeetings.filter((m) => m.time.trim() || m.tutor.trim());
      const scheduleSlot1 = cleanedMeetings[0]?.time.trim() || (editingLevel.scheduleSlot1 || '').trim();
      const tutorSlot1 = cleanedMeetings[0]?.tutor.trim() || (editingLevel.tutorSlot1 || '').trim();
      const scheduleSlot2 = cleanedMeetings[1]?.time.trim() || (editingLevel.scheduleSlot2 || '').trim();
      const tutorSlot2 = cleanedMeetings[1]?.tutor.trim() || (editingLevel.tutorSlot2 || '').trim();

      await saveAdminDocument(
        'programLevels',
        docId,
        {
          programId: editingLevel.programId,
          name: editingLevel.name.trim(),
          materialsSummary: (editingLevel.materialsSummary || '').trim(),
          targetGoal: (editingLevel.targetGoal || '').trim(),
          scheduleSlot1,
          tutorSlot1,
          scheduleSlot2,
          tutorSlot2,
          meetings: cleanedMeetings,
          price: Number(editingLevel.price || 0),
          durationLabel: (editingLevel.durationLabel || '2 minggu (2 kelas)').trim(),
          isActive: editingLevel.isActive !== false,
          sortOrder: Number(editingLevel.sortOrder ?? programLevels.length + 1),
        },
        isNewLevel
      );
      await logAdminActivity({
        action: isNewLevel ? 'CREATE_LEVEL' : 'UPDATE_LEVEL',
        entityType: 'programLevels',
        entityId: docId,
        summary: `Menyimpan level ${editingLevel.name}`,
      });
      showToast('success', 'Level program berhasil disimpan.');
      setEditingLevel(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan level.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial || !editingMaterial.programId || !editingMaterial.title) {
      showToast('error', 'Program dan judul materi wajib diisi.');
      return;
    }
    const docId = editingMaterial.id || `mat_${Date.now()}`;
    setSaving(true);
    try {
      await saveAdminDocument(
        'programMaterials',
        docId,
        {
          programId: editingMaterial.programId,
          levelId: editingMaterial.levelId || '',
          title: editingMaterial.title.trim(),
          description: (editingMaterial.description || '').trim(),
          category: (editingMaterial.category || 'Umum').trim(),
          sortOrder: Number(editingMaterial.sortOrder ?? programMaterials.length + 1),
          isActive: editingMaterial.isActive !== false,
        },
        isNewMaterial
      );
      showToast('success', 'Materi pembelajaran berhasil disimpan.');
      setEditingMaterial(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan materi.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // 3. PERIODE PENDAFTARAN
  // =========================================================================
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriod || !editingPeriod.title) {
      showToast('error', 'Nama periode wajib diisi.');
      return;
    }
    const docId = editingPeriod.id || `period_${Date.now()}`;
    setSaving(true);
    try {
      await saveAdminDocument(
        'registrationPeriods',
        docId,
        {
          title: editingPeriod.title.trim(),
          dayOfMonth: Number(editingPeriod.dayOfMonth || 10),
          startDate: (editingPeriod.startDate || '').trim(),
          endDate: (editingPeriod.endDate || '').trim(),
          registrationCloseDate: (editingPeriod.registrationCloseDate || '').trim(),
          quota: Number(editingPeriod.quota || 0),
          enrolledCount: Number(editingPeriod.enrolledCount || 0),
          programIds: Array.isArray(editingPeriod.programIds) ? editingPeriod.programIds : [],
          notes: (editingPeriod.notes || '').trim(),
          isOpen: editingPeriod.isOpen !== false,
          isActive: editingPeriod.isActive !== false,
        },
        isNewPeriod
      );
      await logAdminActivity({
        action: isNewPeriod ? 'CREATE_PERIOD' : 'UPDATE_PERIOD',
        entityType: 'registrationPeriods',
        entityId: docId,
        summary: `Menyimpan periode ${editingPeriod.title}`,
      });
      showToast('success', 'Periode pendaftaran berhasil disimpan.');
      setEditingPeriod(null);
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan periode.');
    } finally {
      setSaving(false);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (search.trim()) {
      return p.title.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {activeSection === 'programs' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari program..."
                  className="pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                />
              </div>
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value as 'all' | ClassCategory)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value="all">Semua Kategori</option>
                <option value="offline">Offline Class</option>
                <option value="online">Online Class</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewProgram(true);
                setEditingProgram({
                  title: '',
                  slug: '',
                  category: 'offline',
                  basePrice: 0,
                  priceLabel: '',
                  durationLabel: '2 minggu',
                  unitBillingMode: 'per_student',
                  isActive: true,
                  isDraftIncomplete: false,
                  sortOrder: programs.length + 1,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0D213F] text-white text-sm font-semibold hover:bg-[#15325C]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Program</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Harga</th>
                  <th className="px-4 py-3">Durasi</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPrograms.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#0D213F]">{p.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{p.shortDescription}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{p.category}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{formatRupiah(p.basePrice)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.durationLabel}</td>
                    <td className="px-4 py-3 text-xs">
                      {p.isDraftIncomplete ? (
                        <span className="text-amber-700 font-semibold">Menunggu Kelengkapan</span>
                      ) : p.isActive ? (
                        <span className="text-[#0F766E] font-semibold">Aktif</span>
                      ) : (
                        <span className="text-slate-400">Nonaktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewProgram(false);
                          setEditingProgram(p);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                        aria-label={`Edit ${p.title}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({ collection: 'programs', id: p.id, label: p.title })
                        }
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                        aria-label={`Hapus ${p.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'materials' && (
        <div className="space-y-8">
          {/* Levels Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0D213F]">
                Level, Jadwal & Tutor per Program
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsNewLevel(true);
                  setLevelMeetings([
                    { time: '', tutor: '' },
                    { time: '', tutor: '' },
                  ]);
                  setEditingLevel({
                    programId: programs[0]?.id || '',
                    name: '',
                    materialsSummary: '',
                    targetGoal: '',
                    scheduleSlot1: '',
                    tutorSlot1: '',
                    scheduleSlot2: '',
                    tutorSlot2: '',
                    price: 200000,
                    durationLabel: '2 minggu (2 kelas)',
                    isActive: true,
                    sortOrder: programLevels.length + 1,
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Level</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Jadwal & Pertemuan</th>
                    <th className="px-4 py-3">Harga</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {programLevels.map((lvl) => {
                    const prog = programs.find((p) => p.id === lvl.programId);
                    return (
                      <tr key={lvl.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-[#0D213F]">
                          {prog?.title || lvl.programId}
                        </td>
                        <td className="px-4 py-3 font-semibold">{lvl.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {lvl.meetings && lvl.meetings.length > 0 ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-semibold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                                {lvl.meetings.length} Pertemuan
                              </span>
                              <span className="text-slate-500 truncate max-w-[250px]">
                                {lvl.meetings.map((m) => m.time).filter(Boolean).join(', ')}
                              </span>
                            </span>
                          ) : (
                            <span>
                              {lvl.scheduleSlot1 || '-'} · {lvl.tutorSlot1 || '-'}
                              {(lvl.scheduleSlot2 || lvl.tutorSlot2)
                                ? ` | ${lvl.scheduleSlot2 || '-'} · ${lvl.tutorSlot2 || '-'}`
                                : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums">{formatRupiah(lvl.price)}</td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewLevel(false);
                              if (lvl.meetings && lvl.meetings.length > 0) {
                                setLevelMeetings(lvl.meetings.map((m) => ({ ...m })));
                              } else {
                                const initial: { time: string; tutor: string }[] = [];
                                if (lvl.scheduleSlot1 || lvl.tutorSlot1) {
                                  initial.push({ time: lvl.scheduleSlot1 || '', tutor: lvl.tutorSlot1 || '' });
                                }
                                if (lvl.scheduleSlot2 || lvl.tutorSlot2) {
                                  initial.push({ time: lvl.scheduleSlot2 || '', tutor: lvl.tutorSlot2 || '' });
                                }
                                if (initial.length === 0) {
                                  initial.push({ time: '', tutor: '' });
                                }
                                setLevelMeetings(initial);
                              }
                              setEditingLevel(lvl);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                collection: 'programLevels',
                                id: lvl.id,
                                label: `Level ${lvl.name}`,
                              })
                            }
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Granular Materials Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0D213F]">
                Modul Materi Tambahan
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsNewMaterial(true);
                  setEditingMaterial({
                    programId: programs[0]?.id || '',
                    levelId: '',
                    title: '',
                    description: '',
                    category: 'Speaking',
                    sortOrder: programMaterials.length + 1,
                    isActive: true,
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-[#0D213F]"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Materi</span>
              </button>
            </div>

            {programMaterials.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 text-center text-sm text-slate-500">
                Belum ada modul materi terpisah. Materi ringkas per level sudah tersimpan pada tabel level di atas.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                {programMaterials.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm text-[#0D213F]">{m.title}</p>
                      <p className="text-xs text-slate-500">{m.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewMaterial(false);
                          setEditingMaterial(m);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            collection: 'programMaterials',
                            id: m.id,
                            label: m.title,
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
        </div>
      )}

      {activeSection === 'periods' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0D213F]">
                Periode Pendaftaran (Tanggal 10 & 25)
              </h2>
              <p className="text-xs text-slate-500">
                Atur pembukaan, penutupan, kuota, dan program yang tersedia pada setiap periode.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsNewPeriod(true);
                setEditingPeriod({
                  title: '',
                  dayOfMonth: 10,
                  startDate: '',
                  endDate: '',
                  registrationCloseDate: '',
                  quota: 0,
                  enrolledCount: 0,
                  programIds: [],
                  notes: '',
                  isOpen: true,
                  isActive: true,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Periode</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registrationPeriods.map((period) => (
              <div
                key={period.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-base text-[#0D213F]">
                      {period.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tanggal masuk: {period.dayOfMonth} ·{' '}
                      {period.isOpen ? 'Dibuka' : 'Ditutup'} ·{' '}
                      {period.isActive ? 'Aktif' : 'Nonaktif'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewPeriod(false);
                        setEditingPeriod(period);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({
                          collection: 'registrationPeriods',
                          id: period.id,
                          label: period.title,
                        })
                      }
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    Rentang tanggal: {period.startDate || 'Belum diatur'} s.d.{' '}
                    {period.endDate || 'Belum diatur'}
                  </p>
                  <p className="tabular-nums">
                    Kuota: {period.quota > 0 ? `${period.enrolledCount}/${period.quota}` : 'Tidak dibatasi'}
                  </p>
                  {period.notes && <p className="text-slate-500">{period.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL EDIT PROGRAM */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProgram}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-[#0D213F]">
                {isNewProgram ? 'Tambah Program Baru' : `Edit Program: ${editingProgram.title}`}
              </h3>
              <button type="button" onClick={() => setEditingProgram(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Program *</label>
                <input
                  type="text"
                  required
                  value={editingProgram.title || ''}
                  onChange={(e) => setEditingProgram({ ...editingProgram, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Kategori *</label>
                <select
                  value={editingProgram.category || 'offline'}
                  onChange={(e) =>
                    setEditingProgram({
                      ...editingProgram,
                      category: e.target.value as ClassCategory,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="offline">Offline Class</option>
                  <option value="online">Online Class</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Harga Dasar (Rp) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editingProgram.basePrice ?? 0}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, basePrice: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Label Durasi *</label>
                <input
                  type="text"
                  required
                  value={editingProgram.durationLabel || ''}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, durationLabel: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Label Harga Tampil</label>
                <input
                  type="text"
                  value={editingProgram.priceLabel || ''}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, priceLabel: e.target.value })
                  }
                  placeholder="Contoh: Rp200.000 / 2 minggu (2 kelas)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              {editingProgram.category === 'online' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Jumlah Murid / Kapasitas</label>
                    <input
                      type="number"
                      min={1}
                      value={editingProgram.studentCapacity ?? 1}
                      onChange={(e) =>
                        setEditingProgram({
                          ...editingProgram,
                          studentCapacity: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Pengaturan Satuan Biaya</label>
                    <select
                      value={editingProgram.unitBillingMode || 'per_student'}
                      onChange={(e) =>
                        setEditingProgram({
                          ...editingProgram,
                          unitBillingMode: e.target.value as UnitBillingMode,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="per_student">Per Siswa</option>
                      <option value="per_package">Per Paket Kelompok</option>
                      <option value="unconfirmed">Belum Dikonfirmasi (Jangan Kalikan)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">
                  Foto / Gambar Banner Program (Tampil di Kartu Beranda & Program)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  {editingProgram.imageUrl ? (
                    <div className="w-32 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100 relative group">
                      <img
                        src={editingProgram.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingProgram({ ...editingProgram, imageUrl: '' })}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold transition-opacity"
                      >
                        Hapus Foto
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-20 rounded-lg border-2 border-dashed border-slate-200 shrink-0 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <Upload className="w-5 h-5 mb-1 text-slate-300" />
                      <span>Belum ada foto</span>
                    </div>
                  )}

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImage ? 'Mengupload...' : 'Upload File Gambar'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingImage}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingImage(true);
                            try {
                              const res = await uploadFileToStorage({
                                file,
                                folder: 'public-media',
                                subFolder: 'programs',
                                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
                              });
                              setEditingProgram({ ...editingProgram, imageUrl: res.downloadUrl });
                              showToast('success', 'Gambar program berhasil diupload.');
                            } catch (err) {
                              showToast('error', err instanceof Error ? err.message : 'Gagal upload gambar.');
                            } finally {
                              setUploadingImage(false);
                            }
                          }}
                        />
                      </label>
                      <span className="text-xs text-slate-400">atau ketik URL gambar</span>
                    </div>
                    <input
                      type="text"
                      value={editingProgram.imageUrl || ''}
                      onChange={(e) =>
                        setEditingProgram({ ...editingProgram, imageUrl: e.target.value })
                      }
                      placeholder="Contoh: /src/assets/images/... atau https://..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={editingProgram.shortDescription || ''}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, shortDescription: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProgram.isActive)}
                    onChange={(e) =>
                      setEditingProgram({ ...editingProgram, isActive: e.target.checked })
                    }
                  />
                  <span>Program Aktif</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProgram.isDraftIncomplete)}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        isDraftIncomplete: e.target.checked,
                      })
                    }
                  />
                  <span>Masih Menunggu Detail (Belum Bisa Didaftar)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingProgram(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                {saving ? 'Menyimpan...' : 'Simpan Program'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EDIT LEVEL */}
      {editingLevel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLevel}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-[#0D213F]">
                {isNewLevel ? 'Tambah Level Program' : `Edit Level: ${editingLevel.name}`}
              </h3>
              <button type="button" onClick={() => setEditingLevel(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Program *</label>
                <select
                  value={editingLevel.programId || ''}
                  onChange={(e) => setEditingLevel({ ...editingLevel, programId: e.target.value })}
                  disabled={!isNewLevel}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Level *</label>
                <input
                  type="text"
                  required
                  value={editingLevel.name || ''}
                  onChange={(e) => setEditingLevel({ ...editingLevel, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Harga (Rp) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editingLevel.price ?? 0}
                  onChange={(e) => setEditingLevel({ ...editingLevel, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Durasi</label>
                <input
                  type="text"
                  value={editingLevel.durationLabel || ''}
                  onChange={(e) =>
                    setEditingLevel({ ...editingLevel, durationLabel: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div className="sm:col-span-2 space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800">
                      Jadwal & Tutor Pertemuan Kelas ({levelMeetings.length} Pertemuan)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Atur jadwal dan pengajar untuk tiap pertemuan kelas. Anda dapat menambah lebih dari 2 pertemuan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLevelMeetings([...levelMeetings, { time: '', tutor: '' }])}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-[#0F766E] hover:bg-teal-100 text-xs font-semibold transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pertemuan</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {levelMeetings.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0D213F]">
                          Pertemuan {idx + 1}
                        </span>
                        {levelMeetings.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setLevelMeetings(levelMeetings.filter((_, i) => i !== idx))
                            }
                            className="p-1 rounded text-red-500 hover:bg-red-50 text-xs flex items-center gap-1"
                            title="Hapus pertemuan ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Jadwal Pertemuan {idx + 1}
                          </label>
                          <input
                            type="text"
                            value={m.time}
                            onChange={(e) => {
                              const updated = [...levelMeetings];
                              updated[idx] = { ...updated[idx], time: e.target.value };
                              setLevelMeetings(updated);
                            }}
                            placeholder="Contoh: 07.00–08.30"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Tutor Pertemuan {idx + 1}
                          </label>
                          <input
                            type="text"
                            value={m.tutor}
                            onChange={(e) => {
                              const updated = [...levelMeetings];
                              updated[idx] = { ...updated[idx], tutor: e.target.value };
                              setLevelMeetings(updated);
                            }}
                            placeholder="Contoh: Bro. A / Mr. Agus"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Materi Pembelajaran *</label>
                <textarea
                  rows={2}
                  required
                  value={editingLevel.materialsSummary || ''}
                  onChange={(e) =>
                    setEditingLevel({ ...editingLevel, materialsSummary: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Tujuan / Target *</label>
                <textarea
                  rows={2}
                  required
                  value={editingLevel.targetGoal || ''}
                  onChange={(e) =>
                    setEditingLevel({ ...editingLevel, targetGoal: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingLevel(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                {saving ? 'Menyimpan...' : 'Simpan Level'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EDIT MATERIAL */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMaterial}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-[#0D213F]">
                {isNewMaterial ? 'Tambah Materi' : 'Edit Materi'}
              </h3>
              <button type="button" onClick={() => setEditingMaterial(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Program *</label>
                <select
                  value={editingMaterial.programId || ''}
                  onChange={(e) =>
                    setEditingMaterial({ ...editingMaterial, programId: e.target.value })
                  }
                  disabled={!isNewMaterial}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Judul Materi *</label>
                <input
                  type="text"
                  required
                  value={editingMaterial.title || ''}
                  onChange={(e) =>
                    setEditingMaterial({ ...editingMaterial, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Deskripsi Materi *</label>
                <textarea
                  rows={3}
                  required
                  value={editingMaterial.description || ''}
                  onChange={(e) =>
                    setEditingMaterial({ ...editingMaterial, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EDIT PERIOD */}
      {editingPeriod && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePeriod}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-[#0D213F]">
                {isNewPeriod ? 'Tambah Periode Pendaftaran' : `Edit ${editingPeriod.title}`}
              </h3>
              <button type="button" onClick={() => setEditingPeriod(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Nama Periode *</label>
                <input
                  type="text"
                  required
                  value={editingPeriod.title || ''}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tanggal Masuk (1–31) *</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  required
                  value={editingPeriod.dayOfMonth ?? 10}
                  onChange={(e) =>
                    setEditingPeriod({ ...editingPeriod, dayOfMonth: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Kuota (0 = Tanpa Batas)</label>
                <input
                  type="number"
                  min={0}
                  value={editingPeriod.quota ?? 0}
                  onChange={(e) =>
                    setEditingPeriod({ ...editingPeriod, quota: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tanggal Mulai Kelas</label>
                <input
                  type="date"
                  value={editingPeriod.startDate || ''}
                  onChange={(e) =>
                    setEditingPeriod({ ...editingPeriod, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tanggal Selesai Kelas</label>
                <input
                  type="date"
                  value={editingPeriod.endDate || ''}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Catatan Periode</label>
                <textarea
                  rows={2}
                  value={editingPeriod.notes || ''}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div className="sm:col-span-2 flex gap-5">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={editingPeriod.isOpen !== false}
                    onChange={(e) =>
                      setEditingPeriod({ ...editingPeriod, isOpen: e.target.checked })
                    }
                  />
                  <span>Pendaftaran Dibuka</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={editingPeriod.isActive !== false}
                    onChange={(e) =>
                      setEditingPeriod({ ...editingPeriod, isActive: e.target.checked })
                    }
                  />
                  <span>Periode Aktif</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPeriod(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                Simpan Periode
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
              Apakah Anda yakin ingin menghapus <span className="font-semibold">{confirmDelete.label}</span>? Tindakan ini tidak dapat dibatalkan.
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
                {saving ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
