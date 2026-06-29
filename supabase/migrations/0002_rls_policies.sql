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
drop policy if exists "org members read their reminder log" on reminder_log;
create policy "org members read their reminder log"
  on reminder_log for select
  using (org_id = auth_org_id());
