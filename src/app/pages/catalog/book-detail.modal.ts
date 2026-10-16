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
import { dueText, formatDate, statusColor, statusLabel } from '../../core/dates';
import { Book, BookIssue, isMarathi } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';
import { BookFormModel, bookFormFrom, toBookRequest } from './book-request';
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
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonBadge, IonIcon, IonSpinner],
})
export class BookDetailModal implements OnInit {
  @Input({ required: true }) book!: Book;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);
  protected auth = inject(AuthService);

  readonly current = signal<Book | null>(null);
  readonly history = signal<BookIssue[] | null>(null);
  readonly busy = signal(false);
  readonly section = signal<Section>('none');
  readonly menuOpen = signal(false);
  readonly confirmingDelete = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  form: BookFormModel = bookFormFrom();
  private changed = false;

  /** Students who currently have this book; named in the delete warning. */
  readonly borrowers = computed(() =>
    (this.history() ?? []).filter(i => i.status !== 'RETURNED').map(i => i.studentName)
  );

  protected readonly formatDate = formatDate;
  protected readonly dueText = dueText;
  protected readonly statusColor = statusColor;
  protected readonly statusLabel = statusLabel;
  protected readonly isMarathi = isMarathi;

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
    this.api.book(this.current()!.id).subscribe(book => {
      this.current.set(book);
      this.changed = true;
    });
  }

  private loadHistory() {
    this.api.bookIssues(this.book.id).subscribe({
      next: issues => this.history.set(issues),
      error: () => this.history.set([])
    });
  }
}
