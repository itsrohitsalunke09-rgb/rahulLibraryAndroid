import { Component, Input, OnInit, inject, signal } from '@angular/core';
import {
  IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonListHeader, IonNote, IonSpinner, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, sendOutline, trashOutline } from 'ionicons/icons';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { dueText, formatDate, statusColor } from '../../core/dates';
import { Book, BookIssue } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { BookFormModal } from './book-form.modal';
import { IssueBookModal } from './issue-book.modal';

@Component({
  selector: 'app-book-detail',
  templateUrl: 'book-detail.modal.html',
  styleUrls: ['book-detail.modal.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonListHeader, IonItem,
    IonLabel, IonNote, IonBadge, IonIcon, IonSpinner
  ],
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
  private changed = false;

  protected readonly formatDate = formatDate;
  protected readonly dueText = dueText;
  protected readonly statusColor = statusColor;

  constructor() {
    addIcons({ sendOutline, createOutline, trashOutline });
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

  async issue() {
    const modal = await this.modals.create({ component: IssueBookModal, componentProps: { book: this.current() } });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'issued') {
      this.reloadBook();
      this.loadHistory();
    }
  }

  async edit() {
    const modal = await this.modals.create({ component: BookFormModal, componentProps: { book: this.current() } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<Book>();
    if (role === 'saved' && data) {
      this.current.set(data);
      this.changed = true;
    }
  }

  async remove() {
    const book = this.current()!;
    const ok = await this.ui.confirm(
      'Delete book?',
      `"${book.title}" and its issue history will be permanently deleted.`,
      'Delete', true
    );
    if (!ok) {
      return;
    }
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
