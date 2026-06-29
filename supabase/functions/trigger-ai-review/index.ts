// ─────────────────────────────────────────────────────────────
// trigger-ai-review — Supabase Edge Function (Deno)
//
// Invoked on certificate insert for Pro+ orgs. Calls Claude with the
// structured compliance prompt and stores the report in ai_reviews.
//
// Wire it up with a database webhook (Database → Webhooks) on INSERT
// into `certificates`, posting the new row to this function. The
// function checks the org plan before running.
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLAUDE_MODEL = "claude-sonnet-4-6";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  const payload = await req.json().catch(() => ({}));
  // Supabase DB webhooks send { type, record, ... }; also accept { cert_id }.
  const certId = payload?.record?.id ?? payload?.cert_id;
  if (!certId) {
    return json({ error: "cert_id / record required" }, 400);
  }
  if (!anthropicKey) {
    return json({ error: "ANTHROPIC_API_KEY not set" }, 503);
  }

  const { data: cert } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", certId)
    .single();
  if (!cert) return json({ error: "Certificate not found" }, 404);

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", cert.org_id)
    .single();
  if (!org || org.plan !== "pro_plus") {
    return json({ skipped: "AI review is Pro+ only" }, 200);
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", cert.vendor_id)
    .single();

  const { data: pending } = await supabase
    .from("ai_reviews")
    .insert({ cert_id: certId, org_id: cert.org_id, status: "pending" })
    .select("id")
    .single();

  const prompt = buildPrompt(cert, vendor, org);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "{}";
    const report = JSON.parse(extractJson(text));

    await supabase
      .from("ai_reviews")
      .update({
        status: "complete",
        issues_found: report.issues_found ?? 0,
        report,
      })
      .eq("id", pending?.id);

    return json({ ok: true, issues_found: report.issues_found ?? 0 }, 200);
  } catch (e) {
    await supabase
      .from("ai_reviews")
      .update({ status: "error" })
      .eq("id", pending?.id);
    return json({ error: String(e) }, 500);
  }
});

function buildPrompt(cert: any, vendor: any, org: any): string {
  const coverage = `Types: ${(cert.coverage_types ?? []).join(", ") || "unknown"}. Limits: ${
    cert.limits ? JSON.stringify(cert.limits) : "unknown"
  }.`;
  return `You are a COI compliance assistant. Review the following certificate of insurance data and return a JSON report identifying compliance gaps.
Vendor type: ${vendor?.vendor_type ?? "unknown"}
Org industry: ${org?.industry_type ?? "unknown"}
Certificate data:
- Named insured: ${cert.named_insured ?? "unknown"}
- Insurer: ${cert.insurer_name ?? "unknown"}
- Expiration date: ${cert.expiration_date ?? "unknown"}
- Coverage types and limits: ${coverage}
- Additional insured endorsement detected: ${cert.additional_insured ? "true" : "false"}
- Waiver of subrogation detected: ${cert.waiver_of_subrogation ? "true" : "false"}

Return ONLY valid JSON in this format:
{
  "issues_found": 2,
  "issues": [
    {"field": "gl_limit", "severity": "warning", "message": "GL limit is $500K — typical minimum for contractors is $1M."}
  ],
  "summary": "...",
  "clean": false
}
If no issues found, return issues_found: 0, issues: [], clean: true.
Never make a coverage determination. Flag gaps and recommend the user consult their broker for ambiguous cases.`;
}

function extractJson(text: string): string {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  return s === -1 || e === -1 ? text : text.slice(s, e + 1);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
