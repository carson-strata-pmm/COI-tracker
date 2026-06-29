# Email templates

The project brief lists React Email templates here
(`VendorUploadRequest.tsx`, `ExpirationReminder.tsx`, `COIReceived.tsx`).

To keep the dependency surface small, the equivalent templates are currently
implemented as plain-HTML builder functions in
[`lib/email-templates.ts`](../lib/email-templates.ts):

- `vendorUploadRequestEmail` → vendor COI upload request
- `coiReceivedEmail` → org-owner notification when a COI is uploaded
- `expirationReminderEmail` → 45d / 14d / expired / escalation reminders

They return `{ subject, html, text }` and are sent via `lib/resend.ts`. The
daily-reminders Edge Function builds its emails inline (Deno runtime).

These can be swapped for `@react-email/components` renders later without
changing any callers — only the bodies of the builder functions change.
