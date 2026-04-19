# Wishlist Persistence Tests

This directory contains the offline and integration-oriented tests for wishlist persistence behavior.

## Run The Main Test Suite

```bash
npm test
```

That command runs `tests/simple-test.js`, which is the fastest way to validate the core persistence flows without external services.

## What The Main Suite Covers
- guest wishlist persistence across refreshes
- guest-to-account migration
- delete synchronization
- corrupted local storage cleanup
- local storage quota handling

## Test Files

### `simple-test.js`
- plain JavaScript
- no external services
- fast local feedback

### `wishlist-data-integrity.test.ts`
- TypeScript version with broader scenario coverage
- useful when working on persistence behavior in depth

### `run-tests.js`
- helper script for the TypeScript suite
- requires `ts-node` if you want to run the TypeScript tests directly

## Mocked Components

The offline suite uses mocks instead of real services:
- `MockLocalStorage`
- `MockSupabaseAuth`
- `MockAPI`

## When To Run These Tests
- after editing wishlist persistence
- after changing auth state handling
- after changing guest-to-signed-in migration logic
- after modifying local storage keys or hydration behavior

## Adding Coverage
- Keep new scenarios focused on one behavior.
- Prefer deterministic mocked inputs over network dependencies.
- Update the fixtures in the test file when the wishlist schema changes.

## Related Docs
- [docs/DATA_INTEGRITY_ISSUES.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/DATA_INTEGRITY_ISSUES.md)
- [docs/SECURITY_AUDIT.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/docs/SECURITY_AUDIT.md)
