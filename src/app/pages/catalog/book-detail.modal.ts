import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  ellipsisVertical, informationCircleOutline, pencilOutline, timeOutline, trashOutline
} from 'ionicons/icons';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CategoriesStore } from '../../core/categories.store';
import { Book, BookIssue } from '../../core/models';
import { DueTextPipe, MarathiPipe, ShortDatePipe, StatusColorPipe, StatusLabelPipe } from '../../core/pipes';
import { UiService, errorMessage } from '../../core/ui.service';
import { BookFormModel, KEEP_TEXT_CATEGORY, bookFormFrom, toBookRequest, unlinkedCategory } from './book-request';
import { PermissionsStore } from '../../core/permissions.store';
import { IssueBookModal, IssueChoice } from './issue-book.modal';

/** What the book card shows below the title (Figma: Details / Issue history / Edit expanded). */
type Section = 'none' | 'details' | 'history' | 'edit';

/**
 * Book details: one card with a "more options" menu. Details, issue history and the edit form
 * open inside the card; the menu and the delete confirmation float over it.
 */
@Component({
  selector: 'app-book-detail',
  templateUrl: 'book-detail.modal.html',
  styleUrls: ['book-detail.modal.scss'],
  imports: [
    FormsModule, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonBadge, IonIcon, IonSpinner,
    DueTextPipe, MarathiPipe, ShortDatePipe, StatusColorPipe, StatusLabelPipe
  ],
})
export class BookDetailModal implements OnInit {
  @Input({ required: true }) book!: Book;
  /** Told about every change right away, so the list is current however the popup closes (the phone's back button skips close()). */
  @Input() onChange?: (book: Book) => void;
  /** The student already has an open request for this book: show it as requested, with no call to make. */
  @Input() alreadyRequested = false;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);
  protected auth = inject(AuthService);
  /** What this role may do (Roles & permissions). */
  protected perms = inject(PermissionsStore);
  protected categories = inject(CategoriesStore);

  readonly current = signal<Book | null>(null);
  readonly history = signal<BookIssue[] | null>(null);
  readonly busy = signal(false);
  /** The student has asked for this book (this visit, or found already asked). */
  readonly requested = signal(false);
  readonly section = signal<Section>('none');
  readonly menuOpen = signal(false);
  readonly confirmingDelete = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  form: BookFormModel = bookFormFrom();
  /** Old text category of this book that is not in the master; kept selectable while editing. */
  oldCategory = '';
  protected readonly keepText = KEEP_TEXT_CATEGORY;
  private changed = false;

  /** Students who currently have this book; named in the delete warning. */
  readonly borrowers = computed(() =>
    (this.history() ?? []).filter(i => i.status !== 'RETURNED').map(i => i.studentName)
  );

  constructor() {
    addIcons({ ellipsisVertical, pencilOutline, trashOutline, informationCircleOutline, timeOutline });
  }

  ngOnInit() {
    this.current.set(this.book);
    this.requested.set(this.alreadyRequested);
    if (this.auth.isStaff()) {
      this.loadHistory();
    }
  }

  close() {
    const book = this.current();
    this.modals.dismiss(this.changed ? book : null, this.changed ? 'changed' : 'cancel');
  }

  toggleMenu() {
    this.menuOpen.set(!this.menuOpen());
    this.confirmingDelete.set(false);
  }

  /** A menu choice opens that section in the card; choosing it again closes it. */
  show(section: Exclude<Section, 'none'>) {
    this.menuOpen.set(false);
    if (section === 'edit') {
      this.form = bookFormFrom(this.current()!);
      this.oldCategory = unlinkedCategory(this.current()!);
      this.categories.load(true);
      this.formError.set('');
    }
    this.section.set(this.section() === section ? 'none' : section);
  }

  askDelete() {
    this.menuOpen.set(false);
    this.confirmingDelete.set(true);
  }

  cancelEdit() {
    this.section.set('none');
  }

  saveEdit() {
    const result = toBookRequest(this.form);
    if ('error' in result) {
      this.formError.set(result.error);
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    this.api.saveBook(result.request, this.current()!.id).subscribe({
      next: saved => {
        this.saving.set(false);
        this.setBook(saved);
        this.section.set('none');
        this.ui.toast('Book updated.');
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(errorMessage(err, 'Could not save the book.'));
      }
    });
  }

  async issue() {
    const modal = await this.modals.create({ component: IssueBookModal, componentProps: { book: this.current() } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<IssueChoice>();
    if (role !== 'issue' || !data) {
      return;
    }
    // Show the copy as gone at once; if the server refuses, put the book back as it was.
    const before = this.current()!;
    this.setBook({ ...before, availableCopies: 0 });
    this.api.issueBook(before.id, data.student.id, data.days).subscribe({
      next: () => {
        this.ui.toast(`Issued to ${data.student.fullName}.`);
        this.reloadBook();
        this.loadHistory();
      },
      error: err => {
        this.setBook(before);
        this.ui.error(err, 'Could not issue the book.');
      }
    });
  }

  /** A student asks the library for this book; staff see it on their Dashboard. */
  request() {
    this.busy.set(true);
    this.api.requestBook(this.current()!.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.requested.set(true);
        this.ui.toast('Request sent to the librarian.');
        // The Catalog then shows it under My books › Requests.
        this.modals.dismiss(null, 'requested');
      },
      error: err => {
        this.busy.set(false);
        if (err instanceof HttpErrorResponse && err.status === 409) {
          this.requested.set(true);
          this.ui.toast('You have already requested this book.');
          return;
        }
        this.ui.error(err, 'Could not send the request.');
      }
    });
  }

  /** Shows a new state of the book here and in the Catalog row behind. */
  private setBook(book: Book) {
    this.current.set(book);
    this.changed = true;
    this.onChange?.(book);
  }

  remove() {
    const book = this.current()!;
    this.busy.set(true);
    this.api.deleteBook(book.id).subscribe({
      next: () => {
        this.ui.toast('Book deleted.');
        this.modals.dismiss(null, 'deleted');
      },
      error: err => {
        this.busy.set(false);
        this.ui.error(err, 'Could not delete the book.');
      }
    });
  }

  private reloadBook() {
    this.api.book(this.current()!.id).subscribe({
      next: book => this.setBook(book),
      // The issue itself went through; only the copy count shown here is out of date.
      error: err => this.ui.error(err, 'Book issued, but the copy count could not be refreshed.')
    });
  }

  private loadHistory() {
    this.api.bookIssues(this.book.id).subscribe({
      next: issues => this.history.set(issues),
      error: () => this.history.set([])
    });
  }
}
