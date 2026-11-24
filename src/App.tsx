import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Welcome from "./pages/Welcome";
import { ForgotPasswordPage, LogInPage, SignUpPage } from "./pages/AuthPages";
import { AuthProvider, useAuth } from "./lib/auth";
import BusinessSetup from "./pages/BusinessSetup";

function Protected({ title, children }: { title: string; children?: React.ReactNode }) {
  const { session, loading, membershipLoading, membership, signOut } = useAuth(); const location = useLocation();
  if (loading || (session && membershipLoading)) return <main className="flex min-h-screen items-center justify-center text-moss" role="status">Loading…</main>;
  if (!session) return <Navigate to="/log-in" replace state={{ from: location.pathname }} />;
  if (membership === null && location.pathname !== "/setup") return <Navigate to="/setup" replace />;
  if (membership?.role === "Staff" && location.pathname !== "/ledger") return <Navigate to="/ledger" replace />;
  if (membership?.role === "Owner" && location.pathname === "/ledger") return <Navigate to="/dashboard" replace />;
  if (children) return <>{children}</>;
  const toast = (location.state as { toast?: string } | null)?.toast;
  return <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-cream px-4">{toast && <p role="status" className="rounded-control border border-success/20 bg-success/5 p-3 text-body text-success">{toast}</p>}<h1 className="text-title text-vault">{title}</h1><button onClick={()=>void signOut()} className="h-12 rounded-control bg-vault px-6 font-semibold text-white">Log out</button></main>;
}

function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Welcome />} />
    <Route path="/sign-up" element={<SignUpPage />} />
    <Route path="/log-in" element={<LogInPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/privacy" element={<main className="mx-auto max-w-xl p-6"><h1 className="text-title">Privacy Notice</h1><p className="mt-4">PocketVault stores your email and name to provide account access and identify entries. Your business members can see information as described in the PocketVault product privacy terms. You can request account deletion in Settings.</p></main>} />
    <Route path="/setup" element={<Protected title="Business setup"><BusinessSetup /></Protected>} />
    <Route path="/dashboard" element={<Protected title="Dashboard" />} />
    <Route path="/ledger" element={<Protected title="Ledger" />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() { return <AuthProvider><AppRoutes /></AuthProvider>; }
