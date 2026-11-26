import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Calendar,
  CreditCard,
  ExternalLink,
  FileSpreadsheet,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Percent,
  RefreshCw,
  Settings,
  Sliders,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AdminEnrollmentsPanel } from '../../components/admin/AdminEnrollmentsPanel';
import { AdminMarketingContentPanel } from '../../components/admin/AdminMarketingContentPanel';
import { AdminProgramsPanel } from '../../components/admin/AdminProgramsPanel';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { useSiteData } from '../../contexts/SiteDataContext';
import { fetchAdminAllData, seedInitialData } from '../../lib/apiService';
import { formatDateTimeID, formatRupiah } from '../../lib/format';
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
} from '../../types/elite';

type AdminTab =
  | 'overview'
  | 'programs'
  | 'materials'
  | 'periods'
  | 'enrollments'
  | 'payments'
  | 'payment-methods'
  | 'discounts'
  | 'tutors'
  | 'certificates'
  | 'banner'
  | 'gallery'
  | 'faq'
  | 'settings';

export function AdminDashboardPage() {
  const { user, authReady, isAuthorizedAdmin, logout } = useAuth();
  const { reloadCatalog } = useSiteData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateRangeDays, setDateRangeDays] = useState<'all' | '7' | '30'>('all');

  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programLevels, setProgramLevels] = useState<ProgramLevel[]>([]);
  const [programMaterials, setProgramMaterials] = useState<ProgramMaterial[]>([]);
  const [registrationPeriods, setRegistrationPeriods] = useState<RegistrationPeriod[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await seedInitialData();
      const data = await fetchAdminAllData();
      setSiteSettings(data.siteSettings);
      setPrograms(data.programs);
      setProgramLevels(data.programLevels);
      setProgramMaterials(data.programMaterials);
      setRegistrationPeriods(data.registrationPeriods);
      setDiscounts(data.discounts);
      setPaymentMethods(data.paymentMethods);
      setEnrollments(data.enrollments);
      setPayments(data.payments);
      setTutors(data.tutors);
      setCertificates(data.certificates);
      setGalleryItems(data.galleryItems);
      setFaqs(data.faqs);
      setActivityLogs(data.activityLogs);
      await reloadCatalog();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memuat data admin.');
    } finally {
      setLoading(false);
    }
  }, [reloadCatalog, showToast]);

  useEffect(() => {
    if (authReady && isAuthorizedAdmin) {
      void loadAll();
    }
  }, [authReady, isAuthorizedAdmin, loadAll]);

  const toMillis = (val: unknown): number => {
    if (!val) return 0;
    if (typeof val === 'string') return new Date(val).getTime() || 0;
    if (typeof val === 'object' && val !== null && 'seconds' in val) {
      return Number((val as { seconds: number }).seconds) * 1000;
    }
    return 0;
  };

  const filteredEnrollments = useMemo(() => {
    if (dateRangeDays === 'all') return enrollments;
    const cutoff = Date.now() - Number(dateRangeDays) * 86400000;
    return enrollments.filter((e) => toMillis(e.createdAt) >= cutoff);
  }, [enrollments, dateRangeDays]);

  const filteredPayments = useMemo(() => {
    if (dateRangeDays === 'all') return payments;
    const cutoff = Date.now() - Number(dateRangeDays) * 86400000;
    return payments.filter((p) => toMillis(p.createdAt) >= cutoff);
  }, [payments, dateRangeDays]);

  const stats = useMemo(() => {
    const newCount = filteredEnrollments.filter(
      (e) => e.enrollmentStatus === 'Baru' || e.enrollmentStatus === 'Menunggu Pembayaran'
    ).length;
    const confirmedCount = filteredEnrollments.filter(
      (e) => e.enrollmentStatus === 'Dikonfirmasi'
    ).length;
    const pendingPaymentsCount = filteredPayments.filter(
      (p) => p.status === 'Menunggu Verifikasi'
    ).length;
    return {
      totalPrograms: programs.length,
      totalEnrollments: filteredEnrollments.length,
      newEnrollments: newCount,
      confirmedEnrollments: confirmedCount,
      pendingPayments: pendingPaymentsCount,
    };
  }, [programs, filteredEnrollments, filteredPayments]);

  const enrollmentChartBars = useMemo(() => {
    const statuses = [
      'Baru',
      'Menunggu Pembayaran',
      'Menunggu Verifikasi',
      'Dikonfirmasi',
      'Ditolak',
    ];
    const maxVal = Math.max(
      1,
      ...statuses.map((st) => filteredEnrollments.filter((e) => e.enrollmentStatus === st).length)
    );
    return statuses.map((st) => {
      const count = filteredEnrollments.filter((e) => e.enrollmentStatus === st).length;
      return { label: st, count, pct: Math.round((count / maxVal) * 100) };
    });
  }, [filteredEnrollments]);

  const paymentChartBars = useMemo(() => {
    const statuses: Array<PaymentRecord['status']> = [
      'Menunggu Verifikasi',
      'Berhasil',
      'Ditolak',
    ];
    const maxVal = Math.max(
      1,
      ...statuses.map((st) => filteredPayments.filter((p) => p.status === st).length)
    );
    return statuses.map((st) => {
      const count = filteredPayments.filter((p) => p.status === st).length;
      const totalAmt = filteredPayments
        .filter((p) => p.status === st)
        .reduce((acc, cur) => acc + Number(cur.transferAmount || 0), 0);
      return { label: st, count, totalAmt, pct: Math.round((count / maxVal) * 100) };
    });
  }, [filteredPayments]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-sm text-slate-600">
        Memeriksa sesi admin...
      </div>
    );
  }

  if (!user || !isAuthorizedAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'programs', label: 'Kelola Program', icon: BookOpen },
    { id: 'materials', label: 'Kelola Materi & Level', icon: Layers },
    { id: 'periods', label: 'Periode Pendaftaran', icon: Calendar },
    { id: 'enrollments', label: 'Kelola Pendaftar', icon: Users },
    { id: 'payments', label: 'Pembayaran', icon: CreditCard },
    { id: 'payment-methods', label: 'Metode Pembayaran', icon: Wallet },
    { id: 'discounts', label: 'Diskon dan Promo', icon: Percent },
    { id: 'tutors', label: 'Profil Tutor', icon: UserCheck },
    { id: 'certificates', label: 'Sertifikat', icon: Award },
    { id: 'banner', label: 'Banner Website', icon: Sliders },
    { id: 'gallery', label: 'Galeri Kelas', icon: ImageIcon },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'settings', label: 'Pengaturan Website', icon: Settings },
  ];

  const activeTitle = navItems.find((i) => i.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Backdrop overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar Desktop + Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0D213F] text-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <span className="font-display font-bold text-white text-base tracking-tight">
            ELITE ADMIN
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors text-left ${
                  active
                    ? 'bg-[#0F766E] text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
          <div className="px-3 py-1.5 text-xs text-slate-400 truncate">{user.email}</div>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-950/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700"
              aria-label="Buka menu admin"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-base sm:text-lg text-[#0D213F] truncate">
              {activeTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Muat Ulang</span>
            </button>
            <Link
              to="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D213F] text-white text-xs font-semibold hover:bg-[#15325C]"
            >
              <span>Lihat Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {loading && !siteSettings ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              Memuat data manajemen ELITE Course...
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">
                      Ringkasan operasional aktual dari database lokal ELITE Course.
                    </p>
                    <select
                      value={dateRangeDays}
                      onChange={(e) => setDateRangeDays(e.target.value as 'all' | '7' | '30')}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium self-start"
                    >
                      <option value="all">Semua Periode</option>
                      <option value="7">7 Hari Terakhir</option>
                      <option value="30">30 Hari Terakhir</option>
                    </select>
                  </div>

                  {/* 5 Statistik Utama */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
                      <p className="text-xs text-slate-500">Total Program</p>
                      <p className="font-display text-2xl font-bold text-[#0D213F] tabular-nums">
                        {stats.totalPrograms}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
                      <p className="text-xs text-slate-500">Total Pendaftar</p>
                      <p className="font-display text-2xl font-bold text-[#0D213F] tabular-nums">
                        {stats.totalEnrollments}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
                      <p className="text-xs text-slate-500">Pendaftar Baru</p>
                      <p className="font-display text-2xl font-bold text-[#D97706] tabular-nums">
                        {stats.newEnrollments}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
                      <p className="text-xs text-slate-500">Pendaftar Dikonfirmasi</p>
                      <p className="font-display text-2xl font-bold text-[#0F766E] tabular-nums">
                        {stats.confirmedEnrollments}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
                      <p className="text-xs text-slate-500">Pembayaran Pending</p>
                      <p className="font-display text-2xl font-bold text-red-600 tabular-nums">
                        {stats.pendingPayments}
                      </p>
                    </div>
                  </div>

                  {/* Grafik Pendaftaran & Grafik Pembayaran */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                      <h2 className="font-display font-bold text-base text-[#0D213F]">
                        Distribusi Status Pendaftaran
                      </h2>
                      <div className="space-y-3">
                        {enrollmentChartBars.map((bar) => (
                          <div key={bar.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-slate-700">{bar.label}</span>
                              <span className="font-mono font-semibold text-[#0D213F] tabular-nums">
                                {bar.count}
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#0D213F]"
                                style={{ width: `${bar.pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                      <h2 className="font-display font-bold text-base text-[#0D213F]">
                        Ringkasan Status Pembayaran
                      </h2>
                      <div className="space-y-3">
                        {paymentChartBars.map((bar) => (
                          <div key={bar.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-slate-700">{bar.label}</span>
                              <span className="font-mono font-semibold text-[#0F766E] tabular-nums">
                                {bar.count} transaksi ({formatRupiah(bar.totalAmt)})
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#0F766E]"
                                style={{ width: `${bar.pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Daftar Pendaftaran Terbaru & Pembayaran Perlu Verifikasi */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-display font-bold text-base text-[#0D213F]">
                          Pendaftaran Terbaru
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('enrollments')}
                          className="text-xs font-semibold text-[#0F766E] hover:underline"
                        >
                          Lihat Semua
                        </button>
                      </div>
                      {filteredEnrollments.length === 0 ? (
                        <p className="text-sm text-slate-500">Belum ada pendaftar.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 text-sm">
                          {filteredEnrollments.slice(0, 5).map((e) => (
                            <div key={e.id} className="py-2.5 flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#0D213F]">{e.participantName}</p>
                                <p className="text-xs text-slate-500">
                                  {e.registrationCode} · {e.programName}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                {e.enrollmentStatus}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-display font-bold text-base text-[#0D213F]">
                          Pembayaran Perlu Verifikasi
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('payments')}
                          className="text-xs font-semibold text-[#0F766E] hover:underline"
                        >
                          Kelola Pembayaran
                        </button>
                      </div>
                      {filteredPayments.filter((p) => p.status === 'Menunggu Verifikasi').length ===
                      0 ? (
                        <p className="text-sm text-slate-500">
                          Tidak ada pembayaran yang menunggu verifikasi.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100 text-sm">
                          {filteredPayments
                            .filter((p) => p.status === 'Menunggu Verifikasi')
                            .slice(0, 5)
                            .map((p) => (
                              <div
                                key={p.id}
                                className="py-2.5 flex items-center justify-between gap-3"
                              >
                                <div>
                                  <p className="font-semibold text-[#0D213F]">{p.senderName}</p>
                                  <p className="text-xs text-slate-500">
                                    {p.registrationCode} · {p.paymentMethodName}
                                  </p>
                                </div>
                                <span className="font-mono font-bold text-[#0F766E] tabular-nums">
                                  {formatRupiah(p.transferAmount)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Log Aktivitas Admin */}
                  {activityLogs.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                      <div className="flex items-center gap-2 text-[#0D213F]">
                        <FileSpreadsheet className="w-4 h-4 text-[#0F766E]" />
                        <h2 className="font-display font-bold text-base">
                          Catatan Aktivitas Admin Terbaru
                        </h2>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {activityLogs
                          .slice()
                          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
                          .slice(0, 6)
                          .map((log) => (
                            <div key={log.id} className="py-2 flex justify-between gap-4">
                              <span className="text-slate-700">{log.summary}</span>
                              <span className="text-slate-400 shrink-0">
                                {log.actorEmail} · {formatDateTimeID(log.createdAt)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(activeTab === 'programs' ||
                activeTab === 'materials' ||
                activeTab === 'periods') && (
                <AdminProgramsPanel
                  activeSection={activeTab}
                  programs={programs}
                  programLevels={programLevels}
                  programMaterials={programMaterials}
                  registrationPeriods={registrationPeriods}
                  onRefresh={loadAll}
                />
              )}

              {(activeTab === 'enrollments' ||
                activeTab === 'payments' ||
                activeTab === 'payment-methods') && (
                <AdminEnrollmentsPanel
                  activeSection={activeTab}
                  programs={programs}
                  programLevels={programLevels}
                  registrationPeriods={registrationPeriods}
                  discounts={discounts}
                  enrollments={enrollments}
                  payments={payments}
                  paymentMethods={paymentMethods}
                  onRefresh={loadAll}
                />
              )}

              {(activeTab === 'discounts' ||
                activeTab === 'tutors' ||
                activeTab === 'certificates' ||
                activeTab === 'banner' ||
                activeTab === 'gallery' ||
                activeTab === 'faq' ||
                activeTab === 'settings') &&
                siteSettings && (
                  <AdminMarketingContentPanel
                    activeSection={activeTab}
                    siteSettings={siteSettings}
                    programs={programs}
                    programLevels={programLevels}
                    discounts={discounts}
                    tutors={tutors}
                    certificates={certificates}
                    galleryItems={galleryItems}
                    faqs={faqs}
                    onRefresh={loadAll}
                  />
                )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
