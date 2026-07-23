// Plain-HTML transactional email templates. (The brief lists React
// Email templates under /emails; these string templates keep the
// dependency surface small while producing the same emails. They can
// be swapped for React Email renders later without changing callers.)
import { checkStatusLine, type FormattedCheck } from "@/lib/ai-review-format";

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <tr><td style="padding:20px 28px;border-bottom:1px solid #e2e8f0;font-weight:600">🛡️ CertTrack</td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 12px;font-size:18px">${title}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px">
        Powered by CertTrack — secure COI compliance tracking.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:500">${label}</a>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function vendorUploadRequestEmail(args: {
  orgName: string;
  vendorName: string;
  uploadUrl: string;
}): EmailContent {
  const subject = `${args.orgName} requests your certificate of insurance`;
  const html = layout(
    "Certificate of insurance requested",
    `<p style="margin:0 0 12px;color:#334155">Hi ${args.vendorName},</p>
     <p style="margin:0 0 20px;color:#334155"><strong>${args.orgName}</strong> uses CertTrack to keep contractor insurance certificates up to date and has requested a current COI from you. No account is required — just upload your PDF.</p>
     <p style="margin:0 0 24px">${button(args.uploadUrl, "Upload your COI")}</p>
     <p style="margin:0;color:#64748b;font-size:13px">This secure link expires in 30 days. If the button doesn't work, paste this URL into your browser:<br>${args.uploadUrl}</p>`
  );
  const text = `Hi ${args.vendorName},\n\n${args.orgName} has requested a current certificate of insurance from you via CertTrack. Upload your PDF here (no account required):\n\n${args.uploadUrl}\n\nThis link expires in 30 days.`;
  return { subject, html, text };
}

export function coiReceivedEmail(args: {
  vendorName: string;
  issuesSummary?: string | null;
  /** True once the AI review has actually completed with zero issues. */
  clean?: boolean;
  /** True when this upload followed a "Notify vendor" request (a fix, not a first submission). */
  isResubmit?: boolean;
  vendorUrl: string;
}): EmailContent {
  const subject = args.clean
    ? `${args.vendorName} resubmitted their certificate — all checks passed`
    : `${args.vendorName} uploaded a COI`;
  const headline = args.clean
    ? `${args.vendorName} ${args.isResubmit ? "resubmitted their certificate" : "uploaded a certificate"} — all checks passed ✅`
    : `${args.vendorName} uploaded a certificate`;
  const html = layout(
    headline,
    `<p style="margin:0 0 16px;color:#334155">A new certificate of insurance was uploaded and parsed automatically.</p>
     ${
       args.clean
         ? `<p style="margin:0 0 16px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#166534">No compliance issues found.</p>`
         : args.issuesSummary
           ? `<p style="margin:0 0 16px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e">${args.issuesSummary}</p>`
           : ""
     }
     <p style="margin:0 0 4px">${button(args.vendorUrl, "Review certificate")}</p>`
  );
  const text = `${headline}.${
    !args.clean && args.issuesSummary ? `\n\n${args.issuesSummary}` : ""
  }\n\nReview it: ${args.vendorUrl}`;
  return { subject, html, text };
}

export function expirationReminderEmail(args: {
  vendorName: string;
  orgName: string;
  expirationDate: string;
  type: "45d" | "14d" | "expired" | "escalation";
  uploadUrl: string;
}): EmailContent {
  const headline =
    args.type === "expired" || args.type === "escalation"
      ? "Your certificate of insurance has expired"
      : "Your certificate of insurance is expiring soon";
  const subject =
    args.type === "expired" || args.type === "escalation"
      ? `Action needed: COI for ${args.orgName} has expired`
      : `Reminder: your COI for ${args.orgName} expires ${args.expirationDate}`;
  const html = layout(
    headline,
    `<p style="margin:0 0 12px;color:#334155">Hi ${args.vendorName},</p>
     <p style="margin:0 0 20px;color:#334155">Your certificate of insurance on file with <strong>${args.orgName}</strong> ${
       args.type === "expired" || args.type === "escalation"
         ? `expired on <strong>${args.expirationDate}</strong>`
         : `expires on <strong>${args.expirationDate}</strong>`
     }. Please upload a current certificate to stay compliant.</p>
     <p style="margin:0 0 4px">${button(args.uploadUrl, "Upload updated COI")}</p>`
  );
  const text = `Hi ${args.vendorName},\n\nYour certificate of insurance on file with ${args.orgName} ${
    args.type === "expired" || args.type === "escalation" ? "expired" : "expires"
  } on ${args.expirationDate}. Upload a current certificate: ${args.uploadUrl}`;
  return { subject, html, text };
}

/**
 * Sent when an org clicks "Notify vendor" on a certificate with AI
 * review issues. `issues` are the failed checks (see
 * lib/ai-review-format.ts), each rendered as "label — status".
 */
export function issueNotificationEmail(args: {
  vendorName: string;
  orgName: string;
  issues: FormattedCheck[];
  uploadUrl: string;
}): EmailContent {
  const subject = `Action needed — update your certificate of insurance for ${args.orgName}`;

  const issueLine = (i: FormattedCheck) =>
    `${escapeHtml(i.label)} — ${escapeHtml(checkStatusLine(i))}`;

  const issuesHtml = args.issues
    .map((i) => `<li style="margin:0 0 8px;color:#334155">${issueLine(i)}</li>`)
    .join("");

  const html = layout(
    "Your certificate of insurance needs an update",
    `<p style="margin:0 0 12px;color:#334155">Hi ${escapeHtml(args.vendorName)},</p>
     <p style="margin:0 0 16px;color:#334155"><strong>${escapeHtml(args.orgName)}</strong> reviewed your certificate of insurance and found a few items that need to be updated before work can continue.</p>
     <p style="margin:0 0 8px;font-weight:600;color:#0f172a">What needs to be fixed:</p>
     <ul style="margin:0 0 20px;padding-left:20px">${issuesHtml}</ul>
     <p style="margin:0 0 20px;color:#334155">Please contact your insurance broker, request an updated certificate that addresses these items, and upload it using the link below.</p>
     <p style="margin:0 0 4px">${button(args.uploadUrl, "Upload updated certificate")}</p>
     <p style="margin:20px 0 0;color:#64748b;font-size:13px">Questions? Contact ${escapeHtml(args.orgName)} directly.</p>`
  );

  const issuesText = args.issues
    .map((i) => `- ${i.label} — ${checkStatusLine(i)}`)
    .join("\n");
  const text = `Hi ${args.vendorName},\n\n${args.orgName} reviewed your certificate of insurance and found the following items that need to be updated:\n\n${issuesText}\n\nPlease contact your insurance broker, request an updated certificate, and upload it here:\n${args.uploadUrl}`;

  return { subject, html, text };
}
