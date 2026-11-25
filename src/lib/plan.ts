import { MAX_AMOUNT } from "./money";

export const PLAN_KINDS = ["Startup cost", "Monthly expense", "Income"] as const;
export type PlanKind = typeof PLAN_KINDS[number];

export type PlanLine = {
  id?: string;
  business_id?: string;
  kind: PlanKind;
  name: string;
  amount: number;
  quantity: number;
  unit_cost: number;
  created_at?: string;
};

export type PlanTotals = {
  startupTotal: number;
  monthlyExpenses: number;
  monthlyRevenue: number;
  variableCost: number;
  monthlyProfit: number;
  marginRatio: number | null;
  breakEvenRevenue: number | null;
  breakEvenMessage: string | null;
  fundingGap: number;
  paybackMonths: number | null;
  paybackMessage: string | null;
  profitLabel: "Profit" | "Loss";
  disclaimer: "These are your estimates, not guaranteed results.";
};

export type PlanLineInput = {
  kind: PlanKind;
  name: string;
  amount: string | number;
  quantity: string | number;
  unit_cost?: string | number;
};

export function parsePlanMoney(value: string | number): number {
  if (typeof value === "number") return value;
  return Number(value.replace(/[R,\s]/gi, ""));
}

function hasAtMostTwoDecimals(value: string | number): boolean {
  if (typeof value === "number") return Number.isFinite(value) && Math.abs(Math.round(value * 100) - value * 100) < 1e-8;
  const cleaned = value.replace(/[R,\s]/gi, "");
  return /^\d+(?:\.\d{1,2})?$/.test(cleaned);
}

export function calculatePlan(lines: PlanLine[], availableCapital: number): PlanTotals {
  const totals = lines.reduce((result, line) => {
    if (line.kind === "Startup cost") result.startupTotal += Number(line.amount) * line.quantity;
    if (line.kind === "Monthly expense") result.monthlyExpenses += Number(line.amount);
    if (line.kind === "Income") {
      result.monthlyRevenue += Number(line.amount) * line.quantity;
      result.variableCost += Number(line.unit_cost) * line.quantity;
    }
    return result;
  }, { startupTotal: 0, monthlyExpenses: 0, monthlyRevenue: 0, variableCost: 0 });

  const monthlyProfit = totals.monthlyRevenue - totals.variableCost - totals.monthlyExpenses;
  const marginRatio = totals.monthlyRevenue > 0
    ? (totals.monthlyRevenue - totals.variableCost) / totals.monthlyRevenue
    : null;
  const breakEvenRevenue = marginRatio !== null && marginRatio > 0
    ? Math.round((totals.monthlyExpenses / marginRatio + Number.EPSILON) * 100) / 100
    : null;
  const paybackMonths = monthlyProfit > 0 ? Math.ceil(totals.startupTotal / monthlyProfit) : null;

  return {
    ...totals,
    monthlyProfit,
    marginRatio,
    breakEvenRevenue,
    breakEvenMessage: breakEvenRevenue === null ? "Add an income line to see break-even." : null,
    fundingGap: Math.max(0, totals.startupTotal - availableCapital),
    paybackMonths,
    paybackMessage: paybackMonths === null ? "Not reachable at these numbers." : null,
    profitLabel: monthlyProfit < 0 ? "Loss" : "Profit",
    disclaimer: "These are your estimates, not guaranteed results.",
  };
}

export function validatePlanLine(input: PlanLineInput, existingLineCount: number, isEditing = false): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  const amount = parsePlanMoney(input.amount);
  const quantity = Number(input.quantity);
  const unitCostInput = input.unit_cost === undefined || input.unit_cost === "" ? 0 : input.unit_cost;
  const unitCost = parsePlanMoney(unitCostInput);

  if (name.length < 3 || name.length > 60) errors.name = "Enter a name of 3 to 60 characters.";
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT || !hasAtMostTwoDecimals(input.amount)) {
    errors.amount = "Enter an amount above R0.00.";
  }
  if (input.kind === "Startup cost") {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) errors.quantity = "Enter a whole number from 1 to 1,000.";
  } else if (input.kind === "Income") {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) errors.quantity = "Enter a whole number from 1 to 100,000.";
    if (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > MAX_AMOUNT || !hasAtMostTwoDecimals(unitCostInput)) {
      errors.unit_cost = "Enter an amount from R0.00.";
    }
  } else if (quantity !== 1) {
    errors.quantity = "Monthly expense quantity must be 1.";
  }
  if (!isEditing && existingLineCount >= 100) errors.limit = "You can have up to 100 plan lines.";
  return errors;
}

export function validateAvailableCapital(value: string | number): string | null {
  if (typeof value === "string" && !value.trim()) return "Enter an amount from R0.00 to R10,000,000.00.";
  const amount = parsePlanMoney(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT || !hasAtMostTwoDecimals(value)) {
    return "Enter an amount from R0.00 to R10,000,000.00.";
  }
  return null;
}
