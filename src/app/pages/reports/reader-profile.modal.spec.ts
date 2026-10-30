import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Book, BookIssue, UserAccount } from '../../core/models';
import { PermissionsStore } from '../../core/permissions.store';
import { UiService } from '../../core/ui.service';
import { ReaderProfileModal, favouriteCategory } from './reader-profile.modal';

describe('ReaderProfileModal filters', () => {
  it('countsTheYearButOverdueAcrossAllYearsAndFiltersByCard', () => {
    const issue = (id: number, issueDate: string, status: BookIssue['status']) => ({ id, issueDate, status }) as BookIssue;
    const books = [
      issue(1, '2026-03-01', 'ISSUED'), issue(2, '2026-02-01', 'RETURNED'),
      issue(3, '2025-11-01', 'OVERDUE'), issue(4, '2025-05-01', 'RETURNED'),
    ];
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { studentIssues: vi.fn(() => of(books)) } },
        { provide: ModalController, useValue: { dismiss: vi.fn() } },
        { provide: UiService, useValue: { toast: vi.fn(), error: vi.fn() } },
        { provide: PermissionsStore, useValue: { can: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(ReaderProfileModal);
    fixture.componentRef.setInput('reader', { studentId: 3, studentName: 'Asha', books: 4 });
    fixture.componentRef.setInput('year', 2026);
    fixture.detectChanges();
    const p = fixture.componentInstance;

    expect(p.count()).toEqual({ all: 2, issued: 1, overdue: 1, returned: 1 });
    expect(p.listed().map(b => b.id)).toEqual([1, 2]);
    p.swipeTo('OVERDUE');
    expect(p.listed().map(b => b.id)).toEqual([3]);
    p.swipeTo('RETURNED');
    expect(p.listed().map(b => b.id)).toEqual([2]);
    p.setYear(2025);
    expect(p.listed().map(b => b.id)).toEqual([4]);
    p.swipeTo('ALL');
    expect(p.listed().map(b => b.id)).toEqual([3, 4]);
  });
});

describe('ReaderProfileModal from सभासद', () => {
  const asha = { id: 3, fullName: 'Asha Patil', username: 'asha', role: 'STUDENT', active: true } as UserAccount;
  const book = { id: 7, title: 'Wings of Fire', author: 'Kalam', availableCopies: 1 } as Book;

  it('issuesTheFoundBookToThisStudentAndReloadsAllYears', async () => {
    const issueBook = vi.fn(() => of({ id: 1 } as BookIssue));
    const studentIssues = vi.fn(() => of([] as BookIssue[]));
    // The finder hands back the book, then the Issue screen hands back Asha for 14 days.
    const answers = [{ role: 'pick', data: book }, { role: 'issue', data: { student: asha, days: 14 } }];
    const create = vi.fn(async () => ({ present: vi.fn(), onWillDismiss: async () => answers.shift() }));
    const dismiss = vi.fn();
    const toast = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { issueBook, studentIssues } },
        { provide: ModalController, useValue: { create, dismiss } },
        { provide: UiService, useValue: { toast, error: vi.fn() } },
        { provide: PermissionsStore, useValue: { can: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(ReaderProfileModal);
    fixture.componentRef.setInput('reader', { studentId: 3, studentName: 'Asha Patil', books: 0 });
    fixture.componentRef.setInput('account', asha);
    fixture.detectChanges();

    await fixture.componentInstance.issueBook();
    expect(studentIssues).toHaveBeenCalledWith(3);
    expect((create.mock.calls[1] as unknown[])[0]).toMatchObject({ componentProps: { book, student: asha } });
    expect(issueBook).toHaveBeenCalledWith(7, 3, 14);
    expect(toast).toHaveBeenCalledWith('Issued to Asha Patil.');
    expect(studentIssues).toHaveBeenCalledTimes(2);
    // Closing tells सभासद to reload its counts.
    fixture.componentInstance.close();
    expect(dismiss).toHaveBeenCalledWith(null, 'changed');
  });
});

describe('favouriteCategory', () => {
  it('picksTheCategoryReadMostAndIgnoresBlanks', () => {
    expect(favouriteCategory([{ category: 'कथा' }, { category: ' ' }, { category: 'कादंबरी' }, { category: 'कथा' }])).toBe('कथा');
    expect(favouriteCategory([{ category: undefined }])).toBeNull();
  });
});
