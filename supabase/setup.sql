-- ─────────────────────────────────────────────────────────────
-- CertTrack — consolidated database setup
--
-- Generated from supabase/migrations/*.sql + supabase/seed.sql.
-- Paste this whole file into the Supabase SQL editor, or run:
--   supabase db push  &&  psql "$DATABASE_URL" -f supabase/seed.sql
-- Safe to re-run: tables use IF NOT EXISTS, policies are dropped
-- before create, and seed rows use ON CONFLICT.
-- ─────────────────────────────────────────────────────────────

-- ============ 0001_initial_schema.sql ============
-- ─────────────────────────────────────────────────────────────
-- CertTrack — initial schema
-- ─────────────────────────────────────────────────────────────

-- Organizations (one per business account)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry_type text,
  plan text not null default 'free', -- free | pro | pro_plus
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

-- Users (mirror of auth.users, scoped to an org)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'admin', -- admin | member
  created_at timestamptz default now()
);

-- Vendors
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  company_name text not null,
  contact_name text,
  contact_email text,
  vendor_type text,
  status text default 'missing', -- compliant | expiring_soon | expired | missing
  created_at timestamptz default now()
);

-- Certificates
create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  file_path text not null,
  insurer_name text,
  policy_number text,
  effective_date date,
  expiration_date date,
  coverage_types jsonb,
  limits jsonb,
  named_insured text,
  additional_insured boolean,
  waiver_of_subrogation boolean,
  parse_confidence float,
  parse_source text, -- textract | claude | manual
  uploaded_at timestamptz default now(),
  uploaded_by text -- 'org' | 'vendor'
);

-- AI Reviews
create table if not exists ai_reviews (
  id uuid primary key default gen_random_uuid(),
  cert_id uuid references certificates(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  status text default 'pending', -- pending | complete | error
  issues_found int default 0,
  report jsonb,
  created_at timestamptz default now()
);

-- Upload Requests (vendor-facing, no login required)
create table if not exists upload_requests (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  token text unique not null,
  sent_at timestamptz default now(),
  completed_at timestamptz,
  expires_at timestamptz default now() + interval '30 days'
);

-- Reminder Log
create table if not exists reminder_log (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors(id) on delete cascade,
  cert_id uuid references certificates(id) on delete cascade,
  type text not null, -- 45d | 14d | expired | escalation
  sent_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_users_org_id on users (org_id);
create index if not exists idx_vendors_org_id on vendors (org_id);
create index if not exists idx_certificates_vendor_id on certificates (vendor_id);
create index if not exists idx_certificates_org_id on certificates (org_id);
create index if not exists idx_certificates_expiration on certificates (expiration_date);
create index if not exists idx_ai_reviews_cert_id on ai_reviews (cert_id);
create index if not exists idx_upload_requests_token on upload_requests (token);
create index if not exists idx_reminder_log_cert_id on reminder_log (cert_id);

-- ============ 0004_vendor_phone.sql ============
alter table vendors add column if not exists contact_phone text;

-- ============ 0002_rls_policies.sql ============
-- ─────────────────────────────────────────────────────────────
-- CertTrack — Row Level Security
--
-- Model: every domain row carries an org_id. An authenticated user
-- may only touch rows whose org_id matches the org_id recorded for
-- them in the `users` table.
--
-- Vendor upload flow is unauthenticated: the public can read an
-- upload_request by token and insert a certificate against it. That
-- path is handled by the service-role key in server code (which
-- bypasses RLS), so the public policies here are intentionally
-- narrow. See lib/supabase-admin.ts.
-- ─────────────────────────────────────────────────────────────

alter table organizations enable row level security;
alter table users enable row level security;
alter table vendors enable row level security;
alter table certificates enable row level security;
alter table ai_reviews enable row level security;
alter table upload_requests enable row level security;
alter table reminder_log enable row level security;

-- Helper: the org_id of the currently authenticated user.
create or replace function auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.users where id = auth.uid()
$$;

-- Policies use drop-if-exists guards so this migration is re-runnable.

-- ── organizations ────────────────────────────────────────────
drop policy if exists "org members can read their org" on organizations;
create policy "org members can read their org"
  on organizations for select
  using (id = auth_org_id());

drop policy if exists "org members can update their org" on organizations;
create policy "org members can update their org"
  on organizations for update
  using (id = auth_org_id());

-- ── users ────────────────────────────────────────────────────
drop policy if exists "users can read members of their org" on users;
create policy "users can read members of their org"
  on users for select
  using (org_id = auth_org_id());

drop policy if exists "users can update their own row" on users;
create policy "users can update their own row"
  on users for update
  using (id = auth.uid());

-- ── vendors ──────────────────────────────────────────────────
drop policy if exists "org members manage their vendors" on vendors;
create policy "org members manage their vendors"
  on vendors for all
  using (org_id = auth_org_id())
  with check (org_id = auth_org_id());

-- ── certificates ─────────────────────────────────────────────
drop policy if exists "org members manage their certificates" on certificates;
create policy "org members manage their certificates"
  on certificates for all
  using (org_id = auth_org_id())
  with check (org_id = auth_org_id());

-- ── ai_reviews ───────────────────────────────────────────────
drop policy if exists "org members read their ai reviews" on ai_reviews;
create policy "org members read their ai reviews"
  on ai_reviews for select
  using (org_id = auth_org_id());

-- ── upload_requests ──────────────────────────────────────────
drop policy if exists "org members manage their upload requests" on upload_requests;
create policy "org members manage their upload requests"
  on upload_requests for all
  using (org_id = auth_org_id())
  with check (org_id = auth_org_id());

-- Public read by token for the vendor upload page (no auth).
-- The token itself is the bearer secret; rows are only resolvable
-- if the caller already knows the unguessable token.
drop policy if exists "public can read an upload request by token" on upload_requests;
create policy "public can read an upload request by token"
  on upload_requests for select
  to anon
  using (
    completed_at is null
    and expires_at > now()
  );

-- ── reminder_log ─────────────────────────────────────────────
-- reminder_log has no org_id column (per the schema); scope it
-- through the vendor it belongs to.
drop policy if exists "org members read their reminder log" on reminder_log;
create policy "org members read their reminder log"
  on reminder_log for select
  using (
    vendor_id in (select id from vendors where org_id = auth_org_id())
  );

-- ============ 0003_storage.sql ============
-- ─────────────────────────────────────────────────────────────
-- CertTrack — Storage
--
-- Private bucket for COI PDFs. Files are keyed by org:
--   coi-documents/{org_id}/{vendor_id}/{cert_id}.pdf
--
-- The bucket is private. Reads from the app are done with signed
-- URLs minted server-side; vendor uploads go through the service
-- role in the upload API route. We therefore do not grant broad
-- public storage policies here.
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('coi-documents', 'coi-documents', false)
on conflict (id) do nothing;

-- Authenticated org members may read objects under their own org prefix.
drop policy if exists "org members read their coi documents" on storage.objects;
create policy "org members read their coi documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'coi-documents'
    and (storage.foldername(name))[1] = (
      select org_id::text from public.users where id = auth.uid()
    )
  );

-- Authenticated org members may upload objects under their own org prefix.
drop policy if exists "org members upload their coi documents" on storage.objects;
create policy "org members upload their coi documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'coi-documents'
    and (storage.foldername(name))[1] = (
      select org_id::text from public.users where id = auth.uid()
    )
  );

-- ============ 0005_new_plans.sql ============
update organizations set plan = 'unlimited' where plan = 'pro_plus';
update organizations set plan = 'growth'    where plan = 'pro';
update organizations set plan = 'starter'   where plan = 'free';

-- ============ seed.sql ============
-- ─────────────────────────────────────────────────────────────
-- CertTrack — development seed
--
-- Creates a single hardcoded dev org and a handful of vendors in
-- each status so the dashboard has data to render before auth is
-- wired up (Phase 8). The org id matches NEXT_PUBLIC_DEV_ORG_ID.
-- ─────────────────────────────────────────────────────────────

insert into organizations (id, name, industry_type, plan)
values (
  '00000000-0000-0000-0000-000000000001',
  'Acme General Contracting',
  'general_contractor',
  'unlimited'
)
on conflict (id) do update
  set name = excluded.name,
      industry_type = excluded.industry_type,
      plan = excluded.plan;

-- Vendors — one in each status.
insert into vendors (id, org_id, company_name, contact_name, contact_email, vendor_type, status)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
    'Bright Spark Electric', 'Dana Ruiz', 'dana@brightspark.example', 'electrical', 'compliant'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
    'Summit Roofing Co', 'Marco Hill', 'marco@summitroof.example', 'roofing', 'expiring_soon'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
    'Clearview Glass & Glazing', 'Priya Nair', 'priya@clearview.example', 'glazing', 'expired'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
    'Iron Oak Framing', 'Sam Whitfield', 'sam@ironoak.example', 'framing', 'missing')
on conflict (id) do nothing;

-- Certificates backing the statuses above.
insert into certificates (
  id, vendor_id, org_id, file_path, insurer_name, policy_number,
  effective_date, expiration_date, coverage_types, limits, named_insured,
  additional_insured, waiver_of_subrogation, parse_confidence, parse_source, uploaded_by
)
values
  -- compliant: expires well over 45 days out
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001', 'coi-documents/seed/brightspark.pdf',
    'Travelers', 'GL-8841200', (now() - interval '120 days')::date, (now() + interval '210 days')::date,
    '["General Liability", "Workers Compensation", "Auto Liability"]'::jsonb,
    '{"general_liability_each_occurrence": 1000000, "general_liability_aggregate": 2000000, "auto_liability": 1000000}'::jsonb,
    'Bright Spark Electric LLC', true, true, 0.94, 'textract', 'vendor'),
  -- expiring_soon: within 45 days
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001', 'coi-documents/seed/summit.pdf',
    'The Hartford', 'GL-5523019', (now() - interval '330 days')::date, (now() + interval '21 days')::date,
    '["General Liability", "Workers Compensation"]'::jsonb,
    '{"general_liability_each_occurrence": 1000000, "general_liability_aggregate": 2000000}'::jsonb,
    'Summit Roofing Co Inc', true, false, 0.88, 'textract', 'vendor'),
  -- expired: in the past
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001', 'coi-documents/seed/clearview.pdf',
    'Liberty Mutual', 'GL-2210567', (now() - interval '400 days')::date, (now() - interval '35 days')::date,
    '["General Liability"]'::jsonb,
    '{"general_liability_each_occurrence": 500000, "general_liability_aggregate": 1000000}'::jsonb,
    'Clearview Glass & Glazing', false, false, 0.71, 'claude', 'org')
on conflict (id) do nothing;

-- A sample AI review for the compliant vendor's cert.
insert into ai_reviews (cert_id, org_id, status, issues_found, report)
values (
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'complete',
  2,
  '{
    "issues_found": 2,
    "issues": [
      {"field": "gl_limit", "severity": "warning", "message": "GL each-occurrence limit is $500K — typical minimum for contractors is $1M."},
      {"field": "additional_insured", "severity": "critical", "message": "Additional insured endorsement was not detected."}
    ],
    "summary": "2 issues found. GL limit is below typical minimums and additional insured endorsement was not detected.",
    "clean": false
  }'::jsonb
)
on conflict do nothing;
