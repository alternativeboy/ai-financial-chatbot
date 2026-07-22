import { calculateCost } from './cost';

describe('calculateCost', () => {
  it('prices input at $5.00 per million tokens', () => {
    expect(calculateCost(1_000_000, 0)).toBeCloseTo(5, 9);
  });

  it('prices output at $25.00 per million tokens', () => {
    expect(calculateCost(0, 1_000_000)).toBeCloseTo(25, 9);
  });

  it('sums both sides of the turn', () => {
    expect(calculateCost(1_000_000, 1_000_000)).toBeCloseTo(30, 9);
  });

  it('is zero only when nothing was consumed', () => {
    expect(calculateCost(0, 0)).toBe(0);
  });

  it('still charges a turn the user stopped before any output', () => {
    // The prompt was sent and billed even if no tokens came back — a partial
    // message must not be recorded as free.
    expect(calculateCost(1200, 0)).toBeGreaterThan(0);
  });
});
