import { describe, expect, it } from "vitest";
import { BUSINESS_BALANCE_ERROR, BUSINESS_NAME_ERROR, validateBusinessSetup, parseBusinessBalance, type BusinessSetupValues } from "./business-setup-validation";

const validValues: BusinessSetupValues = {
  name: "Zodwa's Home Bakery", type: "Bakery or catering", description: "", stage: "Operating",
  openingBalance: "2000.00", availableCapital: "6000.00",
};

describe("business setup validation", () => {
  it("accepts the US3 example values and zero opening balance", () => {
    expect(validateBusinessSetup(validValues)).toEqual({});
    expect(parseBusinessBalance("R0.00")).toBe(0);
  });

  it("rejects a name shorter than three characters with the US3 message", () => {
    expect(validateBusinessSetup({ ...validValues, name: "Zo" }).name).toBe(BUSINESS_NAME_ERROR);
    expect(validateBusinessSetup({ ...validValues, name: "  " }).name).toBe(BUSINESS_NAME_ERROR);
  });

  it.each(["-0.01", "10000000.01", "", "1.001", "abc"])("rejects invalid opening balance %s with the US3 message", value => {
    expect(validateBusinessSetup({ ...validValues, openingBalance: value }).openingBalance).toBe(BUSINESS_BALANCE_ERROR);
  });

  it("accepts name and money boundary values", () => {
    expect(validateBusinessSetup({ ...validValues, name: "abc" }).name).toBeUndefined();
    expect(validateBusinessSetup({ ...validValues, name: "x".repeat(60) }).name).toBeUndefined();
    expect(validateBusinessSetup({ ...validValues, name: "x".repeat(61) }).name).toBe(BUSINESS_NAME_ERROR);
    expect(parseBusinessBalance("0")).toBe(0);
    expect(parseBusinessBalance("R10,000,000.00")).toBe(10_000_000);
    expect(parseBusinessBalance("10000000.01")).toBeNull();
  });

  it("allows blank optional available capital, and validates a supplied value", () => {
    expect(validateBusinessSetup({ ...validValues, availableCapital: "" }).availableCapital).toBeUndefined();
    expect(validateBusinessSetup({ ...validValues, availableCapital: "-1" }).availableCapital).toBe(BUSINESS_BALANCE_ERROR);
  });

  it("validates description, type and stage", () => {
    expect(validateBusinessSetup({ ...validValues, description: "d".repeat(200) })).toEqual({});
    expect(validateBusinessSetup({ ...validValues, description: "d".repeat(201) }).description).toBeTruthy();
    expect(validateBusinessSetup({ ...validValues, type: "Invalid" }).type).toBeTruthy();
    expect(validateBusinessSetup({ ...validValues, stage: "Invalid" }).stage).toBeTruthy();
  });
});
