import { recentMonths } from './periodical-report.page';

describe('recentMonths', () => {
  it('lists the latest month and the ones before it, across a year boundary', () => {
    expect(recentMonths('2026-02', 4)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11']);
  });

  it('gives twelve months for the export choice', () => {
    const months = recentMonths('2026-10', 12);
    expect(months.length).toBe(12);
    expect(months[0]).toBe('2026-10');
    expect(months[11]).toBe('2025-11');
  });
});
