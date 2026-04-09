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

### Backend (`backend/main.py`)
Single-file FastAPI app with four endpoints:
- `GET /` — health check
- `GET /offers` — fetch active offers joined with seller profiles
- `POST /offers` — create offer (query params: seller_id, amount, price)
- `DELETE /offers/{offer_id}` — soft-delete offer (query param: user_id for auth)

CORS allows `localhost:3000` and `washu-pointswap.vercel.app`.

### Frontend (`frontend/src/`)
- **Next.js 16** with React 19, Tailwind CSS v4, Supabase client
- Single-page app: all marketplace UI lives in `src/app/page.js`
- Supabase client initialized in `src/lib/supabaseClient.js`
- Path alias: `@/*` maps to `./src/*`
- **Important:** Next.js 16 has breaking changes vs. prior versions. Check `node_modules/next/dist/docs/` before using Next.js APIs.

### Database (Supabase)
- **offers**: id, seller_id, amount, price_per_point, status (active/inactive)
- **profiles**: id, email, first_name, last_name, contact_info, updated_at
- Relationship: `offers.seller_id` → `profiles.id`

### Auth
Supabase Magic Link (passwordless email OTP). Frontend manages session state via `supabase.auth`.

### Environment
- Root `.env` has Supabase credentials (`SUPABASE_URL`, `SUPABASE_KEY`)
- Backend loads env from parent directory's `.env`
- Frontend uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `frontend/.env`

### Design System
- WashU red `#A51417`, cream background `#fdfbf9`
- Glassmorphism style (backdrop blur, rounded corners, premium shadows)
- Fonts: Geist Sans, Geist Mono, Lora (serif for headings)

### Business Rules
- Offer amount: 150–2000 MarketPoints
- Sellers can only delete their own offers
- Best-value badge highlights the lowest price-per-point offer
