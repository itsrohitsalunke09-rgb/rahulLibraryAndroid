import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBadge, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar, ModalController
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
import { IssueBookModal } from './issue-book.modal';

/** What the book card shows below the description (Figma: Details / Issue history / Edit expanded). */
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
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonBadge, IonIcon, IonSpinner,
    DueTextPipe, MarathiPipe, ShortDatePipe, StatusColorPipe, StatusLabelPipe
  ],
})
export class BookDetailModal implements OnInit {
  @Input({ required: true }) book!: Book;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);
  protected auth = inject(AuthService);
  protected categories = inject(CategoriesStore);

  readonly current = signal<Book | null>(null);
  readonly history = signal<BookIssue[] | null>(null);
  readonly busy = signal(false);
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
        this.current.set(saved);
        this.changed = true;
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
    const { role } = await modal.onWillDismiss();
    if (role === 'issued') {
      this.reloadBook();
      this.loadHistory();
    }
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
      next: book => {
        this.current.set(book);
        this.changed = true;
      },
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
