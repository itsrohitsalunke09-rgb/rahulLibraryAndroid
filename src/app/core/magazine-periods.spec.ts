import { defaultPeriod, issueName, magazinePeriods, parseIssue, receiptLabel, subscriptionWindow, weekStartDay } from './magazine-periods';
import { MagazineCard } from './models';

const card = (over: Partial<MagazineCard> = {}): MagazineCard => ({
  periodicalId: 4, name: 'लोकराज्य', frequency: 'MONTHLY',
  subscriptionStart: '2026-04-01', subscriptionEnd: '2027-03-31', receipts: [], ...over,
});

describe('magazine periods', () => {
  it('monthlyYearHasTwelveMonthsMarkedReceivedMissingOrUpcoming', () => {
    const periods = magazinePeriods(card({
      // A combined Jun–Jul issue and one for September.
      receipts: [
        { id: 1, receivedOn: '2026-07-10', periodFrom: '2026-06-01', periodTo: '2026-07-31' },
        { id: 2, receivedOn: '2026-09-05', periodFrom: '2026-09-01', periodTo: '2026-09-30' },
      ],
    }), '2026-10-28');
    expect(periods.length).toBe(12);
    expect(periods.map(p => p.label).slice(0, 3)).toEqual(['Apr', 'May', 'Jun']);
    const state = Object.fromEntries(periods.map(p => [p.from.slice(0, 7), p.state]));
    expect(state['2026-04']).toBe('missing');
    expect(state['2026-06']).toBe('received');
    expect(state['2026-07']).toBe('received');
    expect(state['2026-08']).toBe('missing');
    expect(state['2026-10']).toBe('upcoming');
    expect(state['2027-03']).toBe('upcoming');
  });

  it('weeklyPeriodsRunMondayToSunday', () => {
    expect(defaultPeriod('WEEKLY', '2026-10-28')).toEqual({ from: '2026-10-26', to: '2026-11-01' });
    const periods = magazinePeriods(card({ frequency: 'WEEKLY', subscriptionStart: '2026-01-01', subscriptionEnd: '2026-12-31' }), '2026-10-28');
    expect(periods[0].from).toBe('2025-12-29');
    expect(periods.length).toBe(53);
    expect(periods.every(p => p.state !== 'received')).toBe(true);
  });

  it('weeksLineUpWithTheFirstIssueSoEachIssueFillsOneCell', () => {
    // First issue Thu 1 Oct – Wed 7 Oct: weeks become Thursday–Wednesday.
    const receipts = [
      { id: 2, issueNo: 2, receivedOn: '2026-10-08', periodFrom: '2026-10-08', periodTo: '2026-10-14' },
      { id: 1, issueNo: 1, receivedOn: '2026-10-01', periodFrom: '2026-10-01', periodTo: '2026-10-07' },
    ];
    expect(weekStartDay(receipts)).toBe(4);
    expect(defaultPeriod('WEEKLY', '2026-10-28', 4)).toEqual({ from: '2026-10-22', to: '2026-10-28' });
    const periods = magazinePeriods(card({ frequency: 'WEEKLY', subscriptionStart: '2026-01-01', subscriptionEnd: '2026-12-31', receipts }), '2026-10-28');
    expect(periods[0].from).toBe('2026-01-01');
    expect(periods.filter(p => p.state === 'received').map(p => p.from)).toEqual(['2026-10-01', '2026-10-08']);
  });

  it('fortnightsSplitEachMonthAtTheFifteenth', () => {
    expect(defaultPeriod('FORTNIGHTLY', '2026-02-20')).toEqual({ from: '2026-02-16', to: '2026-02-28' });
    expect(defaultPeriod('FORTNIGHTLY', '2026-02-03')).toEqual({ from: '2026-02-01', to: '2026-02-15' });
  });

  it('withoutSubscriptionDatesUsesThisCalendarYear', () => {
    expect(subscriptionWindow({ subscriptionStart: null, subscriptionEnd: null }, '2026-10-28'))
      .toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(subscriptionWindow({ subscriptionStart: '2026-04-01', subscriptionEnd: null }))
      .toEqual({ from: '2026-04-01', to: '2027-03-31' });
  });

  it('labelsAPublishedDayOrTheWeekCovered', () => {
    expect(receiptLabel({ periodFrom: '2026-10-05', periodTo: '2026-10-05' })).toBe('5 Oct 2026');
    expect(receiptLabel({ periodFrom: '2026-10-26', periodTo: '2026-11-01' })).toBe('26 Oct – 1 Nov 2026');
    expect(receiptLabel({ periodFrom: '2026-12-28', periodTo: '2027-01-03' })).toBe('28 Dec 2026 – 3 Jan 2027');
  });

  it('aMonthlyIssueSavedForWholeMonthsShowsItsPublishedDayAndMonths', () => {
    expect(receiptLabel({ receivedOn: '2026-11-05', periodFrom: '2026-10-01', periodTo: '2026-12-31' })).toBe('5 Nov 2026 · Oct–Dec');
    expect(receiptLabel({ receivedOn: '2026-11-05', periodFrom: '2026-11-01', periodTo: '2026-11-30' })).toBe('5 Nov 2026 · Nov');
    const periods = magazinePeriods(card({ receipts: [{ id: 1, receivedOn: '2026-11-05', periodFrom: '2026-10-01', periodTo: '2026-12-31' }] }), '2026-11-10');
    expect(periods.filter(p => p.state === 'received').map(p => p.from)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01']);
  });

  it('theAnkIsANumberOrTextKeptAsWritten', () => {
    expect(parseIssue('12')).toEqual({ issueNo: 12, issueLabel: null });
    expect(parseIssue(13)).toEqual({ issueNo: 13, issueLabel: null });
    expect(parseIssue(' जोडअंक ')).toEqual({ issueNo: null, issueLabel: 'जोडअंक' });
    expect(parseIssue('0')).toEqual({ issueNo: null, issueLabel: '0' });
    expect(parseIssue('')).toEqual({ issueNo: null, issueLabel: null });
    expect(issueName({ issueNo: 12 })).toBe('अंक 12');
    expect(issueName({ issueLabel: 'जोडअंक' })).toBe('जोडअंक');
    expect(issueName({ issueNo: null, issueLabel: null })).toBe('');
    // A fortnightly जोड अंक over a whole month reads as dates, not as a monthly's "published · months".
    expect(receiptLabel({ receivedOn: '2026-10-01', periodFrom: '2026-10-01', periodTo: '2026-10-31' }, 'FORTNIGHTLY')).toBe('1 Oct – 31 Oct 2026');
  });

  it('aCombinedMonthlyIssueCoversItsMonthAndThePastOnes', () => {
    const jod = { id: 1, issueNo: 45, receivedOn: '2026-11-05', periodFrom: '2026-10-01', periodTo: '2026-11-05' };
    expect(receiptLabel(jod)).toBe('5 Nov 2026 · Oct–Nov');
    const periods = magazinePeriods(card({ receipts: [jod] }), '2026-12-10');
    expect(periods.find(p => p.from === '2026-09-01')?.state).not.toBe('received');
    expect(periods.find(p => p.from === '2026-10-01')?.state).toBe('received');
    expect(periods.find(p => p.from === '2026-11-01')?.state).toBe('received');
    expect(periods.find(p => p.from === '2026-12-01')?.state).not.toBe('received');
  });

  it('aMonthlyIssueFillsTheMonthItWasPublishedIn', () => {
    const periods = magazinePeriods(card({ receipts: [{ id: 1, issueNo: 7, receivedOn: '2026-09-05', periodFrom: '2026-09-05', periodTo: '2026-09-05' }] }), '2026-10-28');
    expect(periods.find(p => p.from === '2026-09-01')?.state).toBe('received');
    expect(periods.find(p => p.from === '2026-08-01')?.state).toBe('missing');
  });
});
