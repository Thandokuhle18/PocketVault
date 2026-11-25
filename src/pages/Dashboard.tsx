import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { formatZar } from "../lib/money";
import { billsDue30, cashOnHand, debtGuardLevel, expenses, income, insightSentences, safeToSpend, type InsightBill, type InsightTransaction } from "../lib/insights";

type Period = "This month" | "Last month" | "Last 3 months";
type Transaction = InsightTransaction & { id: string; category: string };
type Bill = InsightBill & { id: string };
type PlanLine = { kind: "Income" | "Monthly expense" | "Startup cost"; amount: number; quantity: number; unit_cost: number };
type Dataset = { opening: number; transactions: Transaction[]; bills: Bill[]; plan: PlanLine[]; businessName: string };
const dateString = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const today = () => dateString(new Date());
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const shiftedMonth = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
function rangeFor(period: Period) {
  const now = new Date();
  const start = period === "This month" ? monthStart(now) : period === "Last month" ? shiftedMonth(now, -1) : shiftedMonth(now, -2);
  const end = period === "This month" || period === "Last 3 months" ? now : new Date(now.getFullYear(), now.getMonth(), 0);
  const previousStart = shiftedMonth(start, period === "Last 3 months" ? -3 : -1);
  const previousThrough = period === "Last month" ? new Date(start.getFullYear(), start.getMonth(), 0) : new Date(previousStart.getFullYear(), previousStart.getMonth() + (period === "Last 3 months" ? 2 : 0), Math.min(end.getDate(), new Date(previousStart.getFullYear(), previousStart.getMonth() + (period === "Last 3 months" ? 3 : 1), 0).getDate()));
  return { from: dateString(start), through: dateString(end), previousFrom: dateString(previousStart), previousThrough: dateString(previousThrough) };
}
function changeText(current: number, previous: number) { return previous === 0 ? "No previous data" : (current >= previous ? "↗ " : "↘ ") + Math.round(Math.abs((current - previous) / previous) * 100) + "% vs previous period"; }
function addDays(date: string, days: number) { const a = date.split("-").map(Number); const d = new Date(Date.UTC(a[0], a[1] - 1, a[2] + days)); return d.toISOString().slice(0, 10); }
function dayDiff(from: string, to: string) { return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000); }
function showDate(value: string) { return new Date(value + "T00:00:00").toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }); }
function breakEven(lines: PlanLine[]) { const incomeLines = lines.filter((x) => x.kind === "Income"); const rev = incomeLines.reduce((s, x) => s + Number(x.amount) * x.quantity, 0); const variable = incomeLines.reduce((s, x) => s + Number(x.unit_cost) * x.quantity, 0); const margin = rev ? (rev - variable) / rev : 0; const fixed = lines.filter((x) => x.kind === "Monthly expense").reduce((s, x) => s + Number(x.amount), 0); return margin > 0 ? Math.round(fixed / margin * 100) / 100 : null; }

