import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { BUSINESS_STAGES, BUSINESS_TYPES, inviteErrorMessage, normalizeInviteEmail, validateBusinessSettings, validateDeleteConfirmation, validateInviteEmail } from "../lib/settings";

type Business = { name: string; type: string; stage: string };
type TeamMember = { user_id: string; email: string; full_name: string; role: "Staff"; status: "Accepted" | "Pending"; inviteId?: string };
type Profile = { email: string; full_name: string };
const control = "h-12 w-full rounded-control border border-moss/30 bg-white px-4 text-body outline-none focus:border-vault focus:ring-2 focus:ring-lime";

export default function Settings() {
  const { membership, session, signOut } = useAuth();
  const navigate = useNavigate();
  const businessId = membership?.businessId;
  const isOwner = membership?.role === "Owner";
  const [business, setBusiness] = useState<Business | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [toast, setToast] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  const load = useCallback(async () => {
    if (!businessId || !session?.user.id) return;
    setLoading(true); setError("");
    try {
      const profileResult = await supabase.from("profiles").select("email,full_name").eq("id", session.user.id).single();
      if (profileResult.error) throw profileResult.error;
      setProfile(profileResult.data);
      if (isOwner) {
        const [businessResult, membershipResult, inviteResult] = await Promise.all([
          supabase.from("businesses").select("name,type,stage").eq("id", businessId).single(),
          supabase.from("memberships").select("user_id,role").eq("business_id", businessId),
          supabase.from("invites").select("id,email,status").eq("business_id", businessId),
        ]);
        if (businessResult.error || membershipResult.error || inviteResult.error) throw new Error("Could not load Settings");
        setBusiness(businessResult.data);
        const staffMemberships = (membershipResult.data ?? []).filter((item) => item.role === "Staff");
        const profileResultForStaff = staffMemberships.length
          ? await supabase.from("profiles").select("id,email,full_name").in("id", staffMemberships.map((item) => item.user_id))
          : { data: [], error: null };
        if (profileResultForStaff.error) throw profileResultForStaff.error;
        const staffProfiles = new Map((profileResultForStaff.data ?? []).map((item) => [item.id, item]));
        const members: TeamMember[] = staffMemberships.map((item) => {
          const staffProfile = staffProfiles.get(item.user_id);
          return { user_id: item.user_id, email: staffProfile?.email ?? "", full_name: staffProfile?.full_name ?? "Former staff member", role: "Staff", status: "Accepted" };
        });
        for (const invite of inviteResult.data ?? []) if (invite.status === "Pending") {
          members.push({ user_id: "invite:" + invite.id, email: invite.email, full_name: "", role: "Staff", status: "Pending", inviteId: invite.id });
        }
        setTeam(members);
      } else {
        const { data, error: businessError } = await supabase.from("businesses").select("name").eq("id", businessId).single();
        if (businessError) throw businessError;
        setBusiness({ name: data.name, type: "", stage: "" }); setTeam([]);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally { setLoading(false); }
  }, [businessId, isOwner, session?.user.id]);
  useEffect(() => { void load(); }, [load]);

  async function invite(email: string) {
    if (!businessId || !isOwner) return false;
    setBusy(true);
    const normalizedEmail = normalizeInviteEmail(email);
    const existing = await supabase.from("invites").select("id,status").eq("business_id", businessId).eq("email", normalizedEmail).maybeSingle();
    let inviteErrorMessageText = existing.error?.message ?? "";
    if (!inviteErrorMessageText && existing.data?.status === "Revoked") {
      const updated = await supabase.from("invites").update({ status: "Pending" }).eq("id", existing.data.id);
      inviteErrorMessageText = updated.error?.message ?? "";
    } else if (!inviteErrorMessageText && existing.data) {
      inviteErrorMessageText = "duplicate key violates unique constraint";
    } else if (!inviteErrorMessageText) {
      const inserted = await supabase.from("invites").insert({ business_id: businessId, email: normalizedEmail, status: "Pending" });
      inviteErrorMessageText = inserted.error?.message ?? "";
    }
    setBusy(false);
    if (inviteErrorMessageText) return inviteErrorMessage(inviteErrorMessageText);
    setInviteOpen(false); setToast("Invite saved. Ask them to sign up with this email."); await load();
    return true;
  }

  async function removeStaff(member: TeamMember) {
    if (!businessId || !isOwner || member.status !== "Accepted") return;
    setBusy(true); setError("");
    const { error: inviteError } = await supabase.from("invites").update({ status: "Revoked" }).eq("business_id", businessId).eq("email", member.email.toLowerCase()).eq("status", "Accepted");
    if (inviteError) { setBusy(false); setError("Something went wrong. Try again."); return; }
    const { error: membershipError } = await supabase.from("memberships").delete().eq("business_id", businessId).eq("user_id", member.user_id);
    setBusy(false);
    if (membershipError) { setError("Something went wrong. Try again."); return; }
    setToast("Staff removed"); await load();
  }

  async function saveBusiness(next: Business) {
    if (!businessId || !isOwner) return;
    setBusy(true); setError("");
    const { error: updateError } = await supabase.from("businesses").update({ name: next.name.trim(), type: next.type, stage: next.stage }).eq("id", businessId);
    setBusy(false);
    if (updateError) { setError("Something went wrong. Try again."); return; }
    setBusiness(next); setEditingBusiness(false); setToast("Business updated");
  }

  async function deleteAccount() {
    setBusy(true); setDeleteError("");
    const { error: deleteError } = await supabase.rpc("delete_my_account");
    if (deleteError) { setBusy(false); setDeleteError("Something went wrong. Try again."); return; }
    await signOut();
    navigate("/", { replace: true, state: { toast: "Account deleted" } });
  }

  return <div className="min-h-screen bg-cream text-ink md:flex">
    <aside className="hidden w-60 shrink-0 border-r border-moss/15 bg-white px-4 py-6 md:block"><Brand /><MainNav owner={isOwner} /></aside>
    <main className="mx-auto w-full max-w-[1000px] px-4 pb-24 pt-5 md:px-8 md:pb-8 md:pt-8">
      <h1 className="mb-5 text-title">Settings</h1>
      {toast && <div role="status" className="mb-4 rounded-control bg-success px-4 py-3 font-semibold text-white">✓ {toast}<button className="float-right" aria-label="Dismiss notification" onClick={() => setToast("")}>×</button></div>}
      {!online && <div className="mb-4 rounded-control bg-vault px-4 py-3 text-small font-semibold text-white">You're offline. Changes will not be saved.</div>}
      {error && <div role="alert" className="mb-4 rounded-control border border-danger/30 bg-white p-4"><p>{error}</p><button onClick={() => void load()} className="mt-2 min-h-11 font-semibold text-vault underline">Try again</button></div>}
      {loading ? <Loading /> : <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          {business && <section className="rounded-card bg-white p-5 shadow-soft"><div className="flex items-start justify-between gap-3"><div><h2 className="text-heading">{business.name}</h2>{isOwner ? <><p className="mt-1 text-small text-moss">{business.type}</p><span className="mt-2 inline-flex rounded-full bg-success/10 px-3 py-1 text-small font-semibold text-success">✓ {business.stage}</span></> : <p className="mt-1 text-small text-moss">Business</p>}</div>{isOwner && <button disabled={!online || busy} onClick={() => setEditingBusiness(true)} className="min-h-11 rounded-control border border-moss/30 bg-cream px-4 text-small font-semibold">Edit</button>}</div></section>}
          <section className="rounded-card bg-white p-5 shadow-soft"><h2 className="mb-3 text-heading">{isOwner ? "Team" : "Your details"}</h2>{isOwner ? team.length ? <div className="space-y-3">{team.map((member) => <article key={member.user_id} className="flex items-center justify-between gap-3 rounded-control border border-moss/10 p-3"><div className="min-w-0"><p className="truncate font-semibold">{member.email}</p><div className="mt-1 flex items-center gap-2 text-small"><span>Staff</span><span className={'rounded-full px-3 py-1 font-semibold ' + (member.status === "Accepted" ? "bg-success/10 text-success" : "bg-gold text-ink")}>{member.status === "Accepted" ? "✓ " : "◷ "}{member.status}</span></div></div>{member.status === "Accepted" && <button disabled={!online || busy} onClick={() => void removeStaff(member)} className="min-h-11 rounded-control border border-danger/40 px-3 text-small font-semibold text-danger">Remove</button>}</article>)}</div> : <p className="text-body text-moss">No staff yet. Invite someone to record transactions.</p> : <div><p className="font-semibold">{profile?.full_name}</p><p className="mt-1 text-moss">{profile?.email}</p><p className="mt-1 text-small text-moss">Staff</p></div>}
            {isOwner && <button disabled={!online || busy} onClick={() => setInviteOpen(true)} className="mt-4 h-12 w-full rounded-control bg-vault font-semibold text-white hover:bg-vault-dark disabled:opacity-50">Invite staff</button>}
          </section>
        </div>
        <section className="overflow-hidden rounded-card bg-white shadow-soft" aria-label="Account settings">
          {isOwner && <SettingsLink href="/review" icon="☑" label="Review and audit" />}
          <SettingsLink href="/privacy" icon="♢" label="Privacy Notice" />
          <button onClick={() => { void signOut().then(() => navigate("/", { replace: true })); }} className="flex min-h-12 w-full items-center gap-3 border-b border-moss/10 px-4 text-left hover:bg-cream"><span className="text-vault">↪</span><span>Log out</span><span className="ml-auto text-moss">›</span></button>
          <button disabled={!online || busy} onClick={() => { setDeleteError(""); setDeleteOpen(true); }} className="flex min-h-12 w-full items-center gap-3 px-4 text-left font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"><span>♧</span><span>Delete account</span><span className="ml-auto">›</span></button>
        </section>
      </div>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-moss/15 bg-white p-2 md:hidden"><MainNav owner={isOwner} mobile /></nav>
    {inviteOpen && <InviteModal busy={busy} online={online} onClose={() => setInviteOpen(false)} onSubmit={invite} />}
    {deleteOpen && <DeleteAccountModal owner={isOwner} busy={busy} online={online} error={deleteError} onClose={() => setDeleteOpen(false)} onSubmit={deleteAccount} />}
    {editingBusiness && business && <BusinessModal business={business} busy={busy} online={online} onClose={() => setEditingBusiness(false)} onSave={saveBusiness} />}
  </div>;
}

function Brand() { return <div className="mb-8 flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-control bg-vault text-lime">⌂</span><b className="text-vault">PocketVault</b></div>; }
function MainNav({ owner, mobile = false }: { owner: boolean; mobile?: boolean }) { const links: [string, string][] = owner ? [["Dashboard", "/dashboard"], ["Planner", "/planner"], ["Ledger", "/ledger"], ["Bills", "/bills"], ["Settings", "/settings"]] : [["Ledger", "/ledger"], ["Bills", "/bills"], ["Settings", "/settings"]]; return <nav aria-label={mobile ? "Bottom navigation" : "Main navigation"} className={mobile ? "grid grid-cols-5" : "space-y-1"}>{links.map(([label, href]) => <Link key={href} to={href} aria-current={href === "/settings" ? "page" : undefined} className={(mobile ? "text-center text-small" : "block text-body") + " min-h-11 rounded-control px-3 py-3 " + (href === "/settings" ? "bg-vault font-semibold text-white" : "text-moss hover:bg-cream")}>{label}</Link>)}</nav>; }
function SettingsLink({ href, icon, label }: { href: string; icon: string; label: string }) { return <Link to={href} className="flex min-h-12 items-center gap-3 border-b border-moss/10 px-4 hover:bg-cream"><span className="text-vault">{icon}</span><span>{label}</span><span className="ml-auto text-moss">›</span></Link>; }
function Loading() { return <div className="mx-auto max-w-sm animate-pulse space-y-4" role="status" aria-label="Loading Settings">{["h-28", "h-36", "h-40"].map((height) => <div key={height} className={height + " rounded-card bg-white shadow-soft"} />)}</div>; }

function InviteModal({ busy, online, onClose, onSubmit }: { busy: boolean; online: boolean; onClose: () => void; onSubmit: (email: string) => Promise<boolean | string> }) {
  const [email, setEmail] = useState(""); const [error, setError] = useState(""); const [limitError, setLimitError] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); const validation = validateInviteEmail(email); if (validation) { setError(validation); setLimitError(false); return; } setError(""); setLimitError(false); const result = await onSubmit(email); if (typeof result === "string") { setLimitError(result.includes("limit of 5 staff")); setError(result); } }
  return <div className="fixed inset-0 z-50 bg-ink/40 md:flex md:items-center md:justify-center md:p-4"><form onSubmit={(e) => void submit(e)} noValidate role="dialog" aria-modal="true" aria-labelledby="invite-title" className="flex h-full w-full flex-col justify-center bg-white p-6 md:h-auto md:max-w-[420px] md:rounded-card md:shadow-soft">
    <h2 id="invite-title" className="text-title">Invite staff</h2><p className="mt-3 text-body text-moss">Ask them to sign up with this email.</p>
    {limitError && <p role="alert" className="mt-4 rounded-control border border-danger/30 bg-danger/5 p-3 text-small font-semibold text-danger">{error}</p>}
    <label htmlFor="invite-email" className="mb-1.5 mt-5 text-small font-semibold">Email address</label><input id="invite-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); setLimitError(false); }} placeholder="staff@email.com" className={control + (error && !limitError ? " border-danger focus:border-danger" : "")} aria-invalid={!!error && !limitError} aria-describedby={error && !limitError ? "invite-email-error" : undefined} />
    {error && !limitError && <p id="invite-email-error" role="alert" className="mt-1 text-small text-danger">{error}</p>}
    <div className="mt-5 grid gap-2"><button disabled={busy || !online} className="h-12 rounded-control bg-vault font-semibold text-white disabled:opacity-60">{busy ? <span className="inline-flex items-center gap-2"><i className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />Sending...</span> : "Send invite"}</button><button type="button" disabled={busy} onClick={onClose} className="h-12 rounded-control border-2 border-vault font-semibold text-vault">Cancel</button></div>
  </form></div>;
}

function DeleteAccountModal({ owner, busy, online, error, onClose, onSubmit }: { owner: boolean; busy: boolean; online: boolean; error: string; onClose: () => void; onSubmit: () => Promise<void> }) {
  const [confirmation, setConfirmation] = useState(""); const [validation, setValidation] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); const error = validateDeleteConfirmation(confirmation); setValidation(error ?? ""); if (!error) await onSubmit(); }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><form onSubmit={(e) => void submit(e)} noValidate role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-[420px] rounded-card bg-white p-6 shadow-soft">
    <h2 id="delete-account-title" className="text-title">Delete your account?</h2>
    <p className="mt-4 text-body text-moss">{owner ? "This permanently deletes your business, plan, transactions, bills and team. This cannot be undone." : "This permanently deletes your account. Transactions you recorded stay in the business as 'Former staff member'."}</p>
    {error && <div role="alert" className="mt-4 rounded-control border border-danger/30 bg-danger/5 p-3 text-small text-danger">{error}<button type="button" onClick={() => void onSubmit()} className="ml-2 font-semibold underline">Try again</button></div>}
    <label htmlFor="delete-confirmation" className="mb-1.5 mt-5 block text-small font-semibold">Type DELETE to confirm</label><input id="delete-confirmation" value={confirmation} onChange={(e) => { setConfirmation(e.target.value); setValidation(""); }} placeholder="DELETE" className={control + (validation ? " border-danger focus:border-danger" : "")} aria-invalid={!!validation} aria-describedby={validation ? "delete-confirmation-error" : undefined} />
    {validation && <p id="delete-confirmation-error" role="alert" className="mt-1 text-small text-danger">{validation}</p>}
    <div className="mt-5 grid gap-2"><button disabled={busy || !online} className="h-12 rounded-control bg-danger font-semibold text-white disabled:opacity-60">{busy ? <span className="inline-flex items-center gap-2"><i className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />Deleting...</span> : "Delete my account"}</button><button type="button" disabled={busy} onClick={onClose} className="h-12 rounded-control border-2 border-vault font-semibold text-vault">Cancel</button></div>
  </form></div>;
}

