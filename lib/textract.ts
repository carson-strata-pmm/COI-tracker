import "server-only";
import {
  TextractClient,
  AnalyzeDocumentCommand,
  type Block,
} from "@aws-sdk/client-textract";

// Below this overall confidence we fall back to Claude for extraction.
export const TEXTRACT_CONFIDENCE_THRESHOLD = 0.75;

let client: TextractClient | null = null;
function getClient(): TextractClient {
  if (!client) {
    client = new TextractClient({
      region: process.env.AWS_REGION ?? "us-east-1",
    });
  }
  return client;
}

export function hasTextract(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  );
}

export interface TextractParseResult {
  fields: Record<string, { value: string; confidence: number }>;
  insurer_name: string | null;
  policy_number: string | null;
  named_insured: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  coverage_types: string[];
  limits: Record<string, number | string>;
  overall_confidence: number;
}

// ACORD 25 key aliases we try to match (lowercased, fuzzy contains).
const KEY_ALIASES: Record<string, string[]> = {
  effective_date: ["policy eff", "effective date", "eff date"],
  expiration_date: ["policy exp", "expiration date", "exp date"],
  insurer_name: ["insurer", "insurer a", "carrier"],
  named_insured: ["insured", "named insured"],
  policy_number: ["policy number", "policy no", "policy #"],
};

/**
 * Parse a COI with Textract FORMS. Returns normalized ACORD 25
 * fields plus per-field confidence and an overall confidence score.
 * Callers compare overall_confidence to TEXTRACT_CONFIDENCE_THRESHOLD
 * and fall back to Claude when it is too low.
 */
export async function parseCoiWithTextract(
  documentBytes: Uint8Array
): Promise<TextractParseResult> {
  const out = await getClient().send(
    new AnalyzeDocumentCommand({
      Document: { Bytes: documentBytes },
      FeatureTypes: ["FORMS"],
    })
  );

  const blocks = out.Blocks ?? [];
  const kvPairs = extractKeyValues(blocks);

  const fields: TextractParseResult["fields"] = {};
  const matched: Record<string, string> = {};

  for (const [normalized, aliases] of Object.entries(KEY_ALIASES)) {
    const hit = kvPairs.find((kv) =>
      aliases.some((a) => kv.key.toLowerCase().includes(a))
    );
    if (hit) {
      fields[normalized] = { value: hit.value, confidence: hit.confidence };
      matched[normalized] = hit.value;
    }
  }

  const confidences = Object.values(fields).map((f) => f.confidence);
  const overall =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  return {
    fields,
    insurer_name: matched.insurer_name ?? null,
    policy_number: matched.policy_number ?? null,
    named_insured: matched.named_insured ?? null,
    effective_date: normalizeDate(matched.effective_date),
    expiration_date: normalizeDate(matched.expiration_date),
    coverage_types: [],
    limits: {},
    overall_confidence: overall,
  };
}

interface KeyValue {
  key: string;
  value: string;
  confidence: number;
}

function extractKeyValues(blocks: Block[]): KeyValue[] {
  const byId = new Map<string, Block>();
  for (const b of blocks) if (b.Id) byId.set(b.Id, b);

  const text = (block: Block | undefined): string => {
    if (!block?.Relationships) return "";
    const childIds =
      block.Relationships.find((r) => r.Type === "CHILD")?.Ids ?? [];
    return childIds
      .map((id) => byId.get(id))
      .filter((c): c is Block => Boolean(c))
      .map((c) => (c.BlockType === "WORD" ? c.Text : c.Text))
      .filter(Boolean)
      .join(" ")
      .trim();
  };

  const pairs: KeyValue[] = [];
  for (const b of blocks) {
    if (b.BlockType !== "KEY_VALUE_SET") continue;
    if (!b.EntityTypes?.includes("KEY")) continue;
    const valueId = b.Relationships?.find((r) => r.Type === "VALUE")?.Ids?.[0];
    const valueBlock = valueId ? byId.get(valueId) : undefined;
    pairs.push({
      key: text(b),
      value: text(valueBlock),
      confidence: (b.Confidence ?? 0) / 100,
    });
  }
  return pairs;
}

function normalizeDate(value: string | undefined): string | null {
  if (!value) return null;
  // Accept MM/DD/YYYY or MM-DD-YYYY → YYYY-MM-DD.
  const m = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return null;
  let [, mm, dd, yyyy] = m;
  if (yyyy.length === 2) yyyy = `20${yyyy}`;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}
