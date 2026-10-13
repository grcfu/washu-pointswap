# WashU Pointswap: Project Overview

## 1. What it does

WashU students pay for a meal plan up front, and by the end of a semester many have
MarketPoints left over while others have run out. The university offers no way to move
points between students, so the trade happens in group chats where listings get buried
and anyone can join in. Pointswap is a single public board for that trade. Sellers post
how many points they have and their asking price. Buyers can sort listings by price or
value and contact a seller to arrange the swap. Anyone can browse, but only students
signed in with a `@wustl.edu` account can post a listing or see a seller's contact
details. The app does not handle money or move points. It connects buyers and sellers,
and they complete the exchange themselves.

Live at **https://washu-pointswap.vercel.app**.

## 2. Tech stack

| Technology | Role in this project |
|---|---|
| **Next.js 16** (App Router) | Serves the single-page UI (`src/app/page.js`) **and** the API, as route handlers under `src/app/api/`. One codebase, one deployment. |
| **React 19** | Renders the marketplace UI and holds client state: listings, the form, the signed-in user, sort order, and modals. |
| **Supabase Postgres** | Stores `offers` and `profiles`. Row-level security (RLS) policies and column grants restrict writes at the database itself. |
| **Supabase Auth** | Handles OAuth sign-in with **WashU Key (Microsoft Entra ID)**, with Google as a fallback. Issues the JWT access tokens the API verifies. |
| **supabase-js** | Client library used in the browser (sign-in, profile) and on the server (reads, and writes made on the caller's behalf). |
| **Tailwind CSS v4** | Styling. All colors and the fluid type scale are design tokens in the `@theme` block of `globals.css`, and dark mode reassigns those tokens. |
| **Vercel** | Hosts the static frontend and runs the API routes as serverless functions on the same origin. |
| **GitHub Actions** | A scheduled keepalive job (`.github/workflows/supabase-keepalive.yml`) that keeps the free-tier database from pausing. |
| **FastAPI (archived)** | The original Python API in `backend/`. It is kept for reference only, and it is not deployed. |

## 3. Architecture

The browser talks to Supabase directly for exactly two things: signing in and saving the
user's own profile. All offer reads and writes go through the API routes on the same
origin, so cross-origin requests (CORS) never come into play.

```
 ┌──────────────────────────── Browser ───────────────────────────────┐
 │  page.js (React)                                                    │
 │    • Sign in ───────────────────────────────┐                       │
 │    • Save own profile (as the user) ────────┤                       │
 │    • fetch('/api/offers', Bearer <JWT>) ─┐  │                       │
 └──────────────────────────────────────────┼──┼───────────────────────┘
                                            │  │
             same origin, HTTPS             ▼  ▼
 ┌──────────── Vercel ──────────────┐   ┌──────────── Supabase ─────────────┐
 │  /api/offers           GET, POST │   │  Auth  (WashU Key / Google OAuth) │
 │  /api/offers/:id/delete    POST  │──▶│                                   │
 │  /api/health               GET   │   │  Postgres  ── RLS policies ──     │
 │                                  │   │    offers ──seller_id──▶ profiles │
 │  apiAuth.getCurrentUser():       │◀──│                                   │
 │   1. verify JWT with Supabase    │   └───────────────────────────────────┘
 │   2. require @wustl.edu (403)    │
 │   3. return a client acting AS   │
 │      the user, so RLS applies    │
 └──────────────────────────────────┘
```

**Posting an offer, step by step**

1. The seller fills in the form. `page.js` checks the limits from `lib/offerRules.js`
   for immediate feedback and converts the **total** price into a **per-point** price.
2. The browser upserts the seller's `profiles` row (name, contact info) directly with
   Supabase, acting as the signed-in user.
3. The browser sends `POST /api/offers` with `{ amount, price }` and an
   `Authorization: Bearer <access token>` header.
4. The route calls `getCurrentUser`, which verifies the token with Supabase Auth and
   rejects non-`@wustl.edu` accounts with a 403. It then validates the body against the
   same shared rules, since the server is the authority.
5. It inserts the offer through a per-request client that carries the user's token, so
   Postgres RLS sees the real user. It sets `seller_id` from the verified token, never
   from the request body.
6. The client re-fetches `GET /api/offers` and the new card appears.

**Reading the marketplace**: `GET /api/offers` returns every offer where
`status = 'active'` and `deleted_at is null`, with each seller's profile joined in the
same query. It requires no sign-in and is never cached.

**Removing an offer** is a *soft delete*. The route sets `deleted_at` on a row matching
`id`, `seller_id = caller`, and `deleted_at is null`. If no row matches, it returns 404.

## 4. Data model

```
 auth.users (managed by Supabase)
      │ id
      ▼
 profiles                               offers
 ─────────────────────────              ─────────────────────────────
 id            uuid  PK  ◀───────────── seller_id        uuid  FK
 email         text                     id               uuid  PK
 first_name    text                     amount           int   (100–500)
 last_name     text                     price_per_point  numeric (> 0, ≤ 3.00)
 contact_info  text                     status           text  ('active' | 'inactive')
 updated_at    timestamptz              created_at       timestamptz
                                        deleted_at       timestamptz  (NULL = live)
```

- **One profile → many offers.** `profiles.id` equals the Supabase Auth user id.
- **Soft deletes.** A removed listing keeps its row with `deleted_at` set, which
  preserves price history. Every live read filters `deleted_at is null`, and the partial
  index `offers_live_idx` covers that filter.
- **Prices are stored per point.** The total shown on a card is computed as
  `amount × price_per_point`.
- Schema changes live in `db/migrations/` and are applied by hand in the Supabase SQL
  editor.

## 5. Running locally

**Prerequisites:** Node.js 20+ and a Supabase project with the `offers` and `profiles`
tables above.

```bash
cd frontend
cp .env.example .env      # then fill in the values
npm install
npm run dev               # http://localhost:3000
```

**Environment variables** (`frontend/.env`):

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key |
| `NEXT_PUBLIC_API_URL` | **Leave unset.** Set it only to point the UI at the archived FastAPI app. |

`NEXT_PUBLIC_*` values are inlined at build time, so restart the dev server (or redeploy)
after changing them. For OAuth to return you to your local server, add
`http://localhost:3000` to the allowed redirect URLs in the Supabase Auth settings.

Other commands: `npm run build` (production build) and `npm run lint`.

The archived `backend/` reads `SUPABASE_URL` and `SUPABASE_KEY` from a root `.env`. See
`backend/README.md`. It is not needed to run the app.