function BusinessModal({ business, busy, online, onClose, onSave }: { business: Business; busy: boolean; online: boolean; onClose: () => void; onSave: (business: Business) => Promise<void> }) {
  const [draft, setDraft] = useState(business); const [errors, setErrors] = useState<Record<string, string>>({});
  async function submit(event: React.FormEvent) { event.preventDefault(); const next = validateBusinessSettings(draft.name, draft.type, draft.stage); setErrors(next); if (!Object.keys(next).length) await onSave(draft); }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><form onSubmit={(e) => void submit(e)} role="dialog" aria-modal="true" aria-labelledby="edit-business-title" className="w-full max-w-[420px] rounded-card bg-white p-6 shadow-soft"><h2 id="edit-business-title" className="text-heading">Edit business</h2>
    <label className="mb-1 mt-4 block text-small font-semibold" htmlFor="settings-business-name">Business name</label><input id="settings-business-name" value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={control} />{errors.name && <p className="text-small text-danger">{errors.name}</p>}
    <label className="mb-1 mt-3 block text-small font-semibold" htmlFor="settings-business-type">Business type</label><select id="settings-business-type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={control}>{BUSINESS_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
    <label className="mb-1 mt-3 block text-small font-semibold" htmlFor="settings-business-stage">Business stage</label><select id="settings-business-stage" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })} className={control}>{BUSINESS_STAGES.map((x) => <option key={x}>{x}</option>)}</select>
    <div className="mt-5 grid gap-2"><button disabled={busy || !online} className="h-12 rounded-control bg-vault font-semibold text-white">{busy ? "Saving..." : "Save"}</button><button type="button" onClick={onClose} className="h-12 rounded-control border-2 border-vault font-semibold text-vault">Cancel</button></div>
  </form></div>;
}
