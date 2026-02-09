import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Product } from "@/types";
import { COUNTRY_CODES } from "@/types";
import { BasePricingEngine } from "./base";

/**
 * Gemini-based pricing engine using Google's Generative AI API.
 */
export class GeminiPricingEngine extends BasePricingEngine {
  private genAI: GoogleGenerativeAI;
  private models = [
    "gemini-3.0-flash",      // Best & Fresh Quota
    "gemini-3.5-flash",      // Best & Fresh Quota
    "gemini-2.5-flash-lite", // Backup: Fast & Fresh Quota
    "gemini-2.5-flash",      // Fallback
  ];

  constructor(apiKey: string) {
    super();
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async resolveProductPricing(
    query: string
  ): Promise<{ product: Product; prompt: string } | null> {
    const prompt = this.buildPrompt(query);
    this.log("Starting product resolution with query:", query);

    for (const modelName of this.models) {
      try {
        this.log(`Trying model: ${modelName}`);
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const genResult = await model.generateContent(prompt);
        const text = genResult.response.text();

        if (!text) {
          this.log(`Model ${modelName} returned empty response, trying next`);
          continue;
        }

        this.log(`Model ${modelName} succeeded`);

        // Parse and validate response
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const product = this.parseProductResponse(parsed, query);

        if (!product) {
          this.log("Failed to parse product from response");
          continue;
        }

        return { product, prompt };
      } catch (err) {
        this.error(`Model ${modelName} failed`, err);
        // Continue to next model
      }
    }

    this.error("All Gemini models exhausted");
    return null;
  }

  private buildPrompt(query: string): string {
    return `You are a Precision Pricing Engine. Your goal is strict "Apples-to-Apples" comparison. You prioritize data accuracy over finding a "low" price.

Task: Analyze the Query "${query}" and define a specific Baseline Configuration (e.g., "Model X, 256GB, WiFi Only"). Search for exactly this configuration in all 10 regions. If the exact configuration is not available in a region, set price to null rather than substituting a different model.

Strict Filtering Rules:
- Condition: NEW items only. Exclude "Refurbished", "Renewed", "Open Box", or "Used".  
- Price Validation: Ignore placeholder prices (e.g., 0, 1, 123456). If the price is "Call to Order" or unavailable, set price to null.
- Regional Sourcing:
  * US: Amazon.com, Apple.com, Best Buy
  * UK: Amazon.co.uk, Apple.co.uk, John Lewis
  * IN: Amazon.in, Flipkart, Apple India
  * AE: Noon.com, Amazon.ae, Carrefour
  * CN: JD.com, Tmall (provide search page if login required)
  * KR: Coupang, Samsung Korea, LG Korea
  * JP: Amazon.co.jp, Rakuten, BIC Camera
  * DE: Amazon.de, MediaMarkt, Currys
  * AU: JB Hi-Fi, Harvey Norman, Amazon.au
  * HK: Aeon.com.hk, Fortress, Watsons Electronics
- Stock Status: Mark as "in_stock", "out_of_stock", "preorder", or "unknown".

Return exactly this JSON (no markdown, no extra text):
{
  "id": "unique-kebab-id",
  "name": "Full product name",
  "displayName": "Short name for UI (e.g. MacBook Pro 14 M4)",
  "category": "tech" | "vehicle" | "other",
  "carryOnFriendly": true or false,
  "baselineConfiguration": "Exact specs compared (e.g. 256GB Storage, 8GB RAM)",
  "pricing": {
    "US": { "price": number or null, "currency": "USD", "priceSource": "e.g. Apple.com", "buyingLink": "https://...", "stockStatus": "in_stock", "notes": "" },
    "UK": { "price": number or null, "currency": "GBP", "priceSource": "e.g. Apple.co.uk", "buyingLink": "https://...", "stockStatus": "in_stock", "notes": "" },
    "IN": { "price": number or null, "currency": "INR", "priceSource": "e.g. Apple India", "buyingLink": "https://...", "stockStatus": "in_stock", "notes": "" },
    "AE": { "price": number or null, "currency": "AED", "priceSource": "e.g. Noon.com", "buyingLink": "https://...", "stockStatus": "in_stock", "notes": "" },
    "CN": { "price": number or null, "currency": "CNY", "priceSource": "e.g. JD.com", "buyingLink": "https://...", "stockStatus": "in_stock", "notes": "" },
    "KR": { "price": number or null, "currency": "KRW", "priceSource": "e.g. Coupang", "buyingLink": "https://...", "stockStatus": "in_stock", "notes": "" },
    "JP": { "price": number or null, "currency": "JPY", "priceSource": "e.g. Amazon.co.jp", "buyingLink": "https://...", "stockStatus": "in_stock", "notes": "" },
    "DE": { "price": number or null, "currency": "EUR", "priceSource": "e.g. Amazon.de", "buyingLink": "https://...", "stockStatus": "in_stock", "notes": "" },
    "AU": { "price": number or null, "currency": "AUD", "priceSource": "e.g. JB Hi-Fi", "buyingLink": "https://...", "stockStatus": "in_stock", "notes": "" },
    "HK": { "price": number or null, "currency": "HKD", "priceSource": "e.g. Fortress", "buyingLink": "https://...", "stockStatus": "in_stock", "notes": "" }
  }
}

Data Accuracy Over Speed: Only return prices you are confident are accurate for the EXACT configuration. Use null for unavailable or uncertain prices. Be conservative.`;
  }

  private parseProductResponse(
    parsed: Record<string, unknown>,
    query: string
  ): Product | null {
    try {
      const pricingRaw = parsed.pricing as Record<string, unknown> | undefined;
      const pricing: Product["pricing"] = {};

      if (pricingRaw && typeof pricingRaw === "object") {
        for (const code of COUNTRY_CODES) {
          const p = pricingRaw[code] as Record<string, unknown> | undefined;
          if (p && typeof p === "object") {
            const price = this.isValidPrice(p.price) ? p.price : null;
            const buyingLink = this.isValidUrl(p.buyingLink)
              ? String(p.buyingLink)
              : "";

            if (
              typeof p.currency === "string" &&
              typeof p.priceSource === "string"
            ) {
              pricing[code] = {
                price,
                currency: String(p.currency),
                priceSource: String(p.priceSource),
                buyingLink,
                stockStatus: [
                  "in_stock",
                  "out_of_stock",
                  "preorder",
                  "unknown",
                ].includes(String(p.stockStatus))
                  ? (p.stockStatus as
                      | "in_stock"
                      | "out_of_stock"
                      | "preorder"
                      | "unknown")
                  : "unknown",
                notes:
                  typeof p.notes === "string" ? p.notes : "",
              };
            }
          }
        }
      }

      const product: Product = {
        id: String(parsed.id ?? crypto.randomUUID()),
        name: String(parsed.name ?? query),
        displayName: String(
          parsed.displayName ?? parsed.name ?? query
        ),
        category: ["tech", "vehicle", "other"].includes(
          String(parsed.category)
        )
          ? (parsed.category as Product["category"])
          : "other",
        carryOnFriendly: Boolean(parsed.carryOnFriendly),
        baselineConfiguration:
          typeof parsed.baselineConfiguration === "string"
            ? parsed.baselineConfiguration
            : undefined,
        pricing,
      };

      return product;
    } catch (err) {
      this.error("Failed to parse product response", err);
      return null;
    }
  }
}
