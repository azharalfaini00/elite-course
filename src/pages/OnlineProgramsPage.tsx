import { Link } from 'react-router-dom';
import { ArrowRight, Award, Calendar, CheckCircle2, Clock, Users } from 'lucide-react';
import { useSiteData } from '../contexts/SiteDataContext';
import { formatRupiah } from '../lib/format';
import { calculateEffectiveDiscount } from '../lib/pricingHelper';

export function OnlineProgramsPage() {
  const { programs, discounts, siteSettings } = useSiteData();

  const onlinePrograms = programs
    .filter((p) => p.category === 'online' && p.isActive)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="bg-[#0D213F] text-white rounded-2xl p-8 sm:p-10 space-y-5">
          <div className="text-xs font-semibold text-teal-300 tracking-wider uppercase">
            Online Class ELITE Course
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-white">
            Program Pembelajaran Bahasa Inggris Online
          </h1>
          <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
            {siteSettings.onlineDescription ||
              'Target pembelajaran disesuaikan dengan kebutuhan dan level peserta.'}
          </p>

          <div className="pt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-200">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
              Grammar
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
              Speaking
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
              Pronunciation
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
              Materi lain sesuai kebutuhan peserta
            </span>
          </div>
        </div>

        {/* 4 Pricing Cards */}
        {onlinePrograms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Belum ada paket Online Class yang aktif.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {onlinePrograms.map((pkg) => {
              const billingDescription =
                pkg.unitBillingMode === 'unconfirmed'
                  ? 'Satuan biaya (per siswa / per paket) menunggu konfirmasi admin'
                  : pkg.unitBillingMode === 'per_package'
                    ? 'Total per paket kelompok'
                    : 'Biaya per siswa';
              const pkgDiscount = calculateEffectiveDiscount(pkg.id, pkg.basePrice, discounts);

              return (
                <div
                  key={pkg.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs"
                >
                  {pkg.imageUrl && (
                    <div className="w-full h-44 bg-slate-100 overflow-hidden border-b border-slate-100">
                      <img
                        src={pkg.imageUrl}
                        alt={pkg.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col justify-between space-y-6 flex-1">
                    <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#0F766E]">Online Class</p>
                      <h2 className="font-display text-lg font-bold text-[#0D213F]">
                        {pkg.title}
                      </h2>
                    </div>

                    <div className="pb-4 border-b border-slate-100 space-y-1">
                      {pkgDiscount.hasDiscount ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="font-display text-2xl font-bold text-[#0F766E] tabular-nums">
                              {formatRupiah(pkgDiscount.finalPrice)}
                            </p>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              {pkgDiscount.discountLabel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-through tabular-nums">
                            {formatRupiah(pkgDiscount.originalPrice)}
                          </p>
                        </div>
                      ) : (
                        <p className="font-display text-2xl font-bold text-[#0D213F] tabular-nums">
                          {formatRupiah(pkg.basePrice)}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">{billingDescription}</p>
                    </div>

                    <ul className="space-y-2.5 text-sm text-slate-600">
                      <li className="flex items-start gap-2.5">
                        <Users className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                        <span>
                          {pkg.tutorCount || 1} Tutor · {pkg.studentCapacity || 1} Murid
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Calendar className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                        <span>
                          {pkg.meetingCount || 10} kali pertemuan · {pkg.durationLabel}
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                        <span>Durasi {pkg.durationPerMeetingMinutes || 60} menit per pertemuan</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                        <span>Materi menyesuaikan keinginan peserta & jadwal disepakati di awal</span>
                      </li>
                      {pkg.certificateIncluded !== false && (
                        <li className="flex items-start gap-2.5">
                          <Award className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                          <span>Mendapatkan sertifikat bahasa Inggris</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <Link
                    to={`/daftar?category=online&program=${pkg.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0D213F] text-white text-sm font-semibold hover:bg-[#15325C] transition-colors"
                  >
                    <span>Daftar Paket Ini</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
