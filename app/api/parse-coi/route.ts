import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured } from "@/lib/queries";
import { ingestCertificate } from "@/lib/ingest";
import { resolveUploadRequest } from "@/lib/upload-request";
import { triggerAiReview } from "@/lib/ai-review";
import { sendEmail } from "@/lib/resend";
import { coiReceivedEmail } from "@/lib/email-templates";
import { getActiveOrgId } from "@/lib/auth";
import type { Organization, Vendor } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Upload + parse a COI. Two entry modes:
 *   - org-direct: multipart with `vendor_id` (authenticated org flow)
 *   - vendor:     multipart with `token`     (public upload page)
 */
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Database not connected. Configure Supabase to enable uploads." },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const vendorId = form.get("vendor_id");
  const token = form.get("token");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  const db = createAdminClient();
  let vendor: Vendor;
  let org: Organization;
  let uploadedBy: "org" | "vendor";
  let requestId: string | null = null;

  if (typeof token === "string" && token) {
    // ── vendor flow ──
    const resolved = await resolveUploadRequest(token);
    if ("error" in resolved) {
      return NextResponse.json(
        { error: `Upload link ${resolved.error}` },
        { status: 400 }
      );
    }
    vendor = resolved.vendor;
    org = resolved.org;
    uploadedBy = "vendor";
    requestId = resolved.request.id;
  } else if (typeof vendorId === "string" && vendorId) {
    // ── org-direct flow ──
    const orgId = await getActiveOrgId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 401 }
      );
    }
    const { data: v } = await db
      .from("vendors")
      .select("*")
      .eq("id", vendorId)
      .eq("org_id", orgId)
      .single();
    if (!v) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    vendor = v as Vendor;
    const { data: o } = await db
      .from("organizations")
      .select("*")
      .eq("id", vendor.org_id)
      .single();
    org = o as Organization;
    uploadedBy = "org";
  } else {
    return NextResponse.json(
      { error: "Provide a vendor_id or a token" },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let result;
  try {
    result = await ingestCertificate({
      fileBytes: bytes,
      fileName: file.name,
      vendorId: vendor.id,
      orgId: org.id,
      uploadedBy,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ingest failed" },
      { status: 500 }
    );
  }

  // Mark the upload request completed (single-use) for the vendor flow.
  if (requestId) {
    await db
      .from("upload_requests")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", requestId);
  }

  // AI review runs on every cert upload for all plans.
  let issuesSummary: string | null = null;
  let reviewClean: boolean | null = null;
  {
    const issues = await triggerAiReview({
      cert: result.certificate,
      vendor,
      org,
    });
    if (issues !== null) {
      reviewClean = issues === 0;
      if (issues > 0) {
        issuesSummary = `AI review flagged ${issues} potential issue${
          issues === 1 ? "" : "s"
        }.`;
      }
    }
  }

  // Notify the org owner on vendor uploads.
  if (uploadedBy === "vendor") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const { data: owner } = await db
      .from("users")
      .select("email")
      .eq("org_id", org.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // Did this upload come from a "Notify vendor" link (a fix), or a
    // regular request/first submission?
    let isResubmit = false;
    if (requestId) {
      const { data: notification } = await db
        .from("vendor_notifications")
        .select("id")
        .eq("upload_request_id", requestId)
        .maybeSingle();
      isResubmit = Boolean(notification);
    }

    if (owner?.email) {
      const email = coiReceivedEmail({
        vendorName: vendor.company_name,
        issuesSummary,
        clean: reviewClean === true,
        isResubmit,
        vendorUrl: `${appUrl}/vendors/${vendor.id}`,
      });
      await sendEmail({ to: owner.email, ...email });
    }
  }

  return NextResponse.json({
    ok: true,
    certificate_id: result.certificate.id,
    certificate: result.certificate,
    parse_source: result.parseSource,
    parse_confidence: result.confidence,
  });
}
