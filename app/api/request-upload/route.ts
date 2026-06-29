import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured } from "@/lib/queries";
import { generateUploadToken } from "@/lib/upload-token";
import { sendEmail, hasResend } from "@/lib/resend";
import { vendorUploadRequestEmail } from "@/lib/email-templates";
import { getActiveOrgId } from "@/lib/auth";
import type { Organization, Vendor } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Create an upload_request for a vendor and email them a secure,
 * single-use upload link. Returns the link so the UI can also offer
 * copy-to-clipboard.
 */
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        error:
          "Database not connected. Configure Supabase to create upload requests.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const vendorId = body.vendor_id as string | undefined;
  if (!vendorId) {
    return NextResponse.json({ error: "vendor_id required" }, { status: 400 });
  }

  const orgId = await getActiveOrgId();
  if (!orgId) {
    return NextResponse.json(
      { error: "No active organization" },
      { status: 401 }
    );
  }
  const db = createAdminClient();
  const { data: vendor } = await db
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .eq("org_id", orgId)
    .single();
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }
  const { data: org } = await db
    .from("organizations")
    .select("*")
    .eq("id", (vendor as Vendor).org_id)
    .single();

  const token = generateUploadToken();
  const { error } = await db.from("upload_requests").insert({
    vendor_id: vendorId,
    org_id: (vendor as Vendor).org_id,
    token,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const uploadUrl = `${appUrl}/upload/${token}`;

  let emailed = false;
  const v = vendor as Vendor;
  if (v.contact_email && hasResend()) {
    const email = vendorUploadRequestEmail({
      orgName: (org as Organization)?.name ?? "Your client",
      vendorName: v.contact_name ?? v.company_name,
      uploadUrl,
    });
    await sendEmail({ to: v.contact_email, ...email });
    emailed = true;
  }

  return NextResponse.json({ ok: true, upload_url: uploadUrl, emailed });
}
