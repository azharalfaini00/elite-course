import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, MessageCircle, Phone, ExternalLink } from 'lucide-react';
import { useSiteData } from '../contexts/SiteDataContext';

export function PublicFooter() {
  const { siteSettings } = useSiteData();
  const waDigits = (siteSettings.whatsappNumber || siteSettings.phone || '6285650809091').replace(/[^0-9]/g, '');
  const normalizedWa = waDigits.startsWith('0') ? `62${waDigits.slice(1)}` : waDigits;

  return (
    <footer id="kontak" className="bg-[#0D213F] text-slate-200 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Kolom 1: Identitas */}
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-white tracking-tight">
              {siteSettings.brandName || 'ELITE COURSE'}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {siteSettings.instituteFullName} · Berdiri sejak {siteSettings.foundedYear || '2019'}.
            </p>
            <div className="text-xs text-slate-400 space-y-1 tabular-nums">
              <p>No. Ijin FKB: {siteSettings.fkbPermitNumber}</p>
              <p>NIB: {siteSettings.nibNumber}</p>
            </div>
          </div>

          {/* Kolom 2: Kontak Resmi */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-white">Kontak & Lokasi</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#F59E0B] shrink-0 mt-1" />
                <span>{siteSettings.address}</span>
              </li>
              <li className="flex items-center gap-2.5 tabular-nums">
                <Phone className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>{siteSettings.phone}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span className="break-all">{siteSettings.email}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>{siteSettings.officeHours}</span>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Navigasi */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-white">Navigasi Halaman</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Beranda
                </Link>
              </li>
              <li>
                <Link to="/program-offline" className="hover:text-white transition-colors">
                  Program Offline Class
                </Link>
              </li>
              <li>
                <Link to="/program-online" className="hover:text-white transition-colors">
                  Program Online Class
                </Link>
              </li>
              <li>
                <Link to="/daftar" className="hover:text-white transition-colors">
                  Formulir Pendaftaran
                </Link>
              </li>
              <li>
                <Link to="/cek-status" className="hover:text-white transition-colors">
                  Cek Status & Pembayaran
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 4: Hubungi & Media Sosial */}
          <div className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-white">Hubungi Kami</h3>
            <div className="flex flex-col gap-2.5">
              <a
                href={`https://wa.me/${normalizedWa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F766E] text-white text-sm font-medium hover:bg-[#0D9488] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Resmi</span>
              </a>
              <a
                href={`mailto:${siteSettings.email}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-100 text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>Kirim Email</span>
              </a>
            </div>

            {siteSettings.socialLinks && siteSettings.socialLinks.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-medium text-slate-400">Media Sosial Resmi</p>
                <div className="flex flex-wrap gap-3">
                  {siteSettings.socialLinks.map((soc, idx) => (
                    <a
                      key={`${soc.platform}-${idx}`}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-200 hover:text-[#F59E0B] transition-colors"
                    >
                      <span>{soc.label || soc.platform}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} {siteSettings.brandName || 'ELITE COURSE'}. Seluruh hak cipta dilindungi.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/cek-status" className="hover:text-slate-200 transition-colors">
              Lacak Pendaftaran
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/admin/login" className="hover:text-slate-200 transition-colors">
              Portal Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
