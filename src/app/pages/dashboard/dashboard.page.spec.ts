import { DayRegister, MonthReport, PeriodicalFrequency, ReportRow } from '../../core/models';
import { paperSummary } from './dashboard.page';

describe('paperSummary', () => {
  const row = (periodicalId: number, frequency: PeriodicalFrequency, arrived = false) =>
    ({ periodicalId, name: 'x', frequency, defaultPrice: 6, arrived, price: 6 });
  const report = (rows: Partial<ReportRow>[]): MonthReport =>
    ({ month: '2026-10', from: '2026-10-01', to: '2026-10-31', totalIssues: 0, totalAmount: 0,
       rows: rows.map(r => ({ name: 'x', frequency: 'WEEKLY', amount: 0, missingDays: null, prices: [], periodicalId: 0, issues: 0, ...r })) });

  it('countsDailiesReceivedTodayAndMagazinesThatCameThisMonth', () => {
    const day: DayRegister = { date: '2026-10-28', rows: [
      row(1, 'DAILY', true), row(2, 'DAILY'), row(3, 'DAILY', true),
      row(4, 'WEEKLY'), row(5, 'MONTHLY'), row(6, 'FORTNIGHTLY'),
    ] };
    // Magazine 4 came earlier this month; 5 has a row but no copies yet; 6 has no row at all.
    const month = report([{ periodicalId: 4, issues: 3 }, { periodicalId: 5, issues: 0 }, { periodicalId: 1, frequency: 'DAILY', issues: 20 }]);
    expect(paperSummary(day, month)).toEqual({ newspapers: { received: 2, total: 3 }, magazines: { received: 1, total: 3 } });
  });

  it('isEmptyWhenNothingIsSubscribed', () => {
    expect(paperSummary({ date: '2026-10-28', rows: [] }, report([])))
      .toEqual({ newspapers: { received: 0, total: 0 }, magazines: { received: 0, total: 0 } });
  });
});
