import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { formatZar } from "../lib/money";
import { calculatePlan, PLAN_KINDS, validateAvailableCapital, validatePlanLine, type PlanKind, type PlanLine, type PlanLineInput } from "../lib/plan";

const controlClass = "h-12 w-full rounded-control border border-moss/30 bg-white px-4 text-body text-ink outline-none focus:border-vault focus:ring-2 focus:ring-lime disabled:opacity-60";
const labelClass = "mb-1.5 block text-small font-semibold text-ink";
const kindLabels: Record<PlanKind, string> = { "Startup cost": "Startup costs", "Monthly expense": "Monthly expenses", Income: "Income" };
const freshDraft = (kind: PlanKind): PlanLineInput => ({ kind, name: "", amount: "", quantity: kind === "Income" ? "20" : "1", unit_cost: "" });

function LoadingPlaceholder() {
  return <div role="status" aria-label="Loading plan" className="space-y-4">
    <div className="h-12 animate-pulse rounded-control bg-sage/25" />
    <div className="rounded-card bg-white p-6 shadow-soft"><div className="mb-5 h-5 w-24 animate-pulse rounded bg-moss/10" />{Array.from({ length: 6 }, (_, index) => <div key={index} className="my-4 h-4 animate-pulse rounded bg-moss/10" />)}</div>
    <div className="h-11 w-64 animate-pulse rounded-full bg-sage/25" />
    {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-card bg-white shadow-soft" />)}
  </div>;
}

export default function Planner() {
  const { membership } = useAuth();
  const businessId = membership?.businessId;
  const isOwner = membership?.role === "Owner";
  const [lines, setLines] = useState<PlanLine[]>([]);
  const [availableCapital, setAvailableCapital] = useState(0);
  const [capitalDraft, setCapitalDraft] = useState("0.00");
  const [capitalError, setCapitalError] = useState("");
  const [selectedKind, setSelectedKind] = useState<PlanKind>("Monthly expense");
  const [draft, setDraft] = useState<PlanLineInput>(freshDraft("Monthly expense"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capitalSaving, setCapitalSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true); setError("");
    const [businessResult, linesResult] = await Promise.all([
      supabase.from("businesses").select("available_capital").eq("id", businessId).single(),
      supabase.from("plan_lines").select("*").eq("business_id", businessId).order("created_at", { ascending: true }),
    ]);
    if (businessResult.error || linesResult.error) {
      setError(businessResult.error?.message ?? linesResult.error?.message ?? "Something went wrong. Try again.");
      setLoading(false);
      return;
    }
    const capital = Number(businessResult.data.available_capital);
    setAvailableCapital(capital);
    setCapitalDraft(capital.toFixed(2));
    setLines((linesResult.data ?? []) as unknown as PlanLine[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => { window.removeEventListener("online", updateOnline); window.removeEventListener("offline", updateOnline); };
  }, []);

  const totals = useMemo(() => calculatePlan(lines, availableCapital), [lines, availableCapital]);
  const selectedLines = useMemo(() => lines.filter((line) => line.kind === selectedKind), [lines, selectedKind]);

  const changeKind = (kind: PlanKind) => {
    setSelectedKind(kind);
    if (!editingId) setDraft(freshDraft(kind));
    setErrors({});
  };

  const updateDraft = (field: keyof PlanLineInput, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => { const next = { ...current }; delete next[field]; delete next.limit; return next; });
  };

  const saveCapital = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateAvailableCapital(capitalDraft);
    setCapitalError(validation ?? "");
    if (validation || !businessId) return;
    setCapitalSaving(true); setCapitalError("");
    const { error: requestError } = await supabase.from("businesses").update({ available_capital: Number(capitalDraft.replace(/[R,\s]/gi, "")) }).eq("id", businessId);
    setCapitalSaving(false);
    if (requestError) { setCapitalError(requestError.message); return; }
    setAvailableCapital(Number(capitalDraft.replace(/[R,\s]/gi, "")));
    setToast("Available capital saved");
  };

  const saveLine = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validatePlanLine(draft, lines.length, editingId !== null);
    setErrors(validation);
    if (Object.keys(validation).length || !businessId || !isOwner) return;
    setSaving(true); setError("");
    const payload = {
      business_id: businessId,
      kind: draft.kind,
      name: draft.name.trim(),
      amount: Number(String(draft.amount).replace(/[R,\s]/gi, "")),
      quantity: draft.kind === "Monthly expense" ? 1 : Number(draft.quantity),
      unit_cost: draft.kind === "Income" && draft.unit_cost !== "" ? Number(String(draft.unit_cost).replace(/[R,\s]/gi, "")) : 0,
    };
    const request = editingId
      ? await supabase.from("plan_lines").update(payload).eq("id", editingId).select("*").single()
      : await supabase.from("plan_lines").insert(payload).select("*").single();
    setSaving(false);
    if (request.error) { setError(request.error.message); return; }
    const saved = request.data as unknown as PlanLine;
    setLines((current) => editingId ? current.map((line) => line.id === editingId ? saved : line) : [...current, saved]);
    setToast(editingId ? "Line updated" : "Line added");
    setDraft(freshDraft(selectedKind)); setEditingId(null); setErrors({}); setFormVisible(false);
  };

  const editLine = (line: PlanLine) => {
    setSelectedKind(line.kind);
    setDraft({ kind: line.kind, name: line.name, amount: Number(line.amount).toFixed(2), quantity: String(line.quantity), unit_cost: Number(line.unit_cost).toFixed(2) });
    setEditingId(line.id ?? null); setFormVisible(true); setErrors({}); setError("");
  };

  const deleteLine = async (line: PlanLine) => {
    if (confirmDeleteId !== line.id || !line.id) { setConfirmDeleteId(line.id ?? null); return; }
    setSaving(true); setError("");
    const { error: requestError } = await supabase.from("plan_lines").delete().eq("id", line.id);
    setSaving(false);
    if (requestError) { setError(requestError.message); return; }
    setLines((current) => current.filter((item) => item.id !== line.id));
    setConfirmDeleteId(null); setToast("Line deleted");
  };

  const startAdd = () => {
    setDraft(freshDraft(selectedKind)); setEditingId(null); setErrors({}); setError(""); setFormVisible(true);
  };

  return <div className="min-h-screen bg-cream text-ink md:flex">
    <aside className="hidden w-60 shrink-0 border-r border-moss/15 bg-white px-4 py-6 md:block">
      <div className="mb-8 flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-control bg-vault text-lime">⌂</span><span className="font-bold text-vault">PocketVault</span></div>
      <nav className="space-y-2" aria-label="Main navigation">
        {[["Dashboard", "/dashboard"], ["Planner", "/planner"], ["Ledger", "/ledger"], ["Bills", "/bills"], ["Review", "/review"], ["Settings", "/settings"]].map(([label, href]) => <Link key={label} to={href} aria-current={href === "/planner" ? "page" : undefined} className={`block rounded-control px-3 py-3 ${href === "/planner" ? "bg-vault font-semibold text-white" : "text-moss hover:bg-cream"}`}>{label}</Link>)}
      </nav>
    </aside>
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-5 md:px-8 md:pb-8 md:pt-8">
      <header className="mb-1 flex items-start justify-between"><div><h1 className="text-title">Plan</h1><p className="mt-1 text-small text-moss">These are your estimates, not guaranteed results.</p></div></header>
      {toast && <div className="my-4 flex items-center justify-between rounded-control border border-success/20 bg-success/5 px-4 py-3 text-body text-success" role="status">{toast}<button onClick={() => setToast("")} aria-label="Dismiss">×</button></div>}
      {!online && <div className="my-4 rounded-control bg-vault px-4 py-3 text-small font-semibold text-white">You're offline. Changes will not be saved.</div>}
      {error && <div className="my-4 rounded-control border border-danger/30 bg-white p-4" role="alert"><p>{error}</p><button onClick={() => void load()} className="mt-2 font-semibold text-vault underline">Try again</button></div>}
      {loading ? <LoadingPlaceholder /> : <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(360px,0.72fr)_minmax(0,1fr)]">
        <section className={`order-2 lg:order-1 ${lines.length ? "lg:row-span-2" : "lg:col-span-2"}`}>
          {lines.length > 0 && <div className="rounded-card bg-white p-5 shadow-soft md:p-6">
            <h2 className="mb-4 text-heading">Results</h2>
            {totals.breakEvenMessage && <div className="mb-3 rounded-control bg-gold px-4 py-3 font-semibold text-ink" role="status">⚠ {totals.breakEvenMessage}</div>}
            <dl className="divide-y divide-moss/10">
              <Metric label="Startup total" value={formatZar(totals.startupTotal)} />
              <Metric label="Monthly expenses" value={formatZar(totals.monthlyExpenses)} />
              <Metric label="Monthly revenue" value={formatZar(totals.monthlyRevenue)} />
              <Metric label="Monthly profit" value={totals.profitLabel === "Loss" ? `Loss: ${formatZar(Math.abs(totals.monthlyProfit))}` : formatZar(totals.monthlyProfit)} tone={totals.profitLabel === "Loss" ? "danger" : "success"} />
              {totals.breakEvenRevenue !== null && <Metric label="Break-even revenue" value={formatZar(totals.breakEvenRevenue)} />}
              <Metric label="Funding gap" value={formatZar(totals.fundingGap)} />
              <Metric label="Payback" value={totals.paybackMessage ?? `${totals.paybackMonths} ${totals.paybackMonths === 1 ? "month" : "months"}`} tone={totals.paybackMessage ? "danger" : undefined} />
            </dl>
          </div>}
          {lines.length === 0 && <div className="flex min-h-[280px] items-center justify-center rounded-card bg-white p-6 text-center shadow-soft lg:min-h-[440px]">
            <div><div className="mx-auto mb-5 grid h-20 w-28 place-items-center rounded-card bg-cream text-big text-sage">◠</div><p className="max-w-sm text-body">No lines yet. Add your first cost or income to see if your business can make a profit.</p><button disabled={!isOwner || !online} onClick={startAdd} className="mt-5 h-12 w-full max-w-xs rounded-control bg-vault font-semibold text-white disabled:opacity-50">Add line</button></div>
          </div>}
        </section>

        <form onSubmit={saveCapital} className="order-1 flex flex-col gap-1 lg:order-2 lg:flex-row lg:items-end lg:justify-end lg:gap-2">
          <div className="w-full lg:max-w-[250px]"><label htmlFor="available-capital" className={labelClass}>Available capital</label><input id="available-capital" className={controlClass} inputMode="decimal" value={capitalDraft} onChange={(event) => { setCapitalDraft(event.target.value); setCapitalError(""); }} placeholder="R0.00" disabled={!isOwner || !online} /></div>
          <button disabled={!isOwner || !online || capitalSaving} className="h-12 rounded-control border-2 border-vault bg-white px-5 font-semibold text-vault disabled:opacity-50">{capitalSaving ? "Saving…" : "Save"}</button>
          {capitalError && <p className="text-small text-danger lg:absolute lg:mt-20">{capitalError}</p>}
        </form>

        <section className="order-3 space-y-4 lg:order-3">
          {lines.length > 0 && <div className="flex flex-wrap gap-2" role="tablist" aria-label="Plan line type">
            {PLAN_KINDS.map((kind) => <button key={kind} type="button" role="tab" aria-selected={selectedKind === kind} onClick={() => changeKind(kind)} className={`min-h-11 rounded-full border border-moss/20 px-4 text-small font-semibold ${selectedKind === kind ? "border-vault bg-vault text-white" : "bg-white text-ink"}`}>{kindLabels[kind]}</button>)}
          </div>}
          {selectedLines.map((line) => <article key={line.id} className="rounded-card bg-white p-4 shadow-soft md:flex md:items-center md:justify-between md:gap-4">
            <div className="min-w-0"><h3 className="font-semibold">{line.name}</h3><p className="text-small text-moss">{line.kind === "Income" ? `${formatZar(Number(line.amount))} × ${line.quantity} units · Cost per unit ${formatZar(Number(line.unit_cost))}` : line.kind === "Startup cost" ? `${formatZar(Number(line.amount))} × ${line.quantity}` : formatZar(Number(line.amount))}</p></div>
            <strong className="block py-2 md:py-0">{formatZar(line.kind === "Startup cost" ? Number(line.amount) * line.quantity : line.kind === "Income" ? Number(line.amount) * line.quantity : Number(line.amount))}</strong>
            {isOwner && <div className="flex gap-2"><button type="button" disabled={!online || saving} onClick={() => editLine(line)} className="h-11 rounded-control border border-moss/30 bg-cream px-4 text-small font-semibold disabled:opacity-50">Edit</button><button type="button" disabled={!online || saving} onClick={() => void deleteLine(line)} className={`h-11 rounded-control border px-4 text-small font-semibold disabled:opacity-50 ${confirmDeleteId === line.id ? "border-danger bg-danger text-white" : "border-danger/40 text-danger"}`}>{confirmDeleteId === line.id ? "Tap again to delete" : "Delete"}</button>{confirmDeleteId === line.id && <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-small text-moss underline">Cancel</button>}</div>}
          </article>)}
          {lines.length > 0 && selectedLines.length === 0 && <div className="rounded-card bg-white p-5 text-moss">No lines in this section yet.</div>}

          {formVisible && isOwner && <form onSubmit={saveLine} className="rounded-card bg-white p-4 shadow-soft md:p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-heading">{editingId ? `Edit ${selectedKind.toLowerCase()} line` : `Add ${selectedKind.toLowerCase()} line`}</h2><button type="button" onClick={() => { setFormVisible(false); setEditingId(null); setErrors({}); }} className="h-10 w-10 rounded-control border border-moss/20" aria-label="Close form">×</button></div>
            {!editingId && <div className="mb-4 flex flex-wrap gap-2">{PLAN_KINDS.map((kind) => <button key={kind} type="button" onClick={() => changeKind(kind)} className={`min-h-10 rounded-full border px-3 text-small font-semibold ${selectedKind === kind ? "border-vault bg-vault text-white" : "border-moss/20 bg-white"}`}>{kindLabels[kind]}</button>)}</div>}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name" id="plan-name" error={errors.name}><input id="plan-name" className={controlClass} value={draft.name} maxLength={60} placeholder="e.g. Rent" onChange={(event) => updateDraft("name", event.target.value)} /></Field>
              <Field label={selectedKind === "Income" ? "Price per unit" : "Amount"} id="plan-amount" error={errors.amount}><input id="plan-amount" className={controlClass} inputMode="decimal" value={String(draft.amount)} placeholder="R0.00" onChange={(event) => updateDraft("amount", event.target.value)} /></Field>
              {selectedKind === "Startup cost" && <Field label="Quantity" id="plan-quantity" error={errors.quantity}><input id="plan-quantity" type="number" min="1" max="1000" step="1" className={controlClass} value={String(draft.quantity)} onChange={(event) => updateDraft("quantity", event.target.value)} /></Field>}
              {selectedKind === "Income" && <>
                <Field label="Units per month" id="plan-quantity" error={errors.quantity}><input id="plan-quantity" type="number" min="1" max="100000" step="1" className={controlClass} value={String(draft.quantity)} onChange={(event) => updateDraft("quantity", event.target.value)} /></Field>
                <Field label="Cost per unit" id="plan-unit-cost" error={errors.unit_cost}><input id="plan-unit-cost" className={controlClass} inputMode="decimal" value={String(draft.unit_cost ?? "")} placeholder="R0.00" onChange={(event) => updateDraft("unit_cost", event.target.value)} /></Field>
              </>}
            </div>
            {errors.limit && <p className="mt-3 text-small text-danger" role="alert">{errors.limit}</p>}
            <button disabled={saving || !online} className="mt-4 h-12 w-full rounded-control bg-vault font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save line" : "Add line"}</button>
          </form>}
          {!formVisible && lines.length > 0 && isOwner && <button disabled={!online} onClick={startAdd} className="h-12 w-full rounded-control bg-vault font-semibold text-white disabled:opacity-50">Add line</button>}
        </section>
      </div>}
    </main>

    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-moss/15 bg-white p-2 md:hidden" aria-label="Bottom navigation">
      {[["Home", "/dashboard"], ["Plan", "/planner"], ["Ledger", "/ledger"], ["Bills", "/bills"], ["Settings", "/settings"]].map(([label, href]) => <Link key={label} to={href} aria-current={href === "/planner" ? "page" : undefined} className={`rounded-control py-2 text-center text-small ${href === "/planner" ? "bg-cream font-semibold text-vault" : "text-moss"}`}>{label}</Link>)}
    </nav>
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const textTone = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink";
  return <div className="flex items-center justify-between gap-3 py-2"><dt className="text-body text-moss">{label}</dt><dd className={`text-right font-semibold ${textTone}`}>{value}</dd></div>;
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className={labelClass}>{label}</label>{children}{error && <p className="mt-1 text-small text-danger" role="alert">{error}</p>}</div>;
}
