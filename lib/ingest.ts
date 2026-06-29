import "server-only";

import { createAdminClient } from "@/lib/supabase-admin";
import { recalculateVendorStatus } from "@/lib/queries";
import {
  parseCoiWithTextract,
  hasTextract,
  TEXTRACT_CONFIDENCE_THRESHOLD,
} from "@/lib/textract";
import { parseCoiWithClaude, hasAnthropic } from "@/lib/anthropic";
import { COI_BUCKET } from "@/lib/constants";
import type { Certificate } from "@/lib/types";

export interface IngestArgs {
  fileBytes: Uint8Array;
  fileName: string;
  vendorId: string;
  orgId: string;
  uploadedBy: "org" | "vendor";
}

export interface IngestResult {
  certificate: Certificate;
  parseSource: "textract" | "claude" | "manual";
  confidence: number;
}

/**
 * Full COI ingest pipeline (shared by the org-direct upload and the
 * vendor token upload):
 *   1. store the PDF in the private Storage bucket
 *   2. parse with Textract; fall back to Claude when confidence is low
 *   3. insert the certificate row
 *   4. recalculate the vendor's status
 */
export async function ingestCertificate(
  args: IngestArgs
): Promise<IngestResult> {
  const db = createAdminClient();

  const certId = crypto.randomUUID();
  const filePath = `${args.orgId}/${args.vendorId}/${certId}.pdf`;

  // 1. Store the PDF.
  const { error: uploadError } = await db.storage
    .from(COI_BUCKET)
    .upload(filePath, args.fileBytes, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // 2. Parse.
  const parsed = await parseCoi(args.fileBytes);

  // 3. Insert the certificate.
  const { data: cert, error: insertError } = await db
    .from("certificates")
    .insert({
      id: certId,
      vendor_id: args.vendorId,
      org_id: args.orgId,
      file_path: `${COI_BUCKET}/${filePath}`,
      insurer_name: parsed.insurer_name,
      policy_number: parsed.policy_number,
      named_insured: parsed.named_insured,
      effective_date: parsed.effective_date,
      expiration_date: parsed.expiration_date,
      coverage_types: parsed.coverage_types,
      limits: parsed.limits,
      additional_insured: parsed.additional_insured,
      waiver_of_subrogation: parsed.waiver_of_subrogation,
      parse_confidence: parsed.confidence,
      parse_source: parsed.source,
      uploaded_by: args.uploadedBy,
    })
    .select("*")
    .single();
  if (insertError || !cert) {
    throw new Error(`Certificate insert failed: ${insertError?.message}`);
  }

  // 4. Recalculate vendor status.
  await recalculateVendorStatus(args.vendorId);

  return {
    certificate: cert as Certificate,
    parseSource: parsed.source,
    confidence: parsed.confidence,
  };
}

interface ParsedCoi {
  insurer_name: string | null;
  policy_number: string | null;
  named_insured: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  coverage_types: string[];
  limits: Record<string, number | string>;
  additional_insured: boolean | null;
  waiver_of_subrogation: boolean | null;
  confidence: number;
  source: "textract" | "claude" | "manual";
}

/**
 * Parse a COI: Textract first, Claude fallback when Textract is
 * unavailable or low-confidence. If neither is configured, returns
 * an empty manual record so the cert can still be saved and edited.
 */
async function parseCoi(fileBytes: Uint8Array): Promise<ParsedCoi> {
  if (hasTextract()) {
    try {
      const t = await parseCoiWithTextract(fileBytes);
      if (t.overall_confidence >= TEXTRACT_CONFIDENCE_THRESHOLD) {
        return {
          insurer_name: t.insurer_name,
          policy_number: t.policy_number,
          named_insured: t.named_insured,
          effective_date: t.effective_date,
          expiration_date: t.expiration_date,
          coverage_types: t.coverage_types,
          limits: t.limits,
          additional_insured: null,
          waiver_of_subrogation: null,
          confidence: t.overall_confidence,
          source: "textract",
        };
      }
      // Low confidence — fall through to Claude.
    } catch (e) {
      console.error("Textract parse failed, falling back to Claude:", e);
    }
  }

  if (hasAnthropic()) {
    try {
      const base64 = Buffer.from(fileBytes).toString("base64");
      const c = await parseCoiWithClaude(base64);
      return {
        insurer_name: c.insurer_name,
        policy_number: c.policy_number,
        named_insured: c.named_insured,
        effective_date: c.effective_date,
        expiration_date: c.expiration_date,
        coverage_types: c.coverage_types ?? [],
        limits: c.limits ?? {},
        additional_insured: c.additional_insured,
        waiver_of_subrogation: c.waiver_of_subrogation,
        confidence: 0.6,
        source: "claude",
      };
    } catch (e) {
      console.error("Claude parse failed:", e);
    }
  }

  // Nothing configured / both failed — empty record for manual entry.
  return {
    insurer_name: null,
    policy_number: null,
    named_insured: null,
    effective_date: null,
    expiration_date: null,
    coverage_types: [],
    limits: {},
    additional_insured: null,
    waiver_of_subrogation: null,
    confidence: 0,
    source: "manual",
  };
}
