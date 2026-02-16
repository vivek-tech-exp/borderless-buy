import type { PricingEngine } from "./base";
import { GeminiPricingEngine } from "./gemini";
import { OpenAIPricingEngine } from "./openai";
import { PerplexityPricingEngine } from "./perplexity";

export type PricingEngineType = "gemini" | "openai" | "perplexity";

/**
 * Factory to create and return the appropriate pricing engine based on environment configuration.
 * Defaults to Gemini if not specified.
 *
 * Environment variables:
 * - PRICING_ENGINE: "gemini" | "openai" | "perplexity" (default: "gemini")
 * - GEMINI_API_KEY: Required if engine is "gemini"
 * - OPENAI_API_KEY: Required if engine is "openai"
 * - PERPLEXITY_API_KEY: Required if engine is "perplexity"
 */
export function createPricingEngine(): PricingEngine {
  const engineType = (
    process.env.PRICING_ENGINE || "gemini"
  ).toLowerCase() as PricingEngineType;

  switch (engineType) {
    case "openai":
      return new OpenAIPricingEngine(process.env.OPENAI_API_KEY || "");

    case "perplexity":
      return new PerplexityPricingEngine(process.env.PERPLEXITY_API_KEY || "");

    case "gemini":
    default:
      return new GeminiPricingEngine(process.env.GEMINI_API_KEY || "");
  }
}

/**
 * Singleton instance of the pricing engine.
 * Retrieved once and reused throughout the application.
 */
let engineInstance: PricingEngine | null = null;

/**
 * Get the singleton pricing engine instance.
 */
export function getPricingEngine(): PricingEngine {
  engineInstance ??= createPricingEngine();
  return engineInstance;
}

// Re-export types and implementations for downstream use
export type { PricingEngine } from "./base";
export { BasePricingEngine } from "./base";
export { GeminiPricingEngine } from "./gemini";
export { OpenAIPricingEngine } from "./openai";
export { PerplexityPricingEngine } from "./perplexity";
