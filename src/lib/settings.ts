export const TEAM_LIMIT = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInviteEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function inviteMatchesProfile(inviteEmail: string, profileEmail: string): boolean {
  return normalizeInviteEmail(inviteEmail) === normalizeInviteEmail(profileEmail);
}

export function hasInviteCapacity(staffCount: number): boolean {
  return Number.isInteger(staffCount) && staffCount >= 0 && staffCount < TEAM_LIMIT;
}

export function validateInviteEmail(value: string): string | null {
  const email = value.trim();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  const [local, domain] = email.split("@");
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..") || domain.split(".").some((label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-"))) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateDeleteConfirmation(value: string): string | null {
  return value === "DELETE" ? null : "Type DELETE to confirm.";
}

export function inviteErrorMessage(message: string): string {
  if (message.includes("limit of 5 staff")) return "You have reached the limit of 5 staff.";
  if (message.toLowerCase().includes("duplicate key") || message.toLowerCase().includes("unique constraint")) return "This email already has an invite.";
  return "Something went wrong. Try again.";
}

export function validateBusinessSettings(name: string, type: string, stage: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (name.trim().length < 3 || name.trim().length > 60) errors.name = "Enter a business name of 3 to 60 characters.";
  if (!(BUSINESS_TYPES as readonly string[]).includes(type)) errors.type = "Choose a valid business type.";
  if (!(BUSINESS_STAGES as readonly string[]).includes(stage)) errors.stage = "Choose a valid business stage.";
  return errors;
}

export const BUSINESS_TYPES = ["Bakery or catering", "Clothing or retail", "Beauty or barbering", "Car wash or cleaning", "Spaza or general shop", "Freelance or professional services", "Events or photography", "Repairs or construction", "Online selling", "Farming", "Other"] as const;
export const BUSINESS_STAGES = ["Idea", "Starting", "Operating"] as const;
