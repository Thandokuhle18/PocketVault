import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { formatZar } from "../lib/money";
import { billsDue30, cashOnHand, debtGuardWarning, safeToSpend } from "../lib/insights";
import {
  calculateLedgerTotals, categoriesForType, clearLedgerFilters, localDateString, parseAmount,
  periodStart, validateDeleteReason, validateTransaction,
  type LedgerFilters, type LedgerTransaction, type TransactionInput, type TransactionPeriod,
} from "../lib/ledger";

const PAGE_SIZE = 20;
const initialFilters: LedgerFilters = { search: "", type: "All", category: "All", status: "All", period: "All time" };
const controlClass = "h-12 w-full rounded-control border border-moss/30 bg-white px-4 text-body text-ink outline-none focus:border-vault focus:ring-2 focus:ring-lime";
const labelClass = "mb-1.5 block text-small font-semibold text-ink";

type ProfileMap = Record<string, string>;
type TransactionDraft = (TransactionInput & { id?: string });

function getRange(filters: LedgerFilters) {
  const from = periodStart(filters.period);
  const to = filters.period === "Last month" ? localDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) : null;
  return { from, to };
}

function transactionQuery(businessId: string, filters: LedgerFilters, select = "*") {
  let query = supabase.from("transactions").select(select, { count: "exact" }).eq("business_id", businessId).is("deleted_at", null);
  if (filters.search.trim()) {
    const literalSearch = filters.search.trim().replace(/[\\%_]/g, "\\$&");
    query = query.ilike("description", `%${literalSearch}%`);
  }
  if (filters.type !== "All") query = query.eq("type", filters.type);
  if (filters.category !== "All") query = query.eq("category", filters.category);
  if (filters.status !== "All") query = query.eq("status", filters.status);
  const { from, to } = getRange(filters);
  if (from) query = query.gte("transaction_date", from);
  if (to) query = query.lt("transaction_date", to);
  return query;
}

function displayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function emptyDraft(): TransactionDraft {
  return { type: "Expense", description: "", amount: "", transaction_date: localDateString(), category: "Rent", payment_method: "Cash", notes: "" };
}

function draftFrom(row: LedgerTransaction): TransactionDraft {
  return {
    id: row.id, type: row.type, description: row.description, amount: Number(row.amount).toFixed(2),
    transaction_date: row.transaction_date, category: row.category, payment_method: row.payment_method,
    notes: row.notes ?? "",
  };
}

function Banner({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "danger" | "neutral" }) {
  const styles = tone === "danger" ? "bg-danger text-white" : tone === "neutral" ? "bg-mist/40 text-ink" : "bg-gold text-ink";
  return <div className={`rounded-control px-4 py-3 text-body font-semibold ${styles}`} role="status">{children}</div>;
}

