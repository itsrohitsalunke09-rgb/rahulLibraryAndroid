import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonInput, IonList, IonListHeader, IonSpinner, IonText,
  IonTextarea, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { Book, BookRequest } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

/** Number fields come back from ion-input as strings (or '' when cleared). */
type FormModel = { [K in keyof BookRequest]: BookRequest[K] | string | null | undefined };

@Component({
  selector: 'app-book-form',
  templateUrl: 'book-form.modal.html',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonListHeader,
    IonInput, IonTextarea, IonSpinner, IonText
  ],
  styles: [`ion-input, ion-textarea { margin-bottom: 12px; } ion-list-header { padding-left: 0; }`],
})
export class BookFormModal implements OnInit {
  /** Book to edit; leave empty to add a new one. */
  @Input() book?: Book;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  form: FormModel = { title: '', author: '', totalCopies: 1 };
  readonly saving = signal(false);
  readonly error = signal('');

  ngOnInit() {
    if (this.book) {
      const { id, availableCopies, ...fields } = this.book;
      this.form = { ...fields };
    }
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  save() {
    const title = text(this.form.title);
    const author = text(this.form.author);
    const totalCopies = num(this.form.totalCopies);
    if (!title || !author) {
      this.error.set('Title and author are required.');
      return;
    }
    if (!totalCopies || totalCopies < 1) {
      this.error.set('Total copies must be at least 1.');
      return;
    }
    const request: BookRequest = {
      title,
      author,
      totalCopies,
      category: text(this.form.category),
      description: text(this.form.description),
      date: text(this.form.date),
      registrationNumber: text(this.form.registrationNumber),
      publication: text(this.form.publication),
      publicationYear: num(this.form.publicationYear),
      pageCount: num(this.form.pageCount),
      seller: text(this.form.seller),
      receiptNumber: text(this.form.receiptNumber),
      price: num(this.form.price),
    };
    this.saving.set(true);
    this.error.set('');
    this.api.saveBook(request, this.book?.id).subscribe({
      next: saved => {
        this.ui.toast(this.book ? 'Book updated.' : 'Book added.');
        this.modals.dismiss(saved, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the book.'));
      }
    });
  }
}

function text(value: unknown): string | undefined {
  const s = value == null ? '' : String(value).trim();
  return s || undefined;
}

function num(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
