import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Search, UserCheck } from 'lucide-react';
import { useSiteData } from '../contexts/SiteDataContext';
import { formatRupiah } from '../lib/format';
import { calculateEffectiveDiscount } from '../lib/pricingHelper';

export function OfflineProgramsPage() {
  const { programs, programLevels, discounts, siteSettings } = useSiteData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');

  const offlinePrograms = programs.filter((p) => p.category === 'offline');

  const filteredPrograms = offlinePrograms.filter((p) => {
    if (selectedProgramId !== 'all' && p.id !== selectedProgramId) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const levels = programLevels.filter((l) => l.programId === p.id);
    return (
      p.title.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      levels.some(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.materialsSummary.toLowerCase().includes(q) ||
          l.targetGoal.toLowerCase().includes(q)
      )
    );
  });

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="bg-[#0D213F] text-white rounded-2xl p-8 sm:p-10 space-y-4">
          <div className="text-xs font-semibold text-teal-300 tracking-wider uppercase">
            Kampung Inggris Pare, Kediri
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-white">
            Program Offline Class ELITE Course
          </h1>
          <p className="text-sm sm:text-base text-slate-200 max-w-3xl leading-relaxed">
            Kelas tatap muka intensif berdurasi {siteSettings.offlinePriceNote || '2 minggu (2 kelas)'} dengan periode masuk setiap tanggal 10 dan tanggal 25. Pilih program dan level sesuai kemampuan Anda.
          </p>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl w-max min-w-full md:min-w-0">
              <button
                type="button"
                onClick={() => setSelectedProgramId('all')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedProgramId === 'all'
                    ? 'bg-white text-[#0D213F] shadow-xs'
                    : 'text-slate-600 hover:text-[#0D213F]'
                }`}
              >
                Semua Program
              </button>
              {offlinePrograms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProgramId(p.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedProgramId === p.id
                      ? 'bg-white text-[#0D213F] shadow-xs'
                      : 'text-slate-600 hover:text-[#0D213F]'
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari program, level, atau materi..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:border-[#0F766E]"
            />
          </div>
        </div>

        {/* Program List */}
        {filteredPrograms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Tidak ada program Offline Class yang sesuai dengan pencarian Anda.
          </div>
        ) : (
          <div className="space-y-8">
            {filteredPrograms.map((prog) => {
              const levels = programLevels
                .filter((l) => l.programId === prog.id)
                .sort((a, b) => a.sortOrder - b.sortOrder);
              const progDiscount = calculateEffectiveDiscount(prog.id, prog.basePrice, discounts);

              return (
                <section
                  key={prog.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
                >
                  {prog.imageUrl && (
                    <div className="w-full h-48 sm:h-64 bg-slate-100 overflow-hidden border-b border-slate-100">
                      <img
                        src={prog.imageUrl}
                        alt={prog.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-[#0F766E]">Offline Class</span>
                        <span aria-hidden="true">·</span>
                        <span>Durasi: {prog.durationLabel}</span>
                      </div>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0D213F]">
                        {prog.title}
                      </h2>
                      <p className="text-sm text-slate-600 max-w-3xl">{prog.fullDescription || prog.shortDescription}</p>
                    </div>

                    {prog.isDraftIncomplete || !prog.isActive ? (
                      <span className="px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shrink-0">
                        Menunggu Detail Admin
                      </span>
                    ) : null}
                  </div>

                  {prog.isDraftIncomplete ? (
                    <div className="p-6 sm:p-8 bg-slate-50/70 text-sm text-slate-600 space-y-2">
                      <p className="font-semibold text-[#0D213F]">
                        Informasi Program Sedang Dilengkapi Admin
                      </p>
                      <p>
                        Biaya program tercatat {formatRupiah(prog.basePrice)}. Informasi level, materi, tujuan, jadwal, tutor, dan durasi belum tersedia dan dapat diaktifkan oleh admin setelah dilengkapi melalui dashboard.
                      </p>
                    </div>
                  ) : levels.length === 0 ? (
                    <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-50/50">
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Biaya Program
                        </p>
                        {progDiscount.hasDiscount ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-2xl font-bold text-[#0F766E] tabular-nums">
                                {formatRupiah(progDiscount.finalPrice)}
                              </p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                {progDiscount.discountLabel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 line-through tabular-nums">
                              {formatRupiah(progDiscount.originalPrice)}
                            </p>
                          </div>
                        ) : (
                          <p className="font-mono text-2xl font-bold text-[#0F766E] tabular-nums">
                            {formatRupiah(prog.basePrice)}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {prog.durationLabel ? `Durasi: ${prog.durationLabel}` : 'Jadwal fleksibel'}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Link
                          to={`/daftar?category=offline&program=${prog.id}`}
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors whitespace-nowrap shadow-sm"
                        >
                          <span>Daftar Program {prog.title}</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {levels.map((lvl) => {
                        const lvlDiscount = calculateEffectiveDiscount(prog.id, lvl.price, discounts, lvl.id);
                        return (
                          <div
                            key={lvl.id}
                            className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="lg:col-span-3 space-y-2">
                              <p className="text-xs font-medium text-slate-500">Level</p>
                              <h3 className="font-display text-lg font-bold text-[#0D213F]">
                                {lvl.name}
                              </h3>
                              {lvlDiscount.hasDiscount ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <p className="font-mono text-base font-bold text-[#0F766E] tabular-nums">
                                      {formatRupiah(lvlDiscount.finalPrice)}
                                    </p>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                      {lvlDiscount.discountLabel}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 line-through tabular-nums">
                                    {formatRupiah(lvlDiscount.originalPrice)}
                                  </p>
                                </div>
                              ) : (
                                <p className="font-mono text-base font-bold text-[#0F766E] tabular-nums">
                                  {formatRupiah(lvl.price)}
                                </p>
                              )}
                              <p className="text-xs text-slate-500">{lvl.durationLabel || prog.durationLabel}</p>
                            </div>

                          <div className="lg:col-span-5 space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                                <BookOpen className="w-3.5 h-3.5 text-[#0F766E]" />
                                <span>Materi Pembelajaran</span>
                              </p>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {lvl.materialsSummary}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700 mb-1">
                                Tujuan / Target
                              </p>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {lvl.targetGoal}
                              </p>
                            </div>
                          </div>

                          <div className="lg:col-span-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                              {(() => {
                                const meetingList =
                                  lvl.meetings && lvl.meetings.length > 0
                                    ? lvl.meetings
                                    : [
                                        { time: lvl.scheduleSlot1, tutor: lvl.tutorSlot1 },
                                        ...(lvl.scheduleSlot2 || lvl.tutorSlot2
                                          ? [{ time: lvl.scheduleSlot2, tutor: lvl.tutorSlot2 }]
                                          : []),
                                      ];

                                const getMeetingTitle = (i: number) => {
                                  const ordinals = [
                                    'Pertemuan Pertama',
                                    'Pertemuan Kedua',
                                    'Pertemuan Ketiga',
                                    'Pertemuan Keempat',
                                    'Pertemuan Kelima',
                                    'Pertemuan Keenam',
                                    'Pertemuan Ketujuh',
                                    'Pertemuan Kedelapan',
                                    'Pertemuan Kesembilan',
                                    'Pertemuan Kesepuluh',
                                  ];
                                  return ordinals[i] || `Pertemuan Ke-${i + 1}`;
                                };

                                return meetingList.map((m, mIdx) => (
                                  <div
                                    key={mIdx}
                                    className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-1"
                                  >
                                    <p className="text-xs font-semibold text-[#0D213F] flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                                      <span>{getMeetingTitle(mIdx)}</span>
                                    </p>
                                    <p className="text-sm text-slate-700 tabular-nums">
                                      {m.time || 'Menunggu jadwal dari admin'}
                                    </p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                      <UserCheck className="w-3.5 h-3.5 text-[#0F766E]" />
                                      <span>Tutor: {m.tutor || 'Menunggu penugasan admin'}</span>
                                    </p>
                                  </div>
                                ));
                              })()}
                            </div>

                            <Link
                              to={`/daftar?category=offline&program=${prog.id}&level=${lvl.id}`}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors"
                            >
                              <span>Daftar Level {lvl.name}</span>
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
