import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { formatZar } from "../lib/money";
import { localDateString } from "../lib/ledger";
import {
  BILL_FREQUENCIES, billGroup, billsDueWithin30Days, displayBillDate, parseBillAmount,
  sortBills, validateBill,
  type Bill, type BillInput,
} from "../lib/bills";
import { EXPENSE_CATEGORIES } from "../lib/ledger";

const labelClass = "mb-1.5 block text-small font-semibold text-ink";
const controlClass = "h-12 w-full rounded-control border border-moss/30 bg-white px-4 text-body text-ink outline-none focus:border-vault focus:ring-2 focus:ring-lime";

type BillDraft = BillInput & { id?: string };
const emptyDraft = (): BillDraft => ({ name: "", amount: "", due_date: localDateString(), frequency: "Once-off", category: "Rent" });

function BillModal({ initial, saving, online, error, onClose, onSave }: {
  initial: BillDraft; saving: boolean; online: boolean; error: string; onClose: () => void; onSave: (draft: BillDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof BillDraft>(key: K, value: BillDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = validateBill(draft);
    setErrors(next);
    if (!Object.keys(next).length) void onSave(draft);
  };
  return <div className="fixed inset-0 z-50 bg-ink/40 md:flex md:items-center md:justify-center md:p-5" role="presentation">
    <section className="flex h-full w-full flex-col overflow-y-auto bg-white md:h-auto md:max-h-[95vh] md:max-w-[480px] md:rounded-card md:shadow-soft" role="dialog" aria-modal="true" aria-labelledby="bill-modal-title">
      <header className="sticky top-0 flex items-center justify-between border-b border-moss/15 bg-white px-4 py-4 md:px-5">
        <h2 id="bill-modal-title" className="text-heading">{draft.id ? "Edit bill" : "Add bill"}</h2>
        <button type="button" disabled={saving} aria-label="Close" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-control border border-moss/20 bg-cream text-heading">×</button>
      </header>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 p-4 md:p-5">
        <div><label htmlFor="bill-name" className={labelClass}>Name</label><input id="bill-name" maxLength={60} className={`${controlClass} ${errors.name ? "border-danger ring-1 ring-danger" : ""}`} value={draft.name} onChange={(e) => set("name", e.target.value)} disabled={saving} />{errors.name && <p className="mt-1 text-small text-danger" role="alert">ⓘ {errors.name}</p>}</div>
        <div><label htmlFor="bill-amount" className={labelClass}>Amount</label><input id="bill-amount" inputMode="decimal" placeholder="R0.00" className={`${controlClass} ${errors.amount ? "border-danger ring-1 ring-danger" : ""}`} value={draft.amount} onChange={(e) => set("amount", e.target.value)} disabled={saving} />{errors.amount && <p className="mt-1 text-small text-danger" role="alert">ⓘ {errors.amount}</p>}</div>
        <div><label htmlFor="bill-due-date" className={labelClass}>Due date</label><input id="bill-due-date" type="date" className={controlClass} value={draft.due_date} onChange={(e) => set("due_date", e.target.value)} disabled={saving} />{errors.due_date && <p className="mt-1 text-small text-danger" role="alert">{errors.due_date}</p>}</div>
        <div><label htmlFor="bill-frequency" className={labelClass}>Frequency</label><select id="bill-frequency" className={controlClass} value={draft.frequency} onChange={(e) => set("frequency", e.target.value as BillDraft["frequency"])} disabled={saving}>{BILL_FREQUENCIES.map((frequency) => <option key={frequency}>{frequency}</option>)}</select></div>
        <div><label htmlFor="bill-category" className={labelClass}>Category</label><select id="bill-category" className={controlClass} value={draft.category} onChange={(e) => set("category", e.target.value)} disabled={saving}>{EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
        {error && <p className="text-small text-danger" role="alert">{error}</p>}
        <div className="mt-auto flex flex-col gap-2 pt-4"><button disabled={saving || !online} className="h-12 rounded-control bg-vault font-semibold text-white disabled:opacity-50">{saving ? "◌ Saving…" : "Save"}</button><button type="button" disabled={saving} onClick={onClose} className="h-12 rounded-control border-2 border-vault font-semibold text-vault">Cancel</button></div>
      </form>
    </section>
  </div>;
}

function LoadingRows() {
  return <div aria-label="Loading bills" role="status" className="mt-5 space-y-4"><div className="h-14 animate-pulse rounded-card bg-white p-4 shadow-soft"><div className="h-5 w-2/3 rounded bg-moss/15" /></div>{[0, 1, 2].map((item) => <div key={item} className="flex h-24 animate-pulse items-center justify-between rounded-card bg-white p-4 shadow-soft"><div className="space-y-2"><div className="h-4 w-28 rounded bg-moss/15" /><div className="h-3 w-36 rounded bg-moss/15" /></div><div className="space-y-2"><div className="h-4 w-20 rounded bg-moss/15" /><div className="h-6 w-20 rounded-full bg-moss/15" /></div></div>)}</div>;
}

export default function Bills() {
  const { membership } = useAuth();
  const businessId = membership?.businessId;
  const isOwner = membership?.role === "Owner";
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<BillDraft | null>(null);
  const [deleting, setDeleting] = useState<Bill | null>(null);
  const [busyBillId, setBusyBillId] = useState<string | null>(null);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const today = localDateString();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true); setError("");
    const { data, error: requestError } = await supabase.from("bills").select("*").eq("business_id", businessId).order("due_date", { ascending: true });
    if (requestError) setError("Something went wrong. Try again.");
    else setBills((data ?? []) as unknown as Bill[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline); window.addEventListener("offline", updateOnline);
    return () => { window.removeEventListener("online", updateOnline); window.removeEventListener("offline", updateOnline); };
  }, []);

  const groups = useMemo(() => {
    const sorted = sortBills(bills, today);
    return { Overdue: sorted.filter((bill) => billGroup(bill, today) === "Overdue"), Upcoming: sorted.filter((bill) => billGroup(bill, today) === "Upcoming"), Paid: sorted.filter((bill) => billGroup(bill, today) === "Paid").sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? "")).slice(0, 10) };
  }, [bills, today]);
  const dueTotal = billsDueWithin30Days(bills, today);

  const saveBill = async (draft: BillDraft) => {
    if (!businessId || !isOwner) return;
    setSaving(true); setModalError("");
    const fields = { name: draft.name.trim(), amount: parseBillAmount(draft.amount), due_date: draft.due_date, frequency: draft.frequency, category: draft.category };
    const result = draft.id
      ? await supabase.from("bills").update(fields).eq("id", draft.id).eq("business_id", businessId).select("*").single()
      : await supabase.from("bills").insert({ ...fields, business_id: businessId }).select("*").single();
    setSaving(false);
    if (result.error) { setModalError("Something went wrong. Try again."); return; }
    setEditing(null); setToast(draft.id ? "Bill updated" : "Bill added"); await load();
  };

  const markPaid = async (bill: Bill) => {
    if (!isOwner || !online || bill.status !== "Unpaid") return;
    setBusyBillId(bill.id); setError("");
    const { data: updated, error: requestError } = await supabase.from("bills").update({ status: "Paid" }).eq("id", bill.id).eq("status", "Unpaid").select("id").maybeSingle();
    setBusyBillId(null);
    if (requestError) { setError("Something went wrong. Try again."); return; }
    if (!updated) { setError("This bill has already been marked paid. Refresh the list to see the latest status."); await load(); return; }
    setToast(`${bill.name} marked as paid.`); await load();
  };

  const deleteBill = async () => {
    if (!deleting || !businessId || !isOwner) return;
    setSaving(true);
    const { error: requestError } = await supabase.from("bills").delete().eq("id", deleting.id).eq("business_id", businessId);
    setSaving(false);
    if (requestError) { setError("Something went wrong. Try again."); setDeleting(null); return; }
    setDeleting(null); setToast("Bill deleted"); await load();
  };

  const beginEdit = (bill: Bill) => setEditing({ id: bill.id, name: bill.name, amount: Number(bill.amount).toFixed(2), due_date: bill.due_date, frequency: bill.frequency, category: bill.category });

  return <div className="min-h-screen bg-cream text-ink md:flex">
    <aside className="hidden w-60 shrink-0 border-r border-moss/15 bg-white px-4 py-6 md:block"><div className="mb-8 flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-control bg-vault text-lime">⌂</span><span className="font-bold text-vault">PocketVault</span></div><nav className="space-y-2" aria-label="Main navigation">{[["Dashboard", "/dashboard"], ...(isOwner ? [["Planner", "/planner"]] : []), ["Ledger", "/ledger"], ["Bills", "/bills"], ...(isOwner ? [["Review", "/review"]] : []), ["Settings", "/settings"]].map(([label, href]) => <Link key={label} to={href} aria-current={href === "/bills" ? "page" : undefined} className={`block rounded-control px-3 py-3 ${href === "/bills" ? "bg-vault font-semibold text-white" : "text-moss hover:bg-cream"}`}>{label}</Link>)}</nav></aside>
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-5 md:px-8 md:pb-8 md:pt-8">
      <header className="mb-5 flex items-center justify-between"><h1 className="text-title">Bills</h1>{isOwner && <button disabled={!online} onClick={() => { setEditing(emptyDraft()); setModalError(""); }} className="h-12 rounded-control bg-vault px-5 font-semibold text-white disabled:opacity-50">Add bill</button>}</header>
      {toast && <div role="status" className="mb-4 flex items-center justify-between rounded-control bg-success px-4 py-3 font-semibold text-white"><span>✓ {toast}</span><button aria-label="Dismiss" onClick={() => setToast("")}>×</button></div>}
      {!online && <div className="mb-4 rounded-control bg-vault px-4 py-3 text-small font-semibold text-white">You're offline. Changes will not be saved.</div>}
      {error && <div className="mb-4 rounded-control border border-danger/30 bg-white p-4" role="alert"><p>{error}</p><button onClick={() => void load()} className="mt-2 font-semibold text-vault underline">Try again</button></div>}
      {loading ? <LoadingRows /> : !bills.length ? <div className="mx-auto mt-8 max-w-2xl rounded-card bg-white p-8 text-center shadow-soft"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-cream text-title text-vault">♧</div><p className="mx-auto max-w-sm text-body text-moss">No bills yet. Add rent, electricity or loan repayments so Debt Guard can protect you.</p>{isOwner && <button onClick={() => { setEditing(emptyDraft()); setModalError(""); }} className="mt-5 h-12 w-full rounded-control bg-vault font-semibold text-white">Add bill</button>}</div> : <>
        <div className="mb-5 rounded-card bg-white px-4 py-4 font-semibold shadow-soft"><span aria-hidden="true" className="mr-2 text-vault">▦</span>Due in the next 30 days: {formatZar(dueTotal)}</div>
        {(["Overdue", "Upcoming", "Paid"] as const).map((group) => groups[group].length > 0 && <section key={group} className="mb-5"><h2 className="mb-3 text-heading">{group}</h2><div className="space-y-3">{groups[group].map((bill) => <article key={bill.id} className="rounded-card bg-white p-4 shadow-soft md:flex md:items-center md:justify-between md:gap-5"><div className="flex min-w-0 flex-1 items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{bill.name}</h3><p className="text-small text-moss">{group === "Paid" ? `Paid ${displayBillDate((bill.paid_at ?? bill.due_date).slice(0, 10))}` : `Due ${displayBillDate(bill.due_date)} · ${bill.frequency}`}</p></div><div className="shrink-0 text-right"><strong className="block">{formatZar(Number(bill.amount))}</strong><span className={`mt-1 inline-flex rounded-full px-3 py-1 text-small font-semibold ${group === "Overdue" ? "bg-danger/10 text-danger" : group === "Paid" ? "bg-success/10 text-success" : "bg-gold text-ink"}`}>{group === "Overdue" ? "ⓘ Overdue" : group === "Paid" ? "✓ Paid" : "◷ Upcoming"}</span></div></div>
          {isOwner && group !== "Paid" && <div className="mt-3 flex justify-end gap-2 md:mt-0"><button disabled={!online || busyBillId === bill.id} onClick={() => void markPaid(bill)} className="min-h-11 rounded-control bg-vault px-4 text-small font-semibold text-white disabled:opacity-50">{busyBillId === bill.id ? "Saving…" : "Mark paid"}</button><button disabled={!online} onClick={() => beginEdit(bill)} className="min-h-11 rounded-control border border-moss/30 bg-cream px-4 text-small font-semibold">Edit</button><button disabled={!online} onClick={() => setDeleting(bill)} className="min-h-11 rounded-control border border-danger/40 px-4 text-small font-semibold text-danger">Delete</button></div>}</article>)}</div></section>)}
      </>}
    </main>
    <nav className={`fixed inset-x-0 bottom-0 z-20 grid ${isOwner ? "grid-cols-5" : "grid-cols-3"} border-t border-moss/15 bg-white p-2 md:hidden`} aria-label="Bottom navigation">{(isOwner ? [["Home", "/dashboard"], ["Plan", "/planner"], ["Ledger", "/ledger"], ["Bills", "/bills"], ["Settings", "/settings"]] : [["Ledger", "/ledger"], ["Bills", "/bills"], ["Settings", "/settings"]]).map(([label, href]) => <Link key={label} to={href} aria-current={href === "/bills" ? "page" : undefined} className={`rounded-control py-2 text-center text-small ${href === "/bills" ? "bg-cream font-semibold text-vault" : "text-moss"}`}>{label}</Link>)}</nav>
    {editing && <BillModal initial={editing} saving={saving} online={online} error={modalError} onClose={() => { if (!saving) setEditing(null); }} onSave={saveBill} />}
    {deleting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-bill-title" className="w-full max-w-md rounded-card bg-white p-6 shadow-soft"><h2 id="delete-bill-title" className="text-heading">Delete bill?</h2><p className="mt-2 text-body text-moss">Delete {deleting.name}? This cannot be undone.</p><div className="mt-5 flex justify-end gap-3"><button disabled={saving} onClick={() => setDeleting(null)} className="h-11 rounded-control border border-moss/30 px-4 font-semibold">Cancel</button><button disabled={saving || !online} onClick={() => void deleteBill()} className="h-11 rounded-control bg-danger px-4 font-semibold text-white">{saving ? "Deleting…" : "Delete"}</button></div></section></div>}
  </div>;
}
