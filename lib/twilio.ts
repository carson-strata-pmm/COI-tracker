import "server-only";

export function hasTwilio(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

/**
 * Send an SMS via Twilio. No-ops (with a console log) if Twilio is
 * not configured so the app degrades gracefully without credentials.
 */
export async function sendSms(args: {
  to: string;
  body: string;
}): Promise<void> {
  if (!hasTwilio()) {
    console.info(`[twilio:dev] would send SMS to ${args.to}: ${args.body}`);
    return;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: args.to, From: from, Body: args.body }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }
}
