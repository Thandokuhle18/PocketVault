import { describe, expect, it } from "vitest";
import { formatZar } from "./money";
import {
  calculateLedgerTotals, expectedApprovalStatus, matchesLedgerFilters, periodStart, sortTransactions,
  transactionReviewUpdate, validateDeleteReason, validateRejectionReason, validateTransaction, type LedgerFilters, type LedgerTransaction,
} from "./ledger";

const baseInput = {
  description: "Flour and sugar", amount: "1250.00", type: "Expense" as const,
  category: "Stock", payment_method: "Card", transaction_date: "2026-11-03", notes: "",
};

const rows: LedgerTransaction[] = [
  { id: "1", business_id: "b", created_by: "z", description: "Cake sales", amount: 4800, type: "Income", category: "Product sales", payment_method: "EFT", transaction_date: "2026-11-02", notes: null, status: "Approved", rejection_reason: null, created_at: "2026-11-02T10:00:00Z", updated_at: "2026-11-02T10:00:00Z" },
  { id: "2", business_id: "b", created_by: "l", description: "Flour and sugar", amount: 1250, type: "Expense", category: "Stock", payment_method: "Card", transaction_date: "2026-11-03", notes: null, status: "Approved", rejection_reason: null, created_at: "2026-11-03T10:00:00Z", updated_at: "2026-11-03T10:00:00Z" },
  { id: "3", business_id: "b", created_by: "l", description: "Oven repair", amount: 2400, type: "Expense", category: "Maintenance", payment_method: "Cash", transaction_date: "2026-11-05", notes: null, status: "Pending", rejection_reason: null, created_at: "2026-11-05T10:00:00Z", updated_at: "2026-11-05T10:00:00Z" },
];

describe("transaction validation (BR6)", () => {
  it("accepts the T-US7-1 Flour and sugar entry and boundary values", () => {
    expect(validateTransaction(baseInput, "2026-11-03")).toEqual({});
    expect(validateTransaction({ ...baseInput, description: "abc", amount: "0.01" }, "2026-11-03")).toEqual({});
    expect(validateTransaction({ ...baseInput, description: "x".repeat(80), amount: "10000000.00", notes: "n".repeat(300) }, "2026-11-03")).toEqual({});
  });

  it("rejects a future date and short description with the T-US7 messages", () => {
    expect(validateTransaction({ ...baseInput, transaction_date: "2026-11-04" }, "2026-11-03").transaction_date).toBe("Date cannot be in the future.");
    expect(validateTransaction({ ...baseInput, description: "ab" }, "2026-11-03").description).toBe("Enter a description of 3 to 80 characters.");
  });

  it("rejects length, money, category, payment and notes outside their limits", () => {
    const errors = validateTransaction({ ...baseInput, description: "x".repeat(81), amount: "10000000.01", category: "Deposits", payment_method: "Crypto", notes: "n".repeat(301) }, "2026-11-03");
    expect(errors).toHaveProperty("description");
    expect(errors).toHaveProperty("amount");
    expect(errors).toHaveProperty("category");
    expect(errors).toHaveProperty("payment_method");
    expect(errors).toHaveProperty("notes");
  });
});

describe("approval, filters and totals (BR7–BR10)", () => {
  it("covers Staff approval thresholds and owner approval", () => {
    expect(expectedApprovalStatus("Expense", 1250, "Staff")).toBe("Approved");
    expect(expectedApprovalStatus("Expense", 2000, "Staff")).toBe("Pending");
    expect(expectedApprovalStatus("Expense", 2400, "Staff")).toBe("Pending");
    expect(expectedApprovalStatus("Income", 2400, "Staff")).toBe("Approved");
    expect(expectedApprovalStatus("Expense", 2400, "Owner")).toBe("Approved");
  });

  it("searches case-insensitively and applies type, category and period filters (T-US9-1)", () => {
    const filters: LedgerFilters = { search: "flour", type: "Expense", category: "Stock", status: "All", period: "This month" };
    expect(rows.filter((row) => matchesLedgerFilters(row, filters, new Date(2026, 10, 25))).map((row) => row.id)).toEqual(["2"]);
    expect(periodStart("Last month", new Date(2026, 10, 25))).toBe("2026-10-01");
    expect(periodStart("Last 3 months", new Date(2026, 10, 25))).toBe("2026-09-01");
    const matchedTotals = calculateLedgerTotals(rows.filter((row) => matchesLedgerFilters(row, filters, new Date(2026, 10, 25))));
    expect(`Income ${formatZar(matchedTotals.income)} · Expenses ${formatZar(matchedTotals.expenses)}`).toBe("Income R0.00 · Expenses R1,250.00");
  });

  it("sorts newest transaction date then newest created_at and totals only Approved rows", () => {
    expect(sortTransactions(rows).map((row) => row.id)).toEqual(["3", "2", "1"]);
    expect(calculateLedgerTotals(rows)).toEqual({ income: 4800, expenses: 1250 });
  });

  it("updates the Approved expense total after an edited amount (T-US9-2)", () => {
    const editedRows = rows.map((row) => row.id === "2" ? { ...row, amount: 1500 } : row);
    expect(calculateLedgerTotals(editedRows)).toEqual({ income: 4800, expenses: 1500 });
  });
});

describe("delete reason (BR9, T-US9-3 and T-US9-4)", () => {
  it("accepts 3 and 200 characters and rejects empty, short, or overlong reasons", () => {
    expect(validateDeleteReason("abc")).toBeNull();
    expect(validateDeleteReason("x".repeat(200))).toBeNull();
    expect(validateDeleteReason("")).toBe("Enter a reason of 3 to 200 characters.");
    expect(validateDeleteReason("ab")).toBe("Enter a reason of 3 to 200 characters.");
    expect(validateDeleteReason("   ")).toBe("Enter a reason of 3 to 200 characters.");
    expect(validateDeleteReason("x".repeat(201))).toBe("Enter a reason of 3 to 200 characters.");
  });
});

describe("transaction approvals (US12)", () => {
  it("approves a pending expense and clears its rejection reason (T-US12-1)", () => {
    const pending = rows[2];
    const approved = { ...pending, ...transactionReviewUpdate(true) };
    expect(approved.status).toBe("Approved");
    expect(approved.rejection_reason).toBeNull();
    expect(calculateLedgerTotals([...rows.slice(0, 2), approved])).toEqual({ income: 4800, expenses: 3650 });
  });

  it("rejects with the trimmed reason and keeps rejected expenses out of totals (T-US12-2)", () => {
    expect(validateRejectionReason("Receipt missing")).toBeNull();
    const rejected = { ...rows[2], ...transactionReviewUpdate(false, "  Receipt missing  ") };
    expect(rejected.status).toBe("Rejected");
    expect(rejected.rejection_reason).toBe("Receipt missing");
    expect(calculateLedgerTotals([...rows.slice(0, 2), rejected])).toEqual({ income: 4800, expenses: 1250 });
  });

  it("requires 3 to 200 non-whitespace characters (T-US12-3 and boundaries)", () => {
    const error = "Enter a reason of 3 to 200 characters.";
    expect(validateRejectionReason("")).toBe(error);
    expect(validateRejectionReason("ab")).toBe(error);
    expect(validateRejectionReason("  ")).toBe(error);
    expect(validateRejectionReason(" abc ")).toBeNull();
    expect(validateRejectionReason("x".repeat(200))).toBeNull();
    expect(validateRejectionReason("x".repeat(201))).toBe(error);
  });
});
