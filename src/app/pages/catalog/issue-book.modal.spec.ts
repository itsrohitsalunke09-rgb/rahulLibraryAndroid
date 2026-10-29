import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Book, UserAccount } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { IssueBookModal } from './issue-book.modal';

describe('IssueBookModal', () => {
  const book = { id: 7, title: 'Wings of Fire', author: 'A. P. J. Abdul Kalam', availableCopies: 1 } as Book;
  const asha = { id: 3, username: 'asha', fullName: 'Asha Patil', role: 'STUDENT', active: true } as UserAccount;
  let issueBook: ReturnType<typeof vi.fn>;
  let dismiss: ReturnType<typeof vi.fn>;

  function render(student?: UserAccount) {
    issueBook = vi.fn(() => of({ id: 1 }));
    dismiss = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { issueBook, searchStudents: vi.fn(() => of([asha])) } },
        { provide: ModalController, useValue: { dismiss } },
        { provide: UiService, useValue: { toast: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(IssueBookModal);
    fixture.componentInstance.book = book;
    fixture.componentInstance.student = student;
    fixture.detectChanges();
    return fixture;
  }

  it('cannotIssueUntilAStudentIsChosen', () => {
    const fixture = render();
    const button = fixture.nativeElement.querySelector('button.primary') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Choose a student');
  });

  it('startsWithTheRequestingStudentChosen', () => {
    const fixture = render(asha);
    const button = fixture.nativeElement.querySelector('button.primary') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('Issue to Asha Patil');
  });

  it('handsBackTheChosenStudentAndPeriodAtOnce', () => {
    const fixture = render();
    fixture.componentInstance.choose(asha);
    fixture.componentInstance.days.set(21);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button.primary') as HTMLButtonElement;
    expect(button.textContent).toContain('Issue to Asha Patil');
    expect(fixture.nativeElement.querySelector('.period.on')?.textContent).toContain('21 days');
    button.click();
    // Closes at once with the choice; Book details sends it to the server.
    expect(dismiss).toHaveBeenCalledWith({ student: asha, days: 21 }, 'issue');
    expect(issueBook).not.toHaveBeenCalled();
  });
});
