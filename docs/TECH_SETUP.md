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
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
IP_HASH_SECRET=your-random-ip-hash-secret
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash-lite
```

Optional provider configuration:

```bash
AI_PROVIDER=mock
```

Notes:
- `NEXT_PUBLIC_*` values are safe for browser use.
- `SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SECRET`, and provider API keys must stay server-side.
- The app can build without Supabase variables, but sign-in and synced wishlists will be unavailable in that environment.

## Supabase Setup
1. Install Supabase CLI outside the project dependency tree using Homebrew, a standalone binary, or `npx`/`bunx` with Node.js 20+.
2. Link the project if needed:
   `supabase link --project-ref your-project-ref`
3. Inspect migration state before remote work:
   `npm run db:list`
4. If older migrations were applied manually and are missing from migration history, use `supabase migration repair` to mark them applied before pushing.
5. Dry-run and push migrations:
   `npm run db:push:dry`
   `npm run db:push`
6. In Supabase Auth settings, allow your local callback URL:
   `http://localhost:3000/api/auth/callback`

Use `npm run db:reset` only for local development. Never run `supabase db reset --linked` or `supabase db reset --db-url` against production.

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
- If wishlist API calls fail, verify `SUPABASE_SERVICE_ROLE_KEY` and the database migrations.
- If product lookup fails, verify the pricing provider key for the selected provider.
- If currency conversion looks wrong, verify `/api/rates` is reachable in the browser.
