/** DI token for the Anthropic client, so tests can supply a fake. */
export const ANTHROPIC_CLIENT = 'ANTHROPIC_CLIENT';

/**
 * Ceiling on tool round-trips in a single turn. A question needing more than a
 * handful of queries is a question the model is not converging on; stopping is
 * better than looping on the user's money.
 */
export const MAX_TOOL_ROUNDS = 5;

/**
 * Required by the API on every request. Generous because the response is
 * streamed — there is no timeout pressure to keep it small.
 */
export const MAX_TOKENS = 8192;
