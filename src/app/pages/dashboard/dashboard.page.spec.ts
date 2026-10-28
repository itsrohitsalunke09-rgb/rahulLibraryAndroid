import { DayRegister, MagazineCard } from '../../core/models';
import { paperSummary } from './dashboard.page';

describe('paperSummary', () => {
  const row = (periodicalId: number, arrived = false) =>
    ({ periodicalId, name: 'x', frequency: 'DAILY' as const, defaultPrice: 6, arrived, price: 6 });
  const magazine = (periodicalId: number, receipts: [string, string][]): MagazineCard =>
    ({ periodicalId, name: 'x', frequency: 'MONTHLY', receipts: receipts.map(([periodFrom, periodTo], id) => ({ id, receivedOn: periodFrom, periodFrom, periodTo })) });

  it('countsDailiesReceivedTodayAndMagazinesCoveringThisMonth', () => {
    const day: DayRegister = { date: '2026-10-28', rows: [row(1, true), row(2), row(3, true)] };
    const magazines = [
      magazine(4, [['2026-10-01', '2026-10-31']]),
      // A combined Sep–Oct issue covers October too.
      magazine(5, [['2026-09-01', '2026-10-31']]),
      magazine(6, [['2026-08-01', '2026-08-31']]),
    ];
    expect(paperSummary(day, magazines, '2026-10-28'))
      .toEqual({ newspapers: { received: 2, total: 3 }, magazines: { received: 2, total: 3 } });
  });

  it('isEmptyWhenNothingIsSubscribed', () => {
    expect(paperSummary({ date: '2026-10-28', rows: [] }, [], '2026-10-28'))
      .toEqual({ newspapers: { received: 0, total: 0 }, magazines: { received: 0, total: 0 } });
  });
});
