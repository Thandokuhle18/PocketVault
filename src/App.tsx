import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Welcome from "./pages/Welcome";
import { ForgotPasswordPage, LogInPage, SignUpPage } from "./pages/AuthPages";
import { AuthProvider, useAuth } from "./lib/auth";
import BusinessSetup from "./pages/BusinessSetup";
import Ledger from "./pages/Ledger";
import Planner from "./pages/Planner";
import Bills from "./pages/Bills";
import Dashboard from "./pages/Dashboard";

function Protected({ title, children }: { title: string; children?: React.ReactNode }) {
  const { session, loading, membershipLoading, membership, signOut } = useAuth(); const location = useLocation();
  if (loading || (session && membershipLoading)) return <main className="flex min-h-screen items-center justify-center text-moss" role="status">Loading…</main>;
  if (!session) return <Navigate to="/log-in" replace state={{ from: location.pathname }} />;
  if (membership === null && location.pathname !== "/setup") return <Navigate to="/setup" replace />;
  if (membership?.role === "Staff" && !["/ledger", "/bills"].includes(location.pathname)) return <Navigate to="/ledger" replace />;
  if (children) return <>{children}</>;
  const toast = (location.state as { toast?: string } | null)?.toast;
  return <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-cream px-4">{toast && <p role="status" className="rounded-control border border-success/20 bg-success/5 p-3 text-body text-success">{toast}</p>}<h1 className="text-title text-vault">{title}</h1>{location.pathname === "/dashboard" && membership?.role === "Owner" && <div className="flex flex-wrap justify-center gap-3"><Link className="rounded-control bg-vault px-6 py-3 font-semibold text-white" to="/planner">Open planner</Link><Link className="rounded-control border-2 border-vault px-6 py-3 font-semibold text-vault" to="/ledger">Open ledger</Link><Link className="rounded-control border-2 border-vault px-6 py-3 font-semibold text-vault" to="/bills">Bills</Link></div>}{location.pathname === "/dashboard" && membership?.role === "Staff" && <Link className="rounded-control border-2 border-vault px-6 py-3 font-semibold text-vault" to="/bills">Bills</Link>}<button onClick={()=>void signOut()} className="h-12 rounded-control bg-vault px-6 font-semibold text-white">Log out</button></main>;
}

function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Welcome />} />
    <Route path="/sign-up" element={<SignUpPage />} />
    <Route path="/log-in" element={<LogInPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/privacy" element={<main className="mx-auto max-w-xl p-6"><h1 className="text-title">Privacy Notice</h1><p className="mt-4">PocketVault stores your email and name to provide account access and identify entries. Your business members can see information as described in the PocketVault product privacy terms. You can request account deletion in Settings.</p></main>} />
    <Route path="/setup" element={<Protected title="Business setup"><BusinessSetup /></Protected>} />
    <Route path="/dashboard" element={<Protected title="Dashboard"><Dashboard /></Protected>} />
    <Route path="/planner" element={<Protected title="Planner"><Planner /></Protected>} />
    <Route path="/ledger" element={<Protected title="Ledger"><Ledger /></Protected>} />
    <Route path="/bills" element={<Protected title="Bills"><Bills /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() { return <AuthProvider><AppRoutes /></AuthProvider>; }
