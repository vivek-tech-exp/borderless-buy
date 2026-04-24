# Borderless Buy

Borderless Buy helps people compare wishlist prices across countries so they can decide where to buy each item, what to buy locally, and what may be worth buying abroad.

## Live Site

[oneday-baby-phi.vercel.app](https://oneday-baby-phi.vercel.app)

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
IP_HASH_SECRET=your-random-ip-hash-secret
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash-lite
```

Notes:
- Without Supabase environment variables, the app still builds, but sign-in and synced wishlists are unavailable.
- Without a pricing provider key, use `AI_PROVIDER=mock` for local demos.
- `GEMINI_MODEL` defaults to `gemini-2.5-flash-lite`, which is the intended free-tier production model.

## AI Usage Strategy

Borderless Buy uses a quota-aware AI access model.

The app can use a platform Gemini API key for a small number of free searches. After the free quota is exhausted, users can provide their own Gemini API key.

User-provided API keys are not stored server-side. They are stored only in browser storage and passed only for the current AI request.

Cached pricing results do not consume quota.

Platform credits are consumed before external AI execution. This intentionally favors quota protection over perfect user fairness.

For local demos without an AI key:

```bash
AI_PROVIDER=mock
```

## Database Migrations

This project uses Supabase SQL migrations. Existing `001`-`005` migrations should not be renamed if they have already been applied remotely.

Create new timestamped migrations with:

```bash
npm run db:migration:new -- migration_name
```

Before applying migrations remotely, inspect migration history:

```bash
npm run db:list
```

If older migrations were applied manually and are missing from Supabase migration history, use `supabase migration repair` to mark them applied before pushing. Then dry-run and push:

```bash
npm run db:push:dry
npm run db:push
```

Use `npm run db:reset` only for local development. Never run `supabase db reset --linked` or `supabase db reset --db-url` against production.

## Architecture Highlights

- Provider-based pricing engine
- Gemini provider
- Mock provider for local demo mode
- Supabase-backed usage tracking
- Supabase-backed pricing cache
- Browser-only bring-your-own-key flow
- AI request logging
- Graceful fallback when AI is unavailable

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
