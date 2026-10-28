import { BookIssue } from './models';
import { bookMoves, moveDays } from './book-moves';

const issue = (id: number, issueDate: string, returnDate?: string): BookIssue => ({
  id, bookId: 1, bookTitle: 'Yayati', author: 'Khandekar', studentId: 2, studentName: 'Asha', issuedByName: 'Admin',
  issueDate, dueDate: issueDate, returnDate, status: returnDate ? 'RETURNED' : 'ISSUED',
});

describe('book moves', () => {
  it('givesAMoveForEachIssueAndReturnInsideTheMonth', () => {
    const moves = bookMoves([issue(1, '2026-09-28', '2026-10-05'), issue(2, '2026-10-05'), issue(3, '2026-10-02', '2026-10-09')], '2026-10');
    expect(moves.map(m => `${m.date} ${m.kind} ${m.issue.id}`)).toEqual([
      '2026-10-02 out 3', '2026-10-05 out 2', '2026-10-05 back 1', '2026-10-09 back 3',
    ]);
  });

  it('marksDaysWithMovesActiveAndTodayOnUpcoming', () => {
    const days = moveDays(bookMoves([issue(1, '2026-10-02', '2026-10-02')], '2026-10'), '2026-10', '2026-10-03');
    expect(days.length).toBe(31);
    expect(days[1]).toEqual({ day: 2, count: 2, state: 'active' });
    expect(days[0].state).toBe('quiet');
    expect(days[2].state).toBe('upcoming');
  });
});
