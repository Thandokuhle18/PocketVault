import { Navigate, Route, Routes } from "react-router-dom";
import Welcome from "./pages/Welcome";

function ComingSoon({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-title text-vault">{title}</h1>
      <p className="text-body text-moss">This screen is built in a later pull request.</p>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/sign-up" element={<ComingSoon title="Create account" />} />
      <Route path="/log-in" element={<ComingSoon title="Log in" />} />
      <Route path="/privacy" element={<ComingSoon title="Privacy Notice" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
