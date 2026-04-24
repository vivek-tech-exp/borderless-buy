import type { Product } from "@/types";
import { createLogger, type Logger } from "@/app/lib/logger";

export type PricingSource = "cache" | "fresh_ai" | "stale_cache";

type PricingMetadata = {
  normalizedQuery: string;
  source?: PricingSource;
  model?: string;
  prompt?: string;
  cacheAgeSeconds?: number;
};

/**
 * Base interface for pricing engines.
 * Implementations define how to fetch and validate pricing data from various LLM providers.
 */
export type PricingResult =
  | (PricingMetadata & {
      product: Product;
    })
  | (PricingMetadata & {
      error: string;
    });

export interface PricingEngine {
  /**
   * Resolve a product query and return pricing across all supported countries.
   * @param query - Product name or description (e.g., "MacBook Pro")
   * @returns Product with pricing data and the prompt used for transparency
   */
  resolveProductPricing(query: string): Promise<PricingResult | null>;
}

/**
 * Abstract base class with common utilities for all pricing engines.
 */
export abstract class BasePricingEngine implements PricingEngine {
  protected logger: Logger;

  constructor() {
    this.logger = createLogger(this.constructor.name);
  }

  private pendingRequests = new Map<string, Promise<PricingResult | null>>();

  /**
   * Resolve a product query with built-in deduplication for concurrent identical requests.
   */
  async resolveProductPricing(query: string): Promise<PricingResult | null> {
    const key = query.trim().toLowerCase();
    const existing = this.pendingRequests.get(key);
    if (existing) {
      this.log("Joining existing in-flight request", { query: key });
      return existing;
    }

    const promise = this.performResolveProductPricing(query);
    this.pendingRequests.set(key, promise);

    try {
      return await promise;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  protected abstract performResolveProductPricing(query: string): Promise<PricingResult | null>;

  /**
   * Validate price to reject placeholders and invalid values.
   */
  protected isValidPrice(price: unknown): price is number {
    if (typeof price !== "number" || price <= 0) return false;
    if ([0, 1, 123456, 999999].includes(price)) return false;
    return true;
  }

  /**
   * Validate URL - ensure valid HTTP(S) link.
   */
  protected isValidUrl(url: unknown): url is string {
    if (typeof url !== "string") return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  /**
   * Log with provider context for debugging.
   */
  protected log(message: string, data?: Record<string, unknown>) {
    this.logger.debug(message, data);
  }

  protected warn(message: string, data?: Record<string, unknown>) {
    this.logger.warn(message, data);
  }

  protected error(message: string, err?: Error | string, data?: Record<string, unknown>) {
    this.logger.error(message, err, data);
  }
}
