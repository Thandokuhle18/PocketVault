import { MAX_AMOUNT } from "./money";

export const INCOME_CATEGORIES = ["Product sales", "Service revenue", "Deposits", "Other income"] as const;
export const EXPENSE_CATEGORIES = [
  "Rent", "Electricity", "Water", "Internet", "Stock", "Materials", "Transport", "Marketing",
  "Salaries", "Equipment", "Insurance", "Subscriptions", "Maintenance", "Loan repayment", "Other expenses",
] as const;
export const PAYMENT_METHODS = ["Cash", "Card", "EFT", "Other"] as const;
export const TRANSACTION_TYPES = ["Income", "Expense"] as const;
export const TRANSACTION_STATUSES = ["Approved", "Pending", "Rejected"] as const;
export const PERIODS = ["This month", "Last month", "Last 3 months", "All time"] as const;

export type TransactionType = typeof TRANSACTION_TYPES[number];
export type TransactionStatus = typeof TRANSACTION_STATUSES[number];
export type TransactionPeriod = typeof PERIODS[number];
export type LedgerTransaction = {
  id: string;
  business_id: string;
  created_by: string | null;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  payment_method: string;
  transaction_date: string;
  notes: string | null;
  status: TransactionStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};
export type TransactionInput = {
  description: string;
  amount: string;
  type: TransactionType;
  category: string;
  payment_method: string;
  transaction_date: string;
  notes: string;
};
export type LedgerFilters = {
  search: string;
  type: TransactionType | "All";
  category: string | "All";
  status: TransactionStatus | "All";
  period: TransactionPeriod;
};

const incomeCategorySet = new Set<string>(INCOME_CATEGORIES);
const expenseCategorySet = new Set<string>(EXPENSE_CATEGORIES);
const paymentSet = new Set<string>(PAYMENT_METHODS);

export function categoriesForType(type: TransactionType) {
  return type === "Income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function parseAmount(value: string): number {
  return Number(value.replace(/[R,\s]/gi, ""));
}

export function validateTransaction(input: TransactionInput, today = localDateString()): Record<string, string> {
  const errors: Record<string, string> = {};
  const description = input.description.trim();
  const rawAmount = input.amount.replace(/[R,\s]/gi, "");
  const amount = Number(rawAmount);

  if (description.length < 3 || description.length > 80) errors.description = "Enter a description of 3 to 80 characters.";
  if (!rawAmount || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT || !/^\d+(?:\.\d{1,2})?$/.test(rawAmount)) {
    errors.amount = "Enter an amount above R0.00.";
  }
  if (!input.transaction_date) errors.transaction_date = "Choose a date.";
  else if (input.transaction_date > today) errors.transaction_date = "Date cannot be in the future.";
  const validCategories = input.type === "Income" ? incomeCategorySet : expenseCategorySet;
  if (!validCategories.has(input.category)) errors.category = "Choose a category for this transaction type.";
  if (!paymentSet.has(input.payment_method)) errors.payment_method = "Choose a payment method.";
  if (input.notes.length > 300) errors.notes = "Notes must be 300 characters or fewer.";
  return errors;
}

export function validateDeleteReason(reason: string): string | null {
  return reason.trim().length < 3 || reason.length > 200 ? "Enter a reason of 3 to 200 characters." : null;
}

export function expectedApprovalStatus(type: TransactionType, amount: number, role: "Owner" | "Staff"): TransactionStatus {
  return role === "Owner" || type === "Income" || amount < 2000 ? "Approved" : "Pending";
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function periodStart(period: TransactionPeriod, now = new Date()): string | null {
  const year = now.getFullYear();
  const month = now.getMonth();
  if (period === "All time") return null;
  if (period === "This month") return localDateString(new Date(year, month, 1));
  if (period === "Last month") return localDateString(new Date(year, month - 1, 1));
  return localDateString(new Date(year, month - 2, 1));
}

export function matchesLedgerFilters(row: LedgerTransaction, filters: LedgerFilters, now = new Date()): boolean {
  if (filters.search && !row.description.toLocaleLowerCase().includes(filters.search.trim().toLocaleLowerCase())) return false;
  if (filters.type !== "All" && row.type !== filters.type) return false;
  if (filters.category !== "All" && row.category !== filters.category) return false;
  if (filters.status !== "All" && row.status !== filters.status) return false;
  const from = periodStart(filters.period, now);
  if (from && row.transaction_date < from) return false;
  if (filters.period === "Last month") {
    const firstThisMonth = localDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    if (row.transaction_date >= firstThisMonth) return false;
  }
  return true;
}

export function sortTransactions(rows: LedgerTransaction[]): LedgerTransaction[] {
  return [...rows].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at));
}

export function calculateLedgerTotals(rows: LedgerTransaction[]) {
  return rows.reduce((totals, row) => {
    if (row.status !== "Approved") return totals;
    if (row.type === "Income") totals.income += Number(row.amount);
    else totals.expenses += Number(row.amount);
    return totals;
  }, { income: 0, expenses: 0 });
}

export function clearLedgerFilters(): LedgerFilters {
  return { search: "", type: "All", category: "All", status: "All", period: "All time" };
}
