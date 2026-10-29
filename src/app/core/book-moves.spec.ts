import { BookIssue } from './models';
import { bookMoves, readers } from './book-moves';

const issue = (id: number, issueDate: string, returnDate?: string, studentId = 2, studentName = 'Asha'): BookIssue => ({
  id, bookId: id, bookTitle: 'Book ' + id, author: 'A', studentId, studentName, issuedByName: 'Admin',
  issueDate, dueDate: issueDate, returnDate, status: returnDate ? 'RETURNED' : 'ISSUED',
});

describe('book moves', () => {
  it('givesAMoveForEachIssueAndReturnInsideTheMonth', () => {
    const moves = bookMoves([issue(1, '2026-09-28', '2026-10-05'), issue(2, '2026-10-05'), issue(3, '2026-10-02', '2026-10-09')], '2026-10');
    expect(moves.map(m => `${m.date} ${m.kind} ${m.issue.id}`)).toEqual([
      '2026-10-02 out 3', '2026-10-05 out 2', '2026-10-05 back 1', '2026-10-09 back 3',
    ]);
  });

  it('groupsBooksByStudentBusiestFirstCountingEachBookOnce', () => {
    const moves = bookMoves([
      issue(1, '2026-10-02', '2026-10-09', 7, 'Kunal'), issue(2, '2026-10-05', undefined, 7, 'Kunal'),
      issue(3, '2026-10-06', undefined, 8, 'Aarav'),
    ], '2026-10');
    const list = readers(moves);
    expect(list.map(r => `${r.studentName} ${r.books.length} ${r.given}/${r.returned}`)).toEqual(['Kunal 2 2/1', 'Aarav 1 1/0']);
    // Kunal's newest move first: book 1 came back on the 9th.
    expect(list[0].books.map(b => b.issue.id)).toEqual([1, 2]);
  });


});
