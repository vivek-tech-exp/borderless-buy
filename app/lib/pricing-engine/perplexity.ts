import type { Product } from "@/types";
import { BasePricingEngine } from "./base";

/**
 * Perplexity-based pricing engine (using Perplexity's API)
 * Ready for integration.
 */
export class PerplexityPricingEngine extends BasePricingEngine {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super();
    if (!apiKey) {
      throw new Error("Perplexity API key is required");
    }
    this.apiKey = apiKey;
  }

  async resolveProductPricing(
    query: string
  ): Promise<{ product: Product; prompt: string } | { error: string; prompt: string } | null> {
    this.error("Perplexity engine not yet implemented. Please use Gemini or OpenAI.");
    this.log("Perplexity engine stub invoked", {
      query,
      hasApiKey: this.apiKey.length > 0,
    });
    return null;
  }
}
