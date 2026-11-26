import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicFooter } from './components/PublicFooter';
import { PublicNavbar } from './components/PublicNavbar';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { SiteDataProvider } from './contexts/SiteDataContext';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { EnrollPage } from './pages/EnrollPage';
import { HomePage } from './pages/HomePage';
import { OfflineProgramsPage } from './pages/OfflineProgramsPage';
import { OnlineProgramsPage } from './pages/OnlineProgramsPage';
import { TrackingPaymentPage } from './pages/TrackingPaymentPage';

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SiteDataProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/program-offline" element={<OfflineProgramsPage />} />
                  <Route path="/program-online" element={<OnlineProgramsPage />} />
                  <Route path="/daftar" element={<EnrollPage />} />
                  <Route path="/cek-status" element={<TrackingPaymentPage />} />
                </Route>
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </SiteDataProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
