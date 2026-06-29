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
