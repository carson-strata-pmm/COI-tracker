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
create policy "org members upload their coi documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'coi-documents'
    and (storage.foldername(name))[1] = (
      select org_id::text from public.users where id = auth.uid()
    )
  );
