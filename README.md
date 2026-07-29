# WashU Pointswap
**The unofficial, high-aesthetic marketplace for Washington University in St. Louis meal point swaps.**

WashU Pointswap solves the "end-of-semester balance" problem by providing a secure, live platform for students to buy and sell meal points. This project focuses on clean architecture and a premium user experience.

**🚀 Try it out: [Live Demo](https://washu-pointswap.vercel.app/)**

## Features
* **Google OAuth Integration:** One-tap login through Supabase Auth, restricted to `@wustl.edu` accounts and enforced server-side on every write rather than in the browser.
* **Live Marketplace:** An uncached feed of active meal point offers, so every load reflects the current database, with instant contact options and a sleek card-flip interface.
* **Sorting & Best Value:** Sort listings by price, quantity, or recency, with an automatic badge on the lowest price-per-point offer.
* **Pinterest-Inspired UI:** A premium interface utilizing Glassmorphism and a sophisticated Geist Sans & Lora Serif font pairing, in WashU green with a full dark mode.
* **Dynamic Profiles:** User-managed contact info (GroupMe/Email) linked directly to marketplace listings.

## 📸 Visuals
| Marketplace View | How it Works | Auth Constraints |
| :---: | :---: | :---: |
| <img src="https://github.com/user-attachments/assets/5aa39f03-7b43-467e-9949-deb5e18dc48e" alt="Marketplace View" width="100%"> | <img src="https://github.com/user-attachments/assets/10a182ae-99b5-45a0-a805-e8b5c58897ac" alt="How it Works" width="100%"> | <img src="https://github.com/user-attachments/assets/875bbca4-c312-4afb-834c-66cb4195c9c3" alt="Auth Constraints" width="100%"> |

## 🛠️ Tech Stack
### **Frontend**
* **Framework:** [Next.js 16](https://nextjs.org/) (App Router) with React 19
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
* **Typography:** Geist Sans & Lora Serif

### **Backend**
* **API:** Next.js Route Handlers deployed as serverless functions
* **Auth & Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth)
* **Deployment:** [Vercel](https://vercel.com/) — frontend and API ship as one project

## Architecture & Design Decisions

* **Same-Origin API:** The API originally ran as a standalone [FastAPI](https://fastapi.tiangolo.com/) service on Railway. It was consolidated into Next.js route handlers served from the same origin as the frontend, which removed cross-origin requests entirely and eliminated a second deployment that could fail independently of the app. The original Python implementation is kept in [`backend/`](./backend) as an archived reference — it is no longer deployed or used.
* **Server-Side Token Verification:** Writes never trust the client. Each request carries the user's Supabase access token as a bearer header, which is verified server-side before the database is touched. Because Google OAuth will issue a session to *any* Google account, the `@wustl.edu` restriction is enforced at this layer rather than in the browser — the client-side check exists only to give non-WashU users a clear message. Deletes are additionally scoped by `seller_id`, so a seller can only remove their own listings.
* **Non-Destructive Deletes:** Removing a listing sets `deleted_at` rather than deleting the row, so the price it was listed at survives and a misclick is recoverable; reads filter on it, so the listing still disappears from the marketplace immediately. The database enforces this too, not just the application: the anon key ships in the browser bundle, so column-scoped Postgres grants reduce it to setting `deleted_at` and nothing else — it cannot rewrite a price or destroy a row. See [`db/migrations/`](./db/migrations).
* **Relational Joins:** The marketplace feed uses a PostgreSQL join via Supabase to fetch `offers` alongside their `profiles` in a single round trip, rather than issuing a query per listing.
* **Operational Resilience:** A `/api/health` endpoint reads from Postgres and returns `503` when the database is unreachable, so an external uptime monitor doubles as both an alerting hook and a keepalive for Supabase's free tier.
* **Tokenised Theming:** All color resolves through a single `@theme` block, with brand identity, decorative accent, and error states as separate tokens. Switching the brand from WashU red to WashU green was a three-line change across ~53 call sites, and dark mode is one media query that reassigns tokens rather than a duplicated stylesheet. Contrast ratios were measured rather than eyeballed; the palette is AA or better in both themes.
* **Responsive Grid:** A card grid that adapts from a high-density four-column desktop view down to a focused two-column mobile experience.

## Running Locally

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Copy `frontend/.env.example` to `frontend/.env` and fill in your Supabase project URL and publishable key. Leave `NEXT_PUBLIC_API_URL` unset — the app defaults to its own same-origin `/api` routes.
