# Project Tour

This guide is for developers who need a quick orientation to the codebase.

## High-Level Product Flow
1. A user adds an item from the main dashboard.
2. The pricing layer resolves the product and gathers market pricing.
3. The UI renders item cards, market totals, and comparison views.
4. If the user is signed in, wishlist data is synced to Supabase.
5. If the user is not signed in, wishlist state is stored locally in the browser.

## Main Directories
- `app/`: Next.js App Router entry points, layouts, routes, and page-level components
- `app/components/`: reusable UI and feature components
- `app/lib/`: shared state, client utilities, theme logic, and pricing integrations
- `app/api/`: route handlers for wishlist, auth callback, product resolution, and rates
- `supabase/`: SQL migrations
- `tests/`: offline and integration-oriented test helpers
- `docs/`: product, design, privacy, and engineering documentation

## Request And State Flow

### Wishlist
- The main dashboard in `app/page.tsx` owns list state and selection state.
- Signed-in persistence goes through `/api/wishlist`.
- Guest persistence uses browser `localStorage`.

### Pricing
- Product resolution lives in `app/lib/pricing-engine/`.
- API entry for adding items is `app/api/add-item/route.ts`.
- Currency conversion is handled through `/api/rates` and shared formatting utilities.

### Auth
- Supabase client configuration lives in `app/lib/supabase.ts`.
- The auth callback route is `app/api/auth/callback/route.ts`.
- Sign-in UI lives in `app/components/sign-in-modal.tsx`.

## Good Starting Points
- `app/page.tsx`: main dashboard state and page composition
- `app/components/wishlist-card.tsx`: item-level presentation
- `app/lib/market-summary.ts`: market totals and comparison logic
- `app/lib/pricing-engine/`: provider abstraction and resolution logic
- `app/api/wishlist/route.ts`: server-side persistence
