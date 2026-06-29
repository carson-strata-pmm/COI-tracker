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
  'pro_plus'
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
