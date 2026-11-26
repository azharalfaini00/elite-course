import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Instagram,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { useSiteData } from '../contexts/SiteDataContext';
import { formatRupiah } from '../lib/format';
import { calculateEffectiveDiscount } from '../lib/pricingHelper';
import { Certificate, GalleryItem } from '../types/elite';

export function HomePage() {
  const {
    loading,
    siteSettings,
    programs,
    programLevels,
    tutors,
    certificates,
    galleryItems,
    faqs,
    discounts,
    registrationPeriods,
  } = useSiteData();

  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [programTab, setProgramTab] = useState<'all' | 'offline' | 'online'>('all');

  // Keyboard navigation for gallery lightbox
  useEffect(() => {
    if (!lightboxItem) return;
    const photos = Array.isArray(lightboxItem.images) && lightboxItem.images.length > 0
      ? lightboxItem.images
      : (lightboxItem.imageUrl ? [lightboxItem.imageUrl] : []);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxItem(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxItem]);

  const waDigits = (siteSettings.whatsappNumber || siteSettings.phone || '6285650809091').replace(/[^0-9]/g, '');
  const normalizedWa = waDigits.startsWith('0') ? `62${waDigits.slice(1)}` : waDigits;

  const activePeriods = (registrationPeriods || []).filter((p) => p.isActive);
  const displayPeriods =
    activePeriods.length > 0
      ? activePeriods
      : [
          {
            id: 'periode-tgl-10',
            title: 'Periode Tanggal 10',
            dayOfMonth: 10,
            startDate: '',
            endDate: '',
            registrationCloseDate: '',
            quota: 0,
            enrolledCount: 0,
            programIds: [],
            notes: 'Periode pembelajaran dimulai tanggal 10 setiap bulan (tatap muka intensif & daring).',
            isOpen: true,
            isActive: true,
          },
          {
            id: 'periode-tgl-25',
            title: 'Periode Tanggal 25',
            dayOfMonth: 25,
            startDate: '',
            endDate: '',
            registrationCloseDate: '',
            quota: 0,
            enrolledCount: 0,
            programIds: [],
            notes: 'Periode pembelajaran dimulai tanggal 25 setiap bulan (tatap muka intensif & daring).',
            isOpen: true,
            isActive: true,
          },
        ];

  const visiblePrograms = programs.filter((p) => {
    if (programTab === 'offline') return p.category === 'offline';
    if (programTab === 'online') return p.category === 'online';
    return true;
  });

  return (
    <div className="bg-[#F8FAFC]">
      {/* A. HERO SECTION */}
      <section className="relative bg-[#0D213F] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="text-xs sm:text-sm font-medium text-teal-300 tracking-wide">
                {siteSettings.instituteFullName} · Kampung Inggris Pare, Kediri
              </div>

              <h1
                className="font-display font-bold tracking-tight text-white leading-[1.12]"
                style={{ fontSize: 'clamp(2.1rem, 4vw, 3.35rem)', textWrap: 'balance' }}
              >
                {siteSettings.heroHeadline}
              </h1>

              <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl">
                {siteSettings.heroDescription}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/daftar"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 rounded-lg bg-[#F59E0B] text-[#0D213F] font-semibold text-sm hover:bg-[#D97706] hover:text-white transition-colors whitespace-nowrap"
                >
                  <span>{siteSettings.heroPrimaryCtaText || 'Daftar Sekarang'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#program-unggulan"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 rounded-lg bg-white/10 text-white border border-white/20 font-medium text-sm hover:bg-white/20 transition-colors whitespace-nowrap"
                >
                  <span>Lihat Program</span>
                </a>
                <a
                  href={`https://wa.me/${normalizedWa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 rounded-lg border border-teal-400/40 text-teal-200 font-medium text-sm hover:bg-teal-900/40 transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Hubungi Kami</span>
                </a>
              </div>

              <div className="pt-4 border-t border-white/15 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300">
                <span>Berdiri sejak {siteSettings.foundedYear || '2019'}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Ijin FKB: {siteSettings.fkbPermitNumber}</span>
                <span aria-hidden="true">·</span>
                <Link to="/cek-status" className="text-teal-300 hover:underline font-medium">
                  Cek Status Pendaftaran
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col">
              <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/15 bg-[#15325C] min-h-[280px] lg:min-h-[400px]">
                <SafeImage
                  src={siteSettings.heroImageUrl}
                  alt={siteSettings.instituteFullName}
                  fallbackLabel={siteSettings.instituteFullName}
                  eager
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#081529]/90 via-[#081529]/45 to-transparent p-5">
                  {siteSettings.socialLinks && siteSettings.socialLinks.length > 0 && (
                    <div className="flex items-center gap-3 mb-2.5">
                      {siteSettings.socialLinks.map((soc, idx) => {
                        const platform = (soc.platform || '').toLowerCase();
                        return (
                          <a
                            key={idx}
                            href={soc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                            aria-label={soc.label || soc.platform}
                          >
                            {platform === 'instagram' ? (
                              <Instagram className="w-4 h-4" />
                            ) : platform === 'tiktok' ? (
                              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.19 8.19 0 0 0 4.78 1.52V6.73a4.84 4.84 0 0 1-1.01-.04z"/>
                              </svg>
                            ) : null}
                            <span className="text-xs font-medium">{soc.label}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-slate-200">
                    {siteSettings.heroImageCaption ||
                      'Ilustrasi pembelajaran bahasa Inggris ELITE Course.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* JADWAL & PERIODE PENDAFTARAN (TANGGAL 10 & 25) */}
      <section id="periode-pendaftaran" className="py-14 lg:py-16 bg-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Jadwal & Periode Pendaftaran</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0D213F]">
                Periode Masuk Kelas: Tanggal 10 & 25 Setiap Bulan
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                ELITE Course membuka gelombang kelas baru secara teratur setiap tanggal 10 dan 25 setiap bulannya. Pilih periode yang Anda inginkan dan amankan kuota Anda sebelum pendaftaran ditutup.
              </p>
            </div>
            <Link
              to="/daftar"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-[#0F766E] hover:text-[#0D213F] hover:border-[#0F766E]/40 shadow-xs transition-colors whitespace-nowrap self-start md:self-end"
            >
              <span>Formulir Pendaftaran</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayPeriods.map((period) => {
              const isFull = period.quota > 0 && period.enrolledCount >= period.quota;
              const isOpen = period.isOpen && !isFull;
              return (
                <div
                  key={period.id}
                  className={`relative rounded-2xl border transition-all p-6 sm:p-7 flex flex-col justify-between ${
                    isOpen
                      ? 'bg-white border-slate-200/90 shadow-xs hover:border-[#0F766E]/50 hover:shadow-md'
                      : 'bg-slate-100/70 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-13 h-13 rounded-2xl bg-[#0D213F] text-white flex flex-col items-center justify-center font-display shadow-xs shrink-0 p-2">
                          <span className="text-[10px] tracking-wider uppercase font-semibold text-teal-300">TGL</span>
                          <span className="text-xl sm:text-2xl font-bold leading-none">{period.dayOfMonth}</span>
                        </div>
                        <div>
                          <h3 className="font-display text-lg sm:text-xl font-bold text-[#0D213F]">
                            {period.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Masuk kelas setiap tanggal {period.dayOfMonth}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                          isOpen
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {isOpen ? 'Pendaftaran Dibuka' : isFull ? 'Kuota Penuh' : 'Ditutup'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      {period.notes ||
                        `Periode pembelajaran reguler dimulai tanggal ${period.dayOfMonth} setiap bulan untuk kelas Offline maupun Online.`}
                    </p>

                    <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400 block font-medium">Rentang Tanggal Belajar:</span>
                          <span className="font-medium text-slate-700">
                            {period.startDate && period.endDate
                              ? `${period.startDate} s.d. ${period.endDate}`
                              : `Dimulai tgl ${period.dayOfMonth} setiap bulan`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400 block font-medium">Ketersediaan Kuota:</span>
                          <span className="font-medium text-slate-700">
                            {period.quota > 0
                              ? `${Math.max(0, period.quota - period.enrolledCount)} kursi tersisa (${period.enrolledCount}/${period.quota})`
                              : 'Kuota Reguler Tersedia'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      {period.registrationCloseDate
                        ? `Batas akhir: ${period.registrationCloseDate}`
                        : 'Pendaftaran dibuka setiap bulan'}
                    </span>
                    {isOpen ? (
                      <Link
                        to={`/daftar?period=${period.id}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D213F] transition-colors shadow-xs"
                      >
                        <span>Daftar {period.title}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-200 text-slate-400 text-xs font-semibold cursor-not-allowed"
                      >
                        Pendaftaran Ditutup
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* B. PROFIL SINGKAT & C. VISI MISI */}
      <section id="tentang-kami" className="py-16 lg:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-semibold tracking-wider text-[#0F766E] uppercase">
                Profil Lembaga
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0D213F] leading-snug">
                ELITE (English Learning Institute) — Berdiri Sejak {siteSettings.foundedYear || '2019'}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Berlokasi di Kampung Inggris Pare, Kediri, ELITE Course menyelenggarakan program pembelajaran bahasa Inggris terstruktur baik secara tatap muka (Offline Class) maupun daring (Online Class).
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-[#0D213F] font-display font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                  <span>Registrasi Resmi FKB</span>
                </div>
                <p className="text-xs text-slate-500">Nomor Ijin Forum Kampung Bahasa</p>
                <p className="font-mono text-sm font-semibold text-[#0D213F] tabular-nums break-all">
                  {siteSettings.fkbPermitNumber}
                </p>
              </div>

              <div className="p-6 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-[#0D213F] font-display font-semibold text-sm">
                  <FileText className="w-4 h-4 text-[#0F766E]" />
                  <span>Nomor Induk Berusaha (NIB)</span>
                </div>
                <p className="text-xs text-slate-500">Terdaftar Resmi</p>
                <p className="font-mono text-sm font-semibold text-[#0D213F] tabular-nums">
                  {siteSettings.nibNumber}
                </p>
              </div>

              <div className="sm:col-span-2 p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#0D213F]">Alamat Lembaga</p>
                  <p className="text-sm text-slate-600">{siteSettings.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visi & Misi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="p-7 rounded-2xl bg-[#0D213F] text-white space-y-4">
              <h3 className="font-display text-xl font-bold text-white">Visi ELITE Course</h3>
              <ol className="space-y-3 text-sm sm:text-base text-slate-200">
                {(siteSettings.visionItems || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="font-mono text-xs font-semibold text-[#F59E0B] mt-1 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="p-7 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-4">
              <h3 className="font-display text-xl font-bold text-[#0D213F]">Misi ELITE Course</h3>
              <ol className="space-y-3 text-sm sm:text-base text-slate-700">
                {(siteSettings.missionItems || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* D. KEUNGGULAN ELITE */}
      <section className="py-16 lg:py-20 bg-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold tracking-wider text-[#0F766E] uppercase">
              Keunggulan Lembaga
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0D213F]">
              Mengapa Belajar di ELITE Course
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(siteSettings.advantages || []).map((adv, idx) => {
              const Icons = [ShieldCheck, Users, Sparkles];
              const IconComp = Icons[idx % Icons.length];
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-7 space-y-4 shadow-xs"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#0D213F]/5 text-[#0D213F] flex items-center justify-center">
                    <IconComp className="w-5 h-5 text-[#0F766E]" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#0D213F]">{adv.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{adv.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* E. KELAS KAMI (GALERI DOKUMENTASI) */}
      <section id="kelas-kami" className="py-16 lg:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-[#0F766E] uppercase">
                Kelas Kami
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0D213F]">
                Dokumentasi Kegiatan dan Suasana Belajar
              </h2>
            </div>
            <p className="text-xs text-slate-500">Klik foto untuk memperbesar tampilan</p>
          </div>

          {galleryItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              Belum ada dokumentasi kelas yang dipublikasikan oleh admin.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleryItems.map((item) => {
                const photos = Array.isArray(item.images) && item.images.length > 0
                  ? item.images
                  : (item.imageUrl ? [item.imageUrl] : []);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setLightboxItem(item);
                      setLightboxIndex(0);
                    }}
                    className="group text-left bg-[#F8FAFC] border border-slate-200 rounded-2xl overflow-hidden hover:border-[#0F766E]/50 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F766E]"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <SafeImage
                        src={item.imageUrl || photos[0]}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                      {photos.length > 1 && (
                        <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-xs">
                          <Camera className="w-3.5 h-3.5 text-teal-300" />
                          <span>{photos.length} Foto</span>
                        </span>
                      )}
                    </div>
                    <div className="p-5 space-y-1.5">
                      {item.category && (
                        <p className="text-xs font-medium text-[#0F766E]">{item.category}</p>
                      )}
                      <h3 className="font-display font-bold text-base text-[#0D213F]">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* F. PROGRAM UNGGULAN */}
      <section id="program-unggulan" className="py-16 lg:py-20 bg-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-[#0F766E] uppercase">
                Pilihan Program
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0D213F]">
                Program Offline Class & Online Class
              </h2>
              <p className="text-sm text-slate-600">
                Pilih kelas tatap muka di Kampung Inggris Pare atau kelas daring interaktif sesuai jadwal yang tersedia.
              </p>
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setProgramTab('all')}
                className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  programTab === 'all'
                    ? 'bg-white text-[#0D213F] shadow-xs'
                    : 'text-slate-600 hover:text-[#0D213F]'
                }`}
              >
                Semua ({programs.length})
              </button>
              <button
                type="button"
                onClick={() => setProgramTab('offline')}
                className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  programTab === 'offline'
                    ? 'bg-white text-[#0D213F] shadow-xs'
                    : 'text-slate-600 hover:text-[#0D213F]'
                }`}
              >
                Offline Class
              </button>
              <button
                type="button"
                onClick={() => setProgramTab('online')}
                className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  programTab === 'online'
                    ? 'bg-white text-[#0D213F] shadow-xs'
                    : 'text-slate-600 hover:text-[#0D213F]'
                }`}
              >
                Online Class
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl bg-white border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visiblePrograms.map((prog) => {
                const levels = programLevels.filter((l) => l.programId === prog.id);
                const levelSummary =
                  prog.category === 'offline'
                    ? levels.length > 0
                      ? levels.map((l) => l.name).join(' · ')
                      : prog.isDraftIncomplete
                        ? 'Menunggu kelengkapan admin'
                        : 'Umum'
                    : `${prog.tutorCount || 1} Tutor · ${prog.studentCapacity || 1} Murid`;

                return (
                  <div
                    key={prog.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                        <SafeImage
                          src={prog.imageUrl}
                          alt={prog.title}
                          fallbackLabel={prog.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-6 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-[#0F766E]">
                            {prog.category === 'offline' ? 'Offline Class' : 'Online Class'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{levelSummary}</span>
                        </div>

                        <h3 className="font-display text-lg font-bold text-[#0D213F]">
                          {prog.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                          {prog.shortDescription}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-4">
                      {(() => {
                        let progDiscount = calculateEffectiveDiscount(prog.id, prog.basePrice, discounts);
                        let displayOriginalPrice = prog.basePrice;

                        // Jika promo diset pada level spesifik di bawah program ini,
                        // ambil diskon dari level terkait agar harga promo dan persentasenya tampil sama persis dengan detail program
                        if (!progDiscount.hasDiscount && levels.length > 0) {
                          const matchingBaseLvl = levels.find((l) => l.price === prog.basePrice);
                          if (matchingBaseLvl) {
                            const lvlDisc = calculateEffectiveDiscount(
                              prog.id,
                              matchingBaseLvl.price,
                              discounts,
                              matchingBaseLvl.id
                            );
                            if (lvlDisc.hasDiscount) {
                              progDiscount = lvlDisc;
                              displayOriginalPrice = matchingBaseLvl.price;
                            }
                          }

                          if (!progDiscount.hasDiscount) {
                            for (const lvl of levels) {
                              const lvlDisc = calculateEffectiveDiscount(
                                prog.id,
                                lvl.price,
                                discounts,
                                lvl.id
                              );
                              if (lvlDisc.hasDiscount) {
                                progDiscount = lvlDisc;
                                displayOriginalPrice = lvl.price;
                                break;
                              }
                            }
                          }
                        }

                        return (
                          <div className="flex items-baseline justify-between gap-2">
                            {progDiscount.hasDiscount ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-display text-lg font-bold text-[#0F766E] tabular-nums">
                                    {formatRupiah(progDiscount.finalPrice)}
                                  </span>
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                    {progDiscount.discountLabel}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-400 line-through tabular-nums block">
                                  {formatRupiah(displayOriginalPrice || progDiscount.originalPrice)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-display text-lg font-bold text-[#0D213F] tabular-nums">
                                {formatRupiah(prog.basePrice)}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 text-right">
                              {prog.durationLabel}
                            </span>
                          </div>
                        );
                      })()}

                      <div className="flex items-center gap-2.5">
                        <Link
                          to={prog.category === 'offline' ? '/program-offline' : '/program-online'}
                          className="flex-1 text-center px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
                        >
                          Detail Program
                        </Link>
                        {prog.isDraftIncomplete || !prog.isActive ? (
                          <span className="flex-1 text-center px-3.5 py-2.5 rounded-lg bg-slate-100 text-slate-500 text-xs sm:text-sm font-medium whitespace-nowrap">
                            Segera Hadir
                          </span>
                        ) : (
                          <Link
                            to={`/daftar?category=${prog.category}&program=${prog.id}`}
                            className="flex-1 text-center px-3.5 py-2.5 rounded-lg bg-[#0D213F] text-white text-xs sm:text-sm font-semibold hover:bg-[#15325C] transition-colors whitespace-nowrap"
                          >
                            Daftar
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/program-offline"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-[#0D213F] hover:border-[#0D213F] transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#0F766E]" />
              <span>Lihat Semua Jadwal Offline Class</span>
            </Link>
            <Link
              to="/program-online"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-[#0D213F] hover:border-[#0D213F] transition-colors"
            >
              <GraduationCap className="w-4 h-4 text-[#0F766E]" />
              <span>Lihat 4 Paket Online Class</span>
            </Link>
          </div>
        </div>
      </section>

      {/* G. PROFIL TUTOR */}
      <section id="tutor" className="py-16 lg:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold tracking-wider text-[#0F766E] uppercase">
              Tim Pengajar
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0D213F]">
              Profil Tutor ELITE Course
            </h2>
          </div>

          {tutors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Profil tutor akan segera ditambahkan oleh admin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutors.map((tutor) => (
                <div
                  key={tutor.id}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row lg:flex-col gap-5"
                >
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                    <SafeImage
                      src={tutor.photoUrl}
                      alt={tutor.name}
                      fallbackLabel={tutor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-bold text-[#0D213F]">{tutor.name}</h3>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>
                        <span className="font-semibold text-slate-700">Asal:</span> {tutor.origin}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">Pengalaman:</span>{' '}
                        {tutor.experience}
                      </p>
                    </div>
                    {tutor.bio && <p className="text-sm text-slate-600 leading-relaxed">{tutor.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* H. SERTIFIKAT ALUMNI */}
      <section id="alumni" className="py-16 lg:py-20 bg-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold tracking-wider text-[#0F766E] uppercase">
              Pencapaian Alumni
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0D213F]">
              Galeri Sertifikat Alumni
            </h2>
            <p className="text-sm text-slate-600">
              Menampilkan sertifikat dan pencapaian peserta yang telah disetujui untuk dipublikasikan oleh admin ELITE Course.
            </p>
          </div>

          {certificates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
              <Award className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-700">
                Belum ada sertifikat alumni yang dipublikasikan.
              </p>
              <p className="text-xs text-slate-500">
                Sertifikat hanya ditampilkan setelah admin menyetujui status publikasinya demi menjaga privasi peserta.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="text-xs text-[#0F766E] font-medium">
                      {cert.programName} · {cert.achievementType}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#0D213F]">
                        {cert.studentName}
                      </h3>
                      {cert.originOrProfession && (
                        <p className="text-xs text-slate-500">{cert.originOrProfession}</p>
                      )}
                    </div>

                    {cert.scoreFormat === 'single' ? (
                      <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">
                          {cert.singleScoreSystem || 'Skor'}
                        </span>
                        <span className="font-mono text-base font-bold text-[#0D213F] tabular-nums">
                          {cert.singleScoreValue || '-'}
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {cert.detailedScores?.speaking && (
                          <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-slate-200">
                            <span className="text-slate-500 block">Speaking</span>
                            <span className="font-mono font-semibold text-[#0D213F] tabular-nums">
                              {cert.detailedScores.speaking}
                            </span>
                          </div>
                        )}
                        {cert.detailedScores?.grammar && (
                          <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-slate-200">
                            <span className="text-slate-500 block">Grammar</span>
                            <span className="font-mono font-semibold text-[#0D213F] tabular-nums">
                              {cert.detailedScores.grammar}
                            </span>
                          </div>
                        )}
                        {cert.detailedScores?.vocabulary && (
                          <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-slate-200">
                            <span className="text-slate-500 block">Vocabulary</span>
                            <span className="font-mono font-semibold text-[#0D213F] tabular-nums">
                              {cert.detailedScores.vocabulary}
                            </span>
                          </div>
                        )}
                        {cert.detailedScores?.pronunciation && (
                          <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-slate-200">
                            <span className="text-slate-500 block">Pronunciation</span>
                            <span className="font-mono font-semibold text-[#0D213F] tabular-nums">
                              {cert.detailedScores.pronunciation}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {cert.fileUrl && (
                    <button
                      type="button"
                      onClick={() => setSelectedCert(cert)}
                      className="w-full py-2.5 px-4 rounded-lg border border-slate-200 text-xs font-semibold text-[#0D213F] hover:bg-slate-50 transition-colors"
                    >
                      Lihat Preview Sertifikat
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* I. FAQ */}
      <section id="faq" className="py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold tracking-wider text-[#0F766E] uppercase">
              Tanya Jawab
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0D213F]">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          {faqs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Belum ada pertanyaan FAQ yang ditambahkan admin.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl bg-[#F8FAFC] overflow-hidden">
              {faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className="bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      aria-expanded={isOpen}
                      className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <span className="font-display font-semibold text-sm sm:text-base text-[#0D213F]">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox Galeri Kegiatan (Multi-Foto Slider) */}
      {lightboxItem && (() => {
        const photos = Array.isArray(lightboxItem.images) && lightboxItem.images.length > 0
          ? lightboxItem.images
          : (lightboxItem.imageUrl ? [lightboxItem.imageUrl] : []);
        const activePhoto = photos[lightboxIndex] || photos[0] || lightboxItem.imageUrl;
        const hasMultiple = photos.length > 1;

        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setLightboxItem(null)}
          >
            <div
              className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-display font-bold text-base text-[#0D213F]">
                    {lightboxItem.title}
                  </h3>
                  {hasMultiple && (
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200/80 text-xs font-semibold tabular-nums">
                      {lightboxIndex + 1} / {photos.length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxItem(null)}
                  aria-label="Tutup lightbox"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Image Stage */}
              <div className="relative bg-slate-950 flex-1 min-h-[300px] max-h-[60vh] flex items-center justify-center overflow-hidden select-none">
                <SafeImage
                  src={activePhoto}
                  alt={`${lightboxItem.title} - Foto ${lightboxIndex + 1}`}
                  className="max-h-[60vh] w-auto max-w-full object-contain"
                />

                {/* Left / Right Navigation */}
                {hasMultiple && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
                      }
                      aria-label="Foto sebelumnya"
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
                      }
                      aria-label="Foto berikutnya"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Bottom Thumbnail Strip & Description */}
              <div className="p-4 bg-white border-t border-slate-100 space-y-3 shrink-0">
                {hasMultiple && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {photos.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLightboxIndex(idx)}
                        className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                          idx === lightboxIndex
                            ? 'border-[#0F766E] ring-2 ring-[#0F766E]/30 scale-105'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {lightboxItem.description && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {lightboxItem.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Preview Sertifikat */}
      {selectedCert && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedCert(null)}
        >
          <div
            className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-display font-bold text-base text-[#0D213F]">
                  {selectedCert.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCert.programName} · {selectedCert.achievementType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                aria-label="Tutup preview sertifikat"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-slate-50 flex flex-col items-center justify-center min-h-[280px]">
              {selectedCert.fileMimeType?.startsWith('image/') && selectedCert.fileUrl ? (
                <img
                  src={selectedCert.fileUrl}
                  alt={`Sertifikat ${selectedCert.studentName}`}
                  referrerPolicy="no-referrer"
                  className="max-h-[60vh] w-auto rounded-lg border border-slate-200"
                />
              ) : selectedCert.fileUrl ? (
                <div className="text-center space-y-3">
                  <FileText className="w-10 h-10 text-[#0D213F] mx-auto" />
                  <p className="text-sm text-slate-700">{selectedCert.fileName || 'Dokumen Sertifikat'}</p>
                  <a
                    href={selectedCert.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D213F] text-white text-sm font-medium"
                  >
                    Buka Dokumen Sertifikat
                  </a>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Preview dokumen tidak tersedia.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
