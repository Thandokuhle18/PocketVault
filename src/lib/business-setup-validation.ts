export const BUSINESS_TYPES = [
  "Bakery or catering", "Clothing or retail", "Beauty or barbering", "Car wash or cleaning",
  "Spaza or general shop", "Freelance or professional services", "Events or photography",
  "Repairs or construction", "Online selling", "Farming", "Other",
] as const;
export const BUSINESS_STAGES = ["Idea", "Starting", "Operating"] as const;
export const BUSINESS_BALANCE_ERROR = "Enter an amount from R0.00 to R10,000,000.00.";
export const BUSINESS_NAME_ERROR = "Enter a business name of 3 to 60 characters.";

export type BusinessSetupValues = {
  name: string;
  type: string;
  description: string;
  stage: string;
  openingBalance: string;
  availableCapital: string;
};
export type BusinessSetupErrors = Partial<Record<keyof BusinessSetupValues, string>>;

export function parseBusinessBalance(value: string): number | null {
  const normalized = value.trim().replace(/^R\s*/i, "");
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amountText = normalized.replace(/,/g, "");
  const amount = Number(amountText);
  return Number.isFinite(amount) && amount >= 0 && amount <= 10_000_000 ? amount : null;
}

export function validateBusinessSetup(values: BusinessSetupValues): BusinessSetupErrors {
  const errors: BusinessSetupErrors = {};
  const nameLength = values.name.trim().length;
  if (nameLength < 3 || nameLength > 60) errors.name = BUSINESS_NAME_ERROR;
  if (!(BUSINESS_TYPES as readonly string[]).includes(values.type)) errors.type = "Choose a business type.";
  if (values.description.length > 200) errors.description = "Enter a description of 200 characters or fewer.";
  if (!(BUSINESS_STAGES as readonly string[]).includes(values.stage)) errors.stage = "Choose a business stage.";
  if (parseBusinessBalance(values.openingBalance) === null) errors.openingBalance = BUSINESS_BALANCE_ERROR;
  if (values.availableCapital.trim() !== "" && parseBusinessBalance(values.availableCapital) === null) errors.availableCapital = BUSINESS_BALANCE_ERROR;
  return errors;
}
