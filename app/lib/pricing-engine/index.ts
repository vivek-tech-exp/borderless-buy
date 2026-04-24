import type { PricingEngine } from "./base";
import { DEFAULT_GEMINI_MODEL, GeminiPricingEngine } from "./gemini";
import { MockPricingProvider } from "./mock";

export type PricingProviderType = "gemini" | "mock";

export type CreatePricingEngineOptions = {
  apiKey?: string;
  cacheMode?: "read-write" | "write-only" | "none";
};

export function getConfiguredPricingProvider(): PricingProviderType {
  const provider = (process.env.AI_PROVIDER || process.env.PRICING_ENGINE || "gemini").toLowerCase();
  return provider === "mock" ? "mock" : "gemini";
}

export function getConfiguredPricingModel(provider: PricingProviderType): string {
  return provider === "gemini" ? DEFAULT_GEMINI_MODEL : "mock-static-v1";
}

export function createPricingEngine(
  provider: PricingProviderType = getConfiguredPricingProvider(),
  options: CreatePricingEngineOptions = {}
): PricingEngine {
  switch (provider) {
    case "mock":
      return new MockPricingProvider();
    case "gemini":
    default:
      return new GeminiPricingEngine(
        options.apiKey ?? process.env.GEMINI_API_KEY ?? "",
        DEFAULT_GEMINI_MODEL,
        { cacheMode: options.cacheMode }
      );
  }
}

let engineInstance: PricingEngine | null = null;

export function getPricingEngine(): PricingEngine {
  engineInstance ??= createPricingEngine();
  return engineInstance;
}

export type { PricingEngine } from "./base";
export { BasePricingEngine } from "./base";
export { GeminiPricingEngine, GeminiPricingProvider } from "./gemini";
export { MockPricingProvider } from "./mock";
