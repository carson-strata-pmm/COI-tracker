import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AIReviewReport } from "@/lib/types";

// Claude model used for both the parsing fallback and AI compliance
// review (per the project brief).
export const CLAUDE_MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface ClaudeParseResult {
  insurer_name: string | null;
  policy_number: string | null;
  named_insured: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  coverage_types: string[];
  limits: Record<string, number | string>;
  additional_insured: boolean | null;
  waiver_of_subrogation: boolean | null;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return text;
  return text.slice(start, end + 1);
}

/**
 * Fallback COI parser. Used when Textract confidence is below the
 * threshold. `document` is the base64-encoded PDF.
 */
export async function parseCoiWithClaude(
  documentBase64: string
): Promise<ClaudeParseResult> {
  const prompt = `Extract the following fields from this certificate of insurance document and return only valid JSON:
{
  "insurer_name": "",
  "policy_number": "",
  "named_insured": "",
  "effective_date": "YYYY-MM-DD",
  "expiration_date": "YYYY-MM-DD",
  "coverage_types": [],
  "limits": {},
  "additional_insured": true/false,
  "waiver_of_subrogation": true/false
}
Return null for any field you cannot find. Return only JSON, no other text.`;

  const message = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        // The document (PDF) content block is cast because the SDK's
        // published content-block union lags the PDF support.
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: documentBase64,
            },
          },
          { type: "text", text: prompt },
        ] as unknown as Anthropic.MessageParam["content"],
      },
    ],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(extractJson(text)) as ClaudeParseResult;
}

export interface AiReviewInput {
  vendor_type: string | null;
  industry_type: string | null;
  named_insured: string | null;
  insurer_name: string | null;
  expiration_date: string | null;
  coverage_types_and_limits: string;
  additional_insured: boolean | null;
  waiver_of_subrogation: boolean | null;
}

/**
 * AI compliance review (Pro+). Returns a structured gap report.
 */
export async function runComplianceReview(
  input: AiReviewInput
): Promise<AIReviewReport> {
  const prompt = `You are a COI compliance assistant. Review the following certificate of insurance data and return a JSON report identifying compliance gaps.
Vendor type: ${input.vendor_type ?? "unknown"}
Org industry: ${input.industry_type ?? "unknown"}
Certificate data:
- Named insured: ${input.named_insured ?? "unknown"}
- Insurer: ${input.insurer_name ?? "unknown"}
- Expiration date: ${input.expiration_date ?? "unknown"}
- Coverage types and limits: ${input.coverage_types_and_limits}
- Additional insured endorsement detected: ${input.additional_insured ? "true" : "false"}
- Waiver of subrogation detected: ${input.waiver_of_subrogation ? "true" : "false"}

Return ONLY valid JSON in this format:
{
  "issues_found": 2,
  "issues": [
    {
      "field": "gl_limit",
      "severity": "warning",
      "message": "GL limit is $500K — typical minimum for contractors is $1M."
    }
  ],
  "summary": "2 issues found. GL limit is below typical minimums and additional insured endorsement was not detected.",
  "clean": false
}
If no issues found, return issues_found: 0, issues: [], clean: true.
Never make a coverage determination. Flag gaps and recommend the user consult their broker for ambiguous cases.`;

  const message = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(extractJson(text)) as AIReviewReport;
}
