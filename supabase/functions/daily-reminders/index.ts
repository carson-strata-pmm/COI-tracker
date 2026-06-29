// ─────────────────────────────────────────────────────────────
// daily-reminders — Supabase Edge Function (Deno)
//
// Runs daily via cron. For every certificate whose expiration is
// exactly 45, 14, 0, or -7 days out, sends a reminder to the vendor
// (CC the org owner) and logs it to reminder_log to avoid duplicate
// sends. Also recalculates vendor status.
//
// Schedule with pg_cron / the dashboard, e.g. daily at 13:00 UTC:
//   select cron.schedule('daily-reminders','0 13 * * *',
//     $$ select net.http_post(
//          url := 'https://<project>.functions.supabase.co/daily-reminders',
//          headers := jsonb_build_object('Authorization','Bearer <anon-or-service-key>')
//        ) $$);
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReminderType = "45d" | "14d" | "expired" | "escalation";

const OFFSET_TO_TYPE: Record<number, ReminderType> = {
  45: "45d",
  14: "14d",
  0: "expired",
  [-7]: "escalation",
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@certtrack.io";
  const appUrl = Deno.env.get("APP_URL") ?? "";

  const today = new Date();
  let sent = 0;

  for (const offsetStr of Object.keys(OFFSET_TO_TYPE)) {
    const offset = Number(offsetStr);
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() + offset);
    const targetDate = target.toISOString().slice(0, 10);
    const type = OFFSET_TO_TYPE[offset];

    const { data: certs } = await supabase
      .from("certificates")
      .select("id, vendor_id, org_id, expiration_date")
      .eq("expiration_date", targetDate);

    for (const cert of certs ?? []) {
      // Dedup: skip if we already logged this type for this cert.
      const { data: existing } = await supabase
        .from("reminder_log")
        .select("id")
        .eq("cert_id", cert.id)
        .eq("type", type)
        .maybeSingle();
      if (existing) continue;

      const { data: vendor } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", cert.vendor_id)
        .single();
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", cert.org_id)
        .single();
      const { data: owner } = await supabase
        .from("users")
        .select("email")
        .eq("org_id", cert.org_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (vendor?.contact_email && resendKey) {
        const subject =
          type === "expired" || type === "escalation"
            ? `Action needed: COI for ${org?.name} has expired`
            : `Reminder: your COI for ${org?.name} expires ${cert.expiration_date}`;
        const body = `Hi ${vendor.contact_name ?? vendor.company_name},\n\nYour certificate of insurance on file with ${org?.name} ${
          type === "expired" || type === "escalation" ? "expired" : "expires"
        } on ${cert.expiration_date}. Please upload a current certificate.\n\n${appUrl}`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: vendor.contact_email,
            cc: owner?.email ? [owner.email] : undefined,
            subject,
            text: body,
          }),
        });
      }

      await supabase.from("reminder_log").insert({
        vendor_id: cert.vendor_id,
        cert_id: cert.id,
        type,
      });
      sent++;
    }
  }

  // Recompute statuses for all vendors (cheap; keeps the dashboard fresh).
  await recalcAllStatuses(supabase);

  return new Response(JSON.stringify({ ok: true, reminders_sent: sent }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function recalcAllStatuses(supabase: ReturnType<typeof createClient>) {
  const { data: vendors } = await supabase.from("vendors").select("id");
  const now = new Date();
  for (const v of vendors ?? []) {
    const { data: certs } = await supabase
      .from("certificates")
      .select("expiration_date")
      .eq("vendor_id", v.id);
    let status = "missing";
    if (certs && certs.length > 0) {
      const exps = certs
        .map((c) => c.expiration_date)
        .filter(Boolean)
        .sort()
        .reverse();
      if (exps.length > 0) {
        const days = Math.ceil(
          (new Date(exps[0]).getTime() - now.getTime()) / 86400000
        );
        status = days < 0 ? "expired" : days <= 45 ? "expiring_soon" : "compliant";
      }
    }
    await supabase.from("vendors").update({ status }).eq("id", v.id);
  }
}
