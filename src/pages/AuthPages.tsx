import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { getPostLoginPath, isValidEmail, isValidName, isValidPassword } from "../lib/auth-validation";
import { supabase } from "../lib/supabase";

const inputClass = "h-12 w-full rounded-control border border-sage bg-white px-4 text-body text-ink outline-none focus:border-vault focus:ring-2 focus:ring-vault/20";
const buttonClass = "h-12 w-full rounded-control bg-vault px-5 font-semibold text-white hover:bg-vault-dark disabled:cursor-not-allowed disabled:bg-sage";

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col bg-cream px-5 pb-8 pt-4 sm:justify-center sm:py-8">
    <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-sm flex-col sm:min-h-0">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-control border border-sage bg-white text-heading text-vault shadow-soft">←</Link>
        <h1 className="text-title text-ink">{title}</h1>
      </header>{children}
    </section>
  </main>;
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="mb-4 rounded-control border border-danger/30 bg-danger/5 p-3 text-body text-danger">{children}</p>;
}

export function SignUpPage() {
  const { signUp } = useAuth(); const navigate = useNavigate();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [adult, setAdult] = useState(false); const [privacy, setPrivacy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [touchedPassword, setTouchedPassword] = useState(false);
  const valid = isValidName(name) && isValidEmail(email) && isValidPassword(password) && adult && privacy;
  async function submit(event: FormEvent) { event.preventDefault(); if (!valid) return; setBusy(true); setError("");
    const { error: authError } = await signUp(name, email, password); setBusy(false);
    if (authError) setError(/already|registered/i.test(authError.message) ? "This email already has an account. Log in instead?" : "Something went wrong. Try again.");
    else navigate("/log-in?verify=1");
  }
  return <AuthShell title="Create account"><form onSubmit={submit} className="flex flex-1 flex-col">
    {error && <ErrorBanner>{error} {error.includes("Log in") && <Link className="font-semibold underline" to="/log-in">Log in</Link>}</ErrorBanner>}
    <div className="space-y-4">
      <label className="block text-small font-semibold text-ink">Full name<input className={`${inputClass} mt-1`} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} aria-label="Full name" maxLength={60} required /></label>
      <label className="block text-small font-semibold text-ink">Email address<input className={`${inputClass} mt-1`} type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} aria-label="Email address" required /></label>
      <label className="block text-small font-semibold text-ink">Password<span className="relative mt-1 block"><input className={`${inputClass} pr-14 ${touchedPassword && !isValidPassword(password) ? "border-danger" : ""}`} type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} onBlur={()=>setTouchedPassword(true)} aria-label="Password" aria-describedby="password-rule" required /><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-0 h-12 px-2 text-small text-vault" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></span>{touchedPassword && !isValidPassword(password) && <span id="password-rule" className="mt-1 block text-small text-danger">At least 8 characters, including a number.</span>}</label>
    </div>
    <div className="mt-6 space-y-4 text-body"><label className="flex min-h-6 items-center gap-3"><input className="h-6 w-6 accent-vault" type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)} />I am 18 or older</label><label className="flex min-h-6 items-center gap-3"><input className="h-6 w-6 accent-vault" type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)} /> <span>I agree to the <Link to="/privacy" className="font-semibold text-vault underline">Privacy Notice</Link></span></label></div>
    <div className="mt-auto pt-8"><button className={buttonClass} type="submit" disabled={!valid || busy}>{busy ? "Creating account…" : "Create account"}</button><p className="mt-5 text-center"><Link to="/log-in" className="font-semibold text-vault underline">Log in</Link></p></div>
  </form></AuthShell>;
}

