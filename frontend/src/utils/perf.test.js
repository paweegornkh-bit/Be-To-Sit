import { describe, expect, it } from 'vitest';
import { formatTHB } from './perf';

describe('formatTHB', () => {
  it('formats a numeric amount as Thai baht', () => {
    expect(formatTHB(120)).toContain('฿');
    expect(formatTHB(120)).toContain('120');
  });
});
