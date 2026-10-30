import { localIsoDate } from './dates';
import { MagazineCard, MagazineReceipt, PeriodicalFrequency } from './models';

/** One month, fortnight or week of a magazine's subscription year, and whether its issue came. */
export interface MagazinePeriod {
  from: string;
  to: string;
  /** "Oct", "Oct 1–15" or "6 Oct". */
  label: string;
  /** received: an issue covers it. missing: its time has passed with no issue. upcoming: not due yet. */
  state: 'received' | 'missing' | 'upcoming';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** The subscription year, or this calendar year when the master has no dates yet. */
export function subscriptionWindow(card: Pick<MagazineCard, 'subscriptionStart' | 'subscriptionEnd'>, today = localIsoDate()) {
  if (card.subscriptionStart) {
    const start = parse(card.subscriptionStart);
    // No end given: one year, as the server stores it.
    const to = card.subscriptionEnd ?? localIsoDate(new Date(start.getFullYear() + 1, start.getMonth(), start.getDate() - 1));
    return { from: card.subscriptionStart, to };
  }
  const year = today.slice(0, 4);
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/** The weekday (0 = Sunday) a weekly magazine's weeks start on: that of its first recorded issue, else Monday. */
export function weekStartDay(receipts: Pick<MagazineReceipt, 'periodFrom'>[]): number {
  const first = receipts.map(r => r.periodFrom).sort()[0];
  return first ? parse(first).getDay() : 1;
}

/** The period one issue usually covers: the 7-day week (from startDay, Monday by default), the half month, or the month around a date. */
export function defaultPeriod(frequency: PeriodicalFrequency, date: string, startDay = 1): { from: string; to: string } {
  const d = parse(date);
  if (frequency === 'WEEKLY') {
    const start = addDays(d, -((d.getDay() - startDay + 7) % 7));
    return { from: localIsoDate(start), to: localIsoDate(addDays(start, 6)) };
  }
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  if (frequency === 'FORTNIGHTLY') {
    return d.getDate() <= 15
      ? { from: localIsoDate(new Date(d.getFullYear(), d.getMonth(), 1)), to: localIsoDate(new Date(d.getFullYear(), d.getMonth(), 15)) }
      : { from: localIsoDate(new Date(d.getFullYear(), d.getMonth(), 16)), to: localIsoDate(monthEnd) };
  }
  return { from: localIsoDate(new Date(d.getFullYear(), d.getMonth(), 1)), to: localIsoDate(monthEnd) };
}

/** Every period of the subscription year, oldest first, each marked received, missing or upcoming. */
export function magazinePeriods(card: MagazineCard, today = localIsoDate()): MagazinePeriod[] {
  const window = subscriptionWindow(card, today);
  const end = window.to;
  const periods: { from: string; to: string; label: string }[] = [];
  // Weeks line up with the first issue's dates, so one issue fills exactly one cell.
  const startDay = weekStartDay(card.receipts);
  let cursor = defaultPeriod(card.frequency, window.from, startDay);
  while (cursor.from <= end) {
    const from = parse(cursor.from);
    const label = card.frequency === 'WEEKLY'
      ? `${from.getDate()} ${MONTHS[from.getMonth()]}`
      : card.frequency === 'FORTNIGHTLY'
        ? `${MONTHS[from.getMonth()]} ${from.getDate()}–${parse(cursor.to).getDate()}`
        : MONTHS[from.getMonth()];
    periods.push({ ...cursor, label });
    cursor = defaultPeriod(card.frequency, localIsoDate(addDays(parse(cursor.to), 1)), startDay);
  }
  return periods.map(p => ({
    ...p,
    state: covered(p, card.receipts) ? 'received' : p.to < today ? 'missing' : 'upcoming',
  }));
}

function covered(period: { from: string; to: string }, receipts: MagazineReceipt[]): boolean {
  return receipts.some(r => r.periodFrom <= period.to && r.periodTo >= period.from);
}

/** "5 Oct 2026" for a monthly issue's published day, or "26 Oct – 1 Nov 2026" for the week a weekly one covers. */
export function receiptLabel(r: Pick<MagazineReceipt, 'periodFrom' | 'periodTo'>): string {
  const from = parse(r.periodFrom);
  const to = parse(r.periodTo);
  const day = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  // A monthly's combined issue: published on a day, covering to the end of a later month ("5 Oct 2026 · Oct–Nov").
  const toMonthEnd = addDays(to, 1).getDate() === 1;
  if (toMonthEnd && (to.getFullYear() * 12 + to.getMonth()) > (from.getFullYear() * 12 + from.getMonth()) && from.getDate() !== 1) {
    return `${day(from)} ${from.getFullYear()} · ${MONTHS[from.getMonth()]}–${MONTHS[to.getMonth()]}`;
  }
  return r.periodFrom === r.periodTo
    ? `${day(from)} ${from.getFullYear()}`
    : `${day(from)}${from.getFullYear() === to.getFullYear() ? '' : ' ' + from.getFullYear()} – ${day(to)} ${to.getFullYear()}`;
}

/** The last day of the month `months - 1` after a date's month: monthsEnd('2026-10-05', 2) = '2026-11-30'. */
export function monthsEnd(date: string, months: number): string {
  const d = parse(date);
  return localIsoDate(new Date(d.getFullYear(), d.getMonth() + months, 0));
}
