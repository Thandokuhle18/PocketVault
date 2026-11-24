export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const isValidName = (value: string) => value.trim().length >= 1 && value.trim().length <= 60;
export const isValidPassword = (value: string) => value.length >= 8 && /\d/.test(value);
export const getPostLoginPath = (role: "Owner" | "Staff" | null, hasBusiness: boolean) =>
  role === "Staff" ? "/ledger" : role === "Owner" && hasBusiness ? "/dashboard" : "/setup";
