# Project Tour

## High-Level Flow
1) User adds items via the wishlist form.
2) Each item is normalized and priced across markets.
3) UI shows per-item best market and list-level totals.
4) Optional sign-in persists data to Supabase.

## Key Folders
- app/ - Next.js App Router pages, components, and styles.
- app/components/ - UI components and feature modules.
- app/lib/ - Context providers, utilities, and pricing engine logic.
- app/api/ - Server routes for pricing, auth callbacks, and wishlist CRUD.
- supabase/ - Database migrations.
- tests/ - Smoke tests and integrity checks.
- docs/ - Product, design, security, and architecture docs.

## Data Flow (Wishlist)
- UI: AddItemForm -> MainDashboard state.
- Persistence: /api/wishlist -> Supabase (when signed in).
- Guest mode: localStorage keys in app/page.tsx.

## Data Flow (Pricing)
- Pricing engine lives in app/lib/pricing-engine/.
- Each item has per-country pricing + source metadata.
- Currency conversion via /api/rates and app/lib/utils.

## Where to Start
- Main UI: app/page.tsx
- Wishlist cards: app/components/wishlist-card.tsx
- Pricing engine: app/lib/pricing-engine/
- Supabase integration: app/lib/supabase.ts
