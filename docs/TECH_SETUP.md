# Tech Setup

## Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+ (or pnpm/yarn if you prefer)
- A Supabase project (free tier works)

## Install
```bash
npm install
```

## Environment Variables
Create a `.env.local` in the project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ... (publishable key)
SUPABASE_SECRET_KEY=... (server-only)
GEMINI_API_KEY=... (server-only)
```

## Supabase Setup
1) Open the Supabase SQL editor.
2) Run the migrations in order:
- `supabase/migrations/001_create_wishlist.sql`
- `supabase/migrations/002_add_tag_to_wishlist.sql`

## Development
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Tests
```bash
node tests/run-tests.js
```

## Common Issues
- If prices do not convert, verify `/api/rates` is reachable and rates are not blocked by ad blockers.
- If auth fails, confirm Supabase URL and publishable key are correct and the redirect URL is allowed in Supabase auth settings.

## Useful Docs
- Product requirements: docs/PRD.md
- Design system: docs/DESIGN_SYSTEM.md
- Pricing engine: docs/PRICING_ENGINE_ARCHITECTURE.md
- Security audit: docs/SECURITY_AUDIT.md
