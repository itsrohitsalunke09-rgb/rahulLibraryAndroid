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
export function receiptLabel(r: Pick<MagazineReceipt, 'periodFrom' | 'periodTo'> & Partial<Pick<MagazineReceipt, 'receivedOn'>>,
                             frequency: PeriodicalFrequency = 'MONTHLY'): string {
  const from = parse(r.periodFrom);
  const to = parse(r.periodTo);
  const day = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (frequency !== 'MONTHLY') {
    return range(from, to);
  }
  // A monthly issue saved for whole months (the 1st of one to the end of another): published day and its months.
  if (from.getDate() === 1 && addDays(to, 1).getDate() === 1) {
    const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
    const shown = r.receivedOn ? parse(r.receivedOn) : to;
    return `${day(shown)} ${shown.getFullYear()} · ${MONTHS[from.getMonth()]}${sameMonth ? '' : '–' + MONTHS[to.getMonth()]}`;
  }
  // A monthly's older combined issue: from the 1st of an earlier month to its published day ("5 Nov 2026 · Oct–Nov").
  if (from.getDate() === 1 && (to.getFullYear() * 12 + to.getMonth()) > (from.getFullYear() * 12 + from.getMonth())) {
    return `${day(to)} ${to.getFullYear()} · ${MONTHS[from.getMonth()]}–${MONTHS[to.getMonth()]}`;
  }
  return range(from, to);
}

/** "5 Oct 2026", or "26 Oct – 1 Nov 2026". */
function range(from: Date, to: Date): string {
  const day = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return from.getTime() === to.getTime()
    ? `${day(from)} ${from.getFullYear()}`
    : `${day(from)}${from.getFullYear() === to.getFullYear() ? '' : ' ' + from.getFullYear()} – ${day(to)} ${to.getFullYear()}`;
}

/** A combined issue (जोड अंक): one that covers more than one month, fortnight or week. */
export function isCombined(frequency: PeriodicalFrequency, r: Pick<MagazineReceipt, 'periodFrom' | 'periodTo'>): boolean {
  const from = parse(r.periodFrom);
  const to = parse(r.periodTo);
  if (frequency === 'MONTHLY') {
    return from.getFullYear() !== to.getFullYear() || from.getMonth() !== to.getMonth();
  }
  // By length (over 7 days a week, over 16 a fortnight), so a range not lined up with the cells isn't miscounted.
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return days > (frequency === 'WEEKLY' ? 7 : 16);
}

/** "अंक 12", or "जोड अंक 12" for a combined issue; without a number, "जोड अंक" or nothing. */
export function issueName(frequency: PeriodicalFrequency, r: Pick<MagazineReceipt, 'issueNo' | 'periodFrom' | 'periodTo'>): string {
  const word = isCombined(frequency, r) ? 'जोड अंक' : 'अंक';
  return r.issueNo ? `${word} ${r.issueNo}` : word === 'जोड अंक' ? word : '';
}

