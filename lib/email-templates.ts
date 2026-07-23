// Plain-HTML transactional email templates. (The brief lists React
// Email templates under /emails; these string templates keep the
// dependency surface small while producing the same emails. They can
// be swapped for React Email renders later without changing callers.)

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
  vendorUrl: string;
}): EmailContent {
  const subject = `${args.vendorName} uploaded a COI`;
  const html = layout(
    `${args.vendorName} uploaded a certificate`,
    `<p style="margin:0 0 16px;color:#334155">A new certificate of insurance was uploaded and parsed automatically.</p>
     ${
       args.issuesSummary
         ? `<p style="margin:0 0 16px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e">${args.issuesSummary}</p>`
         : ""
     }
     <p style="margin:0 0 4px">${button(args.vendorUrl, "Review certificate")}</p>`
  );
  const text = `${args.vendorName} uploaded a certificate of insurance.${
    args.issuesSummary ? `\n\n${args.issuesSummary}` : ""
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
