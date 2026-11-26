import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSiteData } from '../../contexts/SiteDataContext';

export function AdminLoginPage() {
  const { user, authReady, isAuthorizedAdmin, adminCheckError, checkingAdmin, login, logout } =
    useAuth();
  const { siteSettings } = useSiteData();
  const navigate = useNavigate();

  const [email, setEmail] = useState('elitecourse935@gmail.com');
  const [password, setPassword] = useState('eliteadmin2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (authReady && isAuthorizedAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [authReady, isAuthorizedAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      await login(email, password);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Gagal masuk. Periksa kembali email dan password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D213F] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0D213F] text-[#F59E0B] flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0D213F]">
            {siteSettings.brandName || 'ELITE COURSE'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Portal Manajemen Administrator — Sistem Mandiri (Standalone)
          </p>
        </div>

        {/* Credentials Info Badge */}
        <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 text-xs text-teal-900 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[#0F766E]">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Kredensial Akses Administrator Resmi</span>
          </div>
          <p className="text-slate-600">
            Email: <strong className="text-slate-800 font-mono">elitecourse935@gmail.com</strong>
          </p>
          <p className="text-slate-600">
            Password Default: <strong className="text-slate-800 font-mono">eliteadmin2026</strong>
          </p>
        </div>

        {/* Error Alert */}
        {(loginError || adminCheckError) && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Akses Ditolak</p>
              <p>{loginError || adminCheckError}</p>
            </div>
          </div>
        )}

        {/* Active Session Status */}
        {user && isAuthorizedAdmin ? (
          <div className="space-y-3">
            <p className="text-xs text-center text-slate-600">
              Sedang aktif sebagai <span className="font-semibold text-[#0D213F]">{user.email}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="flex-1 py-3 px-4 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors"
              >
                Buka Dashboard
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="py-3 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Keluar
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Administrator <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@elitecourse.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password Administrator <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={checkingAdmin}
              className="w-full py-3.5 px-5 rounded-xl bg-[#0D213F] text-white font-semibold text-sm hover:bg-[#15325C] disabled:opacity-50 transition-colors flex items-center justify-center gap-2.5 shadow-md"
            >
              <LogIn className="w-4 h-4" />
              <span>{checkingAdmin ? 'Memverifikasi Kredensial...' : 'Masuk ke Dashboard Admin'}</span>
            </button>
          </form>
        )}

        {/* Back Link */}
        <div className="pt-2 text-center border-t border-slate-100">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0D213F]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Website Publik</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
