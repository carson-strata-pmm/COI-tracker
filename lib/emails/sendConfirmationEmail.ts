import "server-only";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

export async function sendConfirmationEmail(
  email: string,
  confirmationUrl: string
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const templatePath = path.join(
    process.cwd(),
    "emails",
    "confirmation.html"
  );
  let html = fs.readFileSync(templatePath, "utf-8");
  html = html.replaceAll("CONFIRMATION_URL_PLACEHOLDER", confirmationUrl);

  await resend.emails.send({
    from: `CertTrack <${process.env.RESEND_FROM_EMAIL}>`,
    to: email,
    subject: "Confirm your CertTrack account",
    html,
  });
}
