/**
 * Claude Sonnet 5 list pricing: $3.00 per 1M input tokens, $15.00 per 1M output.
 * Kept as per-token constants so the arithmetic below reads as a unit check.
 *
 * List pricing, not the promotional $2.00/$10.00 running through 2026-08-31 —
 * quoting the intro rate would silently under-report every turn once it lapses,
 * and over-reporting is the safer direction for a number shown to users.
 */
export const INPUT_COST_PER_TOKEN = 3.0 / 1_000_000;
export const OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000;

/** Cost of one turn in USD. */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
): number {
  return inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
}
