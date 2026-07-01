import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AIReviewReport, CoverageRequirement } from "@/lib/types";

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
  org_name: string;
  vendor_company_name: string | null;
  named_insured: string | null;
  insurer_name: string | null;
  expiration_date: string | null;
  // Extracted cert values
  gl_per_occurrence: number | null;
  gl_aggregate: number | null;
  workers_comp_detected: boolean;
  auto_limit: number | null;
  umbrella_limit: number | null;
  additional_insured: boolean | null;
  waiver_of_subrogation: boolean | null;
  // Resolved requirements for this vendor type
  requirements: Pick<
    CoverageRequirement,
    | "gl_per_occurrence_min"
    | "gl_aggregate_min"
    | "workers_comp_required"
    | "auto_required"
    | "auto_min"
    | "umbrella_required"
    | "umbrella_min"
    | "additional_insured_required"
    | "waiver_of_subrogation_required"
  > | null;
}

function fmtMoney(n: number | null): string {
  if (n === null) return "not detected";
  return `$${n.toLocaleString("en-US")}`;
}

function buildReviewPrompt(input: AiReviewInput): string {
  const req = input.requirements;

  const requirementsSection = req
    ? `Required coverage for this vendor type:
- GL per occurrence minimum: ${req.gl_per_occurrence_min !== null ? `$${req.gl_per_occurrence_min.toLocaleString("en-US")}` : "no minimum set"}
- GL aggregate minimum: ${req.gl_aggregate_min !== null ? `$${req.gl_aggregate_min.toLocaleString("en-US")}` : "no minimum set"}
- Workers compensation: ${req.workers_comp_required ? "Required" : "Not required"}
- Commercial auto: ${req.auto_required ? `Required${req.auto_min !== null ? ` at $${req.auto_min.toLocaleString("en-US")}` : ""}` : "Not required"}
- Umbrella/excess: ${req.umbrella_required ? `Required${req.umbrella_min !== null ? ` at $${req.umbrella_min.toLocaleString("en-US")}` : ""}` : "Not required"}
- Additional insured endorsement: ${req.additional_insured_required ? "Required" : "Not required"}
- Waiver of subrogation: ${req.waiver_of_subrogation_required ? "Required" : "Not required"}`
    : `No specific requirements on file for this vendor type — apply general best-practice minimums ($1M GL per occurrence, $2M aggregate).`;

  return `You are a COI compliance assistant. Review the following certificate of insurance against the specific requirements for this vendor type and return a structured JSON report.

Vendor type: ${input.vendor_type ?? "unknown"}
Business name: ${input.org_name}

${requirementsSection}

Certificate data:
- Named insured: ${input.named_insured ?? "not detected"}
- Insurer: ${input.insurer_name ?? "not detected"}
- Expiration date: ${input.expiration_date ?? "not detected"}
- GL per occurrence: ${fmtMoney(input.gl_per_occurrence)}
- GL aggregate: ${fmtMoney(input.gl_aggregate)}
- Workers compensation: ${input.workers_comp_detected ? "detected" : "not detected"}
- Commercial auto limit: ${fmtMoney(input.auto_limit)}
- Umbrella/excess limit: ${fmtMoney(input.umbrella_limit)}
- Additional insured endorsement: ${input.additional_insured === null ? "not detected" : input.additional_insured ? "detected" : "not detected"}
- Waiver of subrogation: ${input.waiver_of_subrogation === null ? "not detected" : input.waiver_of_subrogation ? "detected" : "not detected"}
- Vendor name on file: ${input.vendor_company_name ?? "unknown"}

Return ONLY valid JSON in this format:
{
  "issues_found": 2,
  "clean": false,
  "named_insured_match": true,
  "checks": [
    {
      "requirement": "GL per occurrence",
      "required": "$1,000,000",
      "found": "$500,000",
      "passed": false,
      "severity": "critical",
      "message": "GL per occurrence is $500K — required minimum is $1M. Request an updated certificate."
    },
    {
      "requirement": "Workers compensation",
      "required": "Required",
      "found": "Detected",
      "passed": true,
      "severity": null,
      "message": null
    }
  ],
  "summary": "2 critical issues found. GL limit is below the required minimum and additional insured endorsement is missing."
}

Severity levels: "critical" (coverage gap that creates real liability exposure) or "warning" (recommended but not required for this vendor type). Set severity to null for passed checks. issues_found should count only failed checks.
Never make a final coverage determination. Flag gaps clearly and recommend consulting a broker for ambiguous endorsement language.
Return only JSON, no other text.`;
}

/**
 * AI compliance review. Returns a structured gap report with pass/fail
 * per requirement.
 */
export async function runComplianceReview(
  input: AiReviewInput
): Promise<AIReviewReport> {
  const message = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: buildReviewPrompt(input) }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(extractJson(text)) as AIReviewReport;
}
