import { describe, expect, it } from "vitest";
import { calculatePlan, validateAvailableCapital, validatePlanLine, type PlanLine } from "./plan";
import { formatZar } from "./money";

const sampleLines: PlanLine[] = [
  { kind: "Startup cost", name: "Oven", amount: 5000, quantity: 2, unit_cost: 0 },
  { kind: "Monthly expense", name: "Rent", amount: 3500, quantity: 1, unit_cost: 0 },
  { kind: "Income", name: "Chocolate cake", amount: 350, quantity: 20, unit_cost: 120 },
];

describe("plan calculations (BR2–BR4)", () => {
  it("calculates monthly expenses from the T-US5-1 line", () => {
    const totals = calculatePlan([{ kind: "Monthly expense", name: "Rent", amount: 3500, quantity: 1, unit_cost: 0 }], 0);
    expect(totals.monthlyExpenses).toBe(3500);
    expect(formatZar(totals.monthlyExpenses)).toBe("R3,500.00");
  });

  it("calculates the T-US5-2 income price times units", () => {
    const totals = calculatePlan([{ kind: "Income", name: "Chocolate cake", amount: 350, quantity: 20, unit_cost: 120 }], 0);
    expect(totals.monthlyRevenue).toBe(7000);
    expect(totals.variableCost).toBe(2400);
  });

  it("matches every T-US6-1 total", () => {
    const totals = calculatePlan(sampleLines, 6000);
    expect(totals).toMatchObject({
      startupTotal: 10000, monthlyExpenses: 3500, monthlyRevenue: 7000, variableCost: 2400,
      monthlyProfit: 1100, marginRatio: 4600 / 7000, breakEvenRevenue: 5326.09,
      fundingGap: 4000, paybackMonths: 10, profitLabel: "Profit",
      disclaimer: "These are your estimates, not guaranteed results.",
    });
  });

  it("shows the T-US6-2 loss and break-even message with no revenue", () => {
    const totals = calculatePlan([{ kind: "Monthly expense", name: "Rent", amount: 3500, quantity: 1, unit_cost: 0 }], 0);
    expect(totals.monthlyProfit).toBe(-3500);
    expect(totals.profitLabel).toBe("Loss");
    expect(formatZar(totals.monthlyProfit)).toBe("-R3,500.00");
    expect(totals.breakEvenMessage).toBe("Add an income line to see break-even.");
  });

  it("shows the T-US6-3 unreachable payback at zero or negative profit", () => {
    const noProfit = calculatePlan([{ kind: "Monthly expense", name: "Rent", amount: 100, quantity: 1, unit_cost: 0 }], 0);
    const zeroProfit = calculatePlan([{ kind: "Income", name: "Sales", amount: 100, quantity: 1, unit_cost: 0 }, { kind: "Monthly expense", name: "Rent", amount: 100, quantity: 1, unit_cost: 0 }], 0);
    expect(noProfit.paybackMessage).toBe("Not reachable at these numbers.");
    expect(zeroProfit.paybackMessage).toBe("Not reachable at these numbers.");
  });

  it("handles zero startup, fully funded capital, and margin at or below zero", () => {
    expect(calculatePlan([], 0).paybackMonths).toBeNull();
    expect(calculatePlan([], 0).fundingGap).toBe(0);
    const noMargin = calculatePlan([{ kind: "Income", name: "Item", amount: 100, quantity: 1, unit_cost: 100 }], 0);
    expect(noMargin.breakEvenRevenue).toBeNull();
    expect(noMargin.breakEvenMessage).toBe("Add an income line to see break-even.");
  });
});

describe("plan validation (BR1, BR5)", () => {
  it("accepts quantity and text boundary values", () => {
    expect(validatePlanLine({ kind: "Startup cost", name: "abc", amount: "0.01", quantity: 1 }, 99)).toEqual({});
    expect(validatePlanLine({ kind: "Startup cost", name: "n".repeat(60), amount: "10000000.00", quantity: 1000 }, 99)).toEqual({});
    expect(validatePlanLine({ kind: "Income", name: "Cake", amount: 350, quantity: 100000, unit_cost: 0 }, 99)).toEqual({});
    expect(validatePlanLine({ kind: "Income", name: "Cake", amount: 350, quantity: 20, unit_cost: "" }, 99)).toEqual({});
  });

  it("shows the T-US5-3 amount error for zero or empty values", () => {
    expect(validatePlanLine({ kind: "Monthly expense", name: "Rent", amount: "0.00", quantity: 1 }, 0).amount).toBe("Enter an amount above R0.00.");
    expect(validatePlanLine({ kind: "Monthly expense", name: "Rent", amount: "", quantity: 1 }, 0).amount).toBe("Enter an amount above R0.00.");
  });

  it("enforces the T-US5-4 100-line limit and permits edits at the limit", () => {
    const line = { kind: "Monthly expense" as const, name: "Rent", amount: 3500, quantity: 1 };
    expect(validatePlanLine(line, 100).limit).toBe("You can have up to 100 plan lines.");
    expect(validatePlanLine(line, 100, true)).toEqual({});
  });

  it("checks kind-specific quantities, 3–60 names, price ceilings and amount precision", () => {
    expect(validatePlanLine({ kind: "Startup cost", name: "ab", amount: "2.999", quantity: 0 }, 0)).toMatchObject({
      name: "Enter a name of 3 to 60 characters.", amount: "Enter an amount above R0.00.", quantity: "Enter a whole number from 1 to 1,000.",
    });
    expect(validatePlanLine({ kind: "Income", name: "Cake", amount: 10, quantity: 100001, unit_cost: 0 }, 0).quantity).toBe("Enter a whole number from 1 to 100,000.");
    expect(validatePlanLine({ kind: "Monthly expense", name: "Rent", amount: 10000000.01, quantity: 1 }, 0).amount).toBe("Enter an amount above R0.00.");
  });

  it("allows zero capital but rejects amounts outside its BR1 boundary", () => {
    expect(validateAvailableCapital("0.00")).toBeNull();
    expect(validateAvailableCapital("10000000.00")).toBeNull();
    expect(validateAvailableCapital("10000000.01")).not.toBeNull();
    expect(validateAvailableCapital("-0.01")).not.toBeNull();
    expect(validateAvailableCapital("")).not.toBeNull();
    expect(validateAvailableCapital("0.29")).toBeNull();
  });
});
