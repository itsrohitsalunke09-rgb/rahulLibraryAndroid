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

/** One student's month: the books they had (given or returned in the month) and the moves. */
export interface Reader {
  studentId: number;
  studentName: string;
  /** Each book once, newest move first. */
  books: { issue: BookIssue; moves: BookMove[] }[];
  given: number;
  returned: number;
}

/** Students who had books in the month, the busiest first (then by name). */
export function readers(moves: BookMove[]): Reader[] {
  const byStudent = new Map<number, Reader>();
  for (const move of moves) {
    const { studentId, studentName } = move.issue;
    const reader = byStudent.get(studentId)
      ?? byStudent.set(studentId, { studentId, studentName, books: [], given: 0, returned: 0 }).get(studentId)!;
    const book = reader.books.find(b => b.issue.id === move.issue.id)
      ?? (reader.books.push({ issue: move.issue, moves: [] }), reader.books[reader.books.length - 1]);
    book.moves.push(move);
    if (move.kind === 'out') {
      reader.given++;
    } else {
      reader.returned++;
    }
  }
  const latest = (b: Reader['books'][number]) => b.moves[b.moves.length - 1].date;
  return [...byStudent.values()]
    .map(r => ({ ...r, books: [...r.books].sort((a, b) => latest(b).localeCompare(latest(a))) }))
    .sort((a, b) => b.books.length - a.books.length || a.studentName.localeCompare(b.studentName));
}

/** Grid cells a student's circle spans (1 to 3, square), by books against the busiest reader. */
export function bubbleSpan(books: number, most: number): 1 | 2 | 3 {
  const share = books / Math.max(most, 1);
  return share > 0.66 ? 3 : share > 0.33 ? 2 : 1;
}

/**
 * The circles in a mixed order, so big and small ones share rows and fill the width. The order comes
 * from each student's id, so it stays the same between visits instead of jumping around.
 */
export function mixed<T extends { studentId: number }>(items: T[]): T[] {
  const key = (id: number) => Math.imul(id ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return [...items].sort((a, b) => key(a.studentId) - key(b.studentId));
}
