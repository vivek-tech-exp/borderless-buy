# Database Migrations

This project uses Supabase SQL migrations.

## Create a migration

```bash
npm run db:migration:new -- add_atomic_ai_credit_consumption
```

This creates a timestamped SQL file in `supabase/migrations/`.

## Remote workflow

Check local and remote migration history before remote work:

```bash
npm run db:list
```

If existing migrations were applied manually before Supabase CLI tracking, the remote history may not include them. Use `supabase migration repair` to mark already-applied migrations as applied instead of rerunning them blindly.

Dry-run before pushing:

```bash
npm run db:push:dry
```

Push migrations:

```bash
npm run db:push
```

## Rules

- Never edit a migration after it has been applied remotely.
- Do not rename existing `001`-`005` migrations.
- Use timestamped migration files going forward.
- Every schema change gets a new migration.
- Keep migrations SQL-only and reviewable.
- Use `npm run db:reset` only for local development.
- Never run `supabase db reset --linked` or `supabase db reset --db-url` against production.
- Do not add Supabase CLI as a project dependency. Use Homebrew, a standalone binary, or `npx`/`bunx` with Node.js 20+.

## Local reset

```bash
npm run db:reset
```
