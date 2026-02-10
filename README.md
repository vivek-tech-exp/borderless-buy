# borderless-buy
A smart shopping agent for Indian travelers that finds the cheapest country to buy your wishlist items. Auto-detects flagship models and compares "Buy in India" vs. "Buy Abroad" costs.

> **Stop overpaying.** An intelligent wishlist that tells you *where* to buy your gear—India or Abroad.

## 🚀 Features
- **🤖 AI-Driven Model Detection:** Automatically identifies the latest "Flagship" version of any product (Tech, Cars, Bikes).
- **✈️ "Vehement Yes" Logic:** Smartly classifies items as "Carry-on Friendly" to compare Global vs. Indian prices.
- **🇮🇳 India-Centric Math:** Auto-calculates Landed Cost (Shelf Price + 3.5% FX Markup + 18% GST).
- **📊 Financial Dashboard:** Pie charts and Total Project Cost analysis to plan your next big purchase.

## 🛠 Stack
- **Frontend:** Next.js (App Router), Tailwind CSS
- **Intelligence:** Gemini 2.0 Flash (with Search Grounding)
- **Database:** Supabase

## Getting started
```bash
npm install
npm run dev
```

## Docs
- PRD and roadmap: docs/PRD.md
- Tech setup: docs/TECH_SETUP.md
- Project tour: docs/PROJECT_TOUR.md
- Contributing: docs/CONTRIBUTING.md
- Design system: docs/DESIGN_SYSTEM.md
- Pricing engine: docs/PRICING_ENGINE_ARCHITECTURE.md
- Security audit: docs/SECURITY_AUDIT.md

## Supabase persistence & auth

This project includes Supabase for persisting wishlist items and a simple email "magic link" sign-in flow.

Quick setup:

- Add your Supabase credentials to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ... (publishable key)
# Server-only: SUPABASE_SECRET_KEY=...
```

- Run the SQL migration `supabase/migrations/001_create_wishlist.sql` in the Supabase SQL editor to create the `wishlist` table and RLS policy.

Notes on phone OTP: SMS-based OTPs are not universally free — sending SMS messages is handled by a third-party provider (Twilio or similar) and carriers charge per message. Supabase's Auth supports phone OTP, but SMS delivery will incur provider costs. For a free option, use email magic links (implemented here).

## Environment variables reference
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public, visible to browser)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable/anon key (public, client-side)
- `SUPABASE_SECRET_KEY` — Supabase secret key (server-only, keep private)
- `GEMINI_API_KEY` — Google Gemini API key for product resolution (server-only)