export default function Dashboard() {
  const { membership } = useAuth(); const businessId = membership?.businessId;
  const [period, setPeriod] = useState<Period>("This month"); const [data, setData] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => { const fn = () => setOnline(navigator.onLine); window.addEventListener("online", fn); window.addEventListener("offline", fn); return () => { window.removeEventListener("online", fn); window.removeEventListener("offline", fn); }; }, []);
  const load = useCallback(async () => {
    if (!businessId || membership?.role !== "Owner") return;
    setLoading(true); setError(false);
    try {
      const [b, t, bills, plan] = await Promise.all([
        supabase.from("businesses").select("name,opening_balance").eq("id", businessId).single(),
        supabase.from("transactions").select("id,amount,type,status,transaction_date,deleted_at,category").eq("business_id", businessId).is("deleted_at", null).lte("transaction_date", today()),
        supabase.from("bills").select("id,name,amount,due_date,status").eq("business_id", businessId),
        supabase.from("plan_lines").select("kind,amount,quantity,unit_cost").eq("business_id", businessId),
      ]);
      if (b.error || t.error || bills.error || plan.error) throw new Error("load failed");
      setData({ opening: Number(b.data.opening_balance), businessName: b.data.name, transactions: (t.data ?? []) as unknown as Transaction[], bills: (bills.data ?? []) as unknown as Bill[], plan: (plan.data ?? []) as unknown as PlanLine[] });
    } catch { setError(true); } finally { setLoading(false); }
  }, [businessId, membership?.role]);
  useEffect(() => { void load(); }, [load, retry]);
  const range = useMemo(() => rangeFor(period), [period]);
  const metrics = useMemo(() => {
    if (!data) return null;
    const inc = income(data.transactions, range.from, range.through); const exp = expenses(data.transactions, range.from, range.through);
    const priorInc = income(data.transactions, range.previousFrom, range.previousThrough); const priorExp = expenses(data.transactions, range.previousFrom, range.previousThrough);
    const cash = cashOnHand(data.opening, data.transactions, today()); const due30 = billsDue30(data.bills, today()); const safe = safeToSpend(cash, due30);
    const cats = new Map<string, number>();
    for (const row of data.transactions) if (row.status === "Approved" && !row.deleted_at && row.type === "Expense" && row.transaction_date >= range.from && row.transaction_date <= range.through) cats.set(row.category, (cats.get(row.category) ?? 0) + Number(row.amount));
    const categories = Array.from(cats, ([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
    const be = breakEven(data.plan); const monthIncome = income(data.transactions, dateString(monthStart(new Date())), today());
    return { inc, exp, net: inc - exp, priorInc, priorExp, cash, safe, level: debtGuardLevel(safe, due30, data.transactions.length > 0, data.bills.length > 0), categories,
      insights: insightSentences({ transactions: data.transactions, ...range, bills: data.bills, today: today(), expenseCategories: categories, breakEvenRevenue: be, monthlyIncome: monthIncome }) };
  }, [data, range]);
  const noData = !!data && !data.transactions.length && !data.bills.length;
  const upcoming = (data?.bills ?? []).filter((b) => b.status === "Unpaid" && b.due_date >= today()).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 5);
  const dueSoon = (data?.bills ?? []).filter((b) => b.status === "Unpaid" && b.due_date >= today() && b.due_date <= addDays(today(), 7)).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const pendingCount = data?.transactions.filter((t) => t.status === "Pending" && !t.deleted_at).length ?? 0;

  return <div className="min-h-screen bg-cream text-ink md:flex">
    <aside className="hidden w-60 shrink-0 border-r border-moss/15 bg-white px-4 py-6 md:block"><div className="mb-8 flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-control bg-vault text-lime">⌂</span><b className="text-vault">PocketVault</b></div><Navigation desktop /></aside>
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-5 md:px-8 md:pb-8 md:pt-8">
      {!online && <div className="mb-4 rounded-control bg-ink px-4 py-3 text-small font-semibold text-white" role="status">You're offline. Changes will not be saved.</div>}
      <header className="mb-5 flex items-center justify-between gap-3"><h1 className="text-title">Dashboard</h1><label className="sr-only" htmlFor="period">Dashboard period</label><select id="period" value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="h-11 rounded-control border border-moss/25 bg-white px-3">{(["This month", "Last month", "Last 3 months"] as Period[]).map((x) => <option key={x}>{x}</option>)}</select></header>
      {loading ? <Loading /> : error && !data && online ? <div className="mx-auto mt-24 max-w-sm rounded-card border border-danger/30 bg-white p-6 text-center shadow-soft" role="alert"><span className="mx-auto grid h-12 w-12 place-items-center rounded-control bg-danger text-white">!</span><p className="my-4 font-semibold">Something went wrong. Try again.</p><button className="h-12 w-full rounded-control bg-vault font-semibold text-white" onClick={() => setRetry((x) => x + 1)}>Try again</button></div> : !data ? <div className="mx-auto mt-24 max-w-sm rounded-card bg-white p-8 text-center">Dashboard data will appear when your connection returns.</div> : noData ? <div className="mx-auto mt-20 max-w-sm rounded-card bg-white p-5 text-center shadow-soft"><div className="mx-auto mb-5 grid h-20 w-36 place-items-center rounded-card bg-cream text-big text-sage">◒</div><p>Not enough data yet. Add your first transaction or bill.</p><Link className="mt-5 flex h-12 items-center justify-center rounded-control bg-vault font-semibold text-white" to="/ledger">Add transaction</Link><Link className="mt-3 flex h-12 items-center justify-center rounded-control border-2 border-vault font-semibold text-vault" to="/bills">Add bill</Link></div> : metrics && <>
        {pendingCount > 0 && <Link to="/ledger?status=Pending" className="mb-4 block rounded-control bg-gold px-4 py-3 font-semibold">{pendingCount} transaction{pendingCount === 1 ? "" : "s"} need your approval.</Link>}
        {metrics.level === "At risk" && <Link to="/bills" className="mb-4 block rounded-control bg-danger px-4 py-3 font-semibold text-white"><span aria-hidden="true">⚠ </span>Bills due in the next 30 days are {formatZar(Math.abs(metrics.safe))} more than the cash you have.</Link>}
        {dueSoon && <Link to="/bills" className="mb-4 block rounded-control bg-gold px-4 py-3 font-semibold"><span aria-hidden="true">⚠ </span>{dueSoon.name} ({formatZar(Number(dueSoon.amount))}) is due in {dayDiff(today(), dueSoon.due_date)} days.</Link>}
        <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-card bg-white p-5 shadow-soft md:p-6"><div className="flex items-center justify-between"><h2 className="text-small font-semibold text-moss">Cash on hand · {data.businessName}</h2><RiskBadge level={metrics.level} /></div><p className="mt-3 text-big">{formatZar(metrics.cash)}</p><p className={'mt-1 ' + (metrics.safe < 0 ? "font-semibold text-danger" : "text-moss")}>Safe-to-spend {formatZar(metrics.safe)}</p></section>
          {breakEven(data.plan) !== null && <section className="rounded-card bg-white p-5 shadow-soft md:p-6"><h2 className="text-heading">Break-even progress</h2><p className="mt-5">You have reached {Math.min(100, Math.round(income(data.transactions, dateString(monthStart(new Date())), today()) / (breakEven(data.plan) ?? 1) * 100))}% of your break-even revenue this month.</p><div className="mt-5 h-3 rounded-full bg-cream"><div className="h-3 rounded-full bg-success" style={{ width: Math.min(100, income(data.transactions, dateString(monthStart(new Date())), today()) / (breakEven(data.plan) ?? 1) * 100) + "%" }} /></div></section>}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Stat label="Total income" value={metrics.inc} change={changeText(metrics.inc, metrics.priorInc)} /><Stat label="Total expenses" value={metrics.exp} change={changeText(metrics.exp, metrics.priorExp)} /><Stat label="Net result" value={metrics.net} change={changeText(metrics.net, metrics.priorInc - metrics.priorExp)} /></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><section className="rounded-card bg-white p-5 shadow-soft md:p-6"><h2 className="text-heading">Income and expenses</h2><Chart rows={data.transactions} /></section>
          <section className="rounded-card bg-white p-5 shadow-soft md:p-6"><h2 className="text-heading">Expense breakdown</h2>{metrics.categories.length ? <ul className="mt-5 space-y-4">{metrics.categories.map((x) => { const pct = metrics.exp ? Math.round(x.amount / metrics.exp * 100) : 0; return <li key={x.category}><div className="flex justify-between"><span>{x.category}</span><b>{pct}%</b></div><div className="mt-2 h-3 rounded-full bg-cream"><div className="h-3 rounded-full bg-vault" style={{ width: pct + "%" }} /></div></li>; })}</ul> : <p className="mt-5 text-moss">No expenses this period.</p>}</section>
          <section className="rounded-card bg-white p-5 shadow-soft md:p-6"><div className="mb-3 flex justify-between"><h2 className="text-heading">Upcoming bills</h2><Link to="/bills" className="font-semibold text-vault underline">See all bills</Link></div>{upcoming.length ? <ul className="divide-y divide-moss/10">{upcoming.map((b) => <li key={b.id} className="flex justify-between gap-3 py-3"><div><b>{b.name}</b><p className="text-small text-moss">{showDate(b.due_date)}</p></div><strong>{formatZar(Number(b.amount))}</strong></li>)}</ul> : <p className="text-moss">No upcoming bills.</p>}</section>
          <section className="rounded-card bg-white p-5 shadow-soft md:p-6"><h2 className="mb-3 text-heading">Insights</h2>{metrics.insights.length ? <ul className="space-y-3">{metrics.insights.map((x) => <li key={x} className="rounded-control bg-cream p-4">{x}</li>)}</ul> : <p className="text-moss">No insights for this period.</p>}<Link to="/review" className="mt-4 inline-block font-semibold text-vault underline">Review flags</Link></section></div>
      </>}
    </main><nav className="fixed inset-x-0 bottom-0 z-20 border-t border-moss/15 bg-white p-2 md:hidden"><Navigation /></nav>
  </div>;
}
function Navigation({ desktop = false }: { desktop?: boolean }) { const items: [string, string][] = [["Dashboard", "/dashboard"], ["Planner", "/planner"], ["Ledger", "/ledger"], ["Bills", "/bills"], ["Review", "/review"], ["Settings", "/settings"]]; return <nav aria-label="Main navigation" className={desktop ? "space-y-1" : "grid grid-cols-5"}>{items.filter((x) => desktop || x[1] !== "/review").map(([label, href]) => <Link key={href} to={href} aria-current={href === "/dashboard" ? "page" : undefined} className={(desktop ? "block text-body" : "text-center text-small") + " min-h-11 rounded-control px-3 py-3 " + (href === "/dashboard" ? "bg-vault font-semibold text-white" : "text-moss hover:bg-cream")}>{label}</Link>)}</nav>; }
function RiskBadge({ level }: { level: string }) { if (level === "Not enough data yet") return null; const cls = level === "Safe" ? "bg-success/10 text-success" : level === "Watch" ? "bg-gold text-ink" : "bg-danger text-white"; return <span className={'rounded-full px-3 py-1 text-small font-semibold ' + cls}><span aria-hidden="true">{level === "Safe" ? "♢ " : "⚠ "}</span>{level}</span>; }
function Stat({ label, value, change }: { label: string; value: number; change: string }) { return <section className="rounded-card bg-white p-5 shadow-soft"><div className="flex justify-between gap-2"><h2 className="text-small font-semibold text-moss">{label}</h2><span className="text-small text-success">{change}</span></div><p className="mt-3 text-heading">{formatZar(value)}</p></section>; }
function Loading() { return <div className="animate-pulse space-y-4" role="status" aria-label="Loading dashboard">{["h-36", "h-24", "h-64", "h-64"].map((x, i) => <div key={i} className={x + " rounded-card bg-white shadow-soft"} />)}</div>; }
function Chart({ rows }: { rows: Transaction[] }) { const months = [2, 1, 0].map((n) => shiftedMonth(new Date(), -n)); const values = months.map((m) => { const key = m.getFullYear() + "-" + String(m.getMonth() + 1).padStart(2, "0"); const tx = rows.filter((x) => x.transaction_date.startsWith(key) && x.status === "Approved" && !x.deleted_at); return { label: m.toLocaleDateString("en-ZA", { month: "short" }), inc: tx.filter((x) => x.type === "Income").reduce((s, x) => s + Number(x.amount), 0), exp: tx.filter((x) => x.type === "Expense").reduce((s, x) => s + Number(x.amount), 0) }; }); const max = Math.max(1, ...values.flatMap((x) => [x.inc, x.exp])); return <div className="mt-4"><div className="flex gap-4 text-small"><span><i className="mr-1 inline-block h-3 w-3 rounded-sm bg-sage" />Income</span><span><i className="mr-1 inline-block h-3 w-3 rounded-sm bg-vault" />Expenses</span></div><div className="mt-4 flex h-40 items-end justify-around border-b border-moss/20" aria-label="Income and expenses by month">{values.map((x) => <div className="flex h-full flex-col items-center justify-end" key={x.label}><div className="flex h-[85%] items-end gap-1" aria-label={x.label + ": income " + formatZar(x.inc) + ", expenses " + formatZar(x.exp)}><div className="w-6 rounded-t-md bg-sage" style={{ height: (x.inc / max * 100) + "%" }} /><div className="w-6 rounded-t-md bg-vault" style={{ height: (x.exp / max * 100) + "%" }} /></div><span className="mt-2 text-small">{x.label}</span></div>)}</div><p className="sr-only">Monthly income and expense totals are labelled in each chart group.</p></div>; }
