import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CategoriesStore } from '../../core/categories.store';
import { Book, BookIssue, UserAccount } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { BookDetailModal } from './book-detail.modal';

describe('BookDetailModal', () => {
  const book = { id: 7, title: 'Wings of Fire', author: 'Kalam', totalCopies: 1, availableCopies: 1 } as Book;
  const afterIssue = { ...book, availableCopies: 0 };
  const asha = { id: 3, fullName: 'Asha Patil' } as UserAccount;

  /** Opens Issue book (which hands back Asha for 14 days) against the given server answers. */
  async function issueWith(issued: Observable<BookIssue>, serverBook: Observable<Book> = NEVER) {
    const onChange = vi.fn();
    const ui = { toast: vi.fn(), error: vi.fn() };
    const issueBook = vi.fn(() => issued);
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { issueBook, book: vi.fn(() => serverBook), bookIssues: vi.fn(() => of([])) } },
        { provide: ModalController, useValue: {
          create: vi.fn(async () => ({ present: vi.fn(), onWillDismiss: async () => ({ role: 'issue', data: { student: asha, days: 14 } }) })),
          dismiss: vi.fn(),
        } },
        { provide: UiService, useValue: ui },
        { provide: AuthService, useValue: { isStaff: () => false, isAdmin: () => false } },
        { provide: CategoriesStore, useValue: { load: vi.fn(), items: () => [] } },
      ],
    });
    const fixture = TestBed.createComponent(BookDetailModal);
    fixture.componentRef.setInput('book', book);
    fixture.componentRef.setInput('onChange', onChange);
    fixture.detectChanges();
    await fixture.componentInstance.issue();
    return { fixture, onChange, ui, issueBook };
  }

  it('showsOneCopyFewerBeforeTheServerAnswers', async () => {
    const { fixture, onChange, issueBook } = await issueWith(NEVER);
    expect(issueBook).toHaveBeenCalledWith(7, 3, 14);
    expect(fixture.componentInstance.current()?.availableCopies).toBe(0);
    // The Catalog row is told at once too, however the popup is closed later.
    expect(onChange).toHaveBeenCalledWith(afterIssue);
  });

  it('confirmsWithATickAndTheServersCount', async () => {
    const fromServer = { ...afterIssue, title: 'Wings of Fire (2nd ed.)' };
    const { fixture, ui } = await issueWith(of({ id: 1 } as BookIssue), of(fromServer));
    expect(ui.toast).toHaveBeenCalledWith('Issued to Asha Patil.');
    expect(fixture.componentInstance.current()).toEqual(fromServer);
  });

  it('putsTheBookBackWhenTheServerRefuses', async () => {
    const { fixture, onChange, ui } = await issueWith(throwError(() => new Error('Student already has 3 books')));
    expect(fixture.componentInstance.current()).toEqual(book);
    expect(onChange).toHaveBeenLastCalledWith(book);
    expect(ui.error).toHaveBeenCalled();
    expect(ui.toast).not.toHaveBeenCalled();
  });
});
