/**
 * Currency formatting and conversion.
 * Conversion uses rates as "per 1 USD" (rates.USD === 1).
 */

/** Format amount in a given currency (symbol + number) */
export function formatCurrency(
  value: number,
  currencyCode: string,
  options?: { maxFractionDigits?: number }
): string {
  const maxFractionDigits = options?.maxFractionDigits ?? 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: maxFractionDigits,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(maxFractionDigits)}`;
  }
}

/**
 * Convert amount from one currency to another using rates (per 1 USD).
 * rates[USD] = 1, rates[INR] = 83 => 1 USD = 83 INR.
 * So amountInINR to USD = amountInINR / rates[INR].
 * amountInUSD to INR = amountInUSD * rates[INR].
 * General: amountInFrom / rates[from] * rates[to]
 */
export function convert(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (fromRate == null || toRate == null) return amount;
  if (fromCurrency === toCurrency) return amount;
  return (amount / fromRate) * toRate;
}