export function LogInPage() {
  const { signIn, loadMembership } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const lockKey = "pocketvault-login-lock"; const [lockedUntil,setLockedUntil]=useState(()=>Number(sessionStorage.getItem(lockKey) || 0));
  const locked = lockedUntil > Date.now();
  async function submit(event:FormEvent){event.preventDefault();if(!isValidEmail(email)||!password||locked)return;setBusy(true);setError("");
    const {error:authError}=await signIn(email,password);setBusy(false);
    if(authError){if(/not confirmed|email_not_confirmed/i.test(authError.message)){setError("Please verify your email first.");return;}
      const attempts=Number(sessionStorage.getItem("pocketvault-login-attempts")||0)+1;sessionStorage.setItem("pocketvault-login-attempts",String(attempts));
      if(attempts>=5){const until=Date.now()+15*60*1000;sessionStorage.setItem(lockKey,String(until));setLockedUntil(until);setError("Too many attempts. Try again in 15 minutes.");}
      else setError("Email or password is incorrect."); return; }
    sessionStorage.removeItem("pocketvault-login-attempts");sessionStorage.removeItem(lockKey);
    try { const membership=await loadMembership(); navigate(getPostLoginPath(membership?.role??null,!!membership),{replace:true}); } catch { navigate("/setup",{replace:true}); }
  }
  async function resend(){await resendEmail(email);setError("A verification email has been sent.");}
  return <AuthShell title="Log in">
    {(params.get("verify")==="1"||params.get("verified")==="1")&&<p role="status" className="mb-5 rounded-control border border-vault/20 bg-vault/5 p-3 text-body text-vault">Check your email and tap the link to verify your account.</p>}
    {params.get("reset")==="1"&&<p role="status" className="mb-5 rounded-control bg-success/10 p-3 text-body text-success">Your password reset link is ready.</p>}
    {error&&<ErrorBanner>{error}{error==="Please verify your email first."&&<> <button className="font-semibold underline" onClick={resend} type="button">Resend email</button></>}</ErrorBanner>}
    <form onSubmit={submit} className="flex flex-1 flex-col"><div className="space-y-4">
      <label className="block text-small font-semibold">Email address<input className={`${inputClass} mt-1`} type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} aria-label="Email address" required /></label>
      <label className="block text-small font-semibold">Password<input className={`${inputClass} mt-1`} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} aria-label="Password" required /></label>
      <Link to="/forgot-password" className="inline-block py-1 font-semibold text-vault underline">Forgot password?</Link>
    </div><div className="mt-auto pt-8"><button className={buttonClass} type="submit" disabled={!isValidEmail(email)||!password||busy||locked}>{busy?"Logging in…":locked?"Try again in 15 minutes":"Log in"}</button><p className="mt-5 text-center"><Link to="/sign-up" className="font-semibold text-vault underline">Create account</Link></p></div></form>
  </AuthShell>;
}

async function resendEmail(email:string){if(isValidEmail(email))await supabase.auth.resend({type:"signup",email:email.trim().toLowerCase()});}

export function ForgotPasswordPage(){const {resetPassword}=useAuth();const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);const [error,setError]=useState("");
  async function submit(e:FormEvent){e.preventDefault();if(!isValidEmail(email))return;setBusy(true);setError("");const {error:authError}=await resetPassword(email);setBusy(false);if(authError)setError("Something went wrong. Try again.");else setDone(true);}
  return <AuthShell title="Reset password">{done?<div className="rounded-control border border-success/20 bg-success/5 p-4 text-body text-success" role="status">If an account exists for this email, we've sent a reset link.</div>:<><p className="mb-5 text-body text-moss">Enter your email and we'll send you a link. It works for 1 hour.</p>{error&&<ErrorBanner>{error}</ErrorBanner>}<form onSubmit={submit} className="flex flex-1 flex-col"><label className="block text-small font-semibold">Email address<input className={`${inputClass} mt-1`} type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} aria-label="Email address" required /></label><div className="mt-auto pt-8"><button className={buttonClass} disabled={!isValidEmail(email)||busy}>{busy?"Sending link…":"Send link"}</button><p className="mt-5 text-center"><Link to="/log-in" className="font-semibold text-vault underline">Back to log in</Link></p></div></form></>}</AuthShell>;
}
