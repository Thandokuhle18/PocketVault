import { describe, expect, it } from "vitest";
import { formatZar, isValidAmount } from "./money";

describe("formatZar", () => {
  it("formats rand with comma thousands and 2 decimals", () => {
    expect(formatZar(1234.5)).toBe("R1,234.50");
  });

  it("formats zero", () => {
    expect(formatZar(0)).toBe("R0.00");
  });

  it("formats the maximum amount", () => {
    expect(formatZar(10000000)).toBe("R10,000,000.00");
  });

  it("formats negative amounts", () => {
    expect(formatZar(-3500)).toBe("-R3,500.00");
  });
});

describe("isValidAmount (BR1)", () => {
  it("rejects zero and negative amounts", () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-1)).toBe(false);
  });

  it("accepts amounts up to R10,000,000.00", () => {
    expect(isValidAmount(0.01)).toBe(true);
    expect(isValidAmount(10000000)).toBe(true);
  });

  it("rejects amounts above R10,000,000.00", () => {
    expect(isValidAmount(10000000.01)).toBe(false);
  });
});
