# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WashU Pointswap is a marketplace for WashU students to buy/sell MarketPoints. It has a FastAPI backend and a Next.js frontend, both using Supabase for auth and database.

## Commands

### Frontend (run from `frontend/`)
```bash
npm run dev      # Dev server on localhost:3000
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

### Backend (run from `backend/`)
```bash
python main.py   # Runs uvicorn on port 8000
```

## Architecture

### API (`frontend/src/app/api/`)
The live API is Next.js route handlers deployed as Vercel functions **on the same origin
as the frontend**, so CORS does not apply and there is no separate backend host to keep
alive. Shared helpers live in `frontend/src/lib/apiAuth.js`.

- `GET /api/offers` — active offers joined with seller profiles (public, no auth)
- `POST /api/offers` — create offer (JSON body: `amount`, `price`, where `price` is per-point)
- `POST /api/offers/{offerId}/delete` — hard-delete an offer
- `GET /api/health` — reads one row from `offers`; ping it to keep Supabase awake

Writes call `getCurrentUser(request)`, which requires an
`Authorization: Bearer <supabase_access_token>` header, verifies it via
`supabase.auth.getUser(token)`, and then rejects any account whose email is not
`@wustl.edu` with a **403**. Google OAuth issues sessions to any Google account, so this
server-side check is the actual WashU-only boundary — `verifyWustlEmail` in `page.js` is
UX only and cannot be relied on. Both comparisons lowercase the address so they agree.

Deletes are scoped by `.eq('seller_id', userId)` and return 404 when zero rows match, so
a seller can only remove their own offers.

Errors are returned as `{ "detail": "..." }` to match FastAPI's shape, which is what
`page.js` reads.

Two Next.js 16 specifics to respect here:
- `context.params` is a **Promise** — `const { offerId } = await params`.
- Route handlers are **not cached by default**, which is what keeps listings live.
- `supabase-js` returns no rows from `insert`/`delete` unless `.select()` is chained.

### Archived backend (`backend/`) — not used
A FastAPI app that predates the migration and exposes the same endpoints without the
`/api` prefix. It is **not deployed and not used**; the Railway service it ran on has been
deleted. Kept purely as a reference — see `backend/README.md`.

Do not change app behavior here; business rules live in `frontend/src/app/api/`. It has
already drifted: it does **not** enforce the `@wustl.edu` restriction. Its committed
`venv/` is also broken (built at an older path), so recreate it if you ever run this.

### Frontend (`frontend/src/`)
- **Next.js 16** with React 19, Tailwind CSS v4, Supabase client
- Single-page app: all marketplace UI lives in `src/app/page.js`
- Browser Supabase client in `src/lib/supabaseClient.js`; server-side client and auth
  helpers in `src/lib/apiAuth.js` (never import the latter into a client component)
- Path alias: `@/*` maps to `./src/*`
- **Important:** Next.js 16 has breaking changes vs. prior versions. Check `node_modules/next/dist/docs/` before using Next.js APIs.

### Database (Supabase)
- **offers**: id, seller_id, amount, price_per_point, status (active/inactive)
- **profiles**: id, email, first_name, last_name, contact_info, updated_at
- Relationship: `offers.seller_id` → `profiles.id`

### Auth
Google OAuth via `supabase.auth.signInWithOAuth({ provider: 'google' })`, redirecting to
`window.location.origin`. Frontend manages session state via `supabase.auth`. Browsing the
marketplace is public; posting and deleting require a signed-in `@wustl.edu` account,
enforced server-side (see the API section).

### Environment
See `.env.example` and `frontend/.env.example` for the full list. Neither `.env` is committed.
- Root `.env` has Supabase credentials (`SUPABASE_URL`, `SUPABASE_KEY`)
- Backend loads env from parent directory's `.env` — so it must be run from `backend/`.
  In deployment there is no `.env`; vars come from the host's dashboard.
- Frontend uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `frontend/.env`
- `NEXT_PUBLIC_API_URL` should be **left unset**. It defaults to the same-origin `/api`
  routes. Set it only to target the optional FastAPI app in `backend/`. If it is set in
  Vercel it overrides the built-in routes — that is how the app came to point at a
  Railway service that no longer existed.
- All `NEXT_PUBLIC_*` vars are inlined at **build time**, so changing one in the Vercel
  dashboard does nothing until you redeploy.

### Design System
All color lives in the `@theme` block at the top of `globals.css`. **Never hardcode a
color in a component** — add or use a token. Tailwind v4 generates real utilities from
these (`bg-brand`, `text-ink-muted`, `border-line`).

Roles, which are enforced by convention, not tooling:
| Token | Role |
|---|---|
| `brand` | identity and **fills** — buttons, dots, the bear |
| `brand-ink` | brand as **text**; diverges from `brand` in dark mode |
| `accent` | decorative WashU red, used sparingly (the wordmark period) |
| `danger` | destructive and error states **only** |
| `ink*` / `line*` / `panel` / `field` / `edge` | text, borders, surfaces |

- WashU green `#215732` leads; WashU red `#A51417` survives as `accent` and `danger`.
  Both are official WashU colors. Green is used because red reads as "loss" in a
  financial context.
- Glassmorphism (backdrop blur, rounded corners, premium shadows)
- Fonts: Geist Sans, Geist Mono, Lora (serif for headings)
- `public/bg.jpg` is a **red** paper texture, recolored at runtime by blending
  `--color-brand` over it with `background-blend-mode: color`. Don't "fix" the asset.

Two gotchas worth knowing before editing:
- **Opacity modifiers bake the hex.** `bg-white/90` compiles to `#ffffffe6`, not a live
  `var()`, so a runtime override cannot reach it. That is why translucent surfaces are
  tokens with the alpha folded in (`--color-panel: rgb(255 255 255 / 0.9)`).
- **Dark mode** is one `:root[data-theme='dark']` block that reassigns tokens. There are
  no `dark:` variants anywhere, so adding a hardcoded color breaks the theme silently.
  Contrast was measured, not guessed — keep new pairs at AA or better.
- **The theme is applied by an inline script in `layout.js`**, which must stay
  synchronous and in `<head>`: it sets `data-theme` before first paint so dark-mode
  visitors never see a flash of light. Deferring it or moving it into a component
  reintroduces the flash. It reads `localStorage.pointswap_theme` first, then falls back
  to the OS. `ThemeToggle` only reflects and writes that state; it decides nothing.

### Business Rules
Validated on both the client (`handleSubmit`) and the server (`create_offer`) — keep them in sync:
- Offer amount: 100–500 MarketPoints
- Price must be > $0 and ≤ $3.00 per point
- The seller enters a **total** price; the frontend divides by `amount` and sends per-point
- Contact info must be a valid email or phone number (client-side only)
- Sellers can only delete their own offers
- Best-value badge highlights the lowest price-per-point offer

### Deployment
Everything ships as **one Vercel project** (`washu-pointswap.vercel.app`): the static
frontend plus the `/api` route handlers as serverless functions. There is no second host.

Keeping it alive on free tiers:
- Supabase pauses a free project after ~7 days of inactivity. A paused project's hostname
  **stops resolving in DNS**, so calls fail with `[Errno 8] nodename nor servname provided`
  (Python) or `TypeError: fetch failed` (Node), and the UI shows a connection error.
- Two guards against that: an external uptime monitor pinging `/api/health`, and
  `.github/workflows/supabase-keepalive.yml` as a backup.
- The GitHub Actions guard has a catch: GitHub **disables scheduled workflows after 60
  days of no repository activity**, so it cannot be the only safeguard.
