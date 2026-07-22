/**
 * Claude Opus 4.8 list pricing: $5.00 per 1M input tokens, $25.00 per 1M output.
 * Kept as per-token constants so the arithmetic below reads as a unit check.
 */
export const INPUT_COST_PER_TOKEN = 5.0 / 1_000_000;
export const OUTPUT_COST_PER_TOKEN = 25.0 / 1_000_000;

/** Cost of one turn in USD. */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
): number {
  return inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
}
