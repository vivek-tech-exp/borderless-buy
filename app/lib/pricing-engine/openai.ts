import type { Product } from "@/types";
import { BasePricingEngine } from "./base";

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

  async resolveProductPricing(
    query: string
  ): Promise<{ product: Product; prompt: string } | { error: string; prompt: string } | null> {
    this.error("OpenAI engine not yet implemented. Please use Gemini or Perplexity.");
    this.log("OpenAI engine stub invoked", {
      query,
      hasApiKey: this.apiKey.length > 0,
    });
    return null;
  }
}