function TransactionModal({
  initial, busy, online, serverError, debtWarning, onClose, onClearDebtWarning, onSave,
}: {
  initial: TransactionDraft; busy: boolean; online: boolean; serverError: string; debtWarning: string; onClose: () => void; onClearDebtWarning: () => void;
  onSave: (draft: TransactionDraft, allowWarning?: boolean) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof TransactionDraft>(key: K, value: TransactionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateTransaction(draft);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) void onSave(draft);
  };
  const categories = categoriesForType(draft.type);

  return <div className="fixed inset-0 z-50 bg-ink/40 md:flex md:items-center md:justify-center md:p-5" role="presentation">
    <section className="flex h-full w-full flex-col overflow-y-auto bg-white md:h-auto md:max-h-[95vh] md:max-w-[420px] md:rounded-card md:shadow-soft" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title">
      <header className="sticky top-0 flex items-center justify-between border-b border-moss/15 bg-white px-4 py-4 md:px-5">
        <h2 id="transaction-modal-title" className="text-heading">{draft.id ? "Edit transaction" : "Add transaction"}</h2>
        <button type="button" aria-label="Close" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-control border border-moss/20 bg-cream text-heading">×</button>
      </header>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 p-4 md:p-5">
        <div className="grid grid-cols-2 rounded-control border border-moss/20 bg-cream p-1" role="group" aria-label="Transaction type">
          {(["Income", "Expense"] as const).map((type) => <button key={type} type="button" aria-pressed={draft.type === type}
            onClick={() => { set("type", type); if (!categoriesForType(type).includes(draft.category as never)) set("category", categoriesForType(type)[0]); }}
            className={`h-11 rounded-control font-semibold ${draft.type === type ? "bg-vault text-white" : "text-moss"}`}>{type}</button>)}
        </div>
        <div>
          <label className={labelClass} htmlFor="transaction-description">Description</label>
          <input id="transaction-description" className={controlClass} value={draft.description} maxLength={80} placeholder="e.g. Flour and sugar" onChange={(event) => set("description", event.target.value)} aria-invalid={!!errors.description} />
          {errors.description && <p className="mt-1 text-small text-danger">{errors.description}</p>}
        </div>
        <div>
          <label className={labelClass} htmlFor="transaction-amount">Amount</label>
          <input id="transaction-amount" inputMode="decimal" className={controlClass} value={draft.amount} placeholder="R0.00" onChange={(event) => set("amount", event.target.value)} aria-invalid={!!errors.amount} />
          {errors.amount && <p className="mt-1 text-small text-danger">{errors.amount}</p>}
        </div>
        <div>
          <label className={labelClass} htmlFor="transaction-date">Date</label>
          <input id="transaction-date" type="date" className={controlClass} value={draft.transaction_date} max={localDateString()} onChange={(event) => set("transaction_date", event.target.value)} aria-invalid={!!errors.transaction_date} />
          {errors.transaction_date && <p className="mt-1 text-small text-danger">{errors.transaction_date}</p>}
        </div>
        <div>
          <label className={labelClass} htmlFor="transaction-category">Category</label>
          <select id="transaction-category" className={controlClass} value={draft.category} onChange={(event) => set("category", event.target.value)}>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
          {errors.category && <p className="mt-1 text-small text-danger">{errors.category}</p>}
        </div>
        <div>
          <label className={labelClass} htmlFor="transaction-payment">Payment method</label>
          <select id="transaction-payment" className={controlClass} value={draft.payment_method} onChange={(event) => set("payment_method", event.target.value)}>
            {["Cash", "Card", "EFT", "Other"].map((method) => <option key={method}>{method}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="transaction-notes">Notes (optional)</label>
          <textarea id="transaction-notes" className={`${controlClass} min-h-20 resize-y py-3`} value={draft.notes} maxLength={300} placeholder="Add a short note if needed" onChange={(event) => set("notes", event.target.value)} />
          {errors.notes && <p className="mt-1 text-small text-danger">{errors.notes}</p>}
        </div>
        {serverError && <Banner tone="danger">{serverError}</Banner>}
        {debtWarning && <div className="rounded-control bg-gold p-4 font-semibold text-ink" role="alert"><p>{debtWarning}</p><div className="mt-3 grid gap-2"><button type="button" disabled={busy || !online} onClick={() => void onSave(draft, true)} className="h-12 rounded-control bg-vault font-semibold text-white disabled:opacity-60">Save anyway</button><button type="button" disabled={busy} onClick={onClearDebtWarning} className="h-12 rounded-control border-2 border-vault bg-white font-semibold text-vault">Cancel</button></div></div>}
        <div className="mt-auto grid gap-2 pt-1">
          {!debtWarning && <><button disabled={busy || !online} className="h-12 rounded-control bg-vault px-4 font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
          <button type="button" disabled={busy} onClick={onClose} className="h-12 rounded-control border-2 border-vault bg-white px-4 font-semibold text-vault">Cancel</button></>}
        </div>
      </form>
    </section>
  </div>;
}

function DeleteModal({
  transaction, busy, online, serverError, onClose, onDelete,
}: {
  transaction: LedgerTransaction; busy: boolean; online: boolean; serverError: string; onClose: () => void;
  onDelete: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateDeleteReason(reason);
    setError(validation ?? "");
    if (!validation) void onDelete(reason);
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="presentation">
    <form onSubmit={submit} className="w-full max-w-[360px] rounded-card bg-white p-6 shadow-soft" role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <h2 id="delete-title" className="text-heading">Delete {transaction.description}?</h2>
      <p className="mt-3 text-body text-moss">This removes it from your totals. A record is kept in the audit log.</p>
      <label className={`${labelClass} mt-4`} htmlFor="delete-reason">Reason</label>
      <textarea id="delete-reason" className={`${controlClass} min-h-22 resize-y py-3`} value={reason} maxLength={200} placeholder="Why are you deleting this?" onChange={(event) => setReason(event.target.value)} aria-invalid={!!error} />
      {error && <p className="mt-1 text-small text-danger">{error}</p>}
      {serverError && <p className="mt-3 text-small text-danger" role="alert">{serverError}</p>}
      <div className="mt-4 grid gap-2">
        <button disabled={busy || !online} className="h-12 rounded-control bg-danger font-semibold text-white disabled:opacity-60">{busy ? "Deleting…" : "Delete"}</button>
        <button type="button" disabled={busy} onClick={onClose} className="h-12 rounded-control border-2 border-vault font-semibold text-vault">Cancel</button>
      </div>
    </form>
  </div>;
}

function SkeletonRows() {
  return <div aria-label="Loading transactions" className="space-y-3" role="status">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-card bg-white shadow-soft" />)}</div>;
}

export default function Ledger() {
  const { membership, session } = useAuth();
  const businessId = membership?.businessId;
  const role = membership?.role ?? "Staff";
  const isOwner = role === "Owner";
  const [filters, setFilters] = useState<LedgerFilters>(initialFilters);
  const [rows, setRows] = useState<LedgerTransaction[]>([]);
  const [creatorNames, setCreatorNames] = useState<ProfileMap>({});
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [latestRejection, setLatestRejection] = useState<{ description: string; reason: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<TransactionDraft | null>(null);
  const [deleting, setDeleting] = useState<LedgerTransaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [debtWarning, setDebtWarning] = useState("");

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => { window.removeEventListener("online", updateOnline); window.removeEventListener("offline", updateOnline); };
  }, []);

  const load = useCallback(async (append = false, offset = 0) => {
    if (!businessId) return;
    setError("");
    if (append) setMoreLoading(true);
    else setLoading(true);
    try {
      const pageQuery = transactionQuery(businessId, filters).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
      const pageResult = await pageQuery;
      if (pageResult.error) throw pageResult.error;
      const pageRows = (pageResult.data ?? []) as unknown as LedgerTransaction[];
      setRows((current) => append ? [...current, ...pageRows] : pageRows);
      setTotalCount(pageResult.count ?? 0);

      if (!append) {
        const allForTotals: Pick<LedgerTransaction, "amount" | "type" | "status">[] = [];
        for (let start = 0; ; start += 1000) {
          const result = await transactionQuery(businessId, filters, "amount,type,status").range(start, start + 999);
          if (result.error) throw result.error;
          const batch = (result.data ?? []) as unknown as Pick<LedgerTransaction, "amount" | "type" | "status">[];
          allForTotals.push(...batch);
          if (batch.length < 1000) break;
        }
        setTotals(calculateLedgerTotals(allForTotals as LedgerTransaction[]));
        if (isOwner) {
          const countResult = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("business_id", businessId).is("deleted_at", null).eq("status", "Pending");
          if (countResult.error) throw countResult.error;
          setPendingCount(countResult.count ?? 0);
        } else {
          const rejectedResult = await supabase.from("transactions").select("description,rejection_reason").eq("business_id", businessId).is("deleted_at", null).eq("status", "Rejected").order("updated_at", { ascending: false }).limit(1).maybeSingle();
          if (rejectedResult.error) throw rejectedResult.error;
          setLatestRejection(rejectedResult.data ? {
            description: rejectedResult.data.description,
            reason: rejectedResult.data.rejection_reason,
          } : null);
        }
      }

      const creatorIds = [...new Set(pageRows.map((row) => row.created_by).filter((id): id is string => !!id))];
      if (creatorIds.length) {
        const profilesResult = await supabase.from("profiles").select("id,full_name").in("id", creatorIds);
        if (!profilesResult.error) {
          setCreatorNames((current) => ({ ...current, ...Object.fromEntries((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name])) }));
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
      setMoreLoading(false);
    }
  }, [businessId, filters, isOwner]);

  useEffect(() => { void load(false); }, [load, refresh]);

  const categoryOptions = useMemo(() => filters.type === "Income" ? categoriesForType("Income") : filters.type === "Expense" ? categoriesForType("Expense") : [...categoriesForType("Income"), ...categoriesForType("Expense")], [filters.type]);

  const saveTransaction = async (draft: TransactionDraft, allowWarning = false) => {
    if (!businessId || !session?.user) return;
    setDebtWarning("");
    if (!allowWarning && isOwner && draft.type === "Expense") {
      const old = draft.id ? rows.find((row) => row.id === draft.id) : undefined;
      const amount = parseAmount(draft.amount);
      const wasExpense = old?.type === "Expense";
      const added = wasExpense ? amount - Number(old.amount) : amount;
      if (added > 0) {
        const today = localDateString();
        const [businessResult, transactionsResult, billsResult] = await Promise.all([
          supabase.from("businesses").select("opening_balance").eq("id", businessId).single(),
          supabase.from("transactions").select("amount,type,status,transaction_date,deleted_at").eq("business_id", businessId).is("deleted_at", null).lte("transaction_date", today),
          supabase.from("bills").select("amount,due_date,status").eq("business_id", businessId).eq("status", "Unpaid"),
        ]);
        if (businessResult.error || transactionsResult.error || billsResult.error) { setModalError("Something went wrong. Try again."); return; }
        const cash = cashOnHand(Number(businessResult.data.opening_balance), transactionsResult.data ?? [], today);
        const due = billsDue30(billsResult.data ?? [], today);
        const warning = debtGuardWarning(safeToSpend(cash, due), added);
        if (warning) { setDebtWarning(warning); return; }
      }
    }
    setSaving(true); setModalError("");
    const fields = {
      description: draft.description.trim(), amount: parseAmount(draft.amount),
      type: draft.type, category: draft.category, payment_method: draft.payment_method,
      transaction_date: draft.transaction_date, notes: draft.notes.trim() || null,
    };
    try {
      const result = draft.id
        ? await supabase.from("transactions").update(fields).eq("id", draft.id).select("*").single()
        : await supabase.from("transactions").insert({ ...fields, business_id: businessId, created_by: session.user.id }).select("*").single();
      if (result.error) throw result.error;
      const saved = result.data as unknown as LedgerTransaction;
      setEditing(null); setToast(draft.id ? "Transaction updated" : saved.status === "Pending" ? "Sent to the owner for approval." : "Transaction saved");
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setModalError(requestError instanceof Error ? requestError.message : "Something went wrong. Try again.");
    } finally { setSaving(false); }
  };

  const deleteTransaction = async (reason: string) => {
    if (!deleting) return;
    setSaving(true); setModalError("");
    try {
      const { error: requestError } = await supabase.rpc("delete_transaction", { p_transaction_id: deleting.id, p_reason: reason });
      if (requestError) throw requestError;
      setDeleting(null); setToast("Deleted"); setRefresh((value) => value + 1);
    } catch (requestError) {
      setModalError(requestError instanceof Error ? requestError.message : "Something went wrong. Try again.");
    } finally { setSaving(false); }
  };

  const hasFilters = filters.search !== "" || filters.type !== "All" || filters.category !== "All" || filters.status !== "All" || filters.period !== "All time";
  const clearFilters = () => setFilters(clearLedgerFilters());

  return <div className="min-h-screen bg-cream text-ink md:flex">
    <aside className="hidden w-60 shrink-0 border-r border-moss/15 bg-white px-4 py-6 md:block">
      <div className="mb-8 flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-control bg-vault text-lime">⌂</span><span className="font-bold text-vault">PocketVault</span></div>
      <nav className="space-y-2" aria-label="Main navigation">
        {[ ["Dashboard", "/dashboard"], ["Planner", "/planner"], ["Ledger", "/ledger"], ["Bills", "/bills"], ["Review", "/review"], ["Settings", "/settings"] ].map(([label, href]) => <Link key={label} to={href} aria-current={href === "/ledger" ? "page" : undefined} className={`block rounded-control px-3 py-3 ${href === "/ledger" ? "bg-vault font-semibold text-white" : "text-moss hover:bg-cream"}`}>{label}</Link>)}
      </nav>
    </aside>
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-5 md:px-8 md:pb-8 md:pt-8">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-title">Ledger</h1>
        <button onClick={() => { setModalError(""); setEditing(emptyDraft()); }} className="min-h-12 rounded-control bg-vault px-4 font-semibold text-white hover:bg-vault-dark focus:outline-none focus:ring-2 focus:ring-lime">Add transaction</button>
      </header>
      {toast && <div className="mb-4 flex items-center justify-between rounded-control border border-success/20 bg-success/5 px-4 py-3 text-body text-success" role="status">{toast}<button aria-label="Dismiss" onClick={() => setToast("")} className="px-2 text-heading">×</button></div>}
      {!online && <div className="mb-4"><Banner tone="neutral">You're offline. Changes will not be saved.</Banner></div>}
      {isOwner && pendingCount > 0 && <div className="mb-4"><Banner>{pendingCount} transaction{pendingCount === 1 ? "" : "s"} need your approval.</Banner></div>}
      {!isOwner && latestRejection && <div className="mb-4"><Banner tone="danger">Your transaction '{latestRejection.description}' was rejected: {latestRejection.reason}</Banner></div>}

      <section className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" aria-label="Transaction filters">
        <label className="relative block w-full lg:max-w-xs">
          <span className="sr-only">Search transactions</span><span className="pointer-events-none absolute left-4 top-3 text-moss">⌕</span>
          <input className={`${controlClass} pl-11`} placeholder="Search transactions" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
          <select aria-label="Type" className="h-11 min-w-24 rounded-full border border-moss/25 bg-white px-3 text-small" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as LedgerFilters["type"], category: "All" }))}>
            <option value="All">Type</option><option>Income</option><option>Expense</option>
          </select>
          <select aria-label="Category" className="h-11 min-w-28 rounded-full border border-moss/25 bg-white px-3 text-small" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
            <option value="All">Category</option>{categoryOptions.map((category) => <option key={category}>{category}</option>)}
          </select>
          <select aria-label="Status" className="h-11 min-w-24 rounded-full border border-moss/25 bg-white px-3 text-small" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as LedgerFilters["status"] }))}>
            <option value="All">Status</option><option>Approved</option><option>Pending</option><option>Rejected</option>
          </select>
          <select aria-label="Period" className="h-11 min-w-28 rounded-full border border-moss/25 bg-white px-3 text-small" value={filters.period} onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value as TransactionPeriod }))}>
            {(["This month", "Last month", "Last 3 months", "All time"] as const).map((period) => <option key={period}>{period}</option>)}
          </select>
        </div>
      </section>

      {isOwner && <p className="mb-4 text-small font-semibold">Income {formatZar(totals.income)} · Expenses {formatZar(totals.expenses)}</p>}
      {error && online && <div className="mb-4 rounded-control border border-danger/30 bg-white p-4" role="alert"><p className="text-body">{error || "Something went wrong. Try again."}</p><button onClick={() => { setError(""); setRefresh((value) => value + 1); }} className="mt-2 font-semibold text-vault underline">Try again</button></div>}

      {loading ? <SkeletonRows /> : !online && !rows.length ? <div className="rounded-card bg-white p-8 text-center text-moss shadow-soft">Ledger data will appear when your connection returns.</div> : error && !rows.length && online ? null : !rows.length ? (
        hasFilters ? <div className="rounded-card bg-white p-8 text-center shadow-soft"><p className="text-heading">No transactions match. Clear filters.</p><button onClick={clearFilters} className="mt-4 h-11 rounded-control border-2 border-vault px-5 font-semibold text-vault">Clear filters</button></div>
          : <div className="rounded-card bg-white p-8 text-center shadow-soft"><p className="text-heading">No transactions yet. Record your first sale or purchase.</p><button onClick={() => setEditing(emptyDraft())} className="mt-4 h-11 rounded-control bg-vault px-5 font-semibold text-white">Add transaction</button></div>
      ) : <>
        <div className="rounded-card bg-white p-3 shadow-soft md:px-6">
          {rows.map((row, index) => <article key={row.id} className={`grid gap-3 py-4 md:grid-cols-[minmax(170px,1fr)_minmax(150px,1fr)_minmax(160px,auto)_auto_auto] md:items-center ${index ? "border-t border-moss/10" : ""}`}>
            <div className="min-w-0"><h2 className="truncate font-semibold">{row.description}</h2><p className="text-small text-moss">{row.category} · {row.payment_method}</p></div>
            <div className="text-small text-moss">{displayDate(row.transaction_date)}{isOwner && <span className="block">By {creatorNames[row.created_by ?? ""] ?? "Former staff member"}</span>}</div>
            <p className={`font-semibold ${row.type === "Income" ? "text-success" : "text-ink"}`}>{row.type === "Income" ? "↗" : "↘"} {row.type} {row.type === "Income" ? "+" : "−"}{formatZar(Number(row.amount))}</p>
            <span className={`w-fit rounded-full px-3 py-1 text-small font-semibold ${row.status === "Approved" ? "bg-success/10 text-success" : row.status === "Pending" ? "bg-gold text-ink" : "bg-danger text-white"}`}>{row.status}</span>
            {isOwner && <div className="flex gap-2 md:justify-end"><button onClick={() => { setModalError(""); setEditing(draftFrom(row)); }} className="h-11 rounded-control border border-moss/30 bg-cream px-4 text-small font-semibold">Edit</button><button onClick={() => { setModalError(""); setDeleting(row); }} className="h-11 rounded-control border border-danger/40 px-4 text-small font-semibold text-danger">Delete</button></div>}
          </article>)}
        </div>
        {rows.length < totalCount && <div className="mt-5 text-center"><button disabled={moreLoading} onClick={() => void load(true, rows.length)} className="h-12 rounded-control border-2 border-vault bg-white px-6 font-semibold text-vault disabled:opacity-60">{moreLoading ? "Loading…" : "Load more"}</button></div>}
      </>}
    </main>

    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-moss/15 bg-white p-2 md:hidden" aria-label="Bottom navigation">
      {(isOwner ? [["Dashboard", "/dashboard"], ["Ledger", "/ledger"], ["Bills", "/bills"]] : [["Ledger", "/ledger"], ["Bills", "/bills"], ["Settings", "/settings"]]).map(([label, href]) => <Link key={label} to={href} aria-current={href === "/ledger" ? "page" : undefined} className={`rounded-control py-2 text-center text-small ${href === "/ledger" ? "bg-cream font-semibold text-vault" : "text-moss"}`}>{label}</Link>)}
    </nav>

    {editing && <TransactionModal initial={editing} busy={saving} online={online} serverError={modalError} debtWarning={debtWarning} onClearDebtWarning={() => setDebtWarning("")} onClose={() => { if (!saving) { setEditing(null); setDebtWarning(""); } }} onSave={saveTransaction} />}
    {deleting && <DeleteModal transaction={deleting} busy={saving} online={online} serverError={modalError} onClose={() => { if (!saving) setDeleting(null); }} onDelete={deleteTransaction} />}
  </div>;
}
