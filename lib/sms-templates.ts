// Plain-text SMS templates, following the same pattern as
// lib/email-templates.ts (functions returning ready-to-send strings).

export function issueNotificationSms(args: {
  vendorName: string;
  orgName: string;
  issueCount: number;
  uploadUrl: string;
}): string {
  return `Hi ${args.vendorName}, ${args.orgName} reviewed your certificate of insurance and found ${args.issueCount} item${
    args.issueCount === 1 ? "" : "s"
  } that need to be updated. Upload a corrected cert here: ${args.uploadUrl}`;
}
