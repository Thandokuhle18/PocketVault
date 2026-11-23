export const MAX_AMOUNT = 10000000;

export function formatZar(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const [whole, cents] = Math.abs(amount).toFixed(2).split(".");
  return `${sign}R${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
}

export function isValidAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_AMOUNT;
}
