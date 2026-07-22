import { deriveConversationTitle } from './conversation-title';
import { DEFAULT_CONVERSATION_TITLE } from './entities/conversation.entity';

describe('deriveConversationTitle', () => {
  it('uses a short question verbatim', () => {
    expect(deriveConversationTitle("Apple's net income in 2023?")).toBe(
      "Apple's net income in 2023?",
    );
  });

  it('collapses newlines and runs of whitespace onto one line', () => {
    expect(deriveConversationTitle('  Top 5 companies\n\n by   revenue  ')).toBe(
      'Top 5 companies by revenue',
    );
  });

  it('truncates at a word boundary and marks the cut', () => {
    const title = deriveConversationTitle(
      'Compare the revenue and net income of every technology company across all four fiscal years',
    );

    expect(title.length).toBeLessThanOrEqual(61); // 60 chars + ellipsis
    expect(title.endsWith('…')).toBe(true);
    expect(title).not.toMatch(/\s…$/); // no space stranded before the ellipsis
    expect(title.startsWith('Compare the revenue')).toBe(true);
  });

  it('hard-cuts a single long word rather than returning almost nothing', () => {
    // Cutting at the last space here would leave "A" — worse than a mid-word cut.
    const title = deriveConversationTitle(`A ${'x'.repeat(100)}`);

    expect(title.length).toBe(61);
    expect(title.startsWith('A xxx')).toBe(true);
  });

  it('falls back to the default when there is nothing renderable', () => {
    expect(deriveConversationTitle('   \n\t  ')).toBe(DEFAULT_CONVERSATION_TITLE);
    expect(deriveConversationTitle('')).toBe(DEFAULT_CONVERSATION_TITLE);
  });

  it('never exceeds the column width', () => {
    expect(deriveConversationTitle('word '.repeat(500)).length).toBeLessThan(255);
  });
});
