import { EXPENSE_CATEGORIES } from "./ledger";
import { MAX_AMOUNT } from "./money";

export const BILL_FREQUENCIES = ["Once-off", "Weekly", "Monthly"] as const;
export type BillFrequency = typeof BILL_FREQUENCIES[number];
export type BillStatus = "Unpaid" | "Paid";
export type Bill = {
  id: string;
  business_id: string;
  name: string;
  amount: number;
  due_date: string;
  frequency: BillFrequency;
  category: typeof EXPENSE_CATEGORIES[number];
  status: BillStatus;
  paid_at: string | null;
  created_at: string;
};
export type BillInput = { name: string; amount: string; due_date: string; frequency: BillFrequency; category: string };
export type BillGroup = "Overdue" | "Upcoming" | "Paid";

const expenseCategories = new Set<string>(EXPENSE_CATEGORIES);
const amountPattern = /^\d+(?:\.\d{1,2})?$/;

export function parseBillAmount(value: string): number {
  return Number(value.replace(/[R,\s]/gi, ""));
}

export function validateBill(input: BillInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  const rawAmount = input.amount.replace(/[R,\s]/gi, "");
  const amount = Number(rawAmount);
  if (name.length < 3 || name.length > 60) errors.name = "Enter a name of 3 to 60 characters.";
  if (!rawAmount || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT || !amountPattern.test(rawAmount)) {
    errors.amount = "Enter an amount above R0.00.";
  }
  if (!isValidDate(input.due_date)) errors.due_date = "Choose a due date.";
  if (!(BILL_FREQUENCIES as readonly string[]).includes(input.frequency)) errors.frequency = "Choose a frequency.";
  if (!expenseCategories.has(input.category)) errors.category = "Choose an expense category.";
  return errors;
}

export function billGroup(bill: Pick<Bill, "status" | "due_date">, today: string): BillGroup {
  if (bill.status === "Paid") return "Paid";
  return bill.due_date < today ? "Overdue" : "Upcoming";
}

export function sortBills(bills: Bill[], today: string): Bill[] {
  const order: Record<BillGroup, number> = { Overdue: 0, Upcoming: 1, Paid: 2 };
  return [...bills].sort((a, b) => order[billGroup(a, today)] - order[billGroup(b, today)] || a.due_date.localeCompare(b.due_date) || a.created_at.localeCompare(b.created_at));
}

export function billsDueWithin30Days(bills: Pick<Bill, "status" | "due_date" | "amount">[], today: string): number {
  const lastIncluded = addDays(today, 30);
  return bills.reduce((sum, bill) => bill.status === "Unpaid" && bill.due_date <= lastIncluded ? sum + Number(bill.amount) : sum, 0);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}

export function nextRecurringDueDate(date: string, frequency: BillFrequency): string | null {
  if (frequency === "Once-off") return null;
  if (frequency === "Weekly") return addDays(date, 7);
  const [year, month, day] = date.split("-").map(Number);
  const nextMonthStart = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(nextMonthStart.getUTCFullYear(), nextMonthStart.getUTCMonth() + 1, 0)).getUTCDate();
  return `${nextMonthStart.getUTCFullYear()}-${String(nextMonthStart.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function displayBillDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
