import { normalizeProductQuery } from "@/app/lib/product-query";
import { BasePricingEngine, type PricingResult } from "./base";

/**
 * OpenAI-based pricing engine (GPT-4, GPT-4o, etc.)
 * Ready for integration.
 */
export class OpenAIPricingEngine extends BasePricingEngine {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super();
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = apiKey;
  }

  async performResolveProductPricing(
    query: string
  ): Promise<PricingResult | null> {
    this.error("OpenAI engine not yet implemented. Please use Gemini or Perplexity.");
    this.log("OpenAI engine stub invoked", {
      query,
      hasApiKey: this.apiKey.length > 0,
    });
    return {
      error: "OpenAI pricing engine is not implemented. Use Gemini instead.",
      normalizedQuery: normalizeProductQuery(query),
    };
  }
}
