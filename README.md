# Borderless Buy

Borderless Buy helps people compare wishlist prices across countries so they can decide where to buy each item, what to buy locally, and what may be worth buying abroad.

## What The Product Does
- Builds a wishlist from product queries.
- Compares item pricing across supported markets.
- Shows per-item and whole-list market totals.
- Saves wishlists for signed-in users with email-based sign-in.
- Keeps income-based affordability calculations on the device.

## Who This Repository Is For
- Shoppers and non-technical stakeholders who want a clear overview of the product.
- Designers and product teams who need the experience and content guidelines.
- Developers who need setup, architecture, testing, and contribution guidance.

## Quick Start
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Local Environment

For the full product experience, create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

Notes:
- Without Supabase environment variables, the app still builds, but sign-in and synced wishlists are unavailable.
- Without a pricing provider key, product resolution and price lookup features will be limited.

## Quality Checks
```bash
npm test
npm run lint
npm run build
```

## Security Hooks

This repository uses Husky hooks for leak detection and dependency checks.

Install the required CLI locally:

```bash
brew install gitleaks
```

Run the checks manually:

```bash
npm run security:check
npm run security:gitleaks:repo
```

## Documentation

Start with the documentation index: [docs/README.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/README.md)

Direct links:
- Product overview: [docs/PRD.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/PRD.md)
- Technical setup: [docs/TECH_SETUP.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/TECH_SETUP.md)
- Codebase tour: [docs/PROJECT_TOUR.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/PROJECT_TOUR.md)
- Pricing provider architecture: [docs/PRICING_ENGINE_ARCHITECTURE.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/PRICING_ENGINE_ARCHITECTURE.md)
- Privacy and data handling: [docs/SECURITY_AUDIT.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/SECURITY_AUDIT.md)
- Data reliability notes: [docs/DATA_INTEGRITY_ISSUES.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/DATA_INTEGRITY_ISSUES.md)
- Design system: [docs/DESIGN_SYSTEM.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/DESIGN_SYSTEM.md)
- Contribution guide: [docs/CONTRIBUTING.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/CONTRIBUTING.md)
