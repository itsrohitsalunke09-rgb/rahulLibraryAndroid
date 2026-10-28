import { BookIssue } from './models';

/** One book going out (issued) or coming back (returned) on a day. */
export interface BookMove {
  date: string;
  kind: 'out' | 'back';
  issue: BookIssue;
}

/** The month's moves, oldest first: each issue gives one when issued and one when returned in the month. */
export function bookMoves(issues: BookIssue[], month: string): BookMove[] {
  const moves: BookMove[] = [];
  for (const issue of issues) {
    if (issue.issueDate.startsWith(month)) {
      moves.push({ date: issue.issueDate, kind: 'out', issue });
    }
    if (issue.returnDate?.startsWith(month)) {
      moves.push({ date: issue.returnDate, kind: 'back', issue });
    }
  }
  return moves.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === 'out' ? -1 : 1));
}

/** Day cells for the month: active when a book went out or came back, upcoming from today on, else quiet. */
export function moveDays(moves: BookMove[], month: string, today: string): { day: number; count: number; state: 'active' | 'quiet' | 'upcoming' }[] {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    const count = moves.filter(mv => mv.date === date).length;
    return { day: i + 1, count, state: count ? 'active' : date >= today ? 'upcoming' : 'quiet' };
  });
}
