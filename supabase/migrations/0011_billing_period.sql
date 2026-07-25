-- Monthly + annual billing support. billing_period tracks which
-- cadence an org is on; kept in sync by the Stripe webhook alongside
-- `plan`. Unlimited remains a valid legacy value for `plan` (existing
-- orgs on it are untouched) but is no longer reachable via self-serve
-- checkout — see lib/constants.ts.

alter table organizations
  add column if not exists billing_period text default 'monthly'
  check (billing_period in ('monthly', 'annual'));
