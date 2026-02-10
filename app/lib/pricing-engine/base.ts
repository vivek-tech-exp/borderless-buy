import type { Product } from "@/types";
import { createLogger, type Logger } from "@/app/lib/logger";

/**
 * Base interface for pricing engines.
 * Implementations define how to fetch and validate pricing data from various LLM providers.
 */
export type PricingResult =
  | {
      product: Product;
      prompt: string;
    }
  | {
      error: string;
      prompt: string;
    };

export interface PricingEngine {
  /**
   * Resolve a product query and return pricing across all supported countries.
   * @param query - Product name or description (e.g., "MacBook Pro 14")
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

  abstract resolveProductPricing(query: string): Promise<PricingResult | null>;

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

  protected error(message: string, err?: Error | string) {
    this.logger.error(message, err);
  }
}
