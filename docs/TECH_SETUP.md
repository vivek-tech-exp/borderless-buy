# Technical Setup

This guide is for developers running Borderless Buy locally.

## Prerequisites
- Node.js 18 or newer
- npm 9 or newer
- A Supabase project for sign-in and synced wishlists
- A pricing provider key for full item resolution

## Installation
```bash
npm install
```

## Environment Variables

Create `.env.local` in the project root.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

Optional provider configuration:

```bash
PRICING_ENGINE=gemini
OPENAI_API_KEY=
PERPLEXITY_API_KEY=
```

Notes:
- `NEXT_PUBLIC_*` values are safe for browser use.
- `SUPABASE_SECRET_KEY` and provider API keys must stay server-side.
- The app can build without Supabase variables, but sign-in and synced wishlists will be unavailable in that environment.

## Supabase Setup
1. Open the Supabase SQL editor.
2. Run the migrations in order:
   `supabase/migrations/001_create_wishlist.sql`
   `supabase/migrations/002_add_tag_to_wishlist.sql`
3. In Supabase Auth settings, allow your local callback URL:
   `http://localhost:3000/api/auth/callback`

## Local Development
```bash
npm run dev
```

## Validation
```bash
npm test
npm run lint
npm run build
```

## Integration Test

The integration script requires:
- Supabase environment variables
- A running local app on `http://localhost:3000`

Run it with:

```bash
npm run integration:test
```

## Common Issues
- If sign-in is unavailable, verify the Supabase URL, publishable key, and allowed redirect URL.
- If wishlist API calls fail, verify `SUPABASE_SECRET_KEY` and the database migrations.
- If product lookup fails, verify the pricing provider key for the selected provider.
- If currency conversion looks wrong, verify `/api/rates` is reachable in the browser.
