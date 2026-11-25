import { formatZar } from "./money";

export type InsightTransaction = {
  amount: number;
  type: "Income" | "Expense";
  status: "Approved" | "Pending" | "Rejected";
  transaction_date: string;
  deleted_at?: string | null;
  category?: string;
};
export type InsightBill = { name: string; amount: number; due_date: string; status: "Unpaid" | "Paid" };
export type DebtGuardLevel = "Safe" | "Watch" | "At risk" | "Not enough data yet";

export function income(transactions: InsightTransaction[], from: string, through: string): number {
  return transactions.reduce((sum, row) => isCounted(row, from, through) && row.type === "Income" ? sum + Number(row.amount) : sum, 0);
}

export function expenses(transactions: InsightTransaction[], from: string, through: string): number {
  return transactions.reduce((sum, row) => isCounted(row, from, through) && row.type === "Expense" ? sum + Number(row.amount) : sum, 0);
}

export function net(transactions: InsightTransaction[], from: string, through: string): number {
  return income(transactions, from, through) - expenses(transactions, from, through);
}

export function cashOnHand(openingBalance: number, transactions: InsightTransaction[], today: string): number {
  return Number(openingBalance) + transactions.reduce((sum, row) => {
    if (row.status !== "Approved" || row.deleted_at || row.transaction_date > today) return sum;
    return sum + (row.type === "Income" ? Number(row.amount) : -Number(row.amount));
  }, 0);
}

export function billsDue30(bills: Pick<InsightBill, "amount" | "due_date" | "status">[], today: string): number {
  const lastIncluded = addDays(today, 30);
  return bills.reduce((sum, bill) => bill.status === "Unpaid" && bill.due_date <= lastIncluded ? sum + Number(bill.amount) : sum, 0);
}

export function safeToSpend(cash: number, bills30: number): number { return cash - bills30; }

export function debtGuardLevel(safe: number, bills30: number, hasTransactions: boolean, hasBills: boolean): DebtGuardLevel {
  if (!hasTransactions && !hasBills) return "Not enough data yet";
  if (safe < 0) return "At risk";
  if (safe >= 0 && safe < bills30 * 0.2) return "Watch";
  return "Safe";
}

export function debtGuardWarning(safeBefore: number, addedAmount: number): string | null {
  const shortfall = safeBefore - addedAmount;
  return shortfall < 0 ? `This would leave you ${formatZar(Math.abs(shortfall))} short for bills due in the next 30 days. Save anyway?` : null;
}

export type InsightInputs = {
  transactions: InsightTransaction[];
  from: string;
  through: string;
  previousFrom: string;
  previousThrough: string;
  bills: InsightBill[];
  today: string;
  expenseCategories?: Array<{ category: string; amount: number }>;
  breakEvenRevenue?: number | null;
  monthlyIncome?: number;
};

// BR15 caps the displayed list at four and orders the first four applicable rules.
export function insightSentences(input: InsightInputs): string[] {
  const currentRows = input.transactions.filter((row) => isCounted(row, input.from, input.through));
  if (!input.transactions.length && !input.bills.length) return [];
  const currentIncome = income(currentRows, input.from, input.through);
  const currentExpenses = expenses(currentRows, input.from, input.through);
  const result: string[] = [];
  if (currentExpenses > currentIncome) result.push(`Expenses are ${formatZar(currentExpenses - currentIncome)} higher than income this period.`);

  const categories = input.expenseCategories ?? categoryTotals(currentRows);
  const leading = categories.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount)[0];
  if (leading && currentExpenses > 0 && leading.amount / currentExpenses >= 0.4) {
    result.push(`${leading.category} is ${Math.round(leading.amount / currentExpenses * 100)}% of your expenses.`);
  }
  const dueSoon = input.bills.filter((bill) => bill.status === "Unpaid" && bill.due_date >= input.today && bill.due_date <= addDays(input.today, 7)).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  if (dueSoon) result.push(`${dueSoon.name} (${formatZar(Number(dueSoon.amount))}) is due in ${daysBetween(input.today, dueSoon.due_date)} days.`);
  const previousIncome = income(input.transactions, input.previousFrom, input.previousThrough);
  if (previousIncome > 0 && currentIncome !== previousIncome) {
    const percent = Math.round(Math.abs((currentIncome - previousIncome) / previousIncome) * 100);
    result.push(`Income is ${currentIncome > previousIncome ? "up" : "down"} ${percent}% on the previous period.`);
  }
  if (input.breakEvenRevenue && input.breakEvenRevenue > 0 && input.monthlyIncome !== undefined && input.monthlyIncome < input.breakEvenRevenue && result.length < 4) {
    result.push(`You have reached ${Math.round(input.monthlyIncome / input.breakEvenRevenue * 100)}% of your break-even revenue this month.`);
  }
  return result.slice(0, 4);
}

function isCounted(row: InsightTransaction, from: string, through: string) {
  return row.status === "Approved" && !row.deleted_at && row.transaction_date >= from && row.transaction_date <= through;
}
function categoryTotals(rows: InsightTransaction[]) {
  const totals = new Map<string, number>();
  for (const row of rows) if (row.type === "Expense" && row.status === "Approved" && !row.deleted_at) {
    const category = row.category ?? "Other expenses";
    totals.set(category, (totals.get(category) ?? 0) + Number(row.amount));
  }
  return [...totals].map(([category, amount]) => ({ category, amount }));
}
function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}
function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}
