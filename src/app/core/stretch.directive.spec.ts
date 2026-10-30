import { stretchFor } from './stretch.directive';

describe('stretchFor', () => {
  it('growsWithThePullButNeverPastSixPercent', () => {
    expect(stretchFor(0)).toBe(1);
    expect(stretchFor(-50)).toBe(1);
    expect(stretchFor(100)).toBeGreaterThan(1);
    expect(stretchFor(100)).toBeLessThan(stretchFor(300));
    expect(stretchFor(5000)).toBeLessThanOrEqual(1.06);
    expect(stretchFor(5000)).toBeGreaterThan(1.059);
  });
});
