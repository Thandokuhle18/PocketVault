import { describe, expect, it } from "vitest";
import { getPostLoginPath, isValidEmail, isValidName, isValidPassword } from "./auth-validation";

describe("auth validation", () => {
  it("validates required email format", () => { expect(isValidEmail("a@example.com")).toBe(true); expect(isValidEmail("nope")).toBe(false); });
  it("accepts names from 1 through 60 trimmed characters", () => { expect(isValidName(" A ")).toBe(true); expect(isValidName(" ")).toBe(false); expect(isValidName("x".repeat(61))).toBe(false); });
  it("requires eight characters and a number", () => { expect(isValidPassword("password1")).toBe(true); expect(isValidPassword("password")).toBe(false); expect(isValidPassword("pass1")).toBe(false); });
});

describe("post login role redirect", () => {
  it("routes users by membership role and business membership", () => {
    expect(getPostLoginPath(null, false)).toBe("/setup");
    expect(getPostLoginPath("Owner", false)).toBe("/setup");
    expect(getPostLoginPath("Owner", true)).toBe("/dashboard");
    expect(getPostLoginPath("Staff", true)).toBe("/ledger");
  });
});
