import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured } from "@/lib/queries";
import { triggerAiReview } from "@/lib/ai-review";
import type { Certificate, Organization, Vendor } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Run (or re-run) an AI compliance review for a certificate. In
 * production this is invoked by a Supabase Edge Function on cert
 * insert for Pro+ orgs; this route exposes the same logic for manual
 * re-runs.
 */
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Database not connected." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const certId = body.cert_id as string | undefined;
  if (!certId) {
    return NextResponse.json({ error: "cert_id required" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: cert } = await db
    .from("certificates")
    .select("*")
    .eq("id", certId)
    .single();
  if (!cert) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  const { data: org } = await db
    .from("organizations")
    .select("*")
    .eq("id", (cert as Certificate).org_id)
    .single();
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: vendor } = await db
    .from("vendors")
    .select("*")
    .eq("id", (cert as Certificate).vendor_id)
    .single();

  const issues = await triggerAiReview({
    cert: cert as Certificate,
    vendor: vendor as Vendor,
    org: org as Organization,
  });

  return NextResponse.json({ ok: true, issues_found: issues });
}
