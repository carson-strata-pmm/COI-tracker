import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;
function getClient(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export function hasResend(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@certtrack.io";

export interface SendEmailArgs {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a transactional email. In development, if Resend is not
 * configured, the email is logged to the console instead of sent so
 * flows remain testable without a key.
 */
export async function sendEmail(args: SendEmailArgs): Promise<void> {
  if (!hasResend()) {
    console.info(
      `[resend:dev] would send "${args.subject}" to ${
        Array.isArray(args.to) ? args.to.join(", ") : args.to
      }`
    );
    return;
  }
  await getClient().emails.send({
    from: FROM,
    to: args.to,
    cc: args.cc,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });
}
