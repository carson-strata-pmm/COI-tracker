import "server-only";

import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured } from "@/lib/queries";
import { verifyUploadTokenSignature } from "@/lib/upload-token";
import type { Organization, UploadRequest, Vendor } from "@/lib/types";

export interface ResolvedUploadRequest {
  request: UploadRequest;
  vendor: Vendor;
  org: Organization;
}

export type UploadTokenError =
  | "not_found"
  | "expired"
  | "completed"
  | "bad_signature"
  | "not_configured";

/**
 * Resolve an upload token to its request + vendor + org, validating
 * the HMAC signature, existence, expiry, and that it hasn't already
 * been used. Server-only (uses the service role).
 */
export async function resolveUploadRequest(
  token: string
): Promise<ResolvedUploadRequest | { error: UploadTokenError }> {
  if (!verifyUploadTokenSignature(token)) {
    return { error: "bad_signature" };
  }
  if (!isDbConfigured()) {
    return { error: "not_configured" };
  }

  const db = createAdminClient();
  const { data: request } = await db
    .from("upload_requests")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!request) return { error: "not_found" };
  if (request.completed_at) return { error: "completed" };
  if (new Date(request.expires_at).getTime() < Date.now()) {
    return { error: "expired" };
  }

  const { data: vendor } = await db
    .from("vendors")
    .select("*")
    .eq("id", request.vendor_id)
    .single();
  const { data: org } = await db
    .from("organizations")
    .select("*")
    .eq("id", request.org_id)
    .single();

  if (!vendor || !org) return { error: "not_found" };

  return {
    request: request as UploadRequest,
    vendor: vendor as Vendor,
    org: org as Organization,
  };
}
