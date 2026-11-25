import { describe, expect, it } from "vitest";
import { billsDue30, cashOnHand, debtGuardLevel, debtGuardWarning, expenses, income, insightSentences, net, safeToSpend } from "./insights";

const rows = [
  { amount: 1000, type: "Income" as const, status: "Approved" as const, transaction_date: "2026-11-10" },
  { amount: 600, type: "Expense" as const, status: "Approved" as const, transaction_date: "2026-11-11", category: "Stock" },
  { amount: 300, type: "Expense" as const, status: "Pending" as const, transaction_date: "2026-11-11", category: "Rent" },
  { amount: 200, type: "Expense" as const, status: "Approved" as const, transaction_date: "2026-11-11", deleted_at: "2026-11-12", category: "Stock" },
];

describe("dashboard calculations", () => {
  it("T-US10 period income, expenses, net and excludes non-approved, deleted, out-of-period rows", () => {
    expect(income(rows, "2026-11-01", "2026-11-30")).toBe(1000);
    expect(expenses(rows, "2026-11-01", "2026-11-30")).toBe(600);
    expect(net(rows, "2026-11-01", "2026-11-30")).toBe(400);
    expect(income(rows, "2026-12-01", "2026-12-31")).toBe(0);
  });

  it("T-US10-1 computes cash on hand, Bills30 and safe-to-spend", () => {
    const data = [...rows, { amount: 50, type: "Income" as const, status: "Approved" as const, transaction_date: "2026-12-01" }];
    expect(cashOnHand(2000, data, "2026-11-30")).toBe(2400);
    const bills = billsDue30([
      { amount: 200, due_date: "2026-11-01", status: "Unpaid" as const },
      { amount: 300, due_date: "2026-12-30", status: "Unpaid" as const },
      { amount: 900, due_date: "2026-12-31", status: "Unpaid" as const },
      { amount: 800, due_date: "2026-11-20", status: "Paid" as const },
    ], "2026-11-30");
    expect(bills).toBe(500);
    expect(safeToSpend(2400, bills)).toBe(1900);
  });

  it.each([
    [1000, 100, true, true, "Safe"],
    [19, 100, true, true, "Watch"],
    [-1, 100, true, true, "At risk"],
    [0, 0, false, false, "Not enough data yet"],
    [0, 0, true, false, "Safe"],
  ] as const)("BR12 boundary/status safe=%s bills=%s => %s", (safe, bills, hasTransactions, hasBills, expected) => {
    expect(debtGuardLevel(safe, bills, hasTransactions, hasBills)).toBe(expected);
  });

  it("treats exactly R0.00 as Watch when bills exist and Safe when Bills30 is zero", () => {
    expect(debtGuardLevel(0, 100, true, true)).toBe("Watch");
    expect(debtGuardLevel(0, 0, true, true)).toBe("Safe");
    expect(debtGuardLevel(20, 100, true, true)).toBe("Safe");
  });

  it("T-US10-2 describes At risk banner condition and BR13 formats the shortfall", () => {
    expect(debtGuardWarning(100, 200)).toBe("This would leave you R100.00 short for bills due in the next 30 days. Save anyway?");
    expect(debtGuardWarning(200, 200)).toBeNull();
  });

  it("T-US10-3 has no badge for no activity and T-US10-4 returns the exact expense insight", () => {
    expect(debtGuardLevel(0, 0, false, false)).toBe("Not enough data yet");
    const transactions = [...rows, { amount: 1400, type: "Expense" as const, status: "Approved" as const, transaction_date: "2026-11-15", category: "Stock" }];
    expect(insightSentences({ transactions, from: "2026-11-01", through: "2026-11-30", previousFrom: "2026-10-01", previousThrough: "2026-10-31", bills: [], today: "2026-11-30" })[0]).toBe("Expenses are R1,000.00 higher than income this period.");
  });
});
