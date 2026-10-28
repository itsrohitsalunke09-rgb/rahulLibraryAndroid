import { dayCells, recentMonths } from './periodical-report.page';

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

describe('dayCells', () => {
  it('marksDaysReceivedMissingOrStillToCome', () => {
    const cells = dayCells([5, null, null, 6], '2026-10', '2026-10-03');
    expect(cells.map(c => c.state)).toEqual(['received', 'missing', 'upcoming', 'received']);
    expect(cells[3].day).toBe(4);
  });
});
