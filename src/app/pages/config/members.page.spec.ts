import { StudentSummary, UserAccount } from '../../core/models';
import { members } from './members.page';

describe('members', () => {
  const student = (id: number, fullName: string) => ({ id, fullName, username: fullName.toLowerCase(), role: 'STUDENT', active: true }) as UserAccount;

  it('listsEveryStudentAToZWithZerosForThoseWithoutBooks', () => {
    const summaries: StudentSummary[] = [{ studentId: 2, studentName: 'Asha', total: 5, returned: 3, issued: 2, overdue: 1 }];
    const list = members([student(1, 'Ravi'), student(2, 'Asha')], summaries);
    expect(list.map(m => m.account.fullName)).toEqual(['Asha', 'Ravi']);
    expect(list[0].summary.total).toBe(5);
    expect(list[1].summary).toEqual({ studentId: 1, studentName: 'Ravi', total: 0, returned: 0, issued: 0, overdue: 0 });
  });
});
