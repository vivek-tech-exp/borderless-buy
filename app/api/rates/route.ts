import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const REVALIDATE_SECONDS = 86400; // 24 hours

async function fetchRates(): Promise<{
  rates: Record<string, number>;
  updatedAt: string;
}> {
  const res = await fetch(RATES_URL);
  if (!res.ok) throw new Error("Rates fetch failed");
  const data = (await res.json()) as {
    rates?: Record<string, number>;
    time_last_update_unix?: number;
  };
  const rates = data.rates ?? {};
  if (Object.keys(rates).length === 0) throw new Error("No rates");
  const updatedAt = data.time_last_update_unix
    ? new Date(data.time_last_update_unix * 1000).toISOString()
    : new Date().toISOString();
  return { rates: { USD: 1, ...rates }, updatedAt };
}

const getCachedRates = unstable_cache(
  fetchRates,
  ["fx-rates"],
  { revalidate: REVALIDATE_SECONDS }
);

/**
 * Returns FX rates (per 1 USD). Cached for 24h so conversion stays off the
 * critical path when users interact; rates are fetched at most once per day.
 */
export async function GET() {
  try {
    const { rates, updatedAt } = await getCachedRates();
    return NextResponse.json({
      base: "USD",
      rates,
      updatedAt,
    });
  } catch (err) {
    console.error("Rates API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch rates" },
      { status: 503 }
    );
  }
}
