import { canReadPricingCache } from "@/app/lib/pricing-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const healthy = await canReadPricingCache().catch(() => false);
  return new Response(null, {
    status: healthy ? 204 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export const HEAD = GET;
