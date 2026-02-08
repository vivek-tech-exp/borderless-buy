import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Product, WishlistItem } from "@/types";
import { COUNTRY_CODES } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

/**
 * Receives a product query and returns a WishlistItem with pricing for all 6 countries.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json(
        { error: "Missing or invalid 'query' (e.g. 'MacBook')" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const result = await resolveProductWithGemini(query);
    if (!result) {
      return NextResponse.json(
        { error: "Could not resolve product from query" },
        { status: 422 }
      );
    }
    const { product, prompt } = result;

    const item: WishlistItem = {
      id: crypto.randomUUID(),
      product,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ item, prompt });
  } catch (err) {
    console.error("add-item API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/** Resolve query to Product with pricing for IN, NP, US, AE, CN, KR. */
async function resolveProductWithGemini(
  query: string
): Promise<{ product: Product; prompt: string } | null> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are a product resolver for shoppers comparing prices across countries. Given a short query, identify the current flagship or most relevant product and return exactly this JSON (no markdown, no extra text):
{
  "id": "unique-kebab-id",
  "name": "Full product name",
  "displayName": "Short name for UI (e.g. MacBook Pro 14\\" M4)",
  "category": "tech" | "vehicle" | "other",
  "carryOnFriendly": true or false,
  "pricing": {
    "IN": { "price": number, "currency": "INR", "priceSource": "e.g. Apple India, Flipkart", "buyingLink": "https://..." },
    "NP": { "price": number, "currency": "NPR", "priceSource": "e.g. Daraz Nepal", "buyingLink": "https://..." },
    "US": { "price": number, "currency": "USD", "priceSource": "e.g. Apple US, Amazon.com", "buyingLink": "https://..." },
    "AE": { "price": number, "currency": "AED", "priceSource": "e.g. Apple UAE, Noon", "buyingLink": "https://..." },
    "CN": { "price": number, "currency": "CNY", "priceSource": "e.g. JD.com, Tmall", "buyingLink": "https://..." },
    "KR": { "price": number, "currency": "KRW", "priceSource": "e.g. Samsung Korea, Coupang", "buyingLink": "https://..." }
  }
}
Rules: Provide real or plausible prices in local currency for each country (IN=India, NP=Nepal, US=USA, AE=UAE Dubai, CN=China, KR=South Korea). Use real current flagship models. Fill all 6 keys in pricing. Use official or major retailer URLs. Query: "${query}"`;

  console.log("[Gemini prompt]", prompt);

  const genResult = await model.generateContent(prompt);
  const text = genResult.response.text();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const pricingRaw = parsed.pricing as Record<string, unknown> | undefined;
    const pricing: Product["pricing"] = {};

    if (pricingRaw && typeof pricingRaw === "object") {
      for (const code of COUNTRY_CODES) {
        const p = pricingRaw[code] as Record<string, unknown> | undefined;
        if (
          p &&
          typeof p.price === "number" &&
          typeof p.currency === "string" &&
          typeof p.priceSource === "string" &&
          typeof p.buyingLink === "string"
        ) {
          pricing[code] = {
            price: Number(p.price),
            currency: String(p.currency),
            priceSource: String(p.priceSource),
            buyingLink: String(p.buyingLink),
          };
        }
      }
    }

    const product: Product = {
      id: String(parsed.id ?? crypto.randomUUID()),
      name: String(parsed.name ?? query),
      displayName: String(parsed.displayName ?? parsed.name ?? query),
      category: ["tech", "vehicle", "other"].includes(String(parsed.category))
        ? (parsed.category as Product["category"])
        : "other",
      carryOnFriendly: Boolean(parsed.carryOnFriendly),
      pricing,
    };
    return { product, prompt };
  } catch {
    return null;
  }
}
