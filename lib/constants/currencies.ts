// Shared currency list for all modules
export const CURRENCIES = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
  { value: "CAD", label: "CAD ($)", symbol: "CA$" },
  { value: "AUD", label: "AUD ($)", symbol: "A$" },
  { value: "JPY", label: "JPY (¥)", symbol: "¥" },
  { value: "CHF", label: "CHF (Fr)", symbol: "Fr" },
  { value: "CNY", label: "CNY (¥)", symbol: "¥" },
  { value: "INR", label: "INR (₹)", symbol: "₹" },
  { value: "MXN", label: "MXN ($)", symbol: "MX$" },
  { value: "BRL", label: "BRL (R$)", symbol: "R$" },
  { value: "AED", label: "AED (د.إ)", symbol: "د.إ" },
  { value: "SAR", label: "SAR (﷼)", symbol: "﷼" },
  { value: "EGP", label: "EGP (£)", symbol: "E£" },
  { value: "KWD", label: "KWD (د.ك)", symbol: "د.ك" },
  { value: "QAR", label: "QAR (﷼)", symbol: "﷼" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["value"];

export function getCurrencySymbol(code: string): string {
  const currency = CURRENCIES.find((c) => c.value === code);
  return currency?.symbol || code;
}

export function formatCurrency(value: number, currencyCode: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
