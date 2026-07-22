import { DEFAULT_CONVERSATION_TITLE } from './entities/conversation.entity';

/** Long enough to be recognisable in the sidebar, short enough not to wrap. */
const MAX_TITLE_LENGTH = 60;

/**
 * Derives a conversation title from the first thing the user asked.
 *
 * Titles are cosmetic, so this never throws and always returns something
 * renderable — a question that is pure whitespace or emoji still has to leave a
 * usable row in the sidebar.
 */
export function deriveConversationTitle(firstUserMessage: string): string {
  const normalised = firstUserMessage.replace(/\s+/g, ' ').trim();

  if (normalised.length === 0) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  if (normalised.length <= MAX_TITLE_LENGTH) {
    return normalised;
  }

  // Prefer cutting at a word boundary, but only if that leaves a title worth
  // reading — truncating "supercalifragilistic..." at the last space could
  // otherwise return almost nothing.
  const clipped = normalised.slice(0, MAX_TITLE_LENGTH);
  const lastSpace = clipped.lastIndexOf(' ');
  const body =
    lastSpace > MAX_TITLE_LENGTH / 2 ? clipped.slice(0, lastSpace) : clipped;

  return `${body.trimEnd()}…`;
}
