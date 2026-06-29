# CertTrack

A SaaS tool that helps small businesses (contractors, salons, venues, property
managers) track **certificates of insurance (COIs)** from their vendors and
subcontractors. It replaces email folders and spreadsheets with automated
expiration tracking, vendor-facing upload requests, a compliance dashboard, and
AI-powered gap analysis.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database + Auth + Storage:** Supabase (Postgres, RLS, Edge Functions, Storage)
- **Document Parsing:** AWS Textract (primary), Claude `claude-sonnet-4-6` API (fallback + AI review)
- **Email:** Resend
- **Payments:** Stripe (3 plans)
- **Hosting:** Vercel

## Pricing Tiers

| Tier  | Price   | Vendor limit                    |
| ----- | ------- | ------------------------------- |
| Free  | $0      | 15 vendors                      |
| Pro   | $19/mo  | 50 vendors                      |
| Pro+  | $39/mo  | Unlimited + AI compliance review |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials at minimum. The other services (Textract,
Anthropic, Resend, Stripe) are only needed for their respective phases and the
app degrades gracefully without them during development.

### 3. Set up the database

Run the migrations and seed against your Supabase project, in order:

```bash
# Using the Supabase CLI
supabase db push          # applies supabase/migrations/*
psql "$DATABASE_URL" -f supabase/seed.sql   # seeds the hardcoded dev org
```

**Or — easiest:** open the Supabase SQL editor and paste the entire contents of
[`supabase/setup.sql`](supabase/setup.sql). It bundles all migrations + seed in
order and is safe to re-run (idempotent). After running it, create the private
storage bucket if it wasn't created automatically (the script attempts it):
Storage → New bucket → name `coi-documents`, **not** public.

The seed creates a hardcoded **dev org** (`00000000-0000-0000-0000-000000000001`).
Auth is deferred to Phase 8 — until then the app reads this org id from
`NEXT_PUBLIC_DEV_ORG_ID`.

### 4. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>.

## Build Status

This project is built in phases (see the project brief). Current state:

- [x] **Phase 1 — Foundation:** Next.js + Tailwind + shadcn/ui scaffold,
      Supabase schema + RLS + storage migrations, hardcoded dev org, dashboard
      shell with empty states.
- [x] **Phase 2 — Vendor Management:** Vendor CRUD, status badges, vendor detail
      page, status recalculation logic.
- [ ] **Phase 3 — COI Upload + Parsing** (Textract + Claude fallback) — lib
      wrappers + API routes scaffolded.
- [ ] **Phase 4 — Vendor Upload Request Flow** — scaffolded.
- [ ] **Phase 5 — Automated Reminders** — Edge Function scaffolded.
- [ ] **Phase 6 — AI Compliance Review** — Edge Function + lib scaffolded.
- [x] **Phase 7 — Polish (in progress):** mobile nav, error/loading states,
      settings page.
- [x] **Phase 8 — Auth:** email/password + magic-link sign-in, email
      confirmation/magic-link callback, onboarding (org creation on first
      login), sign-out, and session middleware. All data access is scoped to
      the resolved active org.
- [x] **Phase 9 — Payments:** Stripe Checkout upgrade flow, Customer Portal,
      webhook → plan sync, and vendor-limit enforcement by plan.

### Auth modes

Auth is **additive** so the app runs with zero login in development:

- **Dev/demo (default, `NEXT_PUBLIC_REQUIRE_AUTH=false`):** no login required;
  the active org is the seeded dev org.
- **Enforced (`NEXT_PUBLIC_REQUIRE_AUTH=true`):** unauthenticated users are
  redirected to `/auth/login`; the active org is the signed-in user's org
  (created during onboarding). Flipping this flag is the only change needed —
  the data layer already scopes every query to the resolved org id.

> RLS policies are defined for all tables (see `supabase/migrations`). Server
> data access uses the service-role client scoped explicitly to the active org
> id; the unauthenticated vendor-upload path is gated by signed single-use
> tokens.

## Project Structure

```
/app            # Next.js App Router pages + API routes
/components      # UI primitives (shadcn) + feature components
/lib            # Supabase / Textract / Anthropic / Resend / Stripe clients + helpers
/supabase       # Migrations, seed, Edge Functions
/emails         # Email templates
```
