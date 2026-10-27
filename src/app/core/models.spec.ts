import { byFrequency, onlyFrequency } from './models';

describe('byFrequency', () => {
  it('groups in daily-to-monthly order and skips empty frequencies', () => {
    const papers = [
      { id: 1, frequency: 'MONTHLY' as const },
      { id: 2, frequency: 'DAILY' as const },
      { id: 3, frequency: 'DAILY' as const },
    ];
    expect(byFrequency(papers)).toEqual([
      { frequency: 'DAILY', items: [papers[1], papers[2]] },
      { frequency: 'MONTHLY', items: [papers[0]] },
    ]);
  });
});

describe('onlyFrequency', () => {
  it('keeps one frequency and recounts the totals', () => {
    const row = (periodicalId: number, frequency: 'DAILY' | 'WEEKLY', issues: number, amount: number) =>
      ({ periodicalId, name: 'x', frequency, issues, amount, missingDays: null, prices: [] });
    const report = { month: '2026-10', from: '2026-10-01', to: '2026-10-31', totalIssues: 32, totalAmount: 270,
      rows: [row(1, 'DAILY', 30, 180), row(2, 'WEEKLY', 2, 90)] };
    const weekly = onlyFrequency(report, 'WEEKLY');
    expect(weekly.rows.map(r => r.periodicalId)).toEqual([2]);
    expect([weekly.totalIssues, weekly.totalAmount]).toEqual([2, 90]);
  });
});
