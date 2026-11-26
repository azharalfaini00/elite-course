import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useSiteData } from '../contexts/SiteDataContext';

export function PublicNavbar() {
  const { siteSettings } = useSiteData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [programMenuOpen, setProgramMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setLogoError(false);
  }, [siteSettings.logoUrl]);

  const navLinkClass =
    'inline-flex items-center h-8 text-sm font-medium leading-none text-slate-600 hover:text-[#0D213F] transition-colors whitespace-nowrap shrink-0';

  const handleSectionLink = (sectionId: string) => {
    setMobileOpen(false);
    setProgramMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`);
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-[#0D213F] font-display font-bold text-base lg:text-lg tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
        >
          {siteSettings.logoUrl && !logoError ? (
            <>
              <img
                src={siteSettings.logoUrl}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-8 lg:h-9 w-auto max-w-[140px] object-contain shrink-0"
              />
              <span className="text-[#0D213F] font-bold">{siteSettings.brandName || 'ELITE COURSE'}</span>
            </>
          ) : (
            <span>{siteSettings.brandName || 'ELITE COURSE'}</span>
          )}
        </Link>

        {/* Desktop Nav Links */}
        <nav
          aria-label="Navigasi utama"
          className="hidden lg:flex items-center gap-4 xl:gap-5"
        >
          <Link
            to="/"
            className={navLinkClass}
          >
            Beranda
          </Link>
          <button
            type="button"
            onClick={() => handleSectionLink('tentang-kami')}
            className={navLinkClass}
          >
            Tentang Kami
          </button>

          <div
            className="relative inline-flex items-center h-8"
            onMouseEnter={() => setProgramMenuOpen(true)}
            onMouseLeave={() => setProgramMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setProgramMenuOpen((v) => !v)}
              aria-expanded={programMenuOpen}
              className={`${navLinkClass} gap-1`}
            >
              <span>Program</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {programMenuOpen && (
              <div className="absolute left-0 top-full pt-2 w-52 z-50">
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg py-1.5">
                  <Link
                    to="/program-offline"
                    onClick={() => setProgramMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#0D213F]"
                  >
                    Offline Class (Pare)
                  </Link>
                  <Link
                    to="/program-online"
                    onClick={() => setProgramMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#0D213F]"
                  >
                    Online Class (Live)
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleSectionLink('program-unggulan')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#0D213F]"
                  >
                    Ringkasan Program
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleSectionLink('kelas-kami')}
            className={navLinkClass}
          >
            Kelas Kami
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('tutor')}
            className={navLinkClass}
          >
            Tutor
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('alumni')}
            className={navLinkClass}
          >
            Alumni
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('faq')}
            className={navLinkClass}
          >
            FAQ
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('kontak')}
            className={navLinkClass}
          >
            Kontak
          </button>
          <Link
            to="/cek-status"
            className={`${navLinkClass} text-[#0F766E] font-semibold`}
          >
            Cek Status
          </Link>
        </nav>

        {/* Primary CTA + Mobile Toggle */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <Link
            to="/daftar"
            className="inline-flex items-center justify-center px-3.5 lg:px-4 py-2 rounded-lg bg-[#0D213F] text-white text-xs sm:text-sm font-semibold tracking-wide hover:bg-[#15325C] transition-colors whitespace-nowrap shrink-0"
          >
            <span className="hidden sm:inline">DAFTAR SEKARANG</span>
            <span className="sm:hidden">Daftar</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-[#0D213F] hover:bg-slate-50"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer + Backdrop */}
      {mobileOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="lg:hidden fixed inset-0 top-16 bg-black/20 z-30"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <div className="lg:hidden relative z-40 bg-white border-b border-slate-200 px-4 py-4 space-y-1">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Beranda
            </Link>
            <button
              type="button"
              onClick={() => handleSectionLink('tentang-kami')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tentang Kami
            </button>
            <Link
              to="/program-offline"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Program Offline Class
            </Link>
            <Link
              to="/program-online"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Program Online Class
            </Link>
            <button
              type="button"
              onClick={() => handleSectionLink('kelas-kami')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Kelas Kami
            </button>
            <button
              type="button"
              onClick={() => handleSectionLink('tutor')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tutor
            </button>
            <button
              type="button"
              onClick={() => handleSectionLink('alumni')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Alumni
            </button>
            <button
              type="button"
              onClick={() => handleSectionLink('faq')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => handleSectionLink('kontak')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Kontak
            </button>
            <Link
              to="/cek-status"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#0F766E] hover:bg-teal-50"
            >
              Cek Status & Pembayaran
            </Link>
            <div className="pt-2">
              <Link
                to="/daftar"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-4 py-3 rounded-lg bg-[#0D213F] text-white text-sm font-semibold"
              >
                DAFTAR SEKARANG
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
