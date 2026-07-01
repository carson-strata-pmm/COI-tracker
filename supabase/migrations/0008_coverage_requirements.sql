-- Coverage Requirements — structured per-vendor-type insurance minimums.
-- org_id IS NULL  = system default (readable by all authenticated users, not editable).
-- org_id NOT NULL = customer override for that org (readable/writable by that org only).
--
-- NULL handling: standard SQL unique constraints treat two NULLs as distinct, so
-- we use partial unique indexes instead of a column-level unique constraint.

create table if not exists coverage_requirements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade default null,
  vendor_type text not null,
  gl_per_occurrence_min integer default null,
  gl_aggregate_min integer default null,
  workers_comp_required boolean not null default false,
  auto_required boolean not null default false,
  auto_min integer default null,
  umbrella_required boolean not null default false,
  umbrella_min integer default null,
  additional_insured_required boolean not null default false,
  waiver_of_subrogation_required boolean not null default false,
  is_custom boolean not null default false,
  created_at timestamptz default now()
);

-- Partial unique indexes for correct NULL handling.
create unique index if not exists idx_cov_req_system_default
  on coverage_requirements (vendor_type)
  where org_id is null;

create unique index if not exists idx_cov_req_org_override
  on coverage_requirements (org_id, vendor_type)
  where org_id is not null;

create index if not exists idx_cov_req_org_id
  on coverage_requirements (org_id);

alter table coverage_requirements enable row level security;

-- System defaults: any authenticated user can read, nobody can write.
drop policy if exists "authenticated users read system defaults" on coverage_requirements;
create policy "authenticated users read system defaults"
  on coverage_requirements for select
  to authenticated
  using (org_id is null);

-- Org overrides: only that org can read and write their own rows.
drop policy if exists "org members manage their coverage requirements" on coverage_requirements;
create policy "org members manage their coverage requirements"
  on coverage_requirements for all
  using (org_id = auth_org_id())
  with check (org_id = auth_org_id());

-- ── System defaults (market-standard minimums by vendor type) ─────────────────
insert into coverage_requirements
  (org_id, vendor_type,
   gl_per_occurrence_min, gl_aggregate_min,
   workers_comp_required,
   auto_required, auto_min,
   umbrella_required, umbrella_min,
   additional_insured_required, waiver_of_subrogation_required,
   is_custom)
values
  -- Construction trades (high risk)
  (null, 'General Contractor',        1000000, 2000000, true,  true,  1000000, true,  1000000, true,  true,  false),
  (null, 'Electrician',               1000000, 2000000, true,  true,  1000000, false, null,    true,  true,  false),
  (null, 'Plumber',                   1000000, 2000000, true,  true,  1000000, false, null,    true,  true,  false),
  (null, 'Roofer',                    1000000, 2000000, true,  true,  1000000, true,  1000000, true,  true,  false),
  (null, 'HVAC',                      1000000, 2000000, true,  true,  1000000, false, null,    true,  true,  false),
  (null, 'Framing Contractor',        1000000, 2000000, true,  true,  1000000, false, null,    true,  true,  false),
  (null, 'Concrete Contractor',       1000000, 2000000, true,  true,  1000000, false, null,    true,  true,  false),
  (null, 'Painter',                   500000,  1000000, true,  false, null,    false, null,    true,  false, false),
  -- Property / facilities
  (null, 'Property Maintenance',      1000000, 2000000, true,  true,  1000000, false, null,    true,  true,  false),
  (null, 'Landscaper',                500000,  1000000, true,  true,  1000000, false, null,    true,  false, false),
  (null, 'Cleaner / Janitorial',      500000,  1000000, false, false, null,    false, null,    true,  false, false),
  (null, 'Pest Control',              1000000, 2000000, true,  true,  1000000, false, null,    true,  false, false),
  (null, 'Security',                  1000000, 2000000, true,  true,  1000000, false, null,    true,  true,  false),
  -- Food & events
  (null, 'Caterer / Food Vendor',     1000000, 2000000, false, false, null,    false, null,    true,  false, false),
  (null, 'Event Vendor (AV / Decor)', 500000,  1000000, false, false, null,    false, null,    true,  false, false),
  (null, 'Food Truck',                1000000, 2000000, false, true,  1000000, false, null,    true,  false, false),
  -- Salon / wellness
  (null, 'Booth Renter',              300000,  1000000, false, false, null,    false, null,    true,  false, false),
  (null, 'Personal Trainer',          300000,  1000000, false, false, null,    false, null,    true,  false, false),
  (null, 'Massage Therapist',         300000,  1000000, false, false, null,    false, null,    true,  false, false),
  -- Other
  (null, 'IT / Tech Vendor',          1000000, 2000000, false, false, null,    false, null,    false, false, false),
  (null, 'Delivery / Courier',        500000,  1000000, false, true,  1000000, false, null,    false, false, false),
  (null, 'Other',                     500000,  1000000, false, false, null,    false, null,    false, false, false)
on conflict do nothing;
