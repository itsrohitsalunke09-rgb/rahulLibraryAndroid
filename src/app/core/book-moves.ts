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

/** Circle size (px) for a student with this many books: the busiest gets the biggest; area grows with the count. */
export function bubbleSize(books: number, most: number, min = 56, max = 120): number {
  return Math.round(min + (max - min) * Math.sqrt(books / Math.max(most, 1)));
}
