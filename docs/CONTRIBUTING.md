# Contributing

## Before You Start
- Follow [TECH_SETUP.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/TECH_SETUP.md) for local setup.
- Create a focused branch from the current default branch.
- Keep changes scoped so review and rollback are straightforward.

## Development Standards
- Prefer small, composable React components.
- Extract reusable logic into `app/lib/` or dedicated hooks when it improves clarity.
- Add safe fallbacks when configuration or upstream data may be missing.
- Keep user-facing copy plain, specific, and free of internal shorthand.

## Validation
Run the relevant checks before opening a pull request:

```bash
npm test
npm run lint
npm run build
```

If your change affects auth or persistence, also run the integration test when local Supabase credentials are available.

## UI And Content
- Use the design tokens defined in the theme and global styles.
- Avoid hard-coded colors where a token already exists.
- Match the existing product voice: calm, direct, and practical.
- Remove placeholder copy, jokes, and internal-only notes before merging.

## Pull Requests
- Include a short summary of the change.
- Include screenshots for visible UI changes.
- Call out tradeoffs, follow-up work, or environment requirements explicitly.
