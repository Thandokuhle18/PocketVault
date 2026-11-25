import { describe, expect, it } from "vitest";
import { hasInviteCapacity, inviteErrorMessage, inviteMatchesProfile, normalizeInviteEmail, validateBusinessSettings, validateDeleteConfirmation, validateInviteEmail } from "./settings";

describe("Settings rules / US4", () => {
  it("T-US4-1 accepts and normalizes a valid invite email", () => {
    expect(validateInviteEmail(" lwazi@example.com ")).toBeNull();
    expect(normalizeInviteEmail(" Lwazi@Example.com ")).toBe("lwazi@example.com");
  });

  it("T-US4-2 maps the database BR23 staff limit into its exact user message", () => {
    expect(inviteErrorMessage("You have reached the limit of 5 staff.")).toBe("You have reached the limit of 5 staff.");
    expect(hasInviteCapacity(4)).toBe(true);
    expect(hasInviteCapacity(5)).toBe(false);
  });

  it("T-US4-3 accepts a case-insensitive matching invite email", () => {
    expect(normalizeInviteEmail("Lwazi@Example.com")).toBe("lwazi@example.com");
    expect(inviteMatchesProfile("Lwazi@Example.com", "lwazi@example.com")).toBe(true);
  });

  it("T-US4-4 rejects malformed email values with the PRD message", () => {
    for (const value of ["", "lwazi", "lwazi@", "@example.com", "lwazi@example", "a..b@example.com"]) {
      expect(validateInviteEmail(value)).toBe("Enter a valid email address.");
    }
  });

  it("checks email address length and domain-label boundaries", () => {
    expect(validateInviteEmail("a@b.co")).toBeNull();
    expect(validateInviteEmail("a@-bad.com")).toBe("Enter a valid email address.");
    expect(validateInviteEmail("a@bad-.com")).toBe("Enter a valid email address.");
    expect(validateInviteEmail("x".repeat(250) + "@x.co")).toBe("Enter a valid email address.");
  });

  it("requires the exact M5 DELETE confirmation and validates business fields", () => {
    expect(validateDeleteConfirmation("DELETE")).toBeNull();
    expect(validateDeleteConfirmation("delete")).toBe("Type DELETE to confirm.");
    expect(validateBusinessSettings("AB", "Other", "Idea").name).toBe("Enter a business name of 3 to 60 characters.");
    expect(validateBusinessSettings("x".repeat(60), "Other", "Idea")).toEqual({});
    expect(validateBusinessSettings("x".repeat(61), "Other", "Idea").name).toBe("Enter a business name of 3 to 60 characters.");
    expect(validateBusinessSettings("Bakery", "Other", "Operating")).toEqual({});
  });
});
