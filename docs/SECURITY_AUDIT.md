# Privacy And Data Handling

This document explains what Borderless Buy stores, what it sends to backend services, and what users and developers should expect from the current implementation.

## Summary
- Income information stays on the device and is not sent to Borderless Buy APIs.
- Signed-in wishlist items are stored in Supabase.
- Guest wishlist items are stored in browser `localStorage`.
- The product currently does not include third-party analytics scripts.

## What Stays On The Device

The income input is used for local affordability context only.

Current behavior:
- Stored in browser `localStorage`
- Not included in wishlist API requests
- Not stored in Supabase
- Not part of the authenticated user profile

Practical implication:
- If someone has access to the same browser profile on the same device, they can inspect local storage.
- If the browser storage is cleared, that value is lost.

## What Is Sent To The Server

When a user signs in and chooses to save a wishlist, the app sends:
- wishlist item identifiers
- normalized product data
- pricing information tied to the item
- authenticated user context required for ownership checks

The app does not send the locally stored income input as part of those requests.

## Guest And Signed-In Behavior

### Guest Users
- Wishlist data is stored locally in the browser.
- Selection state and income preferences are also stored locally.
- The experience is tied to that browser unless the user signs in.

### Signed-In Users
- Wishlist items are synced through the wishlist API and stored in Supabase.
- On sign-in, guest wishlist items may be migrated to the signed-in account.
- Income is intentionally not migrated across devices or accounts.

## Current Trust Boundaries
- Browser local storage is private to the browser profile, not to the individual person using the device.
- Supabase stores signed-in wishlist data.
- Pricing providers receive product lookup queries required to resolve item data.

## Known Limitations
- Local storage can be cleared by the browser or the user.
- Private browsing sessions are intentionally temporary.
- Anyone with access to the device and browser profile may inspect local storage.
- Auth and synced wishlist features depend on valid Supabase environment variables.

## Developer Expectations
- Do not add income values to API payloads, logs, analytics, or URL parameters.
- Keep server-side schema free of income-related fields unless the product requirement changes.
- Preserve the current distinction between device-local affordability context and account-level wishlist storage.
