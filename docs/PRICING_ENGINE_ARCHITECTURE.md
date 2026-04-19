# Pricing Provider Architecture

This document explains how Borderless Buy resolves product pricing through interchangeable provider implementations.

## Purpose

The pricing layer is designed so the API route does not depend on one specific provider. That keeps the application easier to test, easier to extend, and easier to reconfigure between environments.

## Directory Layout

```text
app/lib/pricing-engine/
├── base.ts
├── gemini.ts
├── openai.ts
├── perplexity.ts
└── index.ts
```

## Core Contract

Every pricing provider implements the same interface:

```ts
interface PricingEngine {
  resolveProductPricing(query: string): Promise<{
    product: Product;
    prompt: string;
  } | null>;
}
```

The returned `product` object becomes the normalized item used throughout the rest of the app.

## Current Providers
- `gemini.ts`: active implementation
- `openai.ts`: provider stub
- `perplexity.ts`: provider stub

## Provider Selection

`app/lib/pricing-engine/index.ts` selects the provider using `PRICING_ENGINE`.

Example:

```bash
PRICING_ENGINE=gemini
GEMINI_API_KEY=your-key
```

Other supported environment variables:

```bash
PRICING_ENGINE=openai
OPENAI_API_KEY=your-key
```

```bash
PRICING_ENGINE=perplexity
PERPLEXITY_API_KEY=your-key
```

## How The API Uses It

`app/api/add-item/route.ts` requests the current pricing engine from the factory and calls it through the shared interface. The route does not need provider-specific logic.

## Shared Base Utilities

The base implementation centralizes common behavior such as:
- validating price values
- validating outbound retailer URLs
- shared logging helpers
- shared prompt construction helpers where applicable

## Adding A New Provider
1. Add a new file in `app/lib/pricing-engine/`.
2. Implement the shared interface.
3. Add the provider to the factory in `index.ts`.
4. Add the corresponding environment variable to local setup docs.
5. Test the provider through `app/api/add-item/route.ts`.

## Developer Notes
- Keep provider-specific parsing isolated to the provider file.
- Normalize product output before returning it.
- Avoid mixing transport concerns into the route handler.
- Prefer predictable error messages over provider-specific jargon.
