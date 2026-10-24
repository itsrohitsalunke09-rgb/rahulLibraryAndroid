import { BookIssue } from './models';

const DAY = 24 * 60 * 60 * 1000;

/** A date as YYYY-MM-DD in the device's time zone (toISOString would give the UTC day). */
export function localIsoDate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whole days from today until an ISO date (negative when in the past). */
export function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / DAY);
}

/** Short human text for an issue's due state, e.g. "Due in 3 days" / "Overdue by 2 days". */
export function dueText(issue: BookIssue): string {
  if (issue.status === 'RETURNED') {
    return issue.returnDate ? `Returned ${formatDate(issue.returnDate)}` : 'Returned';
  }
  const days = daysUntil(issue.dueDate);
  if (days < 0) {
    return `Overdue by ${-days} day${days === -1 ? '' : 's'}`;
  }
  if (days === 0) {
    return 'Due today';
  }
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
}

export function statusColor(issue: BookIssue): 'success' | 'warning' | 'danger' {
  if (issue.status === 'RETURNED') {
    return 'success';
  }
  return issue.status === 'OVERDUE' ? 'danger' : 'warning';
}

/** Word printed on an issue's status stamp. */
export function statusLabel(issue: BookIssue): string {
  if (issue.status === 'RETURNED') {
    return 'Returned';
  }
  return issue.status === 'OVERDUE' ? 'Overdue' : 'Out';
}

export function formatDate(isoDate?: string): string {
  if (!isoDate) {
    return '-';
  }
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}
