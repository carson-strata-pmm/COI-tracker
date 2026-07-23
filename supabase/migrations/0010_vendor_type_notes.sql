-- Free-text context for vendors whose type is "Other" — shown to the
-- AI review for context, since "Other" itself carries no signal.

alter table vendors add column if not exists vendor_type_notes text;
