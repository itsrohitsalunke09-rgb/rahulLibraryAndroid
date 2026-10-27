import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CategoriesStore } from '../../core/categories.store';
import { Book } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { BookDetailModal } from './book-detail.modal';

describe('BookDetailModal', () => {
  const book = { id: 7, title: 'Wings of Fire', author: 'Kalam', totalCopies: 1, availableCopies: 1 } as Book;
  const afterIssue = { ...book, availableCopies: 0 };

  it('tellsTheCatalogAboutTheIssuedBookStraightAway', async () => {
    const onChange = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { book: vi.fn(() => of(afterIssue)), bookIssues: vi.fn(() => of([])) } },
        // The issue popup reports a successful issue.
        { provide: ModalController, useValue: {
          create: vi.fn(async () => ({ present: vi.fn(), onWillDismiss: async () => ({ role: 'issued' }) })),
          dismiss: vi.fn(),
        } },
        { provide: UiService, useValue: { toast: vi.fn(), error: vi.fn() } },
        { provide: AuthService, useValue: { isStaff: () => false, isAdmin: () => false } },
        { provide: CategoriesStore, useValue: { load: vi.fn(), items: () => [] } },
      ],
    });
    const fixture = TestBed.createComponent(BookDetailModal);
    fixture.componentRef.setInput('book', book);
    fixture.componentRef.setInput('onChange', onChange);
    fixture.detectChanges();

    await fixture.componentInstance.issue();

    // Without waiting for the popup to close, which the phone's back button would skip.
    expect(onChange).toHaveBeenCalledWith(afterIssue);
  });
});
