# Data Reliability Notes

This document describes the current wishlist persistence model, the protections already in place, and the limits developers should keep in mind.

## Current Protections

### Guest Persistence
- Guest wishlist items are stored in browser `localStorage`.
- Income and selection state are also stored locally.
- Corrupted stored JSON is detected and cleared instead of crashing the app.

### Signed-In Persistence
- Signed-in wishlist items are stored through `/api/wishlist`.
- Deletes are sent to the server so removed items do not reappear on the next login.
- Tag updates are persisted through the same API surface.

### Guest-To-Account Migration
- Guest items are uploaded after sign-in.
- Migration uses retry logic for transient failures.
- Duplicate item creation is tolerated through idempotent handling on the wishlist API path.

### Cross-Tab Behavior
- Local storage changes are synchronized across tabs through the browser `storage` event.
- Selection state is filtered against the current item set to avoid stale references.

## Known Limits
- Browser `localStorage` has quota limits; very large lists may exceed that capacity for guest users.
- Guest data is tied to the browser profile until the user signs in.
- Clearing browser storage removes guest wishlist data and local affordability inputs.
- Integration tests that touch Supabase still require valid environment variables and local app availability.

## What The Automated Tests Cover
- guest persistence across refreshes
- guest-to-account migration
- delete synchronization
- corrupted storage handling
- local storage quota handling

See [tests/README.md](/Users/vivekmankonda/Documents/GitHub/borderless-buy/tests/README.md) for the runnable test suites.
