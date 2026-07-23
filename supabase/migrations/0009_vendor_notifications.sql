-- Vendor Notifications — logs each "Notify vendor" send (email + SMS)
-- so the org can see notification history on the vendor detail page.

create table if not exists vendor_notifications (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  cert_id uuid references certificates(id) on delete set null,
  ai_review_id uuid references ai_reviews(id) on delete set null,
  upload_request_id uuid references upload_requests(id) on delete set null,
  issues_sent jsonb, -- snapshot of the failed checks at time of send
  sent_via text[] not null default '{}', -- e.g. {'email'} or {'email','sms'}
  sent_at timestamptz default now()
);

create index if not exists idx_vendor_notifications_vendor_id
  on vendor_notifications (vendor_id);

alter table vendor_notifications enable row level security;

drop policy if exists "org members manage their vendor notifications" on vendor_notifications;
create policy "org members manage their vendor notifications"
  on vendor_notifications for all
  using (org_id = auth_org_id())
  with check (org_id = auth_org_id());
