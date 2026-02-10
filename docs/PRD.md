# Product Requirements Document (PRD)

## Overview
Borderless Buy helps people decide where to purchase wishlist items by comparing global prices, availability, and affordability. It presents best-market insights per item and for the full list, with simple guidance on what to buy abroad vs locally.

## Problem Statement
Shoppers with global options do not have a clear, trustworthy view of where an item is cheapest or which country yields the best combined total for a wishlist. Manual research is slow and error-prone.

## Goals
- Provide a clear "best market" recommendation per item and for the full list.
- Make affordability and savings obvious at a glance.
- Keep the experience fast, mobile-friendly, and easy to understand.

## Primary Users
- Price-sensitive travelers comparing local vs overseas purchase options.
- Power shoppers building a wishlist of high-value items.

## Current Features (Baseline)
- Wishlist creation with AI-assisted product detection.
- Global price comparison per item with home-market fallback.
- Market comparison totals (best market and compare market).
- Analytics pie chart for best country distribution.
- Supabase persistence with email magic link sign-in.

## Success Metrics
- % of sessions with at least one item added.
- % of sessions that expand market comparison details.
- Reduction in time-to-decision (surveyed or via UX tests).
- Retention: return visits within 7 and 30 days.

## Constraints and Assumptions
- Price data quality varies by country and retailer.
- Exchange rates are fetched and may be temporarily unavailable.
- User trust depends on transparency of sources and coverage.

## Feature Enhancements (Next Iterations)
1) Pricing Confidence
- Surface confidence/coverage indicators per market.
- Show last update timestamps and rate freshness.

2) Market Comparison UX
- Inline savings breakdown and travel cost assumptions.
- Quick filter for "Best value" and "Most coverage" markets.

3) Item Insights
- Warranty and compatibility notes per region.
- Region-specific restrictions (customs, carry-on limits).

4) Saved Goals and Alerts
- Price drop alerts per item/market.
- Goal tracking tied to income and target price.

5) Sharing and Collaboration
- Shareable wishlist links.
- Export list and prices to CSV.

## Future Updates (Longer-Term)
- Localized language and currency preferences.
- Retailer-specific tax/shipping estimations.
- Multi-currency budgeting and travel itinerary planning.

## Non-Goals
- Real-time stock tracking across every retailer.
- Full customs duty calculation for every country pair.

## Risks and Mitigations
- Incomplete pricing coverage: add coverage badges and fallback messaging.
- API rate limits: cache results and throttle background refresh.
- Mobile UX regressions: add device-level QA checks.
