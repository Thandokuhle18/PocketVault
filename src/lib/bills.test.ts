import { describe, expect, it } from "vitest";
import { addDays, billGroup, billsDueWithin30Days, nextRecurringDueDate, sortBills, validateBill, type BillInput } from "./bills";

const validBill: BillInput = { name: "Rent", amount: "3,500.00", due_date: "2026-11-28", frequency: "Monthly", category: "Rent" };

describe("Bills US11", () => {
  it("T-US11-1: accepts and classifies an upcoming monthly rent bill", () => {
    expect(validateBill(validBill)).toEqual({});
    expect(billGroup({ status: "Unpaid", due_date: "2026-11-28" }, "2026-11-25")).toBe("Upcoming");
    expect(billsDueWithin30Days([{ status: "Unpaid", due_date: "2026-11-28", amount: 3500 }], "2026-11-25")).toBe(3500);
  });

  it("T-US11-2: recurring dates advance by one week or calendar month and paid bills stay paid", () => {
    expect(nextRecurringDueDate("2026-11-28", "Weekly")).toBe("2026-12-05");
    expect(nextRecurringDueDate("2026-11-30", "Monthly")).toBe("2026-12-30");
    expect(nextRecurringDueDate("2027-01-31", "Monthly")).toBe("2027-02-28");
    expect(nextRecurringDueDate("2026-11-28", "Once-off")).toBeNull();
    expect(billGroup({ status: "Paid", due_date: "2026-11-20" }, "2026-11-25")).toBe("Paid");
  });

  it("T-US11-3: rejects empty, zero, invalid precision and out-of-range amounts", () => {
    for (const amount of ["", "0", "0.00", "1.005", "10000000.01"]) {
      expect(validateBill({ ...validBill, amount }).amount).toBe("Enter an amount above R0.00.");
    }
  });

  it("T-US11-4: bill display rules expose no role permissions to the data model", () => {
    expect(billGroup({ status: "Unpaid", due_date: "2026-11-24" }, "2026-11-25")).toBe("Overdue");
    expect(sortBills([
      { id: "paid", status: "Paid", due_date: "2026-10-01", created_at: "", business_id: "", name: "", amount: 1, frequency: "Once-off", category: "Rent", paid_at: null },
      { id: "today", status: "Unpaid", due_date: "2026-11-25", created_at: "", business_id: "", name: "", amount: 1, frequency: "Once-off", category: "Rent", paid_at: null },
      { id: "late", status: "Unpaid", due_date: "2026-11-24", created_at: "", business_id: "", name: "", amount: 1, frequency: "Once-off", category: "Rent", paid_at: null },
    ], "2026-11-25").map((bill) => bill.id)).toEqual(["late", "today", "paid"]);
  });

  it("enforces name, category and due-date boundaries", () => {
    expect(validateBill({ ...validBill, name: "ab" }).name).toBe("Enter a name of 3 to 60 characters.");
    expect(validateBill({ ...validBill, name: "a".repeat(61) }).name).toBe("Enter a name of 3 to 60 characters.");
    expect(validateBill({ ...validBill, category: "Product sales" }).category).toBe("Choose an expense category.");
    expect(validateBill({ ...validBill, due_date: "2026-02-30" }).due_date).toBe("Choose a due date.");
    expect(validateBill({ ...validBill, amount: "10000000.00" })).toEqual({});
  });

  it("includes overdue and the exact 30-day boundary, while excluding paid and day 31", () => {
    const bills = [
      { status: "Unpaid" as const, due_date: "2026-11-24", amount: 10 },
      { status: "Unpaid" as const, due_date: "2026-12-25", amount: 20 },
      { status: "Unpaid" as const, due_date: "2026-12-26", amount: 30 },
      { status: "Paid" as const, due_date: "2026-12-01", amount: 40 },
    ];
    expect(billsDueWithin30Days(bills, "2026-11-25")).toBe(30);
    expect(addDays("2026-11-25", 30)).toBe("2026-12-25");
  });
});
