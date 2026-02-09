# Pricing Engine Architecture

## Overview

The pricing engine system is now fully modularized, making it easy to switch between different LLM providers (Gemini, OpenAI, Perplexity, etc.) without changing any route logic.

## Architecture

```
app/lib/pricing-engine/
├── base.ts              # PricingEngine interface & BasePricingEngine abstract class
├── gemini.ts            # GeminiPricingEngine implementation
├── openai.ts            # OpenAIPricingEngine (stub, ready for implementation)
├── perplexity.ts        # PerplexityPricingEngine (stub, ready for implementation)
└── index.ts             # Factory & singleton instance management
```

## How It Works

### 1. **Interface** (`base.ts`)
Defines the contract all pricing engines must follow:
```typescript
interface PricingEngine {
  resolveProductPricing(query: string): Promise<{
    product: Product;
    prompt: string;
  } | null>;
}
```

### 2. **Implementations**
Each provider extends `BasePricingEngine`:
- `GeminiPricingEngine` - Uses Google Generative AI API (fully implemented)
- `OpenAIPricingEngine` - Uses OpenAI API (stub, ready for implementation)
- `PerplexityPricingEngine` - Uses Perplexity API (stub, ready for implementation)

### 3. **Factory Pattern** (`index.ts`)
Automatically selects the engine based on `PRICING_ENGINE` environment variable (defaults to Gemini):

```typescript
export function createPricingEngine(): PricingEngine {
  const engineType = (process.env.PRICING_ENGINE || "gemini").toLowerCase();
  
  switch (engineType) {
    case "openai":
      return new OpenAIPricingEngine(process.env.OPENAI_API_KEY || "");
    case "perplexity":
      return new PerplexityPricingEngine(process.env.PERPLEXITY_API_KEY || "");
    default:
      return new GeminiPricingEngine(process.env.GEMINI_API_KEY || "");
  }
}
```

### 4. **Route Usage** (`app/api/add-item/route.ts`)
Route is completely decoupled from any specific provider:
```typescript
const pricingEngine = getPricingEngine();
const result = await pricingEngine.resolveProductPricing(query);
```

## Environment Configuration

Add one of these to your `.env.local`:

**Gemini (default):**
```
PRICING_ENGINE=gemini
GEMINI_API_KEY=sk-...
```

**OpenAI:**
```
PRICING_ENGINE=openai
OPENAI_API_KEY=sk-proj-...
```

**Perplexity:**
```
PRICING_ENGINE=perplexity
PERPLEXITY_API_KEY=sk-...
```

## Adding a New Pricing Engine

### Step 1: Create the implementation file
```typescript
// app/lib/pricing-engine/anthropic.ts
import type { Product } from "@/types";
import { BasePricingEngine } from "./base";

export class AnthropicPricingEngine extends BasePricingEngine {
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    if (!apiKey) throw new Error("Anthropic API key is required");
    this.apiKey = apiKey;
  }

  async resolveProductPricing(
    query: string
  ): Promise<{ product: Product; prompt: string } | null> {
    // Your implementation here
    const prompt = this.buildPrompt(query);
    
    // Call Anthropic API...
    // Parse response...
    // Return { product, prompt }
  }

  private buildPrompt(query: string): string {
    // Same prompt as other engines (can be shared/extracted)
    return `...`;
  }
}
```

### Step 2: Update the factory
```typescript
// app/lib/pricing-engine/index.ts
import { AnthropicPricingEngine } from "./anthropic";

export type PricingEngineType = "gemini" | "openai" | "perplexity" | "anthropic";

export function createPricingEngine(): PricingEngine {
  const engineType = (process.env.PRICING_ENGINE || "gemini").toLowerCase();

  switch (engineType) {
    case "anthropic":
      return new AnthropicPricingEngine(process.env.ANTHROPIC_API_KEY || "");
    // ... other cases
  }
}
```

### Step 3: Export it
```typescript
// app/lib/pricing-engine/index.ts
export { AnthropicPricingEngine } from "./anthropic";
```

### Step 4: Add environment variable
```env
PRICING_ENGINE=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

## Common Utilities in BasePricingEngine

All engines inherit these helpers:
- `isValidPrice(price)` - Rejects placeholders (0, 1, 123456, 999999)
- `isValidUrl(url)` - Validates HTTP(S) URLs
- `log(message, data)` - Logs with engine name prefix
- `error(message, err)` - Logs errors with engine name

## Testing

To test with a different engine:

1. Switch the environment variable
2. Restart the dev server
3. Add an item on the UI
4. The API will use the selected engine automatically

Example:
```bash
PRICING_ENGINE=openai OPENAI_API_KEY=sk-proj-... npm run dev
```

## Future Integrations

Stubs are ready for:
- **OpenAI** - Implement GPT-4o integration (use `gpt-4o-json` for structured output)
- **Perplexity** - Implement Perplexity API integration (great for real-time pricing)
- **Custom Models** - Ollama, vLLM, or other local LLM servers

## Benefits

✅ **Decoupled** - Route doesn't know about specific providers  
✅ **Extensible** - Add new engines without touching existing code  
✅ **Testable** - Mock pricing engines in tests  
✅ **Flexible** - Switch providers at runtime via environment  
✅ **Clean** - Shared logic in base class, provider-specific logic in implementations